import { useState } from 'react'
import { api, Policy, Role } from '../api'
import { useAction, useLoad } from '../hooks'
import { translate, useI18n } from '../i18n'
import PolicyForm, { EDITABLE_KINDS } from '../forms/PolicyForm'
import { confirmDelete, Err } from './common'

export function summary(p: Policy, roles: Role[], t: typeof translate) {
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

  const remove = async (p: Policy) => {
    if (confirmDelete(p.name) && await run(() => api.del(`/policies/${p.id}`))) reload()
  }

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
                {EDITABLE_KINDS.includes(p.type) && <button onClick={() => setEditing(p)}>{t('edit')}</button>}
                <button className="danger" onClick={() => remove(p)}>{t('delete')}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <PolicyForm key={editing?.id ?? 'new'} editing={editing} roles={roles ?? []} onSaved={() => { setEditing(undefined); reload() }} onCancel={editing ? () => setEditing(undefined) : undefined} />
    </section>
  )
}
