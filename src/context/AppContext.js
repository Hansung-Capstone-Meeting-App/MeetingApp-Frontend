import React, { createContext, useContext, useState } from 'react';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [meetings, setMeetings] = useState([
    {
      id: '1',
      name: '주간 팀 스탠드업',
      participants: ['김철수', '이영희', '박민준'],
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      sessions: [
        {
          id: 's1',
          startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          duration: '25분',
          summary: '이번 주 개발 진행 상황 공유. 로그인 기능 완료, 대시보드 UI 작업 중.',
          status: 'completed',
        },
        {
          id: 's2',
          startedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          duration: '30분',
          summary: '프로젝트 킥오프 미팅. 기능 명세 확정 및 역할 분담.',
          status: 'completed',
        },
      ],
    },
    {
      id: '2',
      name: '제품 기획 회의',
      participants: ['정소연', '최동욱'],
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      sessions: [
        {
          id: 's3',
          startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          duration: '45분',
          summary: 'Q2 로드맵 논의. AI 요약 기능 우선순위 1순위 결정.',
          status: 'completed',
        },
      ],
    },
  ]);

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
