## v0.1.12

* [Update README.md to enhance documentation with new features including sticky rows, display-timezone support, and a comprehensive table of contents. Improved installation instructions and added examples for better user guidance. Update RELEASE_NOTES.md for version 0.1.11, reflecting recent changes and enhancements.](https://github.com/amjed-ali-k/react-gantt-lib/commit/1c62221c4cbffff4d0dc72ef7b393adcad5ef1c9) ([1c62221](https://github.com/amjed-ali-k/react-gantt-lib/commit/1c62221c4cbffff4d0dc72ef7b393adcad5ef1c9))
* [Add DragPreview functionality to GanttChart and related components](https://github.com/amjed-ali-k/react-gantt-lib/commit/5719096a73ede80ae87927aaaf0e93ff0155bd06) ([5719096](https://github.com/amjed-ali-k/react-gantt-lib/commit/5719096a73ede80ae87927aaaf0e93ff0155bd06))
  * Introduced DragPreviewStore to manage drag preview state across components.
  * Updated GanttChart to utilize DragPreviewProvider and pass dragPreviewStore to child components.
  * Enhanced DependencyLayer, TaskBar, and TimelineBody to integrate drag preview updates during task dragging.
  * Added tests to verify dependency arrow updates during drag without triggering onTasksChange.
  * Updated index exports to include DragPreviewStore and related types.
* [Refactor GanttChart to optimize custom rows handling and sidebar metrics](https://github.com/amjed-ali-k/react-gantt-lib/commit/d02ee61bbfd8d6d4c267cf384d74aecc51347d46) ([d02ee61](https://github.com/amjed-ali-k/react-gantt-lib/commit/d02ee61bbfd8d6d4c267cf384d74aecc51347d46))
  * Introduced EMPTY_CUSTOM_ROWS constant to prevent unnecessary array allocations.
  * Updated customRows prop to use EMPTY_CUSTOM_ROWS by default.
  * Enhanced sidebar metrics management to ensure stable references during renders, improving performance.
  * Adjusted zoom change handling to maintain stable references for zoom inputs, reducing re-renders of memoized components.
* [Enhance TaskBar props comparison and refactor TaskStore methods](https://github.com/amjed-ali-k/react-gantt-lib/commit/ce3bb49a60e5e1d66002250bfa0787144eb1f492) ([ce3bb49](https://github.com/amjed-ali-k/react-gantt-lib/commit/ce3bb49a60e5e1d66002250bfa0787144eb1f492))
  * Added height comparison to propsEqual function in TaskBar for improved prop change detection.
  * Refactored replaceTasks method in TaskStore to apply changes through a new private method applyReplace, enhancing clarity and functionality.
  * Introduced syncExternalTasks method to handle external task synchronization during render without triggering component updates prematurely.
* [0.1.12](https://github.com/amjed-ali-k/react-gantt-lib/commit/45fcc11ad2dd24b72cf9368d770cfc464cc2a1bd) ([45fcc11](https://github.com/amjed-ali-k/react-gantt-lib/commit/45fcc11ad2dd24b72cf9368d770cfc464cc2a1bd))

**Full Changelog**: https://github.com/amjed-ali-k/react-gantt-lib/compare/v0.1.11...v0.1.12
