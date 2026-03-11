import React, { createContext, useContext, useState } from 'react';
import { createMeeting, fetchMeetings } from '../services/api';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [meetings, setMeetings] = useState([]); // 예시 데이터 없이 빈 상태로 시작

  const login = async (userData) => {
    setUser(userData);
    try {
      const backendMeetings = await fetchMeetings();
      // 백엔드 응답을 프론트 형식으로 변환 (배열이 아닐 경우 방어)
      const list = Array.isArray(backendMeetings) ? backendMeetings : [];
      const mapped = list.map((m) => ({
        ...m,
        name: m.title || '(제목 없음)',
        participants: Array.isArray(m.participants) ? m.participants : [],
        sessions: Array.isArray(m.sessions) ? m.sessions : [],
      }));
      setMeetings(mapped);
    } catch (e) {
      setMeetings([]); // 불러오기 실패해도 앱은 동작
    }
  };

  const logout = () => {
    setUser(null);
    setMeetings([]); // 로그아웃 시 회의 목록 초기화
  };

  /**
   * 사용자 정보 업데이트 (이름, 역할 등)
   */
  const updateUser = (updates) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  const addMeeting = async (meetingData) => {
    const backendMeeting = await createMeeting(meetingData); // 백엔드에 회의 생성 → 실제 ID 획득
    const newMeeting = {
      ...backendMeeting,
      name: backendMeeting.title || meetingData.name,
      participants: meetingData.participants || [],
      description: meetingData.description || '',
      sessions: [],
    };
    setMeetings((prev) => [newMeeting, ...prev]);
    return newMeeting;
  };

  /**
   * 새 세션을 회의에 추가하고 반환합니다.
   */
  const addMeetingSession = (meetingId) => {
    const newSession = {
      id: `s${Date.now()}`,
      startedAt: new Date().toISOString(),
      duration: null,
      summary: null,
      status: 'ongoing',
    };
    setMeetings((prev) =>
      prev.map((m) =>
        String(m.id) === String(meetingId) ? { ...m, sessions: [newSession, ...m.sessions] } : m
      )
    );
    return newSession;
  };

  /**
   * 기존 세션을 업데이트합니다. (녹음 완료 후 요약 저장 등)
   * @param {string} meetingId
   * @param {string} sessionId
   * @param {object} updates - 업데이트할 필드 (예: { summary, duration, status })
   */
  const updateMeetingSession = (meetingId, sessionId, updates) => {
    setMeetings((prev) =>
      prev.map((m) =>
        String(m.id) === String(meetingId)
          ? {
              ...m,
              sessions: m.sessions.map((s) =>
                s.id === sessionId ? { ...s, ...updates } : s
              ),
            }
          : m
      )
    );
  };

  // 백엔드 ID(숫자)와 로컬 ID(문자열) 모두 대응
  const getMeetingById = (id) => meetings.find((m) => String(m.id) === String(id));

  return (
    <AppContext.Provider
      value={{
        user,
        meetings,
        login,
        logout,
        updateUser,
        addMeeting,
        addMeetingSession,
        updateMeetingSession,
        getMeetingById,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
