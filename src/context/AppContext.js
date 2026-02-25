import React, { createContext, useContext, useState } from 'react';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [meetings, setMeetings] = useState([]); // 예시 데이터 없이 빈 상태로 시작

  const login = (userData) => {
    setUser(userData || { id: 'temp_user', name: '김개발', email: 'dev@meetingapp.io', role: '개발팀' });
  };

  const logout = () => {
    setUser(null);
  };

  const addMeeting = (meetingData) => {
    const newMeeting = {
      id: Date.now().toString(),
      ...meetingData,
      createdAt: new Date().toISOString(),
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
        m.id === meetingId ? { ...m, sessions: [newSession, ...m.sessions] } : m
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
        m.id === meetingId
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

  const getMeetingById = (id) => meetings.find((m) => m.id === id);

  return (
    <AppContext.Provider
      value={{
        user,
        meetings,
        login,
        logout,
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
