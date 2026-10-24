import { useState } from 'react'
import { api, Resource } from '../api'
import { useAction, useLoad } from '../hooks'
import { useI18n } from '../i18n'
import { CheckGroup, confirmDelete, Err, Field } from './common'

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
const empty = { name: '', type: '', uris: '', scopes: ['GET'] as string[] }

export default function Resources() {
  const { t } = useI18n()
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
                <button onClick={() => edit(r)}>{t('edit')}</button>
                <button className="danger" onClick={() => remove(r)}>{t('delete')}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>{editing ? t('editing', { name: editing.name }) : t('res.new')}</h3>
      <div className="form">
        <Field label={t('name')}><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label={t('res.typeOpt')}><input value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} placeholder="urn:..." /></Field>
        <Field label={t('res.urisField')}>
          <textarea rows={3} value={form.uris} onChange={e => setForm({ ...form, uris: e.target.value })} placeholder="/callme/*" />
        </Field>
        <Field label={t('res.scopes')}>
          <CheckGroup options={METHODS.map(m => ({ value: m, label: m }))} value={form.scopes} onChange={scopes => setForm({ ...form, scopes })} />
        </Field>
        <div>
          <button className="primary" disabled={!form.name} onClick={save}>{editing ? t('save') : t('add')}</button>
          {editing && <button onClick={() => edit(undefined)}>{t('cancel')}</button>}
        </div>
      </div>
    </section>
  )
}
