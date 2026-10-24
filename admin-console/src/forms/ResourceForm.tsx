import { useState } from 'react'
import { api, Resource } from '../api'
import { useAction } from '../hooks'
import { useI18n } from '../i18n'
import { CheckGroup, Err, Field } from '../pages/common'

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

interface Props { editing?: Resource; onSaved: () => void; onCancel?: () => void }

export default function ResourceForm({ editing, onSaved, onCancel }: Props) {
  const { t } = useI18n()
  const { error, run } = useAction()
  const [form, setForm] = useState({
    name: editing?.name ?? '',
    type: editing?.type ?? '',
    uris: (editing?.uris ?? []).join('\n'),
    scopes: editing ? (editing.scopes ?? []).map(s => s.name) : ['GET'],
  })

  const save = async () => {
    const body = {
      name: form.name,
      type: form.type || undefined,
      uris: form.uris.split('\n').map(s => s.trim()).filter(Boolean),
      scopes: form.scopes.map(name => ({ name })),
    }
    const ok = await run(() => (editing ? api.put(`/resources/${editing._id}`, { ...editing, ...body }) : api.post('/resources', body)))
    if (ok) onSaved()
  }

  return (
    <>
      <h3>{editing ? t('editing', { name: editing.name }) : t('res.new')}</h3>
      <Err msg={error} />
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
          {onCancel && <button onClick={onCancel}>{t('cancel')}</button>}
        </div>
      </div>
    </>
  )
}
