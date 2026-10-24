import Keycloak from 'keycloak-js'

export const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL ?? 'http://localhost:8080/auth',
  realm: import.meta.env.VITE_KEYCLOAK_REALM ?? 'spring-boot-quickstart',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? 'admin-console',
})

let initPromise: Promise<boolean> | undefined

/** StrictMode 에서 두 번 호출되어도 init 은 한 번만 수행한다. */
export function initAuth(): Promise<boolean> {
  initPromise ??= keycloak.init({ onLoad: 'login-required', pkceMethod: 'S256' })
  return initPromise
}
