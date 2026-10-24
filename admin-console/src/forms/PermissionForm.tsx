import { useState } from 'react'
import { api, Permission, Policy, Resource } from '../api'
import { useAction } from '../hooks'
import { useI18n } from '../i18n'
import { CheckGroup, Err, Field } from '../pages/common'

interface Props {
  editing?: Permission
  resources: Resource[]
  policies: Policy[]
  onSaved: () => void
  onCancel?: () => void
}

export default function PermissionForm({ editing, resources, policies, onSaved, onCancel }: Props) {
  const { t } = useI18n()
  const { error, run } = useAction()
  const [form, setForm] = useState({
    name: editing?.name ?? '',
    decisionStrategy: editing?.decisionStrategy ?? 'UNANIMOUS',
    resources: (editing?.resources ?? []).map(r => (r as { _id?: string; id?: string })._id ?? r.id),
    policies: (editing?.policies ?? []).map(p => p.id),
  })

  const save = async () => {
    const body = { name: form.name, type: 'resource', logic: 'POSITIVE', decisionStrategy: form.decisionStrategy, resources: form.resources, policies: form.policies }
    const ok = await run(() => (editing ? api.put(`/permissions/${editing.id}`, { ...editing, ...body }) : api.post('/permissions', body)))
    if (ok) onSaved()
  }

  return (
    <>
      <h3>{editing ? t('editing', { name: editing.name }) : t('perm.new')}</h3>
      <Err msg={error} />
      <div className="form">
        <Field label={t('name')}><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label={t('perm.resources')}>
          <CheckGroup options={resources.map(r => ({ value: r._id, label: r.name }))} value={form.resources} onChange={v => setForm({ ...form, resources: v })} />
        </Field>
        <Field label={t('perm.policies')}>
          <CheckGroup options={policies.map(p => ({ value: p.id, label: `${p.name} (${p.type})` }))} value={form.policies} onChange={v => setForm({ ...form, policies: v })} />
        </Field>
        <Field label={t('perm.strategyField')}>
          <select value={form.decisionStrategy} onChange={e => setForm({ ...form, decisionStrategy: e.target.value })}>
            <option>UNANIMOUS</option><option>AFFIRMATIVE</option><option>CONSENSUS</option>
          </select>
        </Field>
        <div>
          <button className="primary" disabled={!form.name || !form.resources.length || !form.policies.length} onClick={save}>{editing ? t('save') : t('add')}</button>
          {onCancel && <button onClick={onCancel}>{t('cancel')}</button>}
        </div>
      </div>
    </>
  )
}
