import { useState } from 'react'
import { api, Policy, Role } from '../api'
import { Key, translate, useI18n } from '../i18n'
import { useAction, useLoad } from '../hooks'
import { CheckGroup, confirmDelete, Err, Field } from './common'

type Kind = 'role' | 'regex' | 'time'
const KIND_LABEL: Record<Kind, Key> = { role: 'pol.kind.role', regex: 'pol.kind.regex', time: 'pol.kind.time' }
const empty = { name: '', type: 'role' as Kind, logic: 'POSITIVE', roles: [] as string[], targetClaim: '', pattern: '', hour: '', hourEnd: '' }

function summary(p: Policy, roles: Role[], t: typeof translate) {
  if (p.type === 'role') return (p.roles ?? []).map(r => roles.find(x => x.id === r.id)?.name ?? r.id).join(', ')
  if (p.type === 'regex') return `${p.targetClaim} =~ ${p.pattern}`
  if (p.type === 'time') return t('pol.hourRange', { from: p.hour ?? '?', to: p.hourEnd ?? '?' })
  return ''
}

export default function Policies() {
  const { t } = useI18n()
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
      <h2>{t('pol.title')}</h2>
      <p className="muted">{t('pol.desc')}</p>
      <Err msg={error ?? actionError} />
      <table>
        <thead><tr><th>{t('name')}</th><th>{t('type')}</th><th>{t('pol.condition')}</th><th>{t('pol.logic')}</th><th /></tr></thead>
        <tbody>
          {data?.map(p => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.type}</td>
              <td>{summary(p, roles ?? [], t)}</td>
              <td>{p.logic}</td>
              <td className="actions">
                {['role', 'regex', 'time'].includes(p.type) && <button onClick={() => edit(p)}>{t('edit')}</button>}
                <button className="danger" onClick={() => remove(p)}>{t('delete')}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>{editing ? t('editing', { name: editing.name }) : t('pol.new')}</h3>
      <div className="form">
        <Field label={t('name')}><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label={t('type')}>
          <select value={form.type} disabled={!!editing} onChange={e => setForm({ ...form, type: e.target.value as Kind })}>
            {(Object.keys(KIND_LABEL) as Kind[]).map(k => <option key={k} value={k}>{t(KIND_LABEL[k])}</option>)}
          </select>
        </Field>
        <Field label={t('pol.logic')}>
          <select value={form.logic} onChange={e => setForm({ ...form, logic: e.target.value })}>
            <option value="POSITIVE">{t('pol.positive')}</option>
            <option value="NEGATIVE">{t('pol.negative')}</option>
          </select>
        </Field>
        {form.type === 'role' && (
          <Field label={t('pol.realmRoles')}>
            <CheckGroup options={(roles ?? []).map(r => ({ value: r.id, label: r.name }))} value={form.roles} onChange={r => setForm({ ...form, roles: r })} />
          </Field>
        )}
        {form.type === 'regex' && (<>
          <Field label={t('pol.claim')}><input value={form.targetClaim} onChange={e => setForm({ ...form, targetClaim: e.target.value })} placeholder="department" /></Field>
          <Field label={t('pol.pattern')}><input value={form.pattern} onChange={e => setForm({ ...form, pattern: e.target.value })} placeholder="^(dev|ops)$" /></Field>
        </>)}
        {form.type === 'time' && (<>
          <Field label={t('pol.hourStart')}><input type="number" min={0} max={23} value={form.hour} onChange={e => setForm({ ...form, hour: e.target.value })} /></Field>
          <Field label={t('pol.hourEnd')}><input type="number" min={0} max={23} value={form.hourEnd} onChange={e => setForm({ ...form, hourEnd: e.target.value })} /></Field>
        </>)}
        <div>
          <button className="primary" disabled={!valid} onClick={save}>{editing ? t('save') : t('add')}</button>
          {editing && <button onClick={() => edit(undefined)}>{t('cancel')}</button>}
        </div>
      </div>
    </section>
  )
}
