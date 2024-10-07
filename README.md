# 게시판 (board)
이 프로젝트는 게시판의 백엔드입니다. 사용자가 게시글을 작성할 시 이를 처리하고 데이터를 저장하는 역할을 합니다.

## 📄 프로젝트 설명
- **중고 오토바이 거래 플랫폼**을 위한 컨셉 페이지입니다.
- **직관적인 UI**를 통해 사용자들이 쉽게 오토바이를 탐색하고 상품의 세부 사항을 확인 할 수 있습니다.

## 🚀 프로젝트 데모
- [게시판 데모 페이지](https://board.highground.kr/)

## 🔧 사용 기술 스택
Node.js, Express.js, MySQL, JavaScript

## 📌 주요 기능
- **회원 가입 및 로그인 기능**
- **게시글 작성 및 조회**
- **데이터베이스와의 상호작용**

## 설치 및 실행

### 사전 요구 사항
- **Node.js** (v14 이상)
- **npm** 또는 **yarn**

### 설치

1. 저장소를 클론합니다.
```
git clone https://github.com/TKSK2884/board-back.git
```

2. 의존성을 설치합니다.
```
npm install
# 또는
yarn install
```

3. .env 파일을 생성하고 다음 정보를 입력하세요
```
DB_SERVER_ADDR="localhost"
DB_USER="yourUser"
DB_PASSWORD="yourPassword"
DB="yourDB"
```
4. 백엔드 서버 실행
```
npm run start
# 또는
yarn start
```
5. API서버는 기본적으로 http://localhost:3000에서 실행됩니다.
