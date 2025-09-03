<div align="center">

![Zerone Logo](https://zerone01.kr/static/image/zerone_og.png)

**영과일 온라인 코드 컴파일러 프론트엔드**

[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![Monaco Editor](https://img.shields.io/badge/Monaco%20Editor-0.45.0-yellow.svg)](https://microsoft.github.io/monaco-editor/)
[![Styled Components](https://img.shields.io/badge/Styled%20Components-6.1.0-pink.svg)](https://styled-components.com/)

[🌐 **ZERONE Online Compiler Link**](https://zerone01.kr/compiler)

</div>

---

## ✨ 주요 기능

### 🎯 **VSCode 스타일 인터페이스**
- **Monaco Editor** 기반의 코드 에디터
- VSCode와 동일한 다크 테마와 UI/UX
- 실시간 구문 강조 및 자동 완성
- 폰트 크기 조정 및 커스터마이징

### 🔧 **다중 언어 지원**
- **C/C++** - 컴파일 및 실행
- **Python** - 인터프리터 실행
- 확장 가능한 언어 지원 구조

### ⚡ **실시간 코드 실행**
- **컨테이너 기반** 안전한 코드 실행
- **대기열 시스템**으로 동시 실행 관리
- **실행 시간 측정** 및 성능 모니터링
- **실시간 상태 업데이트**

### 🧪 **고급 테스트 시스템**
- **다중 테스트 케이스** 관리
- **백준 온라인 저지** 예제 자동 가져오기
- **배치 테스트** 실행
- **AI 기반 문제 해결 힌트**

### 🤖 **AI 힌트 시스템**
- **실패한 테스트 케이스** 자동 분석
- **개인화된 해결 방안** 제시
- **코드 개선 제안**
- **캐시 시스템**으로 빠른 응답
- **백준 예제 가져오기**시 문제도 프롬프트 포함

### 📱 **반응형 디자인**
- **모바일 최적화** 레이아웃
- **터치 친화적** 인터페이스
- **적응형 패널** 시스템

---

## 🛠️ 기술 스택

### Frontend
- **React 18.2.0** - 사용자 인터페이스
- **Monaco Editor** - 코드 에디터
- **Styled Components** - 스타일링
- **Axios** - HTTP 클라이언트

### Backend Integration
- **FastAPI** - 백엔드 API
- **Docker** - 컨테이너 기반 실행

---

## 📖 사용법

### 🎯 기본 사용법

1. **언어 선택**: 상단 드롭다운에서 프로그래밍 언어 선택
2. **코드 작성**: Monaco Editor에서 코드 작성
3. **입력 데이터**: 필요한 경우 입력 데이터 설정
4. **실행**: "🚀 코드 실행" 버튼 클릭
5. **결과 확인**: 터미널 패널에서 실행 결과 확인

### 🧪 테스트 케이스 사용법

1. **테스트 패널 전환**: "⚡ 테스트 패널" 버튼 클릭
2. **테스트 케이스 추가**: "➕ 테스트 추가" 버튼으로 새 테스트 생성
3. **백준 예제 가져오기**: "➕ 백준 예제" 버튼으로 문제 예제 자동 가져오기
4. **테스트 실행**: "🚀 테스트 실행" 버튼으로 모든 테스트 실행
5. **AI 힌트**: 실패한 테스트에 대해 "🤖 AI 힌트" 버튼으로 도움 받기

### 🎨 인터페이스 커스터마이징

- **폰트 크기 조정**: 상단 메뉴바의 +/- 버튼으로 폰트 크기 변경
- **패널 전환**: 사이드바에서 "터미널"과 "테스트" 패널 간 전환
- **사이드바 접기**: 사이드바 토글 버튼으로 공간 확보

---

## 🏗️ 프로젝트 구조

```
online-code-compiler-frontend/
├── public/
│   └── index.html         # 메인 HTML 파일
├── src/
│   ├── App.js             # 메인 애플리케이션 컴포넌트
│   ├── App.css            # 스타일시트
│   ├── index.js           # 애플리케이션 진입점
│   └── index.css          # 글로벌 스타일
├── package-lock.json      # 프로젝트 패키지 파일 
├── package.json           # 프로젝트 설정 및 의존성
├── .gitignore              
└── README.md              
```

---

## 🔧 API 엔드포인트

### 코드 실행
- `POST /compiler/api/compile` - 코드 컴파일 및 실행
- `GET /compiler/api/status/{job_id}` - 실행 상태 확인

### 언어 지원
- `GET /compiler/api/languages` - 지원 언어 목록

### 테스트 시스템
- `POST /compiler/api/batch-test` - 배치 테스트 실행
- `GET /compiler/api/batch-status/{job_id}` - 테스트 상태 확인

### 백준 통합
- `POST /compiler/api/baekjoon-parse` - 백준 예제 파싱
- `GET /compiler/api/baekjoon-problem/{number}` - 백준 문제 정보

### AI 힌트
- `POST /compiler/api/ai-hint` - AI 힌트 요청

### 언어 서버
- `POST /compiler/api/language-server` - 코드 토큰 분석

---

## 🔒 보안

- **컨테이너 격리**: 모든 사용자 코드는 완전히 격리된 Docker 컨테이너에서 실행
- **실행 시간 제한**: 코드 실행 시간 제한으로 무한 루프 방지
- **리소스 제한**: 메모리 및 CPU 사용량 제한
- **입력 검증**: 모든 사용자 입력에 대한 검증 및 필터링

---

<div align="center">

**⭐ 이 프로젝트는 Cusor기반으로 제작되었습니다 ⭐**

Made by **playlistSDY**

</div>
