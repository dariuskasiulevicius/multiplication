import type { Lang } from '../core/types'
import { en, type Key } from './en'
import { lt } from './lt'

export type { Key }

export interface PluralForms {
  one: string
  few?: string
  many?: string
  other: string
}

export type Dict = { [K in Key]: string | PluralForms }

const DICTS: Record<Lang, Dict> = { en, lt }

export const i18n = $state({ lang: 'en' as Lang })

export function detectLang(): Lang {
  return navigator.languages?.some((l) => l.toLowerCase().startsWith('lt')) ? 'lt' : 'en'
}

/** Translate `key`; `{name}` placeholders come from `vars`, plurals pick a form by `vars.n`. */
export function t(key: Key, vars: Record<string, string | number> = {}): string {
  const lang = i18n.lang
  let entry = DICTS[lang][key] ?? en[key]
  if (typeof entry !== 'string') {
    const forms = entry
    const n = Number(vars.n ?? 0)
    const category = new Intl.PluralRules(lang).select(n) as keyof PluralForms
    entry = forms[category] ?? forms.other
  }
  return entry.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`))
}

/** Seconds with one decimal, e.g. "4.2 s" / "4,2 s". */
export function seconds(ms: number): string {
  return `${(ms / 1000).toLocaleString(i18n.lang, { maximumFractionDigits: 1, minimumFractionDigits: 1 })} s`
}
