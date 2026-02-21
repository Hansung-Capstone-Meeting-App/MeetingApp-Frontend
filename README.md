# MeetingApp Frontend

AI 회의 요약 앱의 React Native (Expo) 프론트엔드입니다.

## 실행 방법

```bash
# 의존성 설치
npm install

# 개발 서버 시작
npx expo start

# 플랫폼별 실행
npx expo start --android
npx expo start --ios
npx expo start --web
```

## 프로젝트 구조

```
MeetingApp-Frontend/
├── App.js                        # 앱 진입점
├── app.json                      # Expo 설정
├── babel.config.js
├── package.json
└── src/
    ├── context/
    │   └── AppContext.js          # 전역 상태 관리 (React Context)
    ├── navigation/
    │   └── AppNavigator.js        # 네비게이션 구조 + 커스텀 탭바
    └── screens/
        ├── LoginScreen.js         # 로그인 (임시 로그인 버튼 포함)
        ├── HomeScreen.js          # 홈 화면 (Meeting 버튼, 통계, 최근 회의)
        ├── MeetingListScreen.js   # 회의 목록 (검색, 정렬, FAB)
        ├── AddMeetingScreen.js    # 회의 추가 (이름, 참여자, 시간 자동저장)
        ├── MeetingDetailScreen.js # 회의 상세 (세션 기록, 회의 시작 버튼)
        ├── MessengerScreen.js     # 메신저 (채팅 목록 + 채팅방 UI)
        └── MyInfoScreen.js        # 내 정보 (프로필, 설정, 알림, AI 설정)
```

## 주요 기능

- **로그인 화면**: 이메일/비밀번호 입력 + 백엔드 없이 바로 테스트 가능한 임시 로그인 버튼
- **하단 탭바**: 메신저(좌) | 홈(중앙 - 강조) | 내 정보(우), 항상 하단에 위치
- **홈**: 사용자 인사, 통계 카드, Meeting 버튼, AI 배너, 최근 회의 목록, 빠른 액션
- **회의 목록**: 검색, 정렬 (최신/오래된/이름순), 회의 카드, FAB로 추가
- **회의 추가**: 회의 이름, 참여자 태그 방식 입력, 회의 시간 자동 저장
- **회의 상세**: 참여자 목록, 세션 통계, 회의 시작 버튼 (CTA), 타임라인 형식의 세션 기록, AI 요약 표시
- **메신저**: 채팅 목록 + 탭 필터 + 채팅방 UI (메시지 전송 가능)
- **내 정보**: 프로필 카드, 통계, 계정/알림/AI/앱 설정, 로그아웃

## 사용 기술

- React Native (Expo ~51)
- React Navigation v6 (Stack + Bottom Tabs)
- @expo/vector-icons (Ionicons)
- React Context API (상태 관리)
- react-native-safe-area-context
