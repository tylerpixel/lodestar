<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    checked = false,
    indeterminate = false,
    disabled = false,
    onToggle,
    children,
  }: {
    checked?: boolean;
    indeterminate?: boolean;
    disabled?: boolean;
    /** Receives the click event — call stopPropagation there if the checkbox
     *  sits inside a clickable row. */
    onToggle?: (e: MouseEvent) => void;
    children?: Snippet;
  } = $props();
</script>

<button
  type="button"
  role="checkbox"
  aria-checked={indeterminate ? 'mixed' : checked}
  class="root"
  class:has-label={!!children}
  {disabled}
  onclick={(e) => onToggle?.(e)}
>
  <span class="box" class:on={checked || indeterminate}>
    {#if indeterminate}
      <span class="dash"></span>
    {:else if checked}
      <svg viewBox="0 0 10 8" aria-hidden="true">
        <path
          d="M1 4 L3.8 6.6 L9 1.2"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    {/if}
  </span>
  {#if children}
    <span class="label">{@render children()}</span>
  {/if}
</button>

<style>
  .root {
    display: inline-flex;
    align-items: center;
    background: none;
    border: none;
    padding: 0;
    color: inherit;
    font: inherit;
    vertical-align: middle;
  }

  .root.has-label {
    display: flex;
    width: 100%;
    gap: var(--space-3);
    text-align: left;
  }

  .box {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    color: var(--color-on-accent);
    transition: background var(--motion-fast), border-color var(--motion-fast);
  }

  .root:hover .box,
  .root:focus-visible .box {
    border-color: var(--color-accent);
  }

  .root:focus-visible {
    outline: none;
  }

  .box.on {
    background: var(--color-accent);
    border-color: var(--color-accent);
  }

  .box svg {
    width: 10px;
    height: 8px;
  }

  .dash {
    width: 8px;
    height: 2px;
    background: currentColor;
  }

  .label {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    flex: 1;
    min-width: 0;
  }
</style>
