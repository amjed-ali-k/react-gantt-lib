## v0.1.6

* [Update RELEASE_NOTES.md for version 0.1.5, reflecting enhancements to custom row functionality and linking to the full changelog.](https://github.com/amjed-ali-k/react-gantt-lib/commit/a3c7bb136e4a56565c2153c344551556f7f748ab) ([a3c7bb1](https://github.com/amjed-ali-k/react-gantt-lib/commit/a3c7bb136e4a56565c2153c344551556f7f748ab))
* [Refactor GanttChart and related components for improved visibility handling](https://github.com/amjed-ali-k/react-gantt-lib/commit/0d5c2460e0811feb070695a5dd1b8aff9f9ae5d4) ([0d5c246](https://github.com/amjed-ali-k/react-gantt-lib/commit/0d5c2460e0811feb070695a5dd1b8aff9f9ae5d4))
  * Updated GanttChart to manage horizontal scroll and viewport width, enhancing the visible column range.
  * Modified DailyColorStrip to utilize new visibleColumns data for rendering segments accurately.
  * Enhanced Timeline components to filter and display elements based on the visible column range.
  * Introduced new types and utility functions for managing visible columns across the application.
* [Enhance GanttChart and demo components with large timeline support](https://github.com/amjed-ali-k/react-gantt-lib/commit/79d822f3195dec82ff17474303aecfa9f2ad27cd) ([79d822f](https://github.com/amjed-ali-k/react-gantt-lib/commit/79d822f3195dec82ff17474303aecfa9f2ad27cd))
  * Introduced a new ChartSection for displaying a large timeline with a 12-band gradient row in the demo.
  * Updated ExamplesDemo to include state management for large tasks and zoom levels.
  * Refactored ChartSection to accept an optional badgeClassName for better customization.
  * Optimized GanttChart to prevent unnecessary re-renders of custom row generators when tasks update within a fixed range.
  * Enhanced DailyColorStrip component with memoization for performance improvements.
* [0.1.6](https://github.com/amjed-ali-k/react-gantt-lib/commit/76183d184712322802b2ade50e4361c212c65d02) ([76183d1](https://github.com/amjed-ali-k/react-gantt-lib/commit/76183d184712322802b2ade50e4361c212c65d02))

**Full Changelog**: https://github.com/amjed-ali-k/react-gantt-lib/compare/v0.1.5...v0.1.6
