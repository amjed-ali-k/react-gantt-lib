<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import { createElement, type ComponentType } from 'react';
import { createRoot, type Root } from 'react-dom/client';

const props = defineProps<{
  name: string;
  height?: number;
}>();

const host = ref<HTMLElement | null>(null);
const error = ref<string | null>(null);
let root: Root | null = null;

const loaders: Record<string, () => Promise<{ default: ComponentType<{ height?: number }> }>> = {
  'quick-start': () => import('../demos/QuickStartDemo'),
  'group-summary': () => import('../demos/GroupSummaryDemo'),
  'sticky-rows': () => import('../demos/StickyRowsDemo'),
  'grid-snap': () => import('../demos/GridSnapDemo'),
  'large-timeline': () => import('../demos/LargeTimelineDemo'),
  'custom-rows': () => import('../demos/CustomRowsDemo'),
  timezone: () => import('../demos/TimezoneDemo'),
  advanced: () => import('../demos/AdvancedDemo'),
  interactions: () => import('../demos/InteractionsDemo'),
  'custom-row-hook': () => import('../demos/CustomRowsDemo'),
};

async function mountChart(el: HTMLElement) {
  const loader = loaders[props.name];
  if (!loader) {
    error.value = `Unknown demo: ${props.name}`;
    return;
  }

  try {
    error.value = null;
    root?.unmount();
    const { default: Demo } = await loader();
    root = createRoot(el);
    root.render(createElement(Demo, { height: props.height }));
  } catch (err) {
    console.error('[GanttDemo] mount failed:', err);
    error.value = err instanceof Error ? err.message : String(err);
  }
}

watch(
  host,
  (el) => {
    if (el) void mountChart(el);
  },
  { flush: 'post' },
);

watch(
  () => [props.name, props.height] as const,
  () => {
    if (host.value) void mountChart(host.value);
  },
);

onBeforeUnmount(() => {
  root?.unmount();
  root = null;
});
</script>

<template>
  <ClientOnly>
    <div class="vp-gantt-demo" :style="height ? { '--vp-gantt-height': height + 'px' } : undefined">
      <div v-if="error" class="vp-gantt-demo__error" role="alert">{{ error }}</div>
      <div ref="host" class="vp-gantt-demo__host docs-demo-root" />
    </div>
    <template #fallback>
      <div class="vp-gantt-demo vp-gantt-demo--loading">Loading chart…</div>
    </template>
  </ClientOnly>
</template>
