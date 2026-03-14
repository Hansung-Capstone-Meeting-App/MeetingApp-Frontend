/**
 * API Service Layer
 * 백엔드 연결 설정
 *
 * BASE_URL 설정:
 *   const BASE_URL = 'https://your-backend.com/api';
 */
// ⚙️ IP가 바뀌면 여기 한 곳만 수정하세요!
const BASE_HOST = 'http://172.30.1.72:8080';
const BASE_URL = `${BASE_HOST}/api`;

// 로그인 후 토큰 저장 (모듈 내부 상태)
let authToken = null;

// 회원가입/로그인 후 이름 저장
let storedDisplayName = null;

export function getStoredDisplayName() { return storedDisplayName; }
export function setStoredDisplayName(name) { storedDisplayName = name; }

// ─── Timeout Helper ──────────────────────────────────────────────────────────

const TIMEOUT_MS = 10000; // 10초

/**
 * fetch에 타임아웃 적용
 * React Native의 fetch는 기본 타임아웃이 없어 백엔드 미응답 시 무한 대기 발생
 * AbortController로 일정 시간 후 강제 중단
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
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{id, name, email, role, token}>}
 */
export async function loginApi(email, password) {
  const res = await fetchWithTimeout(`${BASE_HOST}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error('로그인 실패');
  const data = await res.json();
  authToken = data.accessToken;
  return data;
}

// ─── Register ────────────────────────────────────────────────────────────────

/**
 * 회원가입
 * @param {string} email
 * @param {string} password
 * @param {string} displayName
 * @returns {Promise<object>}
 */
export async function registerApi(email, password, displayName) {
  const res = await fetchWithTimeout(`${BASE_HOST}/user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName }),
  });
  if (!res.ok) throw new Error('회원가입 실패');
  const data = await res.json();
  storedDisplayName = data.name || displayName; // 이름 저장
  return data;
}

// ─── Meetings ─────────────────────────────────────────────────────────────────

/**
 * 회의 목록 조회
 * @returns {Promise<Meeting[]>}
 */
export async function fetchMeetings() {
  const res = await fetchWithTimeout(`${BASE_URL}/meetings`, { headers: authHeaders() });
  if (!res.ok) throw new Error('회의 목록 조회 실패');
  return res.json();
}

/**
 * 회의 생성
 * @param {{name, participants, description}} meetingData
 * @returns {Promise<Meeting>}
 */
export async function createMeeting(meetingData) {
  const res = await fetchWithTimeout(`${BASE_URL}/meetings`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: meetingData.name }), // 백엔드 필드명: title
  });
  if (!res.ok) throw new Error('회의 생성 실패');
  const data = await res.json();
  return { ...data, name: data.title }; // 프론트는 name 필드 사용
}

// ─── Recording & Summary ──────────────────────────────────────────────────────

/**
 * 녹음 파일 업로드 및 AI 요약 요청
 *
 * @param {string} meetingId      - 회의 ID
 * @param {string} sessionId      - 세션 ID
 * @param {string|null} audioUri  - 로컬 오디오 파일 URI
 *                                   · 실시간 녹음: expo-av recording.getURI()
 *                                   · 파일 업로드: expo-document-picker asset.uri
 * @param {number} durationSeconds - 녹음 시간 (초). 파일 업로드 시 0 전달 가능
 * @param {string|null} fileName  - 업로드된 파일명 (파일 업로드 시에만 전달)
 * @returns {Promise<{summary: string, duration: string}>}
 */
export async function uploadAndSummarize(meetingId, sessionId, audioUri, durationSeconds, fileName = null) {
  // Step 1: 녹음 파일 업로드
  const formData = new FormData();
  // 모바일(React Native): { uri, type, name } 형식 사용
  formData.append('file', {
    uri: audioUri,
    type: fileName ? 'audio/*' : 'audio/m4a',
    name: fileName || 'recording.m4a',
  });

  const uploadRes = await fetchWithTimeout(`${BASE_URL}/recordings/upload?meetingId=${meetingId}`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  }, 30000); // 파일 업로드는 30초 타임아웃
  if (!uploadRes.ok) throw new Error('녹음 업로드 실패');
  const uploadData = await uploadRes.json();
  const recordingId = uploadData.recordingId;

  // Step 2: AI 분석 요청 (AssemblyAI STT + Claude 요약)
  const analyzeRes = await fetchWithTimeout(`${BASE_URL}/meetings/${meetingId}/analyze`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ recordingId, speakerMappings: [] }),
  }, 60000); // AI 분석은 60초 타임아웃
  if (!analyzeRes.ok) throw new Error('AI 분석 실패');

  // Step 3: 요약 결과 조회
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
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authHeaders() {
  return authToken ? { Authorization: `Bearer ${authToken}` } : {};
}
