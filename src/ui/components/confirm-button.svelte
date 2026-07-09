<script lang="ts">
  // Two-step destructive action: first click arms, second confirms.
  // Disarms on any click elsewhere.
  let {
    label,
    confirmLabel = 'Confirm',
    danger = false,
    subtle = false,
    pill = false,
    disabled = false,
    onConfirm,
  }: {
    label: string;
    confirmLabel?: string;
    danger?: boolean;
    /** Muted small-text styling (e.g. per-row actions). */
    subtle?: boolean;
    pill?: boolean;
    disabled?: boolean;
    onConfirm: () => void;
  } = $props();

  let armed = $state(false);
  let el = $state<HTMLButtonElement | null>(null);

  $effect(() => {
    if (!armed) return;
    const onDown = (e: MouseEvent) => {
      if (el && !el.contains(e.target as Node)) armed = false;
    };
    queueMicrotask(() => window.addEventListener('mousedown', onDown));
    return () => window.removeEventListener('mousedown', onDown);
  });

  function click() {
    if (!armed) {
      armed = true;
      return;
    }
    armed = false;
    onConfirm();
  }
</script>

<button
  bind:this={el}
  type="button"
  class:danger
  class:subtle
  class:pill
  class:armed
  {disabled}
  onclick={click}
>
  {armed ? confirmLabel : label}
</button>

<style>
  .danger {
    border-color: var(--color-danger);
    color: var(--color-danger);
  }

  .danger:hover,
  .danger.armed {
    border-color: var(--color-danger);
    background: var(--color-danger-muted);
  }

  .subtle {
    background: none;
    border: none;
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .subtle:hover,
  .subtle.armed {
    color: var(--color-danger);
  }

  .pill {
    border-radius: 999px;
  }
</style>
