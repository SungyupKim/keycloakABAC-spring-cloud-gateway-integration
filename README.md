# keycloak-gateway-policy-console

**English** | [한국어](README.ko.md)

> Visual admin console for managing Keycloak Authorization Services policies on Spring Cloud Gateway.

Map your gateway APIs to Keycloak resources, permissions and ABAC policies in a flow editor, and simulate access decisions before they go live — no need to touch the Keycloak console.

- **Flow editor** — create, link and edit resources → permissions → policies on one graph
- **Policy types** — role, token-claim regex (ABAC) and time-of-day policies
- **Policy simulator** — preview allow/deny per policy for a user + URI + method
- **Reference gateway** — includes a Spring Cloud Gateway sample (OAuth2 login + Keycloak authorization filter) and a backend to try it end to end

## Architecture

```
Browser ──► gateway (:8060) ──► callme (:8040)
               │  ▲
               │  └─ OAuth2 login (authorization_code)
               ▼
          Keycloak (:8080/auth)
          realm: spring-boot-quickstart
          client: spring-cloud-gateway
```

Request flow:

1. Unauthenticated users are redirected to the Keycloak login page (`SecurityConfig`).
2. After login, the `TokenRelay` filter forwards the user's access token to the backend request.
3. `KeycloakFilterFactory` looks up the resources matching the request URI using the client credentials (`protection()`), then asks Keycloak to evaluate permissions (`authorize`) with the user's token.
4. The filter chain continues regardless of the result, so behavior on denial depends on how the `authorize` exception is handled (`ScgExceptionHandler`).

## Modules

| Module | Port | Description |
|--------|------|-------------|
| `gateway` | 8060 | Spring Cloud Gateway: OAuth2 login, routing, Keycloak authorization filter |
| `callme` | 8040 | Sample backend serving `/callme/api` and `/other/api` |
| `admin-api` | 8070 | Backend for the admin console; proxies Keycloak Authorization Services (resources / policies / permissions / evaluation) |
| `admin-console` | 5173 | React + Vite + TypeScript admin console (API↔resource mapping, policies, permissions, simulator) |
| `infra` | 8080 | Local Keycloak (docker-compose) and realm configuration |

Tech stack: Java 8, Spring Boot 2.3.4, Spring Cloud Hoxton.SR8, Keycloak 26.0 (context path `/auth`)

## Prerequisites

- JDK 8 or later
- Maven
- Docker / Docker Compose
- Node.js (for the admin console)

## Getting started

### 1. Start Keycloak

```bash
cd infra
docker compose up -d
```

On startup, `infra/realm/spring-boot-quickstart-realm.json` is imported automatically
(clients, resources, role policies, and test users).

- Keycloak admin console: http://localhost:8080/auth (`admin` / `admin`)

> To re-import the realm after changing it, delete the volume with `docker compose down -v` and start again.

### 2. Build and run

```bash
# from the project root
mvn clean package

# in separate terminals
java -jar callme/target/callme-2.3.4.RELEASE.jar
java -jar gateway/target/gateway-2.3.4.RELEASE.jar
```

### 3. Verify

Open either URL in a browser; you will be redirected to the Keycloak login page.

- http://localhost:8060/callme/api
- http://localhost:8060/other/api

## Admin console

A UI for managing API paths and authorization policies without opening the Keycloak console.

| Screen | Features |
|--------|----------|
| Flow | Do everything on one graph: create / edit / delete resources, permissions and policies (click a node or use the `+ New` buttons), drag to link resource → permission → policy, select a line and press Delete to unlink |
| API ↔ Resources | Create / edit / delete Keycloak resources from URI patterns and scopes (HTTP methods) |
| Policies | CRUD for role policies, token-claim regex policies (ABAC), and time-of-day policies |
| Permissions | Link resources to policies and set the decision strategy |
| Policy Simulator | Preview the allow/deny result, per policy, for a user + URI + method |

```bash
# backend (8070)
java -jar admin-api/target/admin-api-2.3.4.RELEASE.jar

# frontend (5173)
cd admin-console
npm install
npm run dev
```

The UI defaults to English; use the dropdown in the top-right corner to switch to Korean (the choice is stored in the browser).

Open http://localhost:5173 and sign in as a user with the `admin` role (`admin1` / `admin1`).
`admin-console` (public client, PKCE) handles the login. `admin-api` checks the `admin` role in the JWT and then calls the Keycloak Admin API with its own service account (`admin-api` client with `realm-management` roles), so no client secret is exposed to the browser.

> The `admin-console` and `admin-api` clients were added to `infra/realm`. If you have already started Keycloak, re-import the realm with `docker compose down -v && docker compose up -d`.

## Test users and permissions

| User | Password | Realm roles |
|------|----------|-------------|
| `user1` | `user1` | `user` |
| `admin1` | `admin1` | `user`, `admin` |

Access policy per resource:

| Resource | URI | Allowed role | Permission |
|----------|-----|--------------|------------|
| `callme-resource` | `/callme/*` | `user` | `callme-permission` |
| `other-resource` | `/other/*` | `admin` | `other-permission` |

So `user1` should only be able to access `/callme/**`, while `admin1` can access both paths.

## Key configuration

- `gateway/src/main/resources/application.yml` — OAuth2 client registration, Keycloak endpoints (`authorization-uri`, `token-uri`, `jwk-set-uri`, ...), port
- `gateway/src/main/resources/keycloak.json` — realm / client / secret used by `AuthzClient`
- `gateway/.../config/RouteConfig.java` — route definitions (`/callme/**`, `/other/**` → `127.0.0.1:8040`)
- `gateway/.../config/SecurityConfig.java` — all requests require authentication, `oauth2Login`
- `gateway/.../filters/KeycloakFilterFactory.java` — Keycloak authorization filter
- `infra/realm/spring-boot-quickstart-realm.json` — realm, clients, resources, policies, and users

## Notes

- The client secrets and the admin/test accounts are for **local development only**. Replace them in production and move them to external configuration (environment variables, a secret store).
- The DEBUG/TRACE logging in `application.yml` and the header/token logging in the filter are for development convenience and should be removed in production.
- Since Keycloak 17 the default context path changed from `/auth` to `/`; this project keeps the old path with `--http-relative-path=/auth`.
