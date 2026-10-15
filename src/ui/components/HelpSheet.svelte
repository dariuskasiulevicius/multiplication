<script lang="ts">
  import { t } from '../../i18n/index.svelte'
  import MysteryBadgeIcon from './MysteryBadgeIcon.svelte'

  let { onclose }: { onclose: () => void } = $props()
</script>

<div class="sheet" role="dialog" aria-modal="true" aria-label={t('helpTitle')}>
  <div class="screen">
    <div class="row">
      <h1>❓ {t('helpTitle')}</h1>
      <span class="spacer"></span>
      <button class="icon-btn" aria-label={t('close')} onclick={onclose}>✕</button>
    </div>

    <section class="card">{t('helpMission')}</section>
    <section class="card">{t('helpFire')}</section>
    <section class="card">{t('helpShield')}</section>
    <section class="card stack">
      <p><b>{t('helpMedals')}</b></p>
      <ul>
        <li>{t('medalBronze')}</li>
        <li>{t('medalSilver')}</li>
        <li>{t('medalGold')}</li>
        <li>{t('medalDiamond')}</li>
      </ul>
      <p>{t('helpDusty')}</p>
    </section>
    <section class="card"><MysteryBadgeIcon /> {t('helpBadges')}</section>
    <section class="card">{t('helpWorlds')}</section>
    <section class="card">{t('helpTrial')}</section>
    <section class="card">{t('helpStars')}</section>

    <button class="btn big" onclick={onclose}>{t('helpClose')}</button>
  </div>
</div>

<style>
  .sheet {
    position: fixed;
    inset: 0;
    z-index: 30;
    overflow: auto;
    background: linear-gradient(170deg, var(--bg1), var(--bg2));
  }
  .card {
    font-size: 1.05rem;
    font-weight: 600;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }
</style>
