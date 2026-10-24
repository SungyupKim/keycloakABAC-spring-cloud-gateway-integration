import { useState } from 'react'
import { api, EvalResult, User } from '../api'
import { useAction, useLoad } from '../hooks'
import { useI18n } from '../i18n'
import { Err, Field } from './common'

export default function Simulator() {
  const { t } = useI18n()
  const { data: users } = useLoad(() => api.get<User[]>('/users'))
  const { error, run } = useAction()
  const [userId, setUserId] = useState('')
  const [uri, setUri] = useState('/callme/api')
  const [method, setMethod] = useState('GET')
  const [attrs, setAttrs] = useState('')
  const [result, setResult] = useState<EvalResult>()

  const evaluate = async () => {
    let attributes: Record<string, string[]> | undefined
    if (attrs.trim()) {
      try { attributes = JSON.parse(attrs) } catch { return alert(t('sim.jsonError')) }
    }
    await run(async () => setResult(await api.post<EvalResult>('/evaluate', { userId, uri, method, attributes })))
  }

  return (
    <section>
      <h2>{t('sim.title')}</h2>
      <p className="muted">{t('sim.desc')}</p>
      <div className="form">
        <Field label={t('sim.user')}>
          <select value={userId} onChange={e => setUserId(e.target.value)}>
            <option value="">{t('sim.select')}</option>
            {users?.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
          </select>
        </Field>
        <Field label={t('sim.uri')}><input value={uri} onChange={e => setUri(e.target.value)} /></Field>
        <Field label="Method">
          <select value={method} onChange={e => setMethod(e.target.value)}>
            {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => <option key={m}>{m}</option>)}
          </select>
        </Field>
        <Field label={t('sim.attrs')}>
          <textarea rows={2} value={attrs} onChange={e => setAttrs(e.target.value)} placeholder='{"ip": ["10.0.0.1"]}' />
        </Field>
        <div><button className="primary" disabled={!userId || !uri} onClick={evaluate}>{t('sim.evaluate')}</button></div>
      </div>
      <Err msg={error} />
      {result && (
        <div className="result">
          <h3>{t('sim.result')}</h3>
          {!result.matchedResources.length && <p className="muted">{t('sim.noMatch')}</p>}
          {result.results?.map((r, i) => (
            <div key={i} className="card">
              <strong>{r.resource.name}</strong>
              <span className={`badge ${r.status}`}>{r.status}</span>
              <ul>
                {r.policies?.map((p, j) => (
                  <li key={j}>{p.policy.name} <span className="muted">({p.policy.type})</span> → <span className={`badge ${p.status}`}>{p.status}</span></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
