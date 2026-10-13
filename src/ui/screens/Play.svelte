<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import { sfx, vibrate } from '../../audio/sfx'
  import { today } from '../../core/dates'
  import { worldOf } from '../../core/journey'
  import {
    completeRound,
    ensureDay,
    finishPlacement,
    introduceLesson,
    nextRound,
    recentDays,
    recordAnswer,
    recordTap,
    targetsFor,
    type NextRound,
    type RoundResult,
  } from '../../core/kid'
  import { tierRank } from '../../core/mastery'
  import { Placement } from '../../core/placement'
  import { pick } from '../../core/rng'
  import { buildRound, choiceOptions, RoundRunner, type RoundItem } from '../../core/rounds'
  import type { KidState, RoundKind } from '../../core/types'
  import { app, saveKid, syncNow } from '../../data/store.svelte'
  import { i18n, seconds, t, type Key } from '../../i18n/index.svelte'
  import type { Theme } from '../../themes'
  import Confetti from '../components/Confetti.svelte'
  import DotGrid from '../components/DotGrid.svelte'
  import Numpad from '../components/Numpad.svelte'
  import SpeedBar from '../components/SpeedBar.svelte'

  let { kid, theme }: { kid: KidState; theme: Theme } = $props()

  type Stage = 'warmup' | 'roundStart' | 'play' | 'summary'
  type Feedback = 'fast' | 'right' | 'wrong' | 'neutral' | null

  const date = today()
  const IDLE_CAP_MS = 45_000
  const HINT_AFTER = 2 // × Target Time

  let stage = $state<Stage>('warmup')
  let input = $state('')
  let shakes = $state(0)

  // Warm-up: mix of 1- and 2-digit numbers, like real answers.
  const warmNumbers = [1, 2, 1, 2, 2].map((d) =>
    d === 1 ? 2 + Math.floor(Math.random() * 8) : 12 + Math.floor(Math.random() * 87),
  )
  let warmIndex = $state(0)

  // Current Round
  let round = $state<NextRound | null>(null)
  let kind = $state<RoundKind>('review')
  let runner: RoundRunner | null = null
  let placement: Placement | null = null
  let item = $state<RoundItem | null>(null)
  let progress = $state(0)
  let questionNo = $state(0)
  let target = $state(5000)
  let feedback = $state<Feedback>(null)
  let feedbackText = $state('')
  let fixing = $state(false)
  let showHint = $state(false)
  let options = $state<number[]>([])
  let chosen = $state<number | null>(null)
  let combo = $state(0)
  let toast = $state<string | null>(null)

  // Timing (not reactive)
  let shownAt = 0
  let lastTick = 0
  let activeMs = 0
  let answerMs = 0
  let hintTimer: ReturnType<typeof setTimeout> | undefined
  let toastTimer: ReturnType<typeof setTimeout> | undefined

  // Results
  let result = $state<RoundResult | null>(null)
  let stats = $state({ correct: 0, total: 0, fast: 0, timeMs: 0 })
  let placementKnown = $state(0)
  let newGold = $state(0)
  let fire = $state(0)
  const after = $derived(stage === 'summary' ? nextRound(kid, date) : null)

  onMount(() => {
    ensureDay(kid, date)
    shownAt = performance.now()
  })

  onDestroy(() => {
    clearTimeout(hintTimer)
    clearTimeout(toastTimer)
  })

  function tick() {
    const now = performance.now()
    if (lastTick) activeMs += Math.min(now - lastTick, IDLE_CAP_MS)
    lastTick = now
  }

  // ── Input ─────────────────────────────────────────────

  function digit(d: number) {
    if (stage === 'warmup') return warmDigit(d)
    if (stage !== 'play' || item?.type !== 'typed' || (feedback && !fixing)) return
    sfx.tap()
    input += String(d)
    if (input.length >= String(item.a * item.b).length) submit(item.a, item.b)
  }

  function back() {
    input = input.slice(0, -1)
  }

  function onKey(e: KeyboardEvent) {
    if (/^[0-9]$/.test(e.key)) digit(Number(e.key))
    else if (e.key === 'Backspace') back()
    else if (e.key === 'Enter') {
      if (stage === 'roundStart') go()
      else if (stage === 'play' && item?.type === 'rule') skip()
      else return
    } else return
    e.preventDefault()
  }

  // ── Warm-up ───────────────────────────────────────────

  function warmDigit(d: number) {
    sfx.tap()
    input += String(d)
    const want = String(warmNumbers[warmIndex])
    if (input.length < want.length) return
    if (input === want) {
      recordTap(kid, want.length, performance.now() - shownAt)
      warmIndex++
      if (warmIndex >= warmNumbers.length) {
        void saveKid()
        startRound()
        return
      }
    } else {
      shakes++
    }
    input = ''
    shownAt = performance.now()
  }

  // ── Rounds ────────────────────────────────────────────

  function startRound() {
    ensureDay(kid, date)
    const next = nextRound(kid, date)
    if (!next) {
      app.screen = 'home'
      return
    }
    round = next
    combo = 0
    stats = { correct: 0, total: 0, fast: 0, timeMs: 0 }
    activeMs = 0
    answerMs = 0
    lastTick = 0
    if (next.kind === 'placement') {
      placement = new Placement(Math.random)
      runner = null
      kind = 'placement'
    } else {
      placement = null
      const built = buildRound(next.kind, {
        facts: kid.facts,
        date,
        recentDays: recentDays(kid, date),
        rng: Math.random,
      })
      kind = built.kind
      if (built.lesson) introduceLesson(kid, built.lesson, date)
      runner = new RoundRunner(built.items)
    }
    stage = 'roundStart'
  }

  function go() {
    stage = 'play'
    lastTick = performance.now()
    present()
  }

  function current(): RoundItem | null {
    if (placement) {
      const q = placement.current
      return q ? { type: 'typed', a: q[0], b: q[1] } : null
    }
    return runner?.current ?? null
  }

  function present() {
    tick()
    clearTimeout(hintTimer)
    input = ''
    fixing = false
    showHint = false
    feedback = null
    chosen = null
    item = current()
    progress = placement ? placement.progress : runner ? runner.answered / Math.max(1, runner.answered + remaining()) : 0
    if (!item) {
      void finishRound()
      return
    }
    if (item.type === 'intro') options = choiceOptions(item.a, item.b, Math.random)
    if (item.type === 'typed') {
      target = targetsFor(kid, date, item.a * item.b).targetMs
      questionNo++
      shownAt = performance.now()
      hintTimer = setTimeout(() => (showHint = true), target * HINT_AFTER)
    }
  }

  function remaining(): number {
    return runner ? runner.items.slice(runner.pos).filter((i) => i.type === 'typed').length : 0
  }

  function skip() {
    runner?.skip()
    present()
  }

  function choose(n: number) {
    if (item?.type !== 'intro' || chosen !== null) return
    chosen = n
    if (n === item.a * item.b) sfx.correct()
    else sfx.wrong()
    setTimeout(skip, n === item.a * item.b ? 600 : 1400)
  }

  function showToast(text: string) {
    toast = text
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => (toast = null), 1400)
  }

  function submit(a: number, b: number) {
    const answer = a * b
    const given = Number(input)

    if (fixing) {
      // Retyping the right answer after a miss; not recorded again.
      if (given === answer) {
        runner?.answer({ correct: false, fast: false })
        present()
      } else {
        shakes++
        input = ''
      }
      return
    }

    const ms = performance.now() - shownAt
    clearTimeout(hintTimer)
    answerMs += ms
    const { outcome } = recordAnswer(kid, { a, b, given, ms, round: kind, date, now: new Date() })
    void saveKid()

    if (tierRank(outcome.tierAfter) > tierRank(outcome.tierBefore) && tierRank(outcome.tierAfter) >= tierRank('silver')) {
      const medal = { silver: '🥈', gold: '🥇', diamond: '💎' }[outcome.tierAfter as 'silver' | 'gold' | 'diamond']
      showToast(`${medal} ${a} × ${b} = ${answer}`)
      if (tierRank(outcome.tierBefore) < tierRank('gold') && tierRank(outcome.tierAfter) >= tierRank('gold')) newGold++
    }

    if (placement) {
      placement.submit(outcome.correct)
      if (outcome.correct) stats.fast += outcome.fast ? 1 : 0
      feedback = 'neutral'
      sfx.tap()
      setTimeout(present, 250)
      return
    }

    if (outcome.correct) {
      combo = outcome.fast ? combo + 1 : 0
      feedback = outcome.fast ? 'fast' : 'right'
      feedbackText = outcome.fast
        ? combo >= 3
          ? `🔥 ${t('combo', { n: combo })}`
          : `⚡ ${pick(theme.cheers[i18n.lang], Math.random)}`
        : `✓ ${t('correct')}`
      if (outcome.fast && combo >= 3) sfx.combo(combo)
      else if (outcome.fast) sfx.fast()
      else sfx.correct()
      runner?.answer({ correct: true, fast: outcome.fast })
      setTimeout(present, outcome.fast ? 450 : 650)
    } else {
      combo = 0
      feedback = 'wrong'
      fixing = true
      input = ''
      shakes++
      sfx.wrong()
      vibrate(120)
    }
  }

  async function finishRound() {
    const r = round!
    if (placement) {
      placementKnown = finishPlacement(kid, placement.knownFamilies, date)
      stats = {
        correct: placement.answers.filter((x) => x.correct).length,
        total: placement.answers.length,
        fast: stats.fast,
        timeMs: answerMs,
      }
    } else if (runner) {
      stats = { correct: runner.correct, total: runner.answered, fast: runner.fast, timeMs: answerMs }
    }
    result = completeRound(kid, { kind, core: r.core, playMs: activeMs, roundMs: Math.round(answerMs), date })
    stage = 'summary'
    fire++
    if (result.earned) sfx.dayDone()
    else sfx.roundEnd()
    await saveKid()
    void syncNow()
  }

  function quit() {
    if (stage === 'play' && !confirm(t('stopRound'))) return
    if (stage === 'play') {
      tick()
      if (kid.day) kid.day.playMs += activeMs
      void saveKid()
    }
    app.screen = 'home'
  }

  const roundTitle = $derived(t(`round_${kind}` as Key))
  const worldName = (w: number | null) => (w ? `${theme.worlds[w - 1].emoji} ${theme.worlds[w - 1].name[i18n.lang]}` : '')
