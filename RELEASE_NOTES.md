## v0.1.18

* [Release v0.1.17](https://github.com/amjed-ali-k/react-gantt-lib/commit/4c81c5340e0978abffe9a2223981059708d20518) ([4c81c53](https://github.com/amjed-ali-k/react-gantt-lib/commit/4c81c5340e0978abffe9a2223981059708d20518))
* [Refactor date handling in Gantt chart components](https://github.com/amjed-ali-k/react-gantt-lib/commit/1449e9de188bc22055aa15208ce6d216dc9d8858) ([1449e9d](https://github.com/amjed-ali-k/react-gantt-lib/commit/1449e9de188bc22055aa15208ce6d216dc9d8858))
  * Updated `llm.txt` to clarify the behavior of block date ranges and their rendering.
  * Modified `computeDateMarkingRects` to use exact start and end times for block date ranges, improving precision in rendering.
  * Added a test case to ensure correct handling of block date ranges with specific start and end times.
* [Add draggable markers feature to Gantt chart](https://github.com/amjed-ali-k/react-gantt-lib/commit/c84882d1fd395761973e9ba03435d2655014bb48) ([c84882d](https://github.com/amjed-ali-k/react-gantt-lib/commit/c84882d1fd395761973e9ba03435d2655014bb48))
  * Introduced `draggableMarkers` and `draggableMarkerSnapPoints` props in the Gantt chart for enhanced interactivity.
  * Implemented drag lifecycle callbacks: `onDraggableMarkerDragStart`, `onDraggableMarkerDrag`, `onDraggableMarkerDragEnd`, and `onDraggableMarkerDragToSnapPoint`.
  * Updated documentation to include new types and event callbacks related to draggable markers.
  * Enhanced demo examples and styles to showcase draggable markers functionality.
* [0.1.18](https://github.com/amjed-ali-k/react-gantt-lib/commit/e774136c2385698a203b51da034b8a78ef9dbfc4) ([e774136](https://github.com/amjed-ali-k/react-gantt-lib/commit/e774136c2385698a203b51da034b8a78ef9dbfc4))

**Full Changelog**: https://github.com/amjed-ali-k/react-gantt-lib/compare/v0.1.17...v0.1.18
