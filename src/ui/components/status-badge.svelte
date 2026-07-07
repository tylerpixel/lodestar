<script lang="ts" module>
  export type Tone = 'neutral' | 'accent' | 'warn' | 'danger';
</script>

<script lang="ts">
  let { label, tone = 'neutral' }: { label: string; tone?: Tone } = $props();
</script>

<!-- Status is always a coloured dot WITH a text label, never colour alone -->
<span class="badge {tone}"><i></i>{label}</span>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
    white-space: nowrap;
  }

  i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--color-border);
  }

  .accent {
    color: var(--color-text);
  }

  .accent i {
    background: var(--color-accent);
  }

  .warn {
    color: var(--color-warn);
  }

  .warn i {
    background: var(--color-warn);
  }

  .danger {
    color: var(--color-danger);
  }

  .danger i {
    background: var(--color-danger);
  }
</style>
