import React, { createContext, useContext, useState } from 'react';
import { createMeeting, fetchMeetings, setupDevWorkspace } from '../services/api';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [meetings, setMeetings] = useState([]);

  /**
   * 로그인 후 호출
   * userData: { email, name, id (userId) }
   */
  const login = async (userData) => {
    setUser(userData);
    // [dev] 워크스페이스 자동 셋업 (dev 프로파일일 때만 동작, 아니면 조용히 무시)
    await setupDevWorkspace();
    try {
      const backendMeetings = await fetchMeetings();
      const list = Array.isArray(backendMeetings) ? backendMeetings : [];
      const mapped = list.map((m) => ({
        ...m,
        name: m.title || '(제목 없음)',
        participants: Array.isArray(m.participants) ? m.participants : [],
        sessions: [],
      }));
      setMeetings(mapped);
    } catch (e) {
      setMeetings([]);
    }
  };

  const logout = () => {
    setUser(null);
    setMeetings([]);
  };

  const updateUser = (updates) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  const addMeeting = async (meetingData) => {
    const backendMeeting = await createMeeting(meetingData);
    const newMeeting = {
      ...backendMeeting,
      name: backendMeeting.title || meetingData.name,
      createdAt: backendMeeting.createdAt || new Date().toISOString(),
      participants: meetingData.participants || [],
      description: meetingData.description || '',
      sessions: [],
    };
    setMeetings((prev) => [newMeeting, ...prev]);
    return newMeeting;
  };

  /**
   * 새 세션을 회의에 추가
   */
  const addMeetingSession = (meetingId) => {
    const newSession = {
      id: `s${Date.now()}`,
      startedAt: new Date().toISOString(),
      duration: null,
      summary: null,
      status: 'ongoing',
      recordingId: null,
      keywords: [],
      segments: [],
    };
    setMeetings((prev) =>
      prev.map((m) =>
        String(m.id) === String(meetingId) ? { ...m, sessions: [newSession, ...m.sessions] } : m
      )
    );
    return newSession;
  };

  /**
   * 기존 세션 업데이트 (녹음 완료 후 요약/recordingId 저장 등)
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
