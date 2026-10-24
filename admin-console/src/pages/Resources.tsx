import { useState } from 'react'
import { api, Resource } from '../api'
import { useAction, useLoad } from '../hooks'
import { CheckGroup, confirmDelete, Err, Field } from './common'

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
const empty = { name: '', type: '', uris: '', scopes: ['GET'] as string[] }

export default function Resources() {
  const { data, error, reload } = useLoad(() => api.get<Resource[]>('/resources'))
  const { error: actionError, run } = useAction()
  const [editing, setEditing] = useState<Resource>()
  const [form, setForm] = useState(empty)

  const edit = (r?: Resource) => {
    setEditing(r)
    setForm(r ? { name: r.name, type: r.type ?? '', uris: (r.uris ?? []).join('\n'), scopes: (r.scopes ?? []).map(s => s.name) } : empty)
  }

  const save = async () => {
    const body = {
      name: form.name,
      type: form.type || undefined,
      uris: form.uris.split('\n').map(s => s.trim()).filter(Boolean),
      scopes: form.scopes.map(name => ({ name })),
    }
    const ok = await run(() => (editing ? api.put(`/resources/${editing._id}`, { ...editing, ...body }) : api.post('/resources', body)))
    if (ok) { edit(undefined); reload() }
  }

  const remove = async (r: Resource) => {
    if (confirmDelete(r.name) && await run(() => api.del(`/resources/${r._id}`))) reload()
  }

  return (
    <section>
      <h2>API ↔ 리소스 매핑</h2>
      <p className="muted">게이트웨이는 요청 URI 에 매칭되는 리소스를 찾아 연결된 permission 으로 권한을 평가합니다. scope 는 HTTP method 입니다.</p>
      <Err msg={error ?? actionError} />
      <table>
        <thead><tr><th>이름</th><th>타입</th><th>URI 패턴</th><th>Scope(Method)</th><th /></tr></thead>
        <tbody>
          {data?.map(r => (
            <tr key={r._id}>
              <td>{r.name}</td>
              <td>{r.type}</td>
              <td>{r.uris?.map(u => <code key={u}>{u}</code>)}</td>
              <td>{r.scopes?.map(s => s.name).join(', ')}</td>
              <td className="actions">
                <button onClick={() => edit(r)}>수정</button>
                <button className="danger" onClick={() => remove(r)}>삭제</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>{editing ? `수정: ${editing.name}` : '새 리소스'}</h3>
      <div className="form">
        <Field label="이름"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="타입 (선택)"><input value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} placeholder="urn:..." /></Field>
        <Field label="URI 패턴 (한 줄에 하나)">
          <textarea rows={3} value={form.uris} onChange={e => setForm({ ...form, uris: e.target.value })} placeholder="/callme/*" />
        </Field>
        <Field label="Scope (Method)">
          <CheckGroup options={METHODS.map(m => ({ value: m, label: m }))} value={form.scopes} onChange={scopes => setForm({ ...form, scopes })} />
        </Field>
        <div>
          <button className="primary" disabled={!form.name} onClick={save}>{editing ? '저장' : '추가'}</button>
          {editing && <button onClick={() => edit(undefined)}>취소</button>}
        </div>
      </div>
    </section>
  )
}
