import { useState } from 'react'
import { api, Resource } from '../api'
import { useAction, useLoad } from '../hooks'
import { useI18n } from '../i18n'
import ResourceForm from '../forms/ResourceForm'
import { confirmDelete, Err } from './common'

export default function Resources() {
  const { t } = useI18n()
  const { data, error, reload } = useLoad(() => api.get<Resource[]>('/resources'))
  const { error: actionError, run } = useAction()
  const [editing, setEditing] = useState<Resource>()

  const remove = async (r: Resource) => {
    if (confirmDelete(r.name) && await run(() => api.del(`/resources/${r._id}`))) reload()
  }

  return (
    <section>
      <h2>{t('res.title')}</h2>
      <p className="muted">{t('res.desc')}</p>
      <Err msg={error ?? actionError} />
      <table>
        <thead><tr><th>{t('name')}</th><th>{t('type')}</th><th>{t('res.uris')}</th><th>{t('res.scopes')}</th><th /></tr></thead>
        <tbody>
          {data?.map(r => (
            <tr key={r._id}>
              <td>{r.name}</td>
              <td>{r.type}</td>
              <td>{r.uris?.map(u => <code key={u}>{u}</code>)}</td>
              <td>{r.scopes?.map(s => s.name).join(', ')}</td>
              <td className="actions">
                <button onClick={() => setEditing(r)}>{t('edit')}</button>
                <button className="danger" onClick={() => remove(r)}>{t('delete')}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ResourceForm key={editing?._id ?? 'new'} editing={editing} onSaved={() => { setEditing(undefined); reload() }} onCancel={editing ? () => setEditing(undefined) : undefined} />
    </section>
  )
}
