import { useState } from 'react'
import { api, Permission, Policy, Resource } from '../api'
import { useAction, useLoad } from '../hooks'
import { useI18n } from '../i18n'
import { CheckGroup, confirmDelete, Err, Field } from './common'

const empty = { name: '', resources: [] as string[], policies: [] as string[], decisionStrategy: 'UNANIMOUS' }

export default function Permissions() {
  const { t } = useI18n()
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
      <h2>{t('perm.title')}</h2>
      <p className="muted">{t('perm.desc')}</p>
      <Err msg={error ?? actionError} />
      <table>
        <thead><tr><th>{t('name')}</th><th>{t('perm.resources')}</th><th>{t('perm.policies')}</th><th>{t('perm.strategy')}</th><th /></tr></thead>
        <tbody>
          {data?.map(p => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.resources.map(r => r.name).join(', ')}</td>
              <td>{p.policies.map(x => x.name).join(', ')}</td>
              <td>{p.decisionStrategy}</td>
              <td className="actions">
                <button onClick={() => edit(p)}>{t('edit')}</button>
                <button className="danger" onClick={() => remove(p)}>{t('delete')}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>{editing ? t('editing', { name: editing.name }) : t('perm.new')}</h3>
      <div className="form">
        <Field label={t('name')}><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label={t('perm.resources')}>
          <CheckGroup options={(resources ?? []).map(r => ({ value: r._id, label: r.name }))} value={form.resources} onChange={v => setForm({ ...form, resources: v })} />
        </Field>
        <Field label={t('perm.policies')}>
          <CheckGroup options={(policies ?? []).map(p => ({ value: p.id, label: `${p.name} (${p.type})` }))} value={form.policies} onChange={v => setForm({ ...form, policies: v })} />
        </Field>
        <Field label={t('perm.strategyField')}>
          <select value={form.decisionStrategy} onChange={e => setForm({ ...form, decisionStrategy: e.target.value })}>
            <option>UNANIMOUS</option><option>AFFIRMATIVE</option><option>CONSENSUS</option>
          </select>
        </Field>
        <div>
          <button className="primary" disabled={!form.name || !form.resources.length || !form.policies.length} onClick={save}>{editing ? t('save') : t('add')}</button>
          {editing && <button onClick={() => edit(undefined)}>{t('cancel')}</button>}
        </div>
      </div>
    </section>
  )
}
