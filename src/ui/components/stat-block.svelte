<script lang="ts">
  // Big number + label (+ optional hint line and progress bar). PRD §6 ui/.
  let {
    label,
    value,
    hint,
    progress = null,
  }: {
    label: string;
    value: string;
    hint?: string;
    /** 0..1 renders a thin progress bar under the value. */
    progress?: number | null;
  } = $props();
</script>

<div class="stat">
  <span class="label">{label}</span>
  <span class="value mono">{value}</span>
  {#if hint}<span class="hint">{hint}</span>{/if}
  {#if progress != null}
    <div class="bar">
      <div class="fill" style:width="{Math.round(Math.min(1, Math.max(0, progress)) * 100)}%"></div>
    </div>
  {/if}
</div>

<style>
  .stat {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .label {
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-muted);
  }

  .value {
    font-size: var(--text-xl);
    line-height: 1.1;
  }

  .hint {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .bar {
    width: 160px;
    height: 3px;
    background: var(--color-border);
    margin-top: var(--space-1);
  }

  .fill {
    height: 100%;
    background: var(--color-accent);
    transition: width var(--motion-fast);
  }
</style>
