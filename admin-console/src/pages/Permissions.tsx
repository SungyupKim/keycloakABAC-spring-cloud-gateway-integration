import { useState } from 'react'
import { api, Permission, Policy, Resource } from '../api'
import { useAction, useLoad } from '../hooks'
import { useI18n } from '../i18n'
import PermissionForm from '../forms/PermissionForm'
import { confirmDelete, Err } from './common'

export default function Permissions() {
  const { t } = useI18n()
  const { data, error, reload } = useLoad(() => api.get<Permission[]>('/permissions'))
  const { data: resources } = useLoad(() => api.get<Resource[]>('/resources'))
  const { data: policies } = useLoad(() => api.get<Policy[]>('/policies'))
  const { error: actionError, run } = useAction()
  const [editing, setEditing] = useState<Permission>()

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
                <button onClick={() => setEditing(p)}>{t('edit')}</button>
                <button className="danger" onClick={() => remove(p)}>{t('delete')}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <PermissionForm key={editing?.id ?? 'new'} editing={editing} resources={resources ?? []} policies={policies ?? []}
        onSaved={() => { setEditing(undefined); reload() }} onCancel={editing ? () => setEditing(undefined) : undefined} />
    </section>
  )
}
