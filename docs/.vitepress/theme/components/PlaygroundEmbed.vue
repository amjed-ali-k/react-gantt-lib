<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';

const host = ref<HTMLElement | null>(null);
const error = ref<string | null>(null);
let root: Root | null = null;

async function mountPlayground(el: HTMLElement) {
  try {
    error.value = null;
    root?.unmount();
    const { default: PlaygroundPage } = await import('../demos/PlaygroundPage');
    root = createRoot(el);
    root.render(createElement(PlaygroundPage));
  } catch (err) {
    console.error('[PlaygroundEmbed] mount failed:', err);
    error.value = err instanceof Error ? err.message : String(err);
  }
}

watch(
  host,
  (el) => {
    if (el) void mountPlayground(el);
  },
  { flush: 'post' },
);

onBeforeUnmount(() => {
  root?.unmount();
  root = null;
});
</script>

<template>
  <ClientOnly>
    <div class="vp-playground">
      <div v-if="error" class="vp-gantt-demo__error" role="alert">{{ error }}</div>
      <div ref="host" class="vp-playground__host" />
    </div>
    <template #fallback>
      <div class="vp-playground vp-playground--loading">Loading playground…</div>
    </template>
  </ClientOnly>
</template>
