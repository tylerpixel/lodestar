<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    onDismiss,
    top = '10vh',
    children,
  }: {
    onDismiss: () => void;
    /** Distance of the content from the window top. */
    top?: string;
    children: Snippet;
  } = $props();
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="overlay"
  style:padding-top={top}
  onmousedown={(e) => e.target === e.currentTarget && onDismiss()}
>
  {@render children()}
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: var(--color-scrim);
    display: flex;
    justify-content: center;
    align-items: flex-start;
    z-index: 100;
  }
</style>
