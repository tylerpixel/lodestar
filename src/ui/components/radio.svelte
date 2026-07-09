<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    selected = false,
    disabled = false,
    onSelect,
    children,
  }: {
    selected?: boolean;
    disabled?: boolean;
    onSelect?: (e: MouseEvent) => void;
    children?: Snippet;
  } = $props();
</script>

<button
  type="button"
  role="radio"
  aria-checked={selected}
  class="root"
  class:has-label={!!children}
  {disabled}
  onclick={(e) => onSelect?.(e)}
>
  <span class="circle" class:on={selected}>
    {#if selected}<span class="dot"></span>{/if}
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
    gap: var(--space-2);
    text-align: left;
  }

  .circle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    border-radius: 50%;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    transition: border-color var(--motion-fast);
  }

  .root:hover .circle,
  .root:focus-visible .circle {
    border-color: var(--color-accent);
  }

  .root:focus-visible {
    outline: none;
  }

  .circle.on {
    border-color: var(--color-accent);
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--color-accent);
  }

  .label {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
</style>
