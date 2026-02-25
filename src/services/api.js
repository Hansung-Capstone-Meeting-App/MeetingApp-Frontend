/**
 * API Service Layer
 * 백엔드 연결 시 이 파일의 함수들만 실제 API 호출로 교체하면 됩니다.
 *
 * BASE_URL 설정:
 *   const BASE_URL = 'https://your-backend.com/api';
 */

const BASE_URL = 'http://localhost:8080/api'; // TODO: 실제 백엔드 URL로 변경

// ─── Auth ────────────────────────────────────────────────────────────────────

/**
 * 로그인
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{id, name, email, role, token}>}
 */
export async function loginApi(email, password) {
  // TODO: 백엔드 연결 시 아래 mock 제거 후 실제 API 호출로 교체
  // const res = await fetch(`${BASE_URL}/auth/login`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ email, password }),
  // });
  // if (!res.ok) throw new Error('로그인 실패');
  // return res.json();

  // Mock
  await delay(800);
  if (!email || !password) throw new Error('이메일과 비밀번호를 입력해주세요.');
  return { id: '1', name: '김개발', email, role: '개발팀', token: 'mock_token' };
}

// ─── Meetings ─────────────────────────────────────────────────────────────────

/**
 * 회의 목록 조회
 * @returns {Promise<Meeting[]>}
 */
export async function fetchMeetings() {
  // TODO: 백엔드 연결 시 아래 mock 제거 후 실제 API 호출로 교체
  // const res = await fetch(`${BASE_URL}/meetings`, { headers: authHeaders() });
  // if (!res.ok) throw new Error('회의 목록 조회 실패');
  // return res.json();

  await delay(300);
  return [];
}

/**
 * 회의 생성
 * @param {{name, participants, description}} meetingData
 * @returns {Promise<Meeting>}
 */
export async function createMeeting(meetingData) {
  // TODO: 백엔드 연결 시 아래 mock 제거 후 실제 API 호출로 교체
  // const res = await fetch(`${BASE_URL}/meetings`, {
  //   method: 'POST',
  //   headers: { ...authHeaders(), 'Content-Type': 'application/json' },
  //   body: JSON.stringify(meetingData),
  // });
  // if (!res.ok) throw new Error('회의 생성 실패');
  // return res.json();

  await delay(300);
  return { id: Date.now().toString(), ...meetingData, createdAt: new Date().toISOString(), sessions: [] };
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
  // TODO: 백엔드 연결 시 아래 mock 제거 후 실제 API 호출로 교체
  //
  // ── 실제 구현 예시 ──────────────────────────────────────────────────────
  // const formData = new FormData();
  // formData.append('audio', {
  //   uri: audioUri,
  //   type: fileName ? 'audio/*' : 'audio/m4a',
  //   name: fileName || 'recording.m4a',
  // });
  // formData.append('meetingId', meetingId);
  // formData.append('sessionId', sessionId);
  // if (durationSeconds > 0) formData.append('duration', durationSeconds.toString());
  //
  // const res = await fetch(`${BASE_URL}/meetings/${meetingId}/sessions/${sessionId}/summarize`, {
  //   method: 'POST',
  //   headers: authHeaders(),
  //   body: formData,
  // });
  // if (!res.ok) throw new Error('요약 생성 실패');
  // return res.json(); // { summary: '...', duration: '15분 30초' }
  // ────────────────────────────────────────────────────────────────────────

  // Mock - 백엔드 연결 전 테스트용 (3초 딜레이)
  await delay(3000);

  let durationStr;
  if (durationSeconds > 0) {
    const mins = Math.floor(durationSeconds / 60);
    const secs = durationSeconds % 60;
    durationStr = mins > 0 ? `${mins}분 ${secs}초` : `${secs}초`;
  } else {
    durationStr = '파일 업로드';
  }

  const sourceLabel = fileName ? `파일: ${fileName}` : '실시간 녹음';
  return {
    summary: `[백엔드 미연결 - Mock 요약] 회의가 성공적으로 기록되었습니다. (${sourceLabel})\n백엔드 연결 후 실제 AI 요약이 표시됩니다.`,
    duration: durationStr,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// function authHeaders() {
//   const token = getStoredToken(); // AsyncStorage 등에서 가져오기
//   return { Authorization: `Bearer ${token}` };
// }
