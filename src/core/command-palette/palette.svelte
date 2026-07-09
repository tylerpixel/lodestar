<script lang="ts">
  import { untrack } from 'svelte';
  import Overlay from '../../ui/components/overlay.svelte';
  import { palette, type Command } from './registry.svelte';

  let query = $state('');
  let selected = $state(0);
  let inputMode = $state<Command | null>(null);
  let inputEl = $state<HTMLInputElement | null>(null);

  const filtered = $derived.by(() => {
    const q = query.trim().toLowerCase();
    if (!q) return palette.commands;
    return palette.commands
      .filter((c) => (c.label + ' ' + (c.hint ?? '')).toLowerCase().includes(q))
      .sort(
        (a, b) =>
          Number(b.label.toLowerCase().startsWith(q)) -
          Number(a.label.toLowerCase().startsWith(q))
      );
  });

  $effect(() => {
    if (palette.open) {
      untrack(() => {
        query = '';
        selected = 0;
        inputMode = palette.seedInput;
        palette.seedInput = null;
      });
      queueMicrotask(() => inputEl?.focus());
    }
  });

  $effect(() => {
    if (selected >= filtered.length) selected = Math.max(0, filtered.length - 1);
  });

  async function runCommand(cmd: Command) {
    if (cmd.input && !inputMode) {
      inputMode = cmd;
      query = '';
      queueMicrotask(() => inputEl?.focus());
      return;
    }
    const arg = inputMode ? query : undefined;
    palette.open = false;
    await cmd.run(arg);
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (inputMode) {
        inputMode = null;
        query = '';
      } else {
        palette.open = false;
      }
    } else if (inputMode) {
      if (e.key === 'Enter') {
        e.preventDefault();
        void runCommand(inputMode);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      selected = Math.min(selected + 1, filtered.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selected = Math.max(selected - 1, 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = filtered[selected];
      if (cmd) void runCommand(cmd);
    }
  }
</script>

{#if palette.open}
  <Overlay top="12vh" onDismiss={() => (palette.open = false)}>
    <div class="palette">
      <input
        bind:this={inputEl}
        bind:value={query}
        onkeydown={onKeydown}
        placeholder={inputMode ? inputMode.input?.placeholder : 'Type a command…'}
        spellcheck="false"
      />
      {#if inputMode}
        <p class="mode">
          <span class="mode-label">{inputMode.label}</span>
          <span class="mode-hint">Enter to submit · Esc to go back</span>
        </p>
      {:else if filtered.length === 0}
        <p class="mode"><span class="mode-hint">No matching commands.</span></p>
      {:else}
        <ul>
          {#each filtered as cmd, i (cmd.id)}
            <li>
              <button
                class:selected={i === selected}
                onmouseenter={() => (selected = i)}
                onclick={() => runCommand(cmd)}
              >
                <span>{cmd.label}</span>
                {#if cmd.hint}<span class="hint">{cmd.hint}</span>{/if}
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </Overlay>
{/if}

<style>
  .palette {
    width: 520px;
    max-width: calc(100vw - 48px);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-pop);
  }

  input {
    width: 100%;
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--color-border);
    color: var(--color-text);
    font: inherit;
    padding: var(--space-3) var(--space-4);
    outline: none;
  }

  ul {
    list-style: none;
    max-height: 320px;
    overflow-y: auto;
    padding: var(--space-1) 0;
  }

  li button {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: var(--space-3);
    width: 100%;
    text-align: left;
    background: transparent;
    border: none;
    color: var(--color-text);
    font-size: var(--text-sm);
    padding: var(--space-2) var(--space-4);
  }

  li button.selected {
    background: var(--color-accent-muted);
    box-shadow: inset 2px 0 0 var(--color-accent);
  }

  .hint,
  .mode-hint {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .mode {
    display: flex;
    justify-content: space-between;
    padding: var(--space-2) var(--space-4);
  }

  .mode-label {
    font-size: var(--text-xs);
    color: var(--color-accent);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
</style>
