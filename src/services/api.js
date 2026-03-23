/**
 * API Service Layer
 * 백엔드 연결 설정
 *
 * ⚙️ IP가 바뀌면 여기 한 곳만 수정하세요!
 */
const BASE_HOST = 'http://172.30.1.16:8080';
const BASE_URL = `${BASE_HOST}/api`;

// 로그인 후 토큰 저장 (모듈 내부 상태)
let authToken = null;

// 로그인 후 유저 정보 저장
let storedUserId = null;
let storedDisplayName = null;

export function getStoredDisplayName() { return storedDisplayName; }
export function setStoredDisplayName(name) { storedDisplayName = name; }
export function getStoredUserId() { return storedUserId; }

// ─── Timeout Helper ──────────────────────────────────────────────────────────

const TIMEOUT_MS = 10000; // 10초

/**
 * fetch에 타임아웃 적용
 */
function fetchWithTimeout(url, options = {}, timeoutMs = TIMEOUT_MS) {
  const fetchPromise = fetch(url, options);
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error('서버 응답 시간이 초과되었습니다. 네트워크 연결을 확인해주세요.')),
      timeoutMs
    )
  );
  return Promise.race([fetchPromise, timeoutPromise]);
}

// ─── Auth ────────────────────────────────────────────────────────────────────

/**
 * 로그인
 * POST /api/auth/login
 * @returns {Promise<{accessToken, refreshToken, userId, name}>}
 */
