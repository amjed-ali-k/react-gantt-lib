---
layout: home

title: react-gantt-lib
titleTemplate: High-performance React Gantt Chart

hero:
  name: React Gantt Library
  text: High-performance React Gantt
  tagline: Granular bar updates, draggable panels, sticky rows, custom timeline bands, and rich event hooks — built with date-fns for React 18+.
  image:
    src: /logo.svg
    alt: react-gantt-lib
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Live Examples
      link: /examples/
    - theme: alt
      text: Open Playground
      link: /playground/

features:
  - icon: ⚡
    title: Granular performance
    details: TaskStore + per-task version counters mean only the changed bar re-renders on drag, resize, or progress edits — not the whole chart.
  - icon: 🧩
    title: Three draggable panels
    details: Left task list, middle date columns, and SVG timeline with synchronized scroll and resizable dividers.
  - icon: 📌
    title: Sticky rows
    details: Pin task rows or custom footer bands to the top or bottom of the viewport while scrolling large schedules.
  - icon: 🌍
    title: Display timezone
    details: Set an IANA timezone so every viewer sees the same labels — headers, columns, and tooltips stay in sync.
  - icon: 🎨
    title: Custom timeline rows
    details: Async sidebar cells and full-width __timeline__ bands with useGanttTimeline() and column virtualization helpers.
  - icon: 🖱️
    title: Rich interactions
    details: Drag, resize, snap, multi-select, dependencies, baselines, blocked dates, event markers, and unified click/hover targets.
---

## Try it now

<GanttDemo name="quick-start" :height="340" />

<p class="home-demo-links">
  <a href="/examples/">Browse all examples →</a>
  <span aria-hidden="true">·</span>
  <a href="/playground/">Open interactive playground →</a>
</p>

## Install

```bash
npm install react-gantt-lib date-fns react react-dom
```

```tsx
import { GanttChart } from 'react-gantt-lib';
import 'react-gantt-lib/styles.css';
```

See the [Getting Started guide](/guide/getting-started) for a full walkthrough.
