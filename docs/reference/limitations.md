---
title: Limitations
description: Known limitations and future work for react-gantt-lib.
---

# Limitations

- `__timeline__` custom cell generators do not re-run on scroll — use `useGanttTimeline()` for live scroll/window data
- `lag` is drawn as a label only; it does not move or constrain bars (there is no scheduling engine)
- `onGanttHover` for blocks may not fire when the pointer is over a task bar (bars sit above the block hit layer)
- No built-in context menu UI — use `onGanttContextMenu` + your own menu component
- No built-in task creation/editing forms — use `renderTaskTooltip` + `onChange` for inline edits
- No resource assignment or multi-project views
- Middle panel start/end show date only (not time)
- Sticky tasks are excluded from the scrollable timeline hit layer
- Dependency arrows use full task list row indices; pinned rows may affect visual arrow paths
- Week starts Monday (`weekStartsOn: 1`)

Have a feature request? [Open an issue on GitHub](https://github.com/amjed-ali-k/react-gantt-lib/issues).