export async function loginApi(email, password) {
  const res = await fetchWithTimeout(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error('로그인 실패');
  const data = await res.json();
  authToken = data.accessToken;
  storedUserId = data.userId;
  storedDisplayName = data.name;
  return data;
}

// ─── Register ────────────────────────────────────────────────────────────────

/**
 * 회원가입
 * POST /api/user/register
 * @returns {Promise<{id, email, name, createdAt}>}
 */
export async function registerApi(email, password, displayName) {
  const res = await fetchWithTimeout(`${BASE_URL}/user/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName }),
  });
  if (!res.ok) throw new Error('회원가입 실패');
  const data = await res.json();
  storedDisplayName = data.name || displayName;
  return data;
}

// ─── User Profile ─────────────────────────────────────────────────────────────

/**
 * 내 프로필 조회
 * GET /api/user/profile
 * @returns {Promise<{id, email, name, ...}>}
 */
export async function getUserProfile() {
  const res = await fetchWithTimeout(`${BASE_URL}/user/profile`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('프로필 조회 실패');
  return res.json();
}

// ─── Meetings ─────────────────────────────────────────────────────────────────

/**
 * 회의 목록 조회
 * GET /api/meetings
 * @returns {Promise<Meeting[]>}
 */
export async function fetchMeetings() {
  const res = await fetchWithTimeout(`${BASE_URL}/meetings`, { headers: authHeaders() });
  if (!res.ok) throw new Error('회의 목록 조회 실패');
  return res.json();
}

/**
 * 회의 생성
 * POST /api/meetings
 * @param {{name, participants, description}} meetingData
 * @returns {Promise<Meeting>}
 */
export async function createMeeting(meetingData) {
  const res = await fetchWithTimeout(`${BASE_URL}/meetings`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: meetingData.name,
      workspaceId: meetingData.workspaceId || null,
      channelId: meetingData.channelId || null,
    }),
  });
  if (!res.ok) throw new Error('회의 생성 실패');
  const data = await res.json();
  return { ...data, name: data.title };
}

// ─── Recording & Summary ──────────────────────────────────────────────────────

/**
 * 녹음 파일 업로드 및 AI 분석 요청
 * 1. POST /api/recordings/upload?meetingId=
 * 2. POST /api/meetings/{meetingId}/analyze
 * 3. GET  /api/meetings/{meetingId}/transcript
 *
 * @returns {Promise<{summary, duration, recordingId, transcriptId, keywords, segments}>}
 */
export async function uploadAndSummarize(meetingId, sessionId, audioUri, durationSeconds, fileName = null) {
  // Step 1: 녹음 파일 업로드
  const formData = new FormData();
  formData.append('file', {
    uri: audioUri,
    type: fileName ? 'audio/*' : 'audio/m4a',
    name: fileName || 'recording.m4a',
  });

  const uploadRes = await fetchWithTimeout(
    `${BASE_URL}/recordings/upload?meetingId=${meetingId}`,
    { method: 'POST', headers: authHeaders(), body: formData },
    30000
  );
  if (!uploadRes.ok) throw new Error('녹음 업로드 실패');
  const uploadData = await uploadRes.json();
  const recordingId = uploadData.recordingId;

  // Step 2: AI 분석 요청 (STT + 요약)
  const analyzeRes = await fetchWithTimeout(
    `${BASE_URL}/meetings/${meetingId}/analyze`,
    {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordingId, speakerMappings: [] }),
    },
    120000 // AI 분석 2분 타임아웃
  );
  if (!analyzeRes.ok) {
    // 업로드는 성공했으므로 recordingId를 에러에 첨부해 호출자가 저장할 수 있도록 함
    const err = new Error('AI 분석 실패');
    err.recordingId = recordingId;
    throw err;
  }

  // Step 3: 분석 결과 조회
  const transcriptRes = await fetchWithTimeout(`${BASE_URL}/meetings/${meetingId}/transcript`, {
    headers: authHeaders(),
  });
  if (!transcriptRes.ok) throw new Error('요약 조회 실패');
  const transcript = await transcriptRes.json();

  let durationStr;
  if (durationSeconds > 0) {
    const mins = Math.floor(durationSeconds / 60);
    const secs = durationSeconds % 60;
    durationStr = mins > 0 ? `${mins}분 ${secs}초` : `${secs}초`;
  } else {
    durationStr = '파일 업로드';
  }

  return {
    summary: transcript.summary || '요약 없음',
    duration: durationStr,
    recordingId,                          // 나중에 재생에 사용
    transcriptId: transcript.id,
    keywords: transcript.keywords || [],
    segments: transcript.segments || [],
  };
}

// ─── Transcript ───────────────────────────────────────────────────────────────

/**
 * 회의 분석 결과 조회 (요약, 키워드, 화자별 발화)
 * GET /api/meetings/{meetingId}/transcript
 * @returns {Promise<{id, summary, keywords, segments}|null>}
 */
export async function fetchTranscript(meetingId) {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/meetings/${meetingId}/transcript`, {
      headers: authHeaders(),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ─── Recordings ───────────────────────────────────────────────────────────────

/**
 * 회의 녹음 목록 조회
 * GET /api/recordings?meetingId=
 * @returns {Promise<RecordingResponse[]>}
 */
export async function fetchRecordings(meetingId) {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/recordings?meetingId=${meetingId}`, {
      headers: authHeaders(),
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

/**
 * 녹음 파일 재생용 Presigned URL 조회
 * GET /api/recordings/{recordingId}/presigned-url
 * @returns {Promise<{presignedUrl, s3Key, expiresAt}>}
 */
export async function getRecordingPresignedUrl(recordingId) {
  const res = await fetchWithTimeout(
    `${BASE_URL}/recordings/${recordingId}/presigned-url`,
    { headers: authHeaders() }
  );
  if (!res.ok) throw new Error('녹음 URL 조회 실패');
  return res.json(); // { presignedUrl, s3Key, expiresAt }
}

// ─── Events & Tasks ───────────────────────────────────────────────────────────

/**
 * 회의에서 추출된 일정 목록 조회
 * GET /api/events?meetingId=
 * @returns {Promise<Event[]>}
 */
export async function fetchEvents(meetingId) {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/events?meetingId=${meetingId}`, {
      headers: authHeaders(),
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

/**
 * 회의에서 추출된 할 일 목록 조회
 * GET /api/tasks?meetingId=
 * @returns {Promise<Task[]>}
 */
export async function fetchTasks(meetingId) {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/tasks?meetingId=${meetingId}`, {
      headers: authHeaders(),
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

// ─── Retry Analyze ────────────────────────────────────────────────────────────

/**
 * 이미 업로드된 녹음에 대해 AI 분석만 재시도
 * POST /api/meetings/{meetingId}/analyze
 * GET  /api/meetings/{meetingId}/transcript
 *
 * @returns {Promise<{summary, keywords, segments}>}
 */
export async function analyzeAndFetch(meetingId, recordingId) {
  const analyzeRes = await fetchWithTimeout(
    `${BASE_URL}/meetings/${meetingId}/analyze`,
    {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordingId, speakerMappings: [] }),
    },
    120000
  );
  if (!analyzeRes.ok) throw new Error('AI 분석 재시도 실패');

  const transcriptRes = await fetchWithTimeout(`${BASE_URL}/meetings/${meetingId}/transcript`, {
    headers: authHeaders(),
  });
  if (!transcriptRes.ok) throw new Error('요약 조회 실패');
  const transcript = await transcriptRes.json();

  return {
    summary: transcript.summary || '요약 없음',
    keywords: transcript.keywords || [],
    segments: transcript.segments || [],
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authHeaders() {
  return authToken ? { Authorization: `Bearer ${authToken}` } : {};
}

/**
 * [개발용] 로그인 직후 워크스페이스 자동 셋업
 * 백엔드를 dev 프로파일로 실행 시 활성화됨
 * POST /api/dev/test-data/calendar-setup
 * → 워크스페이스 생성 + 현재 유저를 멤버로 추가
 * 
 * 백엔드팀이 MeetingService.startMeeting의 워크스페이스 체크를
 * nullable 처리하면 이 함수는 더 이상 불필요합니다.
 * @returns {Promise<{workspaceId: number}|null>}
 */
export async function setupDevWorkspace() {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/dev/test-data/calendar-setup`, {
      method: 'POST',
      headers: authHeaders(),
    }, 5000);
    if (!res.ok) return null;
    const data = await res.json();
    return data; // { workspaceId, eventId, message }
  } catch {
    return null; // dev 프로파일 아니면 조용히 무시
  }
}
