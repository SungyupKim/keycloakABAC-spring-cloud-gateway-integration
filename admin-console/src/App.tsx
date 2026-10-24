import { useEffect, useState } from 'react'
import { initAuth, keycloak } from './auth'
import Resources from './pages/Resources'
import Policies from './pages/Policies'
import Permissions from './pages/Permissions'
import Flow from './pages/Flow'
import Simulator from './pages/Simulator'
import { Key, LANGS, Lang, useI18n } from './i18n'

const TABS: { id: string; label: Key; view: JSX.Element }[] = [
  { id: 'flow', label: 'tab.flow', view: <Flow /> },
  { id: 'resources', label: 'tab.resources', view: <Resources /> },
  { id: 'policies', label: 'tab.policies', view: <Policies /> },
  { id: 'permissions', label: 'tab.permissions', view: <Permissions /> },
  { id: 'simulator', label: 'tab.simulator', view: <Simulator /> },
]

export default function App() {
  const { t, lang, setLang } = useI18n()
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string>()
  const [tab, setTab] = useState(TABS[0].id)

  useEffect(() => {
    initAuth().then(() => setReady(true)).catch(e => setError(String(e)))
  }, [])

  if (error) return <div className="center error">{t('authFailed')}{error}</div>
  if (!ready) return <div className="center">{t('loading')}</div>

  return (
    <div className="app">
      <header>
        <h1>Keycloak Gateway Policy Console</h1>
        <nav>
          {TABS.map(tab_ => (
            <button key={tab_.id} className={tab_.id === tab ? 'active' : ''} onClick={() => setTab(tab_.id)}>
              {t(tab_.label)}
            </button>
          ))}
        </nav>
        <div className="user">
          <select aria-label={t('language')} value={lang} onChange={e => setLang(e.target.value as Lang)}>
            {(Object.keys(LANGS) as Lang[]).map(l => <option key={l} value={l}>{LANGS[l]}</option>)}
          </select>
          {keycloak.tokenParsed?.preferred_username}
          <button onClick={() => keycloak.logout({ redirectUri: window.location.origin })}>{t('logout')}</button>
        </div>
      </header>
      <main>{TABS.find(x => x.id === tab)!.view}</main>
    </div>
  )
}
