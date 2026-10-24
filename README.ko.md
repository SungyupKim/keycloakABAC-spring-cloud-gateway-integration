# keycloak-gateway-policy-console

[English](README.md) | **한국어**

> Spring Cloud Gateway 환경에서 Keycloak 인가(Authorization Services) 정책을 시각적으로 관리하는 관리 콘솔

게이트웨이의 API를 Keycloak 리소스·Permission·ABAC 정책에 Flow 에디터로 매핑하고, 적용 전에 권한 평가 결과를 시뮬레이션합니다. Keycloak 콘솔을 직접 만질 필요가 없습니다.

- **Flow 에디터** — 리소스 → Permission → 정책을 한 그래프에서 생성·연결·수정
- **정책 유형** — Role, 토큰 클레임 정규식(ABAC), 시간대 정책
- **권한 시뮬레이터** — 사용자 + URI + Method 기준으로 정책별 허용/거부 미리보기
- **참조 게이트웨이** — OAuth2 로그인과 Keycloak 인가 필터를 갖춘 Spring Cloud Gateway 샘플과 백엔드를 포함해 처음부터 끝까지 시험 가능

## 아키텍처

```
Browser ──► gateway (:8060) ──► callme (:8040)
               │  ▲
               │  └─ OAuth2 로그인 (authorization_code)
               ▼
          Keycloak (:8080/auth)
          realm: spring-boot-quickstart
          client: spring-cloud-gateway
```

요청 처리 흐름:

1. 미인증 사용자는 Keycloak 로그인 페이지로 리다이렉트됩니다 (`SecurityConfig`).
2. 인증 후 `TokenRelay` 필터가 사용자 액세스 토큰을 백엔드 요청에 실어 보냅니다.
3. `KeycloakFilterFactory`가 클라이언트 자격증명(`protection()`)으로 요청 URI에 매칭되는 리소스를 조회하고, 사용자 토큰으로 Keycloak에 권한 평가(`authorize`)를 요청합니다.
4. 결과와 무관하게 필터 체인은 이어서 진행되므로, 거부 시 동작은 `authorize` 예외 처리(`ScgExceptionHandler`)에 따릅니다.

## 구성

| 모듈 | 포트 | 설명 |
|------|------|------|
| `gateway` | 8060 | Spring Cloud Gateway. OAuth2 로그인, 라우팅, Keycloak 인가 필터 |
| `callme` | 8040 | 백엔드 샘플. `/callme/api`, `/other/api` 제공 |
| `admin-api` | 8070 | 관리 콘솔용 백엔드. Keycloak Authorization Services(리소스/정책/Permission/평가)를 프록시 |
| `admin-console` | 5173 | React + Vite + TypeScript 관리 콘솔 (API↔리소스 매핑, 정책, Permission, 시뮬레이터) |
| `infra` | 8080 | 로컬 Keycloak(docker-compose) 및 realm 설정 |

기술 스택: Java 8, Spring Boot 2.3.4, Spring Cloud Hoxton.SR8, Keycloak 26.0 (context path `/auth`)

## 사전 준비

- JDK 8 이상
- Maven
- Docker / Docker Compose

## 실행 방법

### 1. Keycloak 기동

```bash
cd infra
docker compose up -d
```

기동 시 `infra/realm/spring-boot-quickstart-realm.json`이 자동 import 됩니다
(client, 리소스, role 정책, 테스트 사용자 포함).

- 관리 콘솔: http://localhost:8080/auth (`admin` / `admin`)

> 설정을 바꿔 realm을 다시 import 하려면 `docker compose down -v`로 볼륨을 삭제한 뒤 재기동하세요.

### 2. 빌드 및 실행

```bash
# 프로젝트 루트에서
mvn clean package

# 각각 별도 터미널에서
java -jar callme/target/callme-2.3.4.RELEASE.jar
java -jar gateway/target/gateway-2.3.4.RELEASE.jar
```

### 3. 확인

브라우저에서 아래 URL에 접속하면 Keycloak 로그인 화면으로 이동합니다.

