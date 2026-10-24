import { useState } from 'react'
import { api, Policy, Role } from '../api'
import { useAction, useLoad } from '../hooks'
import { CheckGroup, confirmDelete, Err, Field } from './common'

type Kind = 'role' | 'regex' | 'time'
const KIND_LABEL: Record<Kind, string> = { role: 'Role', regex: '속성(클레임) 정규식 — ABAC', time: '시간대' }
const empty = { name: '', type: 'role' as Kind, logic: 'POSITIVE', roles: [] as string[], targetClaim: '', pattern: '', hour: '', hourEnd: '' }

function summary(p: Policy, roles: Role[]) {
  if (p.type === 'role') return (p.roles ?? []).map(r => roles.find(x => x.id === r.id)?.name ?? r.id).join(', ')
  if (p.type === 'regex') return `${p.targetClaim} =~ ${p.pattern}`
  if (p.type === 'time') return `${p.hour ?? '?'}시 ~ ${p.hourEnd ?? '?'}시`
  return ''
}

export default function Policies() {
  const { data, error, reload } = useLoad(() => api.get<Policy[]>('/policies'))
  const { data: roles } = useLoad(() => api.get<Role[]>('/roles'))
  const { error: actionError, run } = useAction()
  const [editing, setEditing] = useState<Policy>()
  const [form, setForm] = useState(empty)

  const edit = (p?: Policy) => {
    setEditing(p)
    setForm(p ? {
      name: p.name, type: p.type as Kind, logic: p.logic,
      roles: (p.roles ?? []).map(r => r.id),
      targetClaim: p.targetClaim ?? '', pattern: p.pattern ?? '', hour: p.hour ?? '', hourEnd: p.hourEnd ?? '',
    } : empty)
  }

  const save = async () => {
    const base = { name: form.name, type: form.type, logic: form.logic, decisionStrategy: 'UNANIMOUS' }
    const body =
      form.type === 'role' ? { ...base, roles: form.roles.map(id => ({ id, required: true })) }
      : form.type === 'regex' ? { ...base, targetClaim: form.targetClaim, pattern: form.pattern }
      : { ...base, hour: form.hour, hourEnd: form.hourEnd }
    const ok = await run(() => (editing
      ? api.put(`/policies/${form.type}/${editing.id}`, { ...editing, ...body })
      : api.post(`/policies/${form.type}`, body)))
    if (ok) { edit(undefined); reload() }
  }

  const remove = async (p: Policy) => {
    if (confirmDelete(p.name) && await run(() => api.del(`/policies/${p.id}`))) reload()
  }

  const valid = form.name && (
    form.type === 'role' ? form.roles.length > 0
    : form.type === 'regex' ? form.targetClaim && form.pattern
    : form.hour && form.hourEnd)

  return (
    <section>
      <h2>정책</h2>
      <p className="muted">속성 정규식 정책은 토큰 클레임(예: department, preferred_username)을 정규식으로 검사하는 ABAC 조건입니다.</p>
      <Err msg={error ?? actionError} />
      <table>
        <thead><tr><th>이름</th><th>유형</th><th>조건</th><th>Logic</th><th /></tr></thead>
        <tbody>
          {data?.map(p => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.type}</td>
              <td>{summary(p, roles ?? [])}</td>
              <td>{p.logic}</td>
              <td className="actions">
                {['role', 'regex', 'time'].includes(p.type) && <button onClick={() => edit(p)}>수정</button>}
                <button className="danger" onClick={() => remove(p)}>삭제</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>{editing ? `수정: ${editing.name}` : '새 정책'}</h3>
      <div className="form">
        <Field label="이름"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="유형">
          <select value={form.type} disabled={!!editing} onChange={e => setForm({ ...form, type: e.target.value as Kind })}>
            {(Object.keys(KIND_LABEL) as Kind[]).map(k => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
          </select>
        </Field>
        <Field label="Logic">
          <select value={form.logic} onChange={e => setForm({ ...form, logic: e.target.value })}>
            <option value="POSITIVE">POSITIVE (조건 충족 시 허용)</option>
            <option value="NEGATIVE">NEGATIVE (조건 충족 시 거부)</option>
          </select>
        </Field>
        {form.type === 'role' && (
          <Field label="Realm Role">
            <CheckGroup options={(roles ?? []).map(r => ({ value: r.id, label: r.name }))} value={form.roles} onChange={r => setForm({ ...form, roles: r })} />
          </Field>
        )}
        {form.type === 'regex' && (<>
          <Field label="대상 클레임"><input value={form.targetClaim} onChange={e => setForm({ ...form, targetClaim: e.target.value })} placeholder="department" /></Field>
          <Field label="패턴 (정규식)"><input value={form.pattern} onChange={e => setForm({ ...form, pattern: e.target.value })} placeholder="^(dev|ops)$" /></Field>
        </>)}
        {form.type === 'time' && (<>
          <Field label="시작 시각 (0-23)"><input type="number" min={0} max={23} value={form.hour} onChange={e => setForm({ ...form, hour: e.target.value })} /></Field>
          <Field label="종료 시각 (0-23)"><input type="number" min={0} max={23} value={form.hourEnd} onChange={e => setForm({ ...form, hourEnd: e.target.value })} /></Field>
        </>)}
        <div>
          <button className="primary" disabled={!valid} onClick={save}>{editing ? '저장' : '추가'}</button>
          {editing && <button onClick={() => edit(undefined)}>취소</button>}
        </div>
      </div>
    </section>
  )
}
