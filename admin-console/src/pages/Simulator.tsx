import { useState } from 'react'
import { api, EvalResult, User } from '../api'
import { useAction, useLoad } from '../hooks'
import { Err, Field } from './common'

export default function Simulator() {
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
      try { attributes = JSON.parse(attrs) } catch { return alert('추가 속성은 JSON 이어야 합니다. 예: {"ip": ["10.0.0.1"]}') }
    }
    await run(async () => setResult(await api.post<EvalResult>('/evaluate', { userId, uri, method, attributes })))
  }

  return (
    <section>
      <h2>권한 시뮬레이터</h2>
      <p className="muted">사용자와 요청(URI, Method)을 입력하면 Keycloak 정책 평가 결과를 미리 확인할 수 있습니다.</p>
      <div className="form">
        <Field label="사용자">
          <select value={userId} onChange={e => setUserId(e.target.value)}>
            <option value="">선택…</option>
            {users?.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
          </select>
        </Field>
        <Field label="요청 URI"><input value={uri} onChange={e => setUri(e.target.value)} /></Field>
        <Field label="Method">
          <select value={method} onChange={e => setMethod(e.target.value)}>
            {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => <option key={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="추가 컨텍스트 속성 (JSON, 선택)">
          <textarea rows={2} value={attrs} onChange={e => setAttrs(e.target.value)} placeholder='{"ip": ["10.0.0.1"]}' />
        </Field>
        <div><button className="primary" disabled={!userId || !uri} onClick={evaluate}>평가</button></div>
      </div>
      <Err msg={error} />
      {result && (
        <div className="result">
          <h3>결과</h3>
          {result.note && <p className="muted">{result.note}</p>}
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
