## v0.1.13

* [Update RELEASE_NOTES.md for version 0.1.12, detailing enhancements including DragPreview functionality, optimizations in custom rows handling, and improvements to TaskBar props comparison. Added links to relevant commits for further reference.](https://github.com/amjed-ali-k/react-gantt-lib/commit/abb0470a02b192c34ddee9b63bbb7445ee198b7e) ([abb0470](https://github.com/amjed-ali-k/react-gantt-lib/commit/abb0470a02b192c34ddee9b63bbb7445ee198b7e))
* [Implement group summary roll-up functionality in GanttChart](https://github.com/amjed-ali-k/react-gantt-lib/commit/d46005775949aabe783fa83fce26980db57f0a5c) ([d460057](https://github.com/amjed-ali-k/react-gantt-lib/commit/d46005775949aabe783fa83fce26980db57f0a5c))
  * Added `GroupSummaryRollup` interface to define roll-up behavior for group summary bars.
  * Enhanced `GanttChart` and related components to support per-group summary bar roll-up options for dates, progress, and baselines.
  * Updated task resolution logic to compute roll-up values from child tasks, ensuring accurate summary representation even when groups are collapsed.
  * Introduced helper functions to determine roll-up flags and compute summary values, improving task interaction management.
  * Added tests to validate roll-up behavior and ensure correct functionality across various scenarios.
* [0.1.13](https://github.com/amjed-ali-k/react-gantt-lib/commit/c1bc64fb8550c65d8d881c4d49da99c289c6677e) ([c1bc64f](https://github.com/amjed-ali-k/react-gantt-lib/commit/c1bc64fb8550c65d8d881c4d49da99c289c6677e))

**Full Changelog**: https://github.com/amjed-ali-k/react-gantt-lib/compare/v0.1.12...v0.1.13
