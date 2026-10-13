<script lang="ts">
  import { baseline } from '../../core/calibration'
  import { today } from '../../core/dates'
  import { recentDays } from '../../core/kid'
  import { countTiers, rankWeak } from '../../core/mastery'
  import type { KidState } from '../../core/types'
  import { app, deleteKid, saveKid, syncNow } from '../../data/store.svelte'
  import { fetchSnapshot, fromSnapshot, snapshotOf } from '../../data/sync'
  import { i18n, seconds, t, type Key } from '../../i18n/index.svelte'
  import Gate from '../components/Gate.svelte'

  let { kid }: { kid: KidState } = $props()

  let unlocked = $state(false)
  let message = $state<string | null>(null)
  const date = today()

  const tiers = $derived(countTiers(kid.facts))
  const weak = $derived(rankWeak(kid.facts, recentDays(kid, date)).slice(0, 8))
  const days = $derived([...kid.history].reverse().slice(0, 14))

  function back() {
    app.screen = 'settings'
  }

  async function setBudget(field: 'recallBudgetMs' | 'legendRecallBudgetMs', secondsValue: number) {
    kid.settings[field] = Math.round(secondsValue * 1000)
    await saveKid()
  }

  async function sync() {
    await syncNow()
    message = app.syncError ? t('syncError', { error: errorText(app.syncError) }) : null
  }

  function errorText(code: string): string {
    if (code === 'network') return t('networkError')
    if (code === 'bad_secret' || code === 'inactive_device') return t(`error_${code}` as Key)
    return code
  }

  async function restore() {
    if (!kid.sync || !confirm(t('restoreConfirm'))) return
    const res = await fetchSnapshot(kid.sync, kid.kidId, kid.deviceId, kid.name, true)
    if (!res.ok) {
      message = t('syncError', { error: errorText(res.error ?? '') })
      return
    }
    const restored = res.snapshot ? fromSnapshot(res.snapshot, kid) : null
    if (!restored) {
      message = t('restoreNone')
      return
    }
    app.kid = restored
    await saveKid()
    message = t('restoreDone')
  }

  function exportFile() {
    const blob = new Blob([snapshotOf(kid)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `multiplication-${kid.name}-${date}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function importFile(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0]
    if (!file) return
    const restored = fromSnapshot(await file.text(), kid)
    if (!restored) {
      message = t('importBad')
      return
    }
    if (!confirm(t('importConfirm'))) return
    app.kid = restored
    await saveKid()
    message = t('restoreDone')
  }

  async function reset() {
    if (!confirm(t('resetConfirm', { name: kid.name }))) return
    await deleteKid()
    app.screen = 'welcome'
  }

  const when = (iso: string) => new Date(iso).toLocaleString(i18n.lang, { dateStyle: 'short', timeStyle: 'short' })
</script>

<main class="screen">
  {#if !unlocked}
    <span class="spacer"></span>
    <Gate onpass={() => (unlocked = true)} oncancel={back} />
    <span class="spacer"></span>
  {:else}
    <div class="row">
      <button class="icon-btn" aria-label={t('back')} onclick={back}>←</button>
      <h1>{t('parentMenu')}</h1>
    </div>

    {#if message}<p class="card msg">{message}</p>{/if}

    <section class="card stack">
      <label class="stack">
        <span class="row"><b>{t('budget')}</b><span class="spacer"></span>{seconds(kid.settings.recallBudgetMs)}</span>
        <input
          type="range"
          min="1"
          max="15"
          step="0.5"
          value={kid.settings.recallBudgetMs / 1000}
          oninput={(e) => setBudget('recallBudgetMs', Number(e.currentTarget.value))}
        />
      </label>
      <label class="stack">
        <span class="row"
          ><b>{t('legendBudget')}</b><span class="spacer"></span>{seconds(kid.settings.legendRecallBudgetMs)}</span
        >
        <input
          type="range"
          min="1"
          max="15"
          step="0.5"
          value={kid.settings.legendRecallBudgetMs / 1000}
          oninput={(e) => setBudget('legendRecallBudgetMs', Number(e.currentTarget.value))}
        />
      </label>
      <p class="muted small">{t('budgetHelp', { name: kid.name })}</p>
      <p class="muted small">
        {t('baselineInfo', { one: seconds(baseline(kid.calibration, 1)), two: seconds(baseline(kid.calibration, 2)) })}
      </p>
    </section>

    <section class="card stack">
      <h2>{t('syncTitle')}</h2>
      {#if kid.sync}
        <p class="small">{kid.lastSyncAt ? t('syncLast', { time: when(kid.lastSyncAt) }) : t('syncNever')}</p>
        <p class="small">{t('syncPending', { n: kid.pending.length + (kid.outbox.length ? 1 : 0) })}</p>
        {#if app.syncError}<p class="small bad">{t('syncError', { error: errorText(app.syncError) })}</p>{/if}
        <button class="btn" disabled={app.syncing} onclick={sync}>{t('syncNow')}</button>
        <button class="btn ghost" onclick={restore}>{t('restore')}</button>
      {:else}
        <p class="muted small">{t('syncNone')}</p>
      {/if}
      <button class="btn ghost" onclick={exportFile}>💾 {t('exportFile')}</button>
      <label class="btn ghost center">
        📂 {t('importFile')}
        <input type="file" accept="application/json,.json" hidden onchange={importFile} />
      </label>
    </section>

    <section class="card stack">
      <h2>{t('statsTitle')}</h2>
      <p class="small">
        🥉 {tiers.bronze} · 🥈 {tiers.silver} · 🥇 {tiers.gold} · 💎 {tiers.diamond} · ⬜ {tiers.unseen}
      </p>
      {#if days.length}
        <table>
          <thead>
            <tr>
              <th>{t('statsDate')}</th>
              <th>#</th>
              <th>{t('statsMinutes')}</th>
              <th>{t('statsQuestions')}</th>
              <th>{t('statsCorrect')}</th>
              <th>{t('statsFast')}</th>
            </tr>
          </thead>
          <tbody>
            {#each days as d (d.date)}
              <tr>
                <td>{d.date.slice(5)}</td>
                <td>{d.playDay ?? '–'}</td>
                <td>{d.minutes}</td>
                <td>{d.questions}</td>
                <td>{d.questions ? Math.round((d.correct / d.questions) * 100) : 0}%</td>
                <td>{d.questions ? Math.round((d.fast / d.questions) * 100) : 0}%</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
      {#if weak.length}
        <p><b>{t('slowest')}</b></p>
        <p class="small">
          {#each weak as id, i (id)}{i ? ' · ' : ''}{id.replace('x', ' × ')}{kid.facts[id].dusty ? ' 💨' : ''}{/each}
        </p>
      {/if}
    </section>

    <button class="btn danger" onclick={reset}>{t('resetKid')}</button>
  {/if}
</main>

<style>
  .msg {
    font-weight: 700;
  }
  .bad {
    color: var(--bad);
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
    text-align: right;
  }
  th,
  td {
    padding: 4px 2px;
  }
  th:first-child,
  td:first-child {
    text-align: left;
  }
  input[type='range'] {
    width: 100%;
    accent-color: var(--accent);
  }
</style>
