<script lang="ts" module>
  export type SelectOption<V extends string = string> = { value: V; label: string };
</script>

<script lang="ts" generics="V extends string">
  let {
    value = $bindable(),
    options,
    placeholder = 'Select…',
    disabled = false,
    direction = 'down',
    onchange,
  }: {
    value?: V;
    options: SelectOption<V>[];
    placeholder?: string;
    disabled?: boolean;
    /** 'up' for triggers near the bottom of the window (e.g. the action island). */
    direction?: 'down' | 'up';
    onchange?: (value: V) => void;
  } = $props();

  let open = $state(false);
  let highlighted = $state(0);
  let rootEl = $state<HTMLElement | null>(null);

  const current = $derived(options.find((o) => o.value === value));

  function toggleOpen() {
    if (disabled) return;
    open = !open;
    if (open) {
      const at = options.findIndex((o) => o.value === value);
      highlighted = at >= 0 ? at : 0;
    }
  }

  function choose(option: SelectOption<V>) {
    value = option.value;
    onchange?.(option.value);
    open = false;
  }

  // Dismissal is deliberate-only: selection, outside click, or Escape.
  // The menu NEVER closes on mouse-leave, so there is no safe-triangle /
  // hover-intent race — you can take any path to it, at any speed.
  $effect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootEl && !rootEl.contains(e.target as Node)) open = false;
    };
    // Deferred so the opening click doesn't immediately close it
    queueMicrotask(() => window.addEventListener('mousedown', onDown));
    return () => window.removeEventListener('mousedown', onDown);
  });

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        open = false;
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) toggleOpen();
      else highlighted = Math.min(highlighted + 1, options.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) toggleOpen();
      else highlighted = Math.max(highlighted - 1, 0);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!open) toggleOpen();
      else if (options[highlighted]) choose(options[highlighted]);
    }
  }
</script>

<div class="select" bind:this={rootEl}>
  <button
    type="button"
    class="trigger"
    aria-haspopup="listbox"
    aria-expanded={open}
    {disabled}
    onclick={toggleOpen}
    onkeydown={onKeydown}
  >
    <span class="value" class:empty={!current}>{current?.label ?? placeholder}</span>
    <svg class="chevron" class:flipped={open} viewBox="0 0 8 5" aria-hidden="true">
      <path d="M0.5 0.5 L4 4 L7.5 0.5" fill="none" stroke="currentColor" stroke-width="1.2" />
    </svg>
  </button>
  {#if open}
    <ul class="menu" class:up={direction === 'up'} role="listbox">
      {#each options as option, i (option.value)}
        <li>
          <button
            type="button"
            role="option"
            aria-selected={option.value === value}
            class:highlighted={i === highlighted}
            class:selected={option.value === value}
            onmouseenter={() => (highlighted = i)}
            onclick={() => choose(option)}
          >
            {option.label}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .select {
    position: relative;
    display: inline-block;
    min-width: 120px;
  }

  .trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    width: 100%;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    color: var(--color-text);
    font-size: var(--text-sm);
    padding: var(--space-1) var(--space-2);
    transition: border-color var(--motion-fast);
  }

  .trigger:hover,
  .trigger:focus-visible {
    border-color: var(--color-accent);
    outline: none;
  }

  .value {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .value.empty {
    color: var(--color-text-muted);
  }

  .chevron {
    width: 8px;
    height: 5px;
    flex-shrink: 0;
    color: var(--color-text-muted);
    transition: transform var(--motion-fast);
  }

  .chevron.flipped {
    transform: rotate(180deg);
  }

  .menu {
    position: absolute;
    top: calc(100% + 2px);
    left: 0;
  }

  .menu.up {
    top: auto;
    bottom: calc(100% + 2px);
  }

  .menu {
    min-width: 100%;
    max-height: 240px;
    overflow-y: auto;
    list-style: none;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
    padding: var(--space-1) 0;
    z-index: 90;
  }

  .menu button {
    display: block;
    width: 100%;
    text-align: left;
    background: none;
    border: none;
    color: var(--color-text);
    font-size: var(--text-sm);
    padding: var(--space-1) var(--space-3);
    white-space: nowrap;
  }

  .menu button.highlighted {
    background: var(--color-accent-muted);
    box-shadow: inset 2px 0 0 var(--color-accent);
  }

  .menu button.selected {
    color: var(--color-accent);
  }
</style>
