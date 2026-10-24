import { useState } from 'react'
import { api, Permission, Policy, Resource } from '../api'
import { useAction, useLoad } from '../hooks'
import { CheckGroup, confirmDelete, Err, Field } from './common'

const empty = { name: '', resources: [] as string[], policies: [] as string[], decisionStrategy: 'UNANIMOUS' }

export default function Permissions() {
  const { data, error, reload } = useLoad(() => api.get<Permission[]>('/permissions'))
  const { data: resources } = useLoad(() => api.get<Resource[]>('/resources'))
  const { data: policies } = useLoad(() => api.get<Policy[]>('/policies'))
  const { error: actionError, run } = useAction()
  const [editing, setEditing] = useState<Permission>()
  const [form, setForm] = useState(empty)

  const edit = (p?: Permission) => {
    setEditing(p)
    setForm(p ? {
      name: p.name, decisionStrategy: p.decisionStrategy,
      resources: p.resources.map(r => (r as { _id?: string; id?: string })._id ?? r.id),
      policies: p.policies.map(x => x.id),
    } : empty)
  }

  const save = async () => {
    const body = { name: form.name, type: 'resource', logic: 'POSITIVE', decisionStrategy: form.decisionStrategy, resources: form.resources, policies: form.policies }
    const ok = await run(() => (editing ? api.put(`/permissions/${editing.id}`, { ...editing, ...body }) : api.post('/permissions', body)))
    if (ok) { edit(undefined); reload() }
  }

  const remove = async (p: Permission) => {
    if (confirmDelete(p.name) && await run(() => api.del(`/permissions/${p.id}`))) reload()
  }

  return (
    <section>
      <h2>Permission</h2>
      <p className="muted">리소스에 접근하기 위해 충족해야 하는 정책을 연결합니다. UNANIMOUS 는 모든 정책 통과, AFFIRMATIVE 는 하나만 통과하면 허용입니다.</p>
      <Err msg={error ?? actionError} />
      <table>
        <thead><tr><th>이름</th><th>리소스</th><th>정책</th><th>전략</th><th /></tr></thead>
        <tbody>
          {data?.map(p => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.resources.map(r => r.name).join(', ')}</td>
              <td>{p.policies.map(x => x.name).join(', ')}</td>
              <td>{p.decisionStrategy}</td>
              <td className="actions">
                <button onClick={() => edit(p)}>수정</button>
                <button className="danger" onClick={() => remove(p)}>삭제</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>{editing ? `수정: ${editing.name}` : '새 Permission'}</h3>
      <div className="form">
        <Field label="이름"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="리소스">
          <CheckGroup options={(resources ?? []).map(r => ({ value: r._id, label: r.name }))} value={form.resources} onChange={v => setForm({ ...form, resources: v })} />
        </Field>
        <Field label="정책">
          <CheckGroup options={(policies ?? []).map(p => ({ value: p.id, label: `${p.name} (${p.type})` }))} value={form.policies} onChange={v => setForm({ ...form, policies: v })} />
        </Field>
        <Field label="Decision strategy">
          <select value={form.decisionStrategy} onChange={e => setForm({ ...form, decisionStrategy: e.target.value })}>
            <option>UNANIMOUS</option><option>AFFIRMATIVE</option><option>CONSENSUS</option>
          </select>
        </Field>
        <div>
          <button className="primary" disabled={!form.name || !form.resources.length || !form.policies.length} onClick={save}>{editing ? '저장' : '추가'}</button>
          {editing && <button onClick={() => edit(undefined)}>취소</button>}
        </div>
      </div>
    </section>
  )
}
