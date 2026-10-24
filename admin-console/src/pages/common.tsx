import type { ReactNode } from 'react'
import { translate, useI18n } from '../i18n'

export function Err({ msg }: { msg?: string }) {
  return msg ? <div className="error">{msg}</div> : null
}

export function CheckGroup<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[]
  value: T[]
  onChange: (v: T[]) => void
}) {
  const { t } = useI18n()
  return (
    <div className="checks">
      {options.length === 0 && <span className="muted">{t('noItems')}</span>}
      {options.map(o => (
        <label key={o.value}>
          <input
            type="checkbox"
            checked={value.includes(o.value)}
            onChange={e => onChange(e.target.checked ? [...value, o.value] : value.filter(v => v !== o.value))}
          />
          {o.label}
        </label>
      ))}
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>
}

export function confirmDelete(name: string) {
  return window.confirm(translate('confirmDelete', { name }))
}
