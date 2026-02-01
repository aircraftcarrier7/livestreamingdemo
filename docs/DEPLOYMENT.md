# Server Deployment Guide

이 문서는 Ubuntu 20.04/22.04 LTS 서버(VPS)에 `web-rtmp-streamer`를 배포하는 방법을 설명합니다.
AWS EC2, DigitalOcean, Vultr, Linode 등의 서비스를 이용할 수 있습니다.

## 1. 사전 준비 (Prerequisites)

- 우분투 서버 (Ubuntu 20.04 이상 권장)
- 루트(root) 권한 또는 sudo 권한이 있는 사용자
- 도메인 (선택 사항)

## 2. 시스템 패키지 설치

서버에 접속하여 필수 패키지와 **FFmpeg**를 설치합니다.

```bash
# 패키지 목록 업데이트
sudo apt update

# 필수 도구 및 FFmpeg 설치
sudo apt install -y curl git ffmpeg build-essential

# FFmpeg 설치 확인
ffmpeg -version
```

## 3. Node.js 설치 (v18 이상)

Node.js 버전 관리 매니저인 `fnm` 또는 `nvm`을 사용하거나, NodeSource 저장소를 이용해 설치합니다. 여기서는 NodeSource를 이용합니다.

```bash
# Node.js 20.x 설치 스크립트 실행
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Node.js 설치
sudo apt install -y nodejs

# 설치 확인
node -v
npm -v
```

## 4. pnpm 설치

프로젝트에서 패키지 매니저로 `pnpm`을 사용합니다.

```bash
sudo npm install -g pnpm
```

## 5. 프로젝트 클론 및 설정

```bash
# git clone (본인의 저장소 주소로 변경 필요)
git clone https://github.com/your-username/web-rtmp-streamer.git
cd web-rtmp-streamer

# 의존성 설치
pnpm install

# 환경 변수 설정 (.env 파일 생성)
# 필요한 경우 VITE_API_URL 등을 설정
echo "PORT=3000" > .env
```

## 6. 빌드 및 실행

```bash
# 프로덕션 빌드
pnpm build

# 서버 실행 (테스트)
pnpm start
```

## 7. PM2를 이용한 무중단 배포 (Process Management)

서버 연결을 종료해도 애플리케이션이 계속 실행되도록 `pm2`를 사용합니다.

```bash
# pm2 설치
sudo npm install -g pm2

# pm2로 서버 실행 (이름: rtmp-server)
pm2 start pnpm --name "rtmp-server" -- start

# 서버 재부팅 시 자동 실행 설정
pm2 startup
pm2 save
```

## 8. (선택 사항) 도메인 연결 및 Nginx 설정

도메인으로 접속하고 HTTPS를 적용하려면 Nginx를 리버스 프록시로 설정해야 합니다.

```bash
# Nginx 설치
sudo apt install -y nginx

# 설정 파일 생성
sudo nano /etc/nginx/sites-available/rtmp-server
```

**설정 예시:**
```nginx
server {
    listen 80;
    server_name your-domain.com; # 본인의 도메인 입력

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# 설정 활성화
sudo ln -s /etc/nginx/sites-available/rtmp-server /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 배포 시 주의사항

- **방화벽(Firewall)**: 클라우드 서비스의 보안 그룹(Security Group)에서 3000번 포트(또는 80/443)를 열어야 합니다.
- **FFmpeg 경로**: 대부분의 경우 `apt install ffmpeg`로 설치하면 자동으로 PATH에 등록되지만, 만약 실행되지 않는다면 환경 변수를 확인하세요.
