## v0.5.0

* [Release v0.4.0](https://github.com/amjed-ali-k/react-gantt-lib/commit/a9a36bb7d84eb050529f8c32ac236cbd41e7db59) ([a9a36bb](https://github.com/amjed-ali-k/react-gantt-lib/commit/a9a36bb7d84eb050529f8c32ac236cbd41e7db59))
* [feat(a11y): keyboard-operable bars, treegrid ARIA, announcements, reduced motion, critical path (#5)](https://github.com/amjed-ali-k/react-gantt-lib/commit/f1b048bbb25b6bc067a687ad602dd5d4fce26cdf) ([f1b048b](https://github.com/amjed-ali-k/react-gantt-lib/commit/f1b048bbb25b6bc067a687ad602dd5d4fce26cdf))
  * bars are rows of a role=treegrid, one roving tab stop; named '{name}, {start} to {end}, {progress}%,
  * keys: Up/Down rows, Left/Right move one grid unit, Shift/Alt+Left/Right resize end/start, Enter
  * announce prop, or a built-in visually hidden role=status region; link progress is worded as a
  * dependency links: one roving tab stop (role=group 'Dependencies'), arrows/Home/End
  * prefers-reduced-motion: rg-gantt--reduced-motion + media rule switch off transitions; Home/End jump
  * critical?: boolean on tasks: dashed outline; today marker labelled
  * axe-core check in vitest
  * keyboard move/resize steps by the zoom scale's calendar unit (addScaleSteps), not fixed ms, so
  * names and announcements show the time when the task has one (hour/minute zoom)
  * arrows that cannot change the bar are not swallowed (Alt+Left stays Back)
  * memo compares resolved dates by value and predecessors by id, not by reference
  * no empty treegrid; group rows carry aria-expanded
  * announcements live in their own store: speaking re-renders only the region
  * reduced motion starts false and syncs after mount (SSR-safe; the media rule covers first paint)
  * one attribute-escape helper
  * RovingFocus caches the tab stop and wakes only the old and new item (was every bar, O(n) each)
  * bar names memoised on the fields they read; predecessor names from one Map, not find()
  * allocation-free predecessor comparison in the TaskBar memo
  * zoom via nextScaleInList; Space reuses the click payload; normalizeDependency reused
  * smaller: link-store self-target announces directly, one linkOf per key, required grid props
  * ---------
* [0.5.0](https://github.com/amjed-ali-k/react-gantt-lib/commit/1366a7b5412dd18846328d01a05abc3049ca5c91) ([1366a7b](https://github.com/amjed-ali-k/react-gantt-lib/commit/1366a7b5412dd18846328d01a05abc3049ca5c91))

**Full Changelog**: https://github.com/amjed-ali-k/react-gantt-lib/compare/v0.4.0...v0.5.0