- http://localhost:8060/callme/api
- http://localhost:8060/other/api

## 관리 콘솔 (Admin Console)

Keycloak 콘솔에 들어가지 않고도 API 경로와 권한 정책을 관리하는 UI입니다.

| 화면 | 기능 |
|------|------|
| Flow | 한 화면에서 리소스/Permission/정책 생성·수정·삭제(노드 클릭 또는 `+ New` 버튼), 리소스 → Permission → 정책 드래그 연결, 선 선택 후 Delete로 해제 |
| API ↔ 리소스 | URI 패턴과 scope(HTTP method)를 Keycloak 리소스로 등록/수정/삭제 |
| 정책 | Role 정책, 토큰 클레임 정규식 정책(ABAC), 시간대 정책 CRUD |
| Permission | 리소스와 정책을 연결, decision strategy 지정 |
| 권한 시뮬레이터 | 사용자 + URI + Method로 허용/거부와 정책별 결과를 미리 확인 |

```bash
# 백엔드 (8070)
java -jar admin-api/target/admin-api-2.3.4.RELEASE.jar

# 프론트엔드 (5173)
cd admin-console
npm install
npm run dev
```

UI 언어는 영어가 기본이며 우측 상단 드롭다운에서 한국어로 전환할 수 있습니다(선택은 브라우저에 저장됩니다).

http://localhost:5173 접속 후 `admin` role을 가진 사용자(`admin1` / `admin1`)로 로그인합니다.
`admin-console`(public, PKCE)이 로그인하고, `admin-api`는 JWT의 `admin` role을 검사한 뒤 자신의 서비스 계정(`admin-api` client, `realm-management` 권한)으로 Keycloak Admin API를 호출합니다. client secret이 브라우저에 노출되지 않습니다.

> `infra/realm`에 `admin-console`, `admin-api` client가 추가되었습니다. 이미 Keycloak을 띄운 적이 있다면 `docker compose down -v && docker compose up -d`로 realm을 다시 import 하세요.

## 테스트 사용자 및 권한

| 사용자 | 비밀번호 | Realm Role |
|--------|----------|------------|
| `user1` | `user1` | `user` |
| `admin1` | `admin1` | `user`, `admin` |

리소스별 접근 정책:

| 리소스 | URI | 허용 Role | Permission |
|--------|-----|-----------|------------|
| `callme-resource` | `/callme/*` | `user` | `callme-permission` |
| `other-resource` | `/other/*` | `admin` | `other-permission` |

따라서 `user1`은 `/callme/**`만, `admin1`은 두 경로 모두 접근할 수 있어야 합니다.

## 주요 설정

- `gateway/src/main/resources/application.yml` — OAuth2 client 등록, Keycloak endpoint(`authorization-uri`, `token-uri`, `jwk-set-uri` 등), 포트
- `gateway/src/main/resources/keycloak.json` — `AuthzClient`가 사용하는 realm / client / secret
- `gateway/.../config/RouteConfig.java` — 라우트 정의 (`/callme/**`, `/other/**` → `127.0.0.1:8040`)
- `gateway/.../config/SecurityConfig.java` — 전체 요청 인증 필수, `oauth2Login`
- `gateway/.../filters/KeycloakFilterFactory.java` — Keycloak 인가 평가 필터
- `infra/realm/spring-boot-quickstart-realm.json` — realm, client, 리소스, 정책, 사용자 정의

## 주의사항

- client secret, 관리자/테스트 계정은 **로컬 개발 전용** 값입니다. 운영 환경에서는 반드시 교체하고 외부 설정(환경변수, 시크릿 저장소)으로 분리하세요.
- `application.yml`의 DEBUG/TRACE 로그와 필터의 헤더/토큰 로깅은 개발 편의를 위한 것이므로 운영에서는 제거해야 합니다.
- Keycloak 17+ 부터 기본 context path가 `/auth`에서 `/`로 바뀌어, 이 프로젝트는 `--http-relative-path=/auth`로 기존 경로를 유지합니다.
