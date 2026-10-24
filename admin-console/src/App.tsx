import { useEffect, useState } from 'react'
import { initAuth, keycloak } from './auth'
import Resources from './pages/Resources'
import Policies from './pages/Policies'
import Permissions from './pages/Permissions'
import Simulator from './pages/Simulator'

const TABS = [
  { id: 'resources', label: 'API ↔ 리소스', view: <Resources /> },
  { id: 'policies', label: '정책', view: <Policies /> },
  { id: 'permissions', label: 'Permission', view: <Permissions /> },
  { id: 'simulator', label: '권한 시뮬레이터', view: <Simulator /> },
]

export default function App() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string>()
  const [tab, setTab] = useState(TABS[0].id)

  useEffect(() => {
    initAuth().then(() => setReady(true)).catch(e => setError(String(e)))
  }, [])

  if (error) return <div className="center error">인증 초기화 실패: {error}</div>
  if (!ready) return <div className="center">로그인 중…</div>

  return (
    <div className="app">
      <header>
        <h1>Authorization Admin Console</h1>
        <nav>
          {TABS.map(t => (
            <button key={t.id} className={t.id === tab ? 'active' : ''} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
        <div className="user">
          {keycloak.tokenParsed?.preferred_username}
          <button onClick={() => keycloak.logout({ redirectUri: window.location.origin })}>로그아웃</button>
        </div>
      </header>
      <main>{TABS.find(t => t.id === tab)!.view}</main>
    </div>
  )
}
