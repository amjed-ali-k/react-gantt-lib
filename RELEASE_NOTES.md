## v0.4.0

* [Release v0.3.0](https://github.com/amjed-ali-k/react-gantt-lib/commit/c855977f99bd2944bf9f1e72d9eb1c7e985153a5) ([c855977](https://github.com/amjed-ali-k/react-gantt-lib/commit/c855977f99bd2944bf9f1e72d9eb1c7e985153a5))
* [feat(dependencies): drag-to-link — connector handles, preview, auto-scroll, keyboard (#4)](https://github.com/amjed-ali-k/react-gantt-lib/commit/daedf474f72e9838be7b1ff9edf5507a7e5bbb2b) ([daedf47](https://github.com/amjed-ali-k/react-gantt-lib/commit/daedf474f72e9838be7b1ff9edf5507a7e5bbb2b))
  * readOnly tasks get no handles
  * a link drag ending on its own bar no longer selects the task
  * a keyboard session ends when focus leaves the chart; Escape outside the chart is left alone
  * keyboard sessions re-measure on scroll
  * the type menu flips above the bar when it would be clipped, and survives Safari's no-focus clicks
  * auto-scroll pauses over a droppable handle; pointer moves coalesce to one per frame
  * bar lookup by attribute selector; touch-action: none on handles
  * linkable bars are role=group (Enter/Space are TM-20's)
  * one LinkSession shape (from/target endpoints) for pointer and keyboard; preview measured once,
  * store handlers set once at construction; drop resolution inlined; store.name shared
  * enableDependencyCreate resolved with the other interaction flags (readOnly included) and passed
  * the linking class is toggled by the link layer, so starting/ending a link no longer re-renders
  * the type menu is focusable on first render (was hidden until placed)
  * only dependencyTypeForEdges is newly public
  * ---------
* [0.4.0](https://github.com/amjed-ali-k/react-gantt-lib/commit/1f5967174c54330143215805e1b71471662bcb56) ([1f59671](https://github.com/amjed-ali-k/react-gantt-lib/commit/1f5967174c54330143215805e1b71471662bcb56))

**Full Changelog**: https://github.com/amjed-ali-k/react-gantt-lib/compare/v0.3.0...v0.4.0