</script>

<svelte:window onkeydown={onKey} />

<main class="screen play">
  <div class="row">
    <button class="icon-btn" aria-label={t('home')} onclick={quit}>✕</button>
    {#if stage === 'play'}
      <div class="progress"><div style="width: {progress * 100}%"></div></div>
      <span class="combo" class:hot={combo >= 3}>{combo >= 2 ? `🔥${combo}` : ''}</span>
    {:else}
      <span class="spacer"></span>
    {/if}
  </div>

  {#if stage === 'warmup'}
    <section class="stage center stack">
      <p class="muted">{t('warmup')}</p>
      <p class="dots">{'●'.repeat(warmIndex)}{'○'.repeat(warmNumbers.length - warmIndex)}</p>
      {#key shakes}
        <p class="target-num" class:shake={shakes > 0}>{warmNumbers[warmIndex]}</p>
      {/key}
      <p class="typed">{input || ' '}</p>
    </section>
    <Numpad onDigit={digit} onBack={back} />
  {:else if stage === 'roundStart'}
    <section class="stage center stack pop">
      <div class="emoji">{kind === 'speed' ? '⚡' : kind === 'new' ? '✨' : kind === 'placement' ? '🧭' : theme.avatar}</div>
      <h1>{roundTitle}</h1>
      {#if round?.core}<p class="muted">{t('roundOf', { n: round.index, total: round.total })}</p>{/if}
      {#if kind === 'speed' && kid.bestSpeedRoundMs}<p>🏆 {t('bestTime', { time: seconds(kid.bestSpeedRoundMs) })}</p>{/if}
      {#if kind === 'placement'}<p>{t('placementIntro')}</p>{/if}
      <button class="btn big" onclick={go}>{t('letsGo')}</button>
    </section>
  {:else if stage === 'play' && item?.type === 'rule'}
    <section class="stage center stack pop">
      <p class="tag">{t('newFact')}</p>
      <h1 class="rule-title">× {item.family}</h1>
      <DotGrid a={3} b={item.family} size={item.family === 10 ? 12 : 18} />
      <p class="explain">{t(`rule_${item.family}` as Key)}</p>
      <button class="btn big" onclick={skip}>{t('next')}</button>
    </section>
  {:else if stage === 'play' && item?.type === 'intro'}
    {@const answer = item.a * item.b}
    <section class="stage center stack pop">
      <p class="tag">{t('newFact')}</p>
      <p class="question">{item.a} × {item.b} = ?</p>
      <DotGrid a={item.a} b={item.b} />
      <p class="explain">{t(`trick_${item.family}` as Key)}</p>
      {#if item.a !== item.b}<p class="muted small">{t('turnaround', { a: item.a, b: item.b })}</p>{/if}
      <p class="muted">{t('pickAnswer')}</p>
      <div class="choices">
        {#each options as n (n)}
          <button
            class="choice"
            class:right={chosen !== null && n === answer}
            class:wrong={chosen === n && n !== answer}
            onclick={() => choose(n)}>{n}</button
          >
        {/each}
      </div>
    </section>
  {:else if stage === 'play' && item?.type === 'typed'}
    <section class="stage center stack">
      <p class="muted small">{kind === 'placement' ? t('placementProgress') : roundTitle}</p>
      {#key shakes}
        <p class="question {feedback ?? ''}" class:shake={feedback === 'wrong' || (fixing && shakes > 0)}>
          {item.a} × {item.b} = <span class="answer">{input || (fixing ? '' : '?')}</span>
        </p>
      {/key}
      {#if fixing}
        <p class="fix">{t('itIs', { answer: item.a * item.b })}</p>
        <DotGrid a={item.a} b={item.b} size={12} />
      {:else if feedback === 'fast' || feedback === 'right'}
        <p class="cheer pop">{feedbackText}</p>
      {:else}
        <SpeedBar targetMs={target} id={questionNo} />
        {#if showHint && kind !== 'placement'}<div class="hint"><DotGrid a={item.a} b={item.b} size={10} /></div>{/if}
      {/if}
    </section>
    <Numpad onDigit={digit} onBack={back} />
  {:else if stage === 'summary' && result}
    <section class="stage center stack pop">
      {#if kind === 'placement'}
        <div class="emoji">🧭</div>
        <h1>{placementKnown > 0 ? t('placementDone', { n: placementKnown }) : t('placementZero')}</h1>
      {:else}
        <div class="emoji">🎉</div>
        <h1>{t('roundDone')}</h1>
        <p>{t('roundStats', { correct: stats.correct, total: stats.total, fast: stats.fast })}</p>
        {#if kind === 'speed'}
          <p>⏱️ {t('yourTime', { time: seconds(stats.timeMs) })}</p>
          <p class:record={result.newBest}>
            {result.newBest ? `🏆 ${t('newRecord')}` : t('bestTime', { time: seconds(kid.bestSpeedRoundMs ?? stats.timeMs) })}
          </p>
        {/if}
      {/if}

      {#if result.earned}
        {@const e = result.earned}
        <div class="card stack day">
          <h2>{theme.avatar} {t('dayDone', { n: e.playDay })}</h2>
          <p>{t('streakNow', { n: kid.journey.streak })}</p>
          {#if e.shieldsUsed.length}<p>🛡️ {t('shieldUsed', { n: e.shieldsUsed.length })}</p>{/if}
          {#if e.worldCompleted}
            <p class="world">🏁 {t('worldDone', { world: worldName(e.worldCompleted) })}</p>
            {#if e.worldCompleted < 10}<p>{t('nextWorld', { world: worldName(worldOf(e.playDay + 1)) })}</p>{/if}
          {/if}
          {#if e.shieldEarned}<p>{t('shieldEarned')}</p>{/if}
          {#if newGold > 0}<p>🥇 {t('newGold', { n: newGold })}</p>{/if}
        </div>
      {/if}

      {#if after?.core}
        <button class="btn big" onclick={startRound}>{t('nextRound')} →</button>
      {:else if after}
        <button class="btn big" onclick={startRound}>⭐ {t('playBonus')}</button>
        <button class="btn ghost" onclick={() => (app.screen = 'home')}>{t('home')}</button>
      {:else}
        {#if result.capReached}<p>{t('capReached')}</p>{/if}
        <button class="btn big" onclick={() => (app.screen = 'home')}>{t('home')}</button>
      {/if}
    </section>
  {/if}
</main>

{#if toast}<div class="toast pop">{toast}</div>{/if}
<Confetti {fire} />

<style>
  .play {
    user-select: none;
    -webkit-user-select: none;
  }
  .stage {
    flex: 1;
    justify-content: center;
    align-items: center;
  }
  .progress {
    flex: 1;
    height: 12px;
    border-radius: 99px;
    background: rgba(255, 255, 255, 0.12);
    overflow: hidden;
  }
  .progress div {
    height: 100%;
    background: var(--accent);
    transition: width 0.3s;
  }
  .combo {
    min-width: 3em;
    font-weight: 900;
    text-align: right;
  }
  .combo.hot {
    color: var(--gold);
  }
  .question {
    font-size: clamp(2.6rem, 12vw, 4rem);
    font-weight: 900;
    letter-spacing: 1px;
    white-space: nowrap;
  }
  .answer {
    display: inline-block;
    min-width: 1.4em;
    border-bottom: 4px solid var(--accent);
    color: var(--accent);
  }
  .question.fast .answer,
  .question.right .answer {
    color: var(--good);
    border-color: var(--good);
  }
  .question.wrong .answer {
    color: var(--bad);
  }
  .target-num {
    font-size: clamp(3rem, 16vw, 5rem);
    font-weight: 900;
    color: var(--accent);
  }
  .typed {
    font-size: 2rem;
    font-weight: 800;
    min-height: 1.4em;
  }
  .dots {
    letter-spacing: 4px;
    color: var(--accent);
  }
  .emoji {
    font-size: 4rem;
  }
  .tag {
    background: var(--accent);
    color: var(--accent-text);
    border-radius: 999px;
    padding: 4px 14px;
    font-weight: 900;
  }
  .rule-title {
    font-size: 3rem;
  }
  .explain {
    font-size: 1.15rem;
    font-weight: 600;
    max-width: 26em;
  }
  .choices {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    width: 100%;
    max-width: 320px;
  }
  .choice {
    border: 0;
    border-radius: 16px;
    padding: 16px;
    font-size: 1.6rem;
    font-weight: 900;
    background: rgba(255, 255, 255, 0.14);
  }
  .choice.right {
    background: var(--good);
    color: #08311a;
  }
  .choice.wrong {
    background: var(--bad);
  }
  .fix {
    font-size: 1.2rem;
    font-weight: 800;
    color: var(--gold);
  }
  .cheer {
    font-size: 1.5rem;
    font-weight: 900;
    color: var(--good);
    min-height: 10px;
  }
  .hint {
    opacity: 0.55;
  }
  .day {
    width: 100%;
  }
  .world,
  .record {
    font-weight: 900;
    color: var(--gold);
  }
  .toast {
    position: fixed;
    top: max(70px, calc(env(safe-area-inset-top) + 56px));
    left: 50%;
    translate: -50% 0;
    background: rgba(0, 0, 0, 0.75);
    border-radius: 999px;
    padding: 10px 18px;
    font-weight: 900;
    font-size: 1.2rem;
    z-index: 40;
  }
</style>
