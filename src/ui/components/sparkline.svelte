<script lang="ts">
  // Minimal trend line. Set `color` on the element to tint (defaults to accent).
  let {
    values,
    width = 110,
    height = 22,
  }: {
    values: number[];
    width?: number;
    height?: number;
  } = $props();

  const points = $derived.by(() => {
    if (values.length < 2) return '';
    const max = Math.max(...values, 1);
    const step = width / (values.length - 1);
    return values
      .map((v, i) => `${(i * step).toFixed(1)},${(height - 1.5 - (v / max) * (height - 3)).toFixed(1)}`)
      .join(' ');
  });
</script>

<svg {width} {height} viewBox="0 0 {width} {height}" aria-hidden="true">
  {#if points}
    <polyline
      {points}
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linejoin="round"
      stroke-linecap="round"
    />
  {/if}
</svg>

<style>
  svg {
    display: block;
    color: var(--color-accent);
    flex-shrink: 0;
  }
</style>
