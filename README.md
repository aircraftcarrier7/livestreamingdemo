# Web RTMP Streamer

Web RTMP Streamer는 웹 브라우저 기반의 RTMP 스트리밍 도구입니다. 웹캠 화면, 로컬 비디오 파일, 그리고 텍스트 등을 자유롭게 배치하고 합성하여 YouTube, Twitch와 같은 RTMP 지원 플랫폼으로 실시간 방송을 송출할 수 있습니다.

## 주요 기능
- **다양한 소스 지원**: 웹캠, 로컬 동영상 파일, 이미지 등을 방송 소스로 활용 가능
- **화면 합성 (Composition)**: PIP(Picture-in-Picture), 분할 화면 등 다양한 레이아웃 프리셋 제공 및 커스터마이징 지원
- **실시간 RTMP 송출**: YouTube Live, Twitch, Naver Chzzk 등 RTMP 프로토콜을 지원하는 모든 플랫폼으로 송출 가능 (FFmpeg 기반)
- **미디어 플레이어**: 재생 목록 관리, 반복 재생, 구간 반복 등 강력한 미디어 제어 기능
- **방송 모니터링**: 프레임 레이트, 비트레이트, 네트워크 상태 등 실시간 방송 품질 모니터링

## 기술 스택
- **Client**: React, Vite, TailwindCSS, Radix UI, Framer Motion
- **Server**: Node.js, Express, Socket.io, tRPC
- **Streaming Engine**: FFmpeg, Fluent-ffmpeg
- **Database**: Drizzle ORM (MySQL - optional/configurable)

## 시작하기

### 필수 요구사항
- Node.js (v18 이상 권장)
- pnpm
- FFmpeg (시스템에 설치되어 있어야 하며, PATH에 등록되어 있어야 함)

### 설치
프로젝트의 의존성을 설치합니다.

```bash
pnpm install
```

### 개발 서버 실행
클라이언트와 서버를 동시에 실행합니다.

```bash
pnpm dev
# Server running on http://localhost:3000/
```

브라우저에서 `http://localhost:3000`으로 접속하여 애플리케이션을 사용할 수 있습니다.

### 프로덕션 빌드 및 실행

```bash
pnpm build
pnpm start
``` 

## 주의사항
- **FFmpeg 설치**: 이 프로젝트는 영상 인코딩 및 RTMP 송출을 위해 FFmpeg를 사용합니다. 서버를 실행하는 머신에 반드시 FFmpeg가 설치되어 있어야 합니다.
- **포트 충돌**: 기본적으로 3000번 포트를 사용하며, 포트가 사용 중일 경우 자동으로 다음 가용 포트(3001, 3002...)를 탐색합니다.

## 라이선스
MIT
