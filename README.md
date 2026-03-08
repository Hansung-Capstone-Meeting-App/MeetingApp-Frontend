# MeetingApp Frontend

AI 회의 요약 앱의 React Native (Expo) 프론트엔드입니다.

---

## 실행 방법

```bash
# 의존성 설치
npm install

# 개발 서버 시작
npx expo start

# 플랫폼별 실행
npx expo start --android
npx expo start --ios
```

> 백엔드 서버가 먼저 실행되어 있어야 합니다.

---

## 백엔드 연결 설정

`src/services/api.js` 상단의 `BASE_URL`과 로그인/회원가입 URL을 실행 환경에 맞게 수정하세요.

```js
// src/services/api.js
const BASE_URL = 'http://{백엔드_서버_IP}:8080/api';
```

로컬 개발 시 Mac에서 IP 확인:
```bash
ipconfig getifaddr en0
```

---

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
    ├── services/
    │   └── api.js                 # 백엔드 API 연동 레이어
    └── screens/
        ├── LoginScreen.js         # 로그인 / 회원가입
        ├── HomeScreen.js          # 홈 화면 (통계, 최근 회의)
        ├── MeetingListScreen.js   # 회의 목록 (검색, 정렬, FAB)
        ├── AddMeetingScreen.js    # 회의 추가
        ├── MeetingDetailScreen.js # 회의 상세 (녹음, AI 요약)
        ├── MessengerScreen.js     # 메신저
        └── MyInfoScreen.js        # 내 정보 / 설정
```

---

## 주요 기능

- **로그인 / 회원가입**: 백엔드 연동, JWT 토큰 인증
- **회의 목록**: 로그인 시 백엔드에서 자동 불러오기, 검색 및 정렬
- **회의 생성**: 백엔드에 저장 후 실제 ID 사용
- **녹음 & AI 요약**: 음성 파일 업로드 → AssemblyAI STT → Gemini 요약
- **하단 탭바**: 메신저 | 홈 | 내 정보
- **내 정보**: 프로필, 설정, 로그아웃

---

## 사용 기술

- React Native (Expo ~54)
- React Navigation v6 (Stack + Bottom Tabs)
- @expo/vector-icons (Ionicons)
- React Context API (전역 상태 관리)
- expo-av (녹음)
- expo-document-picker (파일 업로드)
