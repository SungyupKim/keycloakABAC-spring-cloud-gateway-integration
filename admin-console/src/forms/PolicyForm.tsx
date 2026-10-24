import { useState } from 'react'
import { api, Policy, Role } from '../api'
import { useAction } from '../hooks'
import { Key, useI18n } from '../i18n'
import { CheckGroup, Err, Field } from '../pages/common'

export type Kind = 'role' | 'regex' | 'time'
export const EDITABLE_KINDS: string[] = ['role', 'regex', 'time']
const KIND_LABEL: Record<Kind, Key> = { role: 'pol.kind.role', regex: 'pol.kind.regex', time: 'pol.kind.time' }

interface Props { editing?: Policy; roles: Role[]; onSaved: () => void; onCancel?: () => void }

export default function PolicyForm({ editing, roles, onSaved, onCancel }: Props) {
  const { t } = useI18n()
  const { error, run } = useAction()
  const [form, setForm] = useState({
    name: editing?.name ?? '',
    type: (editing?.type ?? 'role') as Kind,
    logic: editing?.logic ?? 'POSITIVE',
    roles: (editing?.roles ?? []).map(r => r.id),
    targetClaim: editing?.targetClaim ?? '',
    pattern: editing?.pattern ?? '',
    hour: editing?.hour ?? '',
    hourEnd: editing?.hourEnd ?? '',
  })

  const save = async () => {
    const base = { name: form.name, type: form.type, logic: form.logic, decisionStrategy: 'UNANIMOUS' }
    const body =
      form.type === 'role' ? { ...base, roles: form.roles.map(id => ({ id, required: true })) }
      : form.type === 'regex' ? { ...base, targetClaim: form.targetClaim, pattern: form.pattern }
      : { ...base, hour: form.hour, hourEnd: form.hourEnd }
    const ok = await run(() => (editing
      ? api.put(`/policies/${form.type}/${editing.id}`, { ...editing, ...body })
      : api.post(`/policies/${form.type}`, body)))
    if (ok) onSaved()
  }

  const valid = form.name && (
    form.type === 'role' ? form.roles.length > 0
    : form.type === 'regex' ? form.targetClaim && form.pattern
    : form.hour && form.hourEnd)

  return (
    <>
      <h3>{editing ? t('editing', { name: editing.name }) : t('pol.new')}</h3>
      <Err msg={error} />
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
            <CheckGroup options={roles.map(r => ({ value: r.id, label: r.name }))} value={form.roles} onChange={r => setForm({ ...form, roles: r })} />
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
          {onCancel && <button onClick={onCancel}>{t('cancel')}</button>}
        </div>
      </div>
    </>
  )
}
