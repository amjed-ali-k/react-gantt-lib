import { createContext, memo, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { addDays, addHours, addMinutes, addMonths, addWeeks, differenceInDays, differenceInHours, differenceInMinutes, differenceInMonths, differenceInWeeks, endOfDay, endOfHour, endOfMinute, endOfMonth, endOfWeek, format, format as format$1, isValid, parseISO, startOfDay, startOfHour, startOfMinute, startOfMonth, startOfWeek } from "date-fns";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";

//#region src/hooks/useGanttEmitter.ts
const CALLBACK_MAP = {
	taskClick: "onTaskClick",
	taskDoubleClick: "onTaskDoubleClick",
	ganttClick: "onGanttClick",
	ganttContextMenu: "onGanttContextMenu",
	ganttHover: "onGanttHover",
	taskHover: "onTaskHover",
	taskDragStart: "onTaskDragStart",
	taskDrag: "onTaskDrag",
	taskDragEnd: "onTaskDragEnd",
	taskResizeStart: "onTaskResizeStart",
	taskResize: "onTaskResize",
	taskResizeEnd: "onTaskResizeEnd",
	progressChange: "onProgressChange",
	draggableMarkerDragStart: "onDraggableMarkerDragStart",
	draggableMarkerDrag: "onDraggableMarkerDrag",
	draggableMarkerDragEnd: "onDraggableMarkerDragEnd",
	draggableMarkerDragToSnapPoint: "onDraggableMarkerDragToSnapPoint",
	zoomChange: "onZoomChange",
	scroll: "onScroll",
	sidebarLayoutChange: "onSidebarLayoutChange",
	selectionChange: "onSelectionChange",
	dependencyClick: "onDependencyClick",
	dependencyContextMenu: "onDependencyContextMenu",
	dependencyHover: "onDependencyHover",
	dependencyDelete: "onDependencyDelete",
	customRowCellReady: "onCustomRowCellReady",
	customRowCellError: "onCustomRowCellError"
};
function useGanttEmitter(callbacks) {
	const ref = useRef(callbacks);
	ref.current = callbacks;
	return useCallback((name, detail) => {
		const key = CALLBACK_MAP[name];
		const handler = ref.current[key];
		handler?.(detail);
	}, []);
}

//#endregion
//#region src/core/selection.ts
const EMPTY = [];
function toggle(ids, id) {
	return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}
/** Keeps the same empty array, so a no-op clear does not hand memoised children a new reference. */
function cleared(ids) {
	return ids.length === 0 ? ids : EMPTY;
}
function selectTask(current, taskId, multi) {
	if (multi) return {
		taskIds: toggle(current.taskIds, taskId),
		dependencyIds: current.dependencyIds
	};
	return {
		taskIds: [taskId],
		dependencyIds: cleared(current.dependencyIds)
	};
}
function selectDependency(current, dependencyId$1, multi) {
	if (multi) return {
		taskIds: current.taskIds,
		dependencyIds: toggle(current.dependencyIds, dependencyId$1)
	};
	return {
		taskIds: cleared(current.taskIds),
		dependencyIds: [dependencyId$1]
	};
}

//#endregion
//#region src/core/rowLayout.ts
const BASELINE_ROW_EXTRA = 10;
const BASELINE_BOTTOM_PAD = 6;
const BASELINE_BAR_GAP = 4;
const BASELINE_LINE_HEIGHT = 3;
const MILESTONE_BASELINE_TOP_OFFSET = 2;
function taskHasBarBaseline(task, showBaseline) {
	return showBaseline && task._baselineStart != null && task.type !== "milestone";
}
function getEffectiveRowHeight(task, baseRowHeight, showBaseline) {
	if (!taskHasBarBaseline(task, showBaseline)) return baseRowHeight;
	return baseRowHeight + BASELINE_ROW_EXTRA;
}
function computeRowLayouts(tasks, baseRowHeight, showBaseline) {
	let y = 0;
	return tasks.map((task) => {
		const height = getEffectiveRowHeight(task, baseRowHeight, showBaseline);
		const layout = {
			y,
			height
		};
		y += height;
		return layout;
	});
}
function totalRowLayoutHeight(layouts) {
	return layouts.reduce((sum, row) => sum + row.height, 0);
}
function getTaskBarHeight(task, rowHeight, hasBarBaseline) {
	if (task.width != null) return task.width;
	if (hasBarBaseline) return Math.max(14, rowHeight - 12 - BASELINE_BOTTOM_PAD - BASELINE_LINE_HEIGHT - BASELINE_BAR_GAP);
	return Math.max(16, rowHeight - 12);
}
function getTaskBarPad(_task, rowHeight, barHeight, hasBarBaseline) {
	if (hasBarBaseline) return 6;
	return (rowHeight - barHeight) / 2;
}
function getTaskBarCenterY(task, row, showBaseline) {
	const hasBarBaseline = taskHasBarBaseline(task, showBaseline);
	const barHeight = getTaskBarHeight(task, row.height, hasBarBaseline);
	const barPad = getTaskBarPad(task, row.height, barHeight, hasBarBaseline);
	return row.y + barPad + barHeight / 2;
}

//#endregion
//#region src/core/displayFormat.ts
const formatterCache = /* @__PURE__ */ new Map();
function cachedFormatter(timeZone, options) {
	const key = `${timeZone}\0${JSON.stringify(options)}`;
	let fmt = formatterCache.get(key);
	if (!fmt) {
		fmt = new Intl.DateTimeFormat("en-US", {
			...options,
			timeZone
		});
		formatterCache.set(key, fmt);
	}
	return fmt;
}
function partMap(date, timeZone, options) {
	const map = {};
	for (const p of cachedFormatter(timeZone, options).formatToParts(date)) if (p.type !== "literal") map[p.type] = p.value;
	return map;
}
/** Date-only string for sidebar middle columns. */
function formatDisplayDate(date, timeZone) {
	if (!timeZone) return date.toLocaleDateString();
	if (date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0 && date.getMilliseconds() === 0) return date.toLocaleDateString("en-US");
	return date.toLocaleDateString("en-US", { timeZone });
}
/** True when the instant has a non-midnight clock time in the display timezone. */
function hasDisplayTime(date, timeZone) {
	if (!timeZone) return date.getHours() !== 0 || date.getMinutes() !== 0 || date.getSeconds() !== 0 || date.getMilliseconds() !== 0;
	const p = partMap(date, timeZone, {
		hour: "numeric",
		minute: "numeric",
		second: "numeric",
		hour12: false
	});
	return Number(p.hour) !== 0 || Number(p.minute) !== 0 || Number(p.second) !== 0;
}
/** Format a date for on-screen labels. Falls back to date-fns in the browser timezone when `timeZone` is omitted. */
function formatDisplay(date, pattern, timeZone) {
	if (!timeZone) return format$1(date, pattern);
	switch (pattern) {
		case "HH:mm": {
			const p = partMap(date, timeZone, {
				hour: "2-digit",
				minute: "2-digit",
				hour12: false
			});
			return `${p.hour}:${p.minute}`;
		}
		case "HH:00": return `${partMap(date, timeZone, {
			hour: "2-digit",
			hour12: false
		}).hour}:00`;
		case "d": return partMap(date, timeZone, { day: "numeric" }).day;
		case "MMM d": {
			const p = partMap(date, timeZone, {
				month: "short",
				day: "numeric"
			});
			return `${p.month} ${p.day}`;
		}
		case "MMM yyyy": {
			const p = partMap(date, timeZone, {
				month: "short",
				year: "numeric"
			});
			return `${p.month} ${p.year}`;
		}
		case "EEE d MMM": {
			const p = partMap(date, timeZone, {
				weekday: "short",
				day: "numeric",
				month: "short"
			});
			return `${p.weekday} ${p.day} ${p.month}`;
		}
		case "MMMM yyyy": {
			const p = partMap(date, timeZone, {
				month: "long",
				year: "numeric"
			});
			return `${p.month} ${p.year}`;
		}
		case "yyyy": return partMap(date, timeZone, { year: "numeric" }).year;
		case "MMM d, yyyy": {
			const p = partMap(date, timeZone, {
				month: "short",
				day: "numeric",
				year: "numeric"
			});
			return `${p.month} ${p.day}, ${p.year}`;
		}
		case "MMM d, yyyy HH:mm": {
			const p = partMap(date, timeZone, {
				month: "short",
				day: "numeric",
				year: "numeric",
				hour: "2-digit",
				minute: "2-digit",
				hour12: false
			});
			return `${p.month} ${p.day}, ${p.year} ${p.hour}:${p.minute}`;
		}
		default: return format$1(date, pattern);
	}
}

//#endregion
//#region src/core/dates.ts
function toDate(value) {
	if (value instanceof Date) return value;
	const parsed = parseISO(value);
	if (isValid(parsed)) return parsed;
	const fallback = new Date(value);
	if (isValid(fallback)) return fallback;
	throw new Error(`Invalid date: ${value}`);
}
function addUnit(date, amount, zoom) {
	switch (zoom) {
		case "minute": return addMinutes(date, amount);
		case "hour": return addHours(date, amount);
		case "day": return addDays(date, amount);
		case "week": return addWeeks(date, amount);
		case "month": return addMonths(date, amount);
		default: return zoom;
	}
}
function diffUnits(later, earlier, zoom) {
	switch (zoom) {
		case "minute": return differenceInMinutes(later, earlier);
		case "hour": return differenceInHours(later, earlier);
		case "day": return differenceInDays(later, earlier);
		case "week": return differenceInWeeks(later, earlier);
		case "month": return differenceInMonths(later, earlier);
		default: return zoom;
	}
}
/** Human-readable date/time for task tooltips (time omitted at midnight). */
function formatTaskDateTime(value, timeZone) {
	const d = toDate(value);
	return formatDisplay(d, hasDisplayTime(d, timeZone) ? "MMM d, yyyy HH:mm" : "MMM d, yyyy", timeZone);
}

//#endregion
//#region src/core/groupTasks.ts
function isGroupTask(task) {
	return task.type === "group";
}
function taskHasChildren(taskId, tasks) {
	return tasks.some((task) => task.parentId === taskId);
}
/** Rows that can expand/collapse descendants in the sidebar. */
function taskSupportsCollapse(task, tasks) {
	return isGroupTask(task) || taskHasChildren(task.id, tasks);
}
/** Group rows show a summary bar unless explicitly disabled. */
function groupShowsSummaryBar(task) {
	if (!isGroupTask(task)) return false;
	return task.showSummaryBar !== false;
}
function buildTaskMap(tasks) {
	return new Map(tasks.map((task) => [task.id, task]));
}
function collectDescendantIds(parentId, tasks) {
	const ids = [];
	for (const task of tasks) {
		if (task.parentId !== parentId) continue;
		ids.push(task.id);
		ids.push(...collectDescendantIds(task.id, tasks));
	}
	return ids;
}
/** Leaf descendants that contribute to a summary group's roll-up. */
function collectRollupDescendants(group, tasks, taskMap = buildTaskMap(tasks)) {
	const descendants = [];
	for (const id of collectDescendantIds(group.id, tasks)) {
		const descendant = taskMap.get(id);
		if (!descendant) continue;
		if (isGroupTask(descendant) && groupShowsSummaryBar(descendant)) continue;
		descendants.push(descendant);
	}
	return descendants;
}
function resolveGroupRollupFlag(task, key, defaults) {
	const taskValue = task.rollup?.[key];
	if (taskValue !== void 0) return taskValue;
	const defaultValue = defaults?.[key];
	if (defaultValue !== void 0) return defaultValue;
	return true;
}
function shouldRollupGroupDates(task, defaults) {
	return isGroupTask(task) && groupShowsSummaryBar(task) && resolveGroupRollupFlag(task, "dates", defaults);
}
function shouldRollupGroupProgress(task, defaults) {
	if (!isGroupTask(task) || !groupShowsSummaryBar(task)) return false;
	if (task.rollup?.progress !== void 0) return task.rollup.progress;
	if (defaults?.progress !== void 0) return defaults.progress;
	if (task.progress !== void 0) return false;
	return true;
}
function shouldRollupGroupBaseline(task, defaults) {
	if (!isGroupTask(task) || !groupShowsSummaryBar(task)) return false;
	if (task.rollup?.baseline !== void 0) return task.rollup.baseline;
	if (defaults?.baseline !== void 0) return defaults.baseline;
	if (task.baseline !== void 0) return false;
	return true;
}
function isBarHiddenByGroupAncestor(_task, _tasks) {
	return false;
}
function shouldRenderTaskBar(task, tasks) {
	if (isGroupTask(task) && !groupShowsSummaryBar(task)) return false;
	if (isBarHiddenByGroupAncestor(task, tasks)) return false;
	return true;
}
/** Compute all summary roll-up values from descendants in a single pass. */
function computeGroupSummaryRollup(task, tasks, taskMap) {
	const descendants = collectRollupDescendants(task, tasks, taskMap);
	if (descendants.length === 0) return {
		dates: null,
		progress: null,
		baseline: null
	};
	let minMs = Infinity;
	let maxMs = -Infinity;
	let totalWeight = 0;
	let weightedProgress = 0;
	let baselineMinMs = Infinity;
	let baselineMaxMs = -Infinity;
	for (const descendant of descendants) {
		const start = toDate(descendant.start).getTime();
		const end = toDate(descendant.end).getTime();
		minMs = Math.min(minMs, start);
		maxMs = Math.max(maxMs, end);
		const weight = Math.max(end - start, 1);
		weightedProgress += (descendant.progress ?? 0) * weight;
		totalWeight += weight;
		if (descendant.baseline) {
			const baselineStart = toDate(descendant.baseline.start).getTime();
			const baselineEnd = toDate(descendant.baseline.end).getTime();
			baselineMinMs = Math.min(baselineMinMs, baselineStart);
			baselineMaxMs = Math.max(baselineMaxMs, baselineEnd);
		}
	}
	return {
		dates: minMs === Infinity ? null : {
			start: new Date(minMs),
			end: new Date(maxMs)
		},
		progress: totalWeight === 0 ? 0 : Math.round(weightedProgress / totalWeight),
		baseline: baselineMinMs === Infinity ? null : {
			start: new Date(baselineMinMs),
			end: new Date(baselineMaxMs)
		}
	};
}
function resolveTaskInteractionFlags(task, defaults) {
	if (task.readOnly) return {
		enableDrag: false,
		enableResize: false,
		enableProgressDrag: false
	};
	let enableDrag = task.enableDrag ?? defaults.enableDrag;
	let enableResize = task.enableResize ?? defaults.enableResize;
	let enableProgressDrag = task.enableProgressDrag ?? defaults.enableProgressDrag;
	if (shouldRollupGroupDates(task, defaults.groupSummaryRollup)) {
		enableDrag = false;
		enableResize = false;
	}
	if (shouldRollupGroupProgress(task, defaults.groupSummaryRollup)) enableProgressDrag = false;
	return {
		enableDrag,
		enableResize,
		enableProgressDrag
	};
}

//#endregion
//#region src/core/scale.ts
const PRESET_SCALES = {
	month: {
		id: "month",
		label: "Month",
		stepAmount: 1,
		stepUnit: "month",
		columnWidth: 120
	},
	week: {
		id: "week",
		label: "Week",
		stepAmount: 1,
		stepUnit: "week",
		columnWidth: 140
	},
	day: {
		id: "day",
		label: "Day",
		stepAmount: 1,
		stepUnit: "day",
		columnWidth: 48
	},
	"2day": {
		id: "2day",
		label: "2 Days",
		stepAmount: 2,
		stepUnit: "day",
		columnWidth: 64
	},
	"6hour": {
		id: "6hour",
		label: "6 Hours",
		stepAmount: 6,
		stepUnit: "hour",
		columnWidth: 56
	},
	"3hour": {
		id: "3hour",
		label: "3 Hours",
		stepAmount: 3,
		stepUnit: "hour",
		columnWidth: 48
	},
	"1hour": {
		id: "1hour",
		label: "1 Hour",
		stepAmount: 1,
		stepUnit: "hour",
		columnWidth: 40
	},
	hour: {
		id: "hour",
		label: "Hour",
		stepAmount: 1,
		stepUnit: "hour",
		columnWidth: 64
	},
	minute: {
		id: "minute",
		label: "Minute",
		stepAmount: 1,
		stepUnit: "minute",
		columnWidth: 40
	}
};
const DEFAULT_ZOOM_ORDER = [
	"month",
	"week",
	"day",
	"hour",
	"minute"
];
function resolveScale(id) {
	return PRESET_SCALES[id] ?? PRESET_SCALES.day;
}
function resolveScales(ids) {
	return (ids?.length ? ids : [...DEFAULT_ZOOM_ORDER]).map((id) => resolveScale(id));
}
function startOfScaleUnit(date, scale) {
	switch (scale.stepUnit) {
		case "minute": return startOfMinute(date);
		case "hour": return startOfHour(date);
		case "day": return startOfDay(date);
		case "week": return startOfWeek(date, { weekStartsOn: 1 });
		case "month": return startOfMonth(date);
	}
}
function endOfScaleUnit(date, scale) {
	switch (scale.stepUnit) {
		case "minute": return endOfMinute(date);
		case "hour": return endOfHour(date);
		case "day": return endOfDay(date);
		case "week": return endOfWeek(date, { weekStartsOn: 1 });
		case "month": return endOfMonth(date);
	}
}
function addScaleSteps(date, steps, scale) {
	const amount = steps * scale.stepAmount;
	switch (scale.stepUnit) {
		case "minute": return addMinutes(date, amount);
		case "hour": return addHours(date, amount);
		case "day": return addDays(date, amount);
		case "week": return addWeeks(date, amount);
		case "month": return addMonths(date, amount);
	}
}
function diffScaleSteps(later, earlier, scale) {
	let raw;
	switch (scale.stepUnit) {
		case "minute":
			raw = differenceInMinutes(later, earlier);
			break;
		case "hour":
			raw = differenceInHours(later, earlier);
			break;
		case "day":
			raw = differenceInDays(later, earlier);
			break;
		case "week":
			raw = differenceInWeeks(later, earlier);
			break;
		case "month":
			raw = differenceInMonths(later, earlier);
			break;
	}
	return Math.floor(raw / scale.stepAmount);
}
function getScaleMsPerPixel(scale) {
	const anchor = new Date(2020, 5, 15, 12, 0, 0, 0);
	return (addScaleSteps(anchor, 1, scale).getTime() - anchor.getTime()) / scale.columnWidth;
}
function formatScaleHeader(date, scale, timeZone) {
	const calendarTimeZone = scale.stepUnit === "day" || scale.stepUnit === "week" || scale.stepUnit === "month" ? void 0 : timeZone;
	if (scale.id === "2day") return formatDisplay(date, "MMM d");
	if (scale.stepUnit === "hour" || scale.stepUnit === "minute") return formatDisplay(date, "HH:mm", calendarTimeZone);
	switch (scale.stepUnit) {
		case "day": return formatDisplay(date, "d");
		case "week": return formatDisplay(date, "MMM d");
		case "month": return formatDisplay(date, "MMM yyyy");
		default: return formatDisplay(date, "d");
	}
}
function formatScaleSubHeader(date, scale, timeZone) {
	if (scale.stepUnit === "hour" || scale.stepUnit === "minute") return formatDisplay(date, "EEE d MMM", timeZone);
	if (scale.stepUnit === "day" || scale.stepUnit === "week") return formatDisplay(date, "MMMM yyyy");
	return formatDisplay(date, "yyyy");
}
function nextScaleInList(currentId, available, direction) {
	const idx = available.findIndex((s) => s.id === currentId);
	if (idx === -1) return available[0]?.id ?? "day";
	if (direction === "in") return available[Math.min(idx + 1, available.length - 1)].id;
	return available[Math.max(idx - 1, 0)].id;
}

//#endregion
//#region src/core/zoom.ts
const ZOOM_LEVELS = [...DEFAULT_ZOOM_ORDER];
function asScale(scaleOrId) {
	return typeof scaleOrId === "string" ? resolveScale(scaleOrId) : scaleOrId;
}
function getColumnWidth(scaleOrId, override) {
	const scale = asScale(scaleOrId);
	return override ?? scale.columnWidth;
}
/** Pixel width from range start through end of maxDate — avoids extra scroll past the chart end. */
function computeFixedTimelinePixelWidth(start, maxDate, scale, columnWidth) {
	const end = endOfDay(toDate(maxDate));
	return Math.max(columnWidth, Math.ceil(dateToScalePixel(end, start, scale, columnWidth)));
}
function resolveTimelineWidth(range, columnWidth) {
	return range.pixelWidth ?? range.columnCount * columnWidth;
}
function computeTimelineRange(tasks, scaleOrId, paddingUnits = 2, bounds) {
	const scale = asScale(scaleOrId);
	if (bounds?.minDate != null && bounds?.maxDate != null) {
		const start$1 = startOfScaleUnit(toDate(bounds.minDate), scale);
		const max$1 = toDate(bounds.maxDate);
		const end$1 = endOfDay(max$1);
		const cw = scale.columnWidth;
		const pixelWidth = computeFixedTimelinePixelWidth(start$1, max$1, scale, cw);
		return {
			start: start$1,
			end: end$1,
			columnCount: Math.max(1, Math.ceil(pixelWidth / cw)),
			pixelWidth,
			fixed: true
		};
	}
	if (tasks.length === 0) {
		const now = startOfScaleUnit(/* @__PURE__ */ new Date(), scale);
		return {
			start: now,
			end: addScaleSteps(now, 10, scale),
			columnCount: 10 + paddingUnits * 2
		};
	}
	let min = toDate(tasks[0].start);
	let max = toDate(tasks[0].end);
	for (const t of tasks) {
		const s = toDate(t.start);
		const e = toDate(t.end);
		if (s < min) min = s;
		if (e > max) max = e;
	}
	const start = addScaleSteps(startOfScaleUnit(min, scale), -paddingUnits, scale);
	const end = addScaleSteps(endOfScaleUnit(max, scale), paddingUnits, scale);
	return {
		start,
		end,
		columnCount: Math.max(1, diffScaleSteps(end, start, scale) + 1)
	};
}
function getMsPerPixel(scaleOrId, columnWidthOverride) {
	const scale = asScale(scaleOrId);
	if (columnWidthOverride != null && columnWidthOverride !== scale.columnWidth) return getScaleMsPerPixel(scale) * (scale.columnWidth / columnWidthOverride);
	return getScaleMsPerPixel(scale);
}
function dateToScalePixel(date, rangeStart, scaleOrId, columnWidth) {
	const scale = asScale(scaleOrId);
	const cw = getColumnWidth(scale, columnWidth);
	let stepIndex = diffScaleSteps(date, rangeStart, scale);
	let stepStart = addScaleSteps(rangeStart, stepIndex, scale);
	let nextStepStart = addScaleSteps(stepStart, 1, scale);
	while (date.getTime() < stepStart.getTime()) {
		stepIndex -= 1;
		nextStepStart = stepStart;
		stepStart = addScaleSteps(rangeStart, stepIndex, scale);
	}
	while (date.getTime() >= nextStepStart.getTime()) {
		stepIndex += 1;
		stepStart = nextStepStart;
		nextStepStart = addScaleSteps(stepStart, 1, scale);
	}
	const stepMs = nextStepStart.getTime() - stepStart.getTime();
	const fraction = stepMs > 0 ? (date.getTime() - stepStart.getTime()) / stepMs : 0;
	return stepIndex * cw + fraction * cw;
}
function scalePixelToDate(x, rangeStart, scaleOrId, columnWidth) {
	const scale = asScale(scaleOrId);
	const rawStep = x / getColumnWidth(scale, columnWidth);
	const stepIndex = Math.floor(rawStep);
	const fraction = rawStep - stepIndex;
	const stepStart = addScaleSteps(rangeStart, stepIndex, scale);
	const stepMs = addScaleSteps(stepStart, 1, scale).getTime() - stepStart.getTime();
	return new Date(stepStart.getTime() + fraction * stepMs);
}
function computeBarXExact(start, rangeStart, scaleOrId, columnWidth) {
	return dateToScalePixel(start, rangeStart, scaleOrId, columnWidth);
}
function computeBarWidthExact(start, end, scaleOrId, columnWidth, rangeStart) {
	if (rangeStart) return Math.max(6, dateToScalePixel(end, rangeStart, scaleOrId, columnWidth) - dateToScalePixel(start, rangeStart, scaleOrId, columnWidth));
	return Math.max(6, dateToScalePixel(end, start, scaleOrId, columnWidth));
}
function pixelDeltaToDates(mode, originStart, originEnd, deltaPx, msPerPixel) {
	const deltaMs = deltaPx * msPerPixel;
	const minMs = msPerPixel;
	if (mode === "move") return {
		start: new Date(originStart.getTime() + deltaMs),
		end: new Date(originEnd.getTime() + deltaMs)
	};
	if (mode === "resize-start") {
		const start = new Date(originStart.getTime() + deltaMs);
		const maxStart = originEnd.getTime() - minMs;
		return {
			start: new Date(Math.min(start.getTime(), maxStart)),
			end: originEnd
		};
	}
	const end = new Date(originEnd.getTime() + deltaMs);
	const minEnd = originStart.getTime() + minMs;
	return {
		start: originStart,
		end: new Date(Math.max(end.getTime(), minEnd))
	};
}
function finalizeDragDates(start, end, scaleOrId, snapToGrid, rangeStart) {
	if (!snapToGrid) return {
		start,
		end
	};
	const scale = asScale(scaleOrId);
	const anchor = startOfScaleUnit(rangeStart, scale);
	const snappedStart = addScaleSteps(anchor, diffScaleSteps(start, anchor, scale), scale);
	let snappedEnd = addScaleSteps(anchor, diffScaleSteps(end, anchor, scale), scale);
	if (snappedEnd.getTime() <= snappedStart.getTime()) snappedEnd = addScaleSteps(snappedStart, 1, scale);
	return {
		start: snappedStart,
		end: snappedEnd
	};
}
function clampTaskDates(start, end, bounds, mode = "move") {
	const minMs = bounds.min.getTime();
	const maxMs = bounds.max.getTime();
	const minDuration = 6e4;
	let s = start.getTime();
	let e = end.getTime();
	if (mode === "move") if (e - s > maxMs - minMs) {
		s = minMs;
		e = maxMs;
	} else {
		if (s < minMs) {
			e += minMs - s;
			s = minMs;
		}
		if (e > maxMs) {
			s -= e - maxMs;
			e = maxMs;
		}
	}
	else if (mode === "resize-start") s = Math.max(minMs, Math.min(s, e - minDuration));
	else if (mode === "resize-end") e = Math.min(maxMs, Math.max(e, s + minDuration));
	return {
		start: new Date(s),
		end: new Date(e)
	};
}
function resolveTasks(tasks, options) {
	const rollupDefaults = options?.groupSummaryRollup;
	const taskMap = buildTaskMap(tasks);
	const collapsedParents = /* @__PURE__ */ new Set();
	for (const t of tasks) if (t.collapsed) collapsedParents.add(t.id);
	function isHidden(task) {
		let pid = task.parentId;
		while (pid) {
			if (collapsedParents.has(pid)) return true;
			pid = tasks.find((t) => t.id === pid)?.parentId;
		}
		return false;
	}
	function level(task) {
		let l = 0;
		let pid = task.parentId;
		while (pid) {
			l++;
			pid = tasks.find((t) => t.id === pid)?.parentId;
		}
		return l;
	}
	return tasks.filter((t) => !isHidden(t)).map((task, rowIndex) => {
		let start = toDate(task.start);
		let end = toDate(task.end);
		let progress = task.progress ?? 0;
		let baselineStart = task.baseline ? toDate(task.baseline.start) : void 0;
		let baselineEnd = task.baseline ? toDate(task.baseline.end) : void 0;
		if (isGroupTask(task) && groupShowsSummaryBar(task)) {
			const rollupValues = computeGroupSummaryRollup(task, tasks, taskMap);
			if (shouldRollupGroupDates(task, rollupDefaults) && rollupValues.dates) {
				start = rollupValues.dates.start;
				end = rollupValues.dates.end;
			}
			if (shouldRollupGroupProgress(task, rollupDefaults) && rollupValues.progress != null) progress = rollupValues.progress;
			if (shouldRollupGroupBaseline(task, rollupDefaults)) if (rollupValues.baseline) {
				baselineStart = rollupValues.baseline.start;
				baselineEnd = rollupValues.baseline.end;
			} else {
				baselineStart = void 0;
				baselineEnd = void 0;
			}
		}
		return {
			...task,
			_start: start,
			_end: end,
			_baselineStart: baselineStart,
			_baselineEnd: baselineEnd,
			_rowIndex: rowIndex,
			_level: level(task),
			_visible: true,
			progress
		};
	});
}
function updateTaskInList(tasks, taskId, patch) {
	return tasks.map((t) => t.id === taskId ? {
		...t,
		...patch
	} : t);
}
function nextZoomLevel(current, direction, availableIds) {
	return nextScaleInList(current, (availableIds?.length ? availableIds : [...ZOOM_LEVELS]).map((id) => resolveScale(id)), direction);
}

//#endregion
//#region src/components/Timeline/milestoneGeometry.ts
/** Square diamond side length in px — width and height are always equal. */
const MILESTONE_DIAMOND_SIZE = 14;
function computeMilestoneGeometry(start, rowY, rowHeight, rangeStart, scale, columnWidth, barHeight) {
	const h = barHeight ?? Math.max(16, rowHeight - 12);
	const barPad = (rowHeight - h) / 2;
	const size = MILESTONE_DIAMOND_SIZE;
	return {
		x: computeBarXExact(start, rangeStart, scale, columnWidth) - size / 2,
		y: rowY + barPad + (h - size) / 2,
		width: size,
		height: size
	};
}
function milestoneCenterX(start, rangeStart, scale, columnWidth) {
	return computeBarXExact(start, rangeStart, scale, columnWidth);
}
/** X coordinate for dependency arrow attachment on a task bar edge. */
function taskConnectorX(task, edge, rangeStart, scale, columnWidth) {
	if (task.type === "milestone") {
		const cx = milestoneCenterX(task._start, rangeStart, scale, columnWidth);
		return edge === "start" ? cx - MILESTONE_DIAMOND_SIZE / 2 : cx + MILESTONE_DIAMOND_SIZE / 2;
	}
	const x = computeBarXExact(task._start, rangeStart, scale, columnWidth);
	if (edge === "end") return x + computeBarWidthExact(task._start, task._end, scale, columnWidth, rangeStart);
	return x;
}
function milestoneDiamondPoints(width, height) {
	return `${width / 2},0 ${width},${height / 2} ${width / 2},${height} 0,${height / 2}`;
}

//#endregion
//#region src/components/Timeline/dependencyPaths.ts
const STUB = 14;
const MIN_HEAD_RUN = 10;
const BYPASS_CLEARANCE = 8;
const CORNER_RADIUS = 4;
const HEAD_LENGTH = 8;
const HEAD_HALF_WIDTH = 4;
const DEPENDENCY_EDGES = {
	FS: {
		from: "end",
		to: "start"
	},
	SS: {
		from: "start",
		to: "start"
	},
	FF: {
		from: "end",
		to: "end"
	},
	SF: {
		from: "start",
		to: "end"
	}
};
/**
* Horizontal travel direction away from an edge: right (+1) from an end edge, left (-1) from a
* start edge. A path arrives travelling the opposite way, i.e. `-outward(to)`.
*/
function outward(edge) {
	return edge === "end" ? 1 : -1;
}
function channelY(fromY, toY) {
	if (Math.abs(toY - fromY) < CORNER_RADIUS * 2) return fromY + (toY >= fromY ? STUB : -STUB);
	return (fromY + toY) / 2;
}
function roundedOrthogonalPath(points, radius) {
	if (points.length < 2) return "";
	if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
	let d = `M ${points[0].x} ${points[0].y}`;
	for (let i = 0; i < points.length - 2; i++) {
		const p0 = points[i];
		const p1 = points[i + 1];
		const p2 = points[i + 2];
		const dx1 = p1.x - p0.x;
		const dy1 = p1.y - p0.y;
		const dx2 = p2.x - p1.x;
		const dy2 = p2.y - p1.y;
		const len1 = Math.hypot(dx1, dy1);
		const len2 = Math.hypot(dx2, dy2);
		if (len1 === 0 || len2 === 0) {
			d += ` L ${p1.x} ${p1.y}`;
			continue;
		}
		const r = Math.min(radius, len1 / 2, len2 / 2);
		const x1 = p1.x - dx1 / len1 * r;
		const y1 = p1.y - dy1 / len1 * r;
		const x2 = p1.x + dx2 / len2 * r;
		const y2 = p1.y + dy2 / len2 * r;
		d += ` L ${x1} ${y1} Q ${p1.x} ${p1.y} ${x2} ${y2}`;
	}
	const last = points[points.length - 1];
	d += ` L ${last.x} ${last.y}`;
	return d;
}
/**
* Orthogonal route (corner points) for a link of `type` from the predecessor's connector
* `(fromX, fromY)` to the successor's `(toX, toY)`. The connectors are the bar edges named by
* `DEPENDENCY_EDGES[type]`; the route leaves and arrives horizontally and always ends with at
* least `MIN_HEAD_RUN` px of straight line before the arrowhead.
*
* - **Same side** (SS, FF): one C-shaped run around whichever edge sticks out further.
* - **Opposite sides** (FS, SF): a Z when the successor's edge is far enough ahead; otherwise the
*   path doubles back through the row gutter (the "backwards" case).
*/
function routeDependency(type, fromX, fromY, toX, toY) {
	const edges = DEPENDENCY_EDGES[type];
	const out = outward(edges.from);
	const entry = -outward(edges.to);
	const exitX = fromX + out * STUB;
	const approachX = toX - entry * (MIN_HEAD_RUN + CORNER_RADIUS);
	if (out !== entry) {
		const x = out > 0 ? Math.max(exitX, approachX) : Math.min(exitX, approachX);
		return [
			{
				x: fromX,
				y: fromY
			},
			{
				x,
				y: fromY
			},
			{
				x,
				y: toY
			},
			{
				x: toX,
				y: toY
			}
		];
	}
	if ((approachX - exitX) * out >= 0) return [
		{
			x: fromX,
			y: fromY
		},
		{
			x: approachX,
			y: fromY
		},
		{
			x: approachX,
			y: toY
		},
		{
			x: toX,
			y: toY
		}
	];
	const backX = out > 0 ? Math.min(approachX - BYPASS_CLEARANCE, fromX - BYPASS_CLEARANCE) : Math.max(approachX + BYPASS_CLEARANCE, fromX + BYPASS_CLEARANCE);
	const gutterY = channelY(fromY, toY);
	return [
		{
			x: fromX,
			y: fromY
		},
		{
			x: exitX,
			y: fromY
		},
		{
			x: exitX,
			y: gutterY
		},
		{
			x: backX,
			y: gutterY
		},
		{
			x: backX,
			y: toY
		},
		{
			x: toX,
			y: toY
		}
	];
}
/** SVG path data for a route, with rounded corners. */
function routeToPath(points) {
	return roundedOrthogonalPath(points, CORNER_RADIUS);
}
/** SVG path data for a link of `type` — see `routeDependency`. */
function buildDependencyPath(type, fromX, fromY, toX, toY) {
	return routeToPath(routeDependency(type, fromX, fromY, toX, toY));
}
/**
* Arrowhead polygon (`points` attribute) with its tip on the route's last point, pointing along
* the final segment — rightwards into a start edge, leftwards into an end edge.
*/
function arrowHeadPoints(points) {
	const tip = points[points.length - 1];
	const prev = points[points.length - 2] ?? tip;
	const dir = tip.x >= prev.x ? 1 : -1;
	const baseX = tip.x - dir * HEAD_LENGTH;
	return `${tip.x},${tip.y} ${baseX},${tip.y - HEAD_HALF_WIDTH} ${baseX},${tip.y + HEAD_HALF_WIDTH}`;
}
/**
* Where a lag label sits: the middle of the route's longest vertical run, or of its first segment
* when the route is flat.
*/
function labelAnchor(points) {
	let best = null;
	let bestLength = 0;
	for (let i = 0; i < points.length - 1; i++) {
		const a$1 = points[i];
		const b$1 = points[i + 1];
		const length = Math.abs(b$1.y - a$1.y);
		if (a$1.x === b$1.x && length > bestLength) {
			bestLength = length;
			best = {
				x: a$1.x,
				y: (a$1.y + b$1.y) / 2
			};
		}
	}
	if (best) return best;
	const [a, b = a] = points;
	return {
		x: (a.x + b.x) / 2,
		y: (a.y + b.y) / 2
	};
}

//#endregion
//#region src/components/Timeline/dependencyLinks.ts
/** Stable id of the link from `fromId` (predecessor) to `toId` (successor). */
function dependencyId(fromId, toId) {
	return `${fromId}->${toId}`;
}
const KNOWN_TYPES = new Set([
	"FS",
	"SS",
	"FF",
	"SF"
]);
/** Fills in `type` and `lag`. A missing or unknown type (e.g. from untyped JSON) reads as FS. */
function normalizeDependency(dep) {
	if (typeof dep === "string") return {
		id: dep,
		type: "FS",
		lag: 0
	};
	const type = dep.type && KNOWN_TYPES.has(dep.type) ? dep.type : "FS";
	return {
		...dep,
		type,
		lag: dep.lag ?? 0
	};
}
/** Every link declared on `tasks`, as targets — whether or not both ends are rendered. */
function collectDependencyTargets(tasks, ids) {
	const byId = /* @__PURE__ */ new Map();
	for (const task of tasks) byId.set(task.id, task);
	const result = [];
	for (const to of tasks) for (const raw of to.dependencies ?? []) {
		const dependency = normalizeDependency(raw);
		const id = dependencyId(dependency.id, to.id);
		if (ids && !ids.has(id)) continue;
		const from = byId.get(dependency.id);
		if (!from) continue;
		result.push({
			type: "dependency",
			id,
			from,
			to,
			dependency
		});
	}
	return result;
}
function connectorTask(task, preview) {
	if (!preview?.dates || preview.taskId !== task.id) return task;
	return {
		...task,
		_start: preview.dates.start,
		_end: preview.dates.end
	};
}
/**
* Geometry for every link whose both ends are in `tasks`. Pure — the layers memoise it. Rows are
* looked up by position in `tasks`, not `_rowIndex` (which counts sticky rows too), so a section
* of the chart only draws links between its own rows.
*/
function computeDependencyLinks({ tasks, rowLayouts, rangeStart, scale, columnWidth, showBaseline, preview }) {
	const position = /* @__PURE__ */ new Map();
	tasks.forEach((task, i) => position.set(task.id, i));
	const links = [];
	for (const target of collectDependencyTargets(tasks)) {
		const { from, to, dependency } = target;
		const fromRow = rowLayouts[position.get(from.id) ?? -1];
		const toRow = rowLayouts[position.get(to.id) ?? -1];
		if (!fromRow || !toRow) continue;
		const edges = DEPENDENCY_EDGES[dependency.type];
		const fromX = taskConnectorX(connectorTask(from, preview), edges.from, rangeStart, scale, columnWidth);
		const toX = taskConnectorX(connectorTask(to, preview), edges.to, rangeStart, scale, columnWidth);
		const fromY = getTaskBarCenterY(from, fromRow, showBaseline);
		const toY = getTaskBarCenterY(to, toRow, showBaseline);
		const points = routeDependency(dependency.type, fromX, fromY, toX, toY);
		links.push({
			target,
			id: target.id,
			type: dependency.type,
			lag: dependency.lag,
			points,
			d: routeToPath(points),
			head: arrowHeadPoints(points),
			label: labelAnchor(points)
		});
	}
	return links;
}
/** Default lag label: the lag read as days, signed (`+2d`, `-1d`). */
function defaultDependencyLagLabel(lag) {
	return `${lag > 0 ? "+" : "-"}${Math.abs(lag)}d`;
}
const DEPENDENCY_TYPE_NAMES = {
	FS: "finish to start",
	SS: "start to start",
	FF: "finish to finish",
	SF: "start to finish"
};
/** Accessible name for a link, e.g. "Dependency: Design finish to start Build, lag +2d". */
function dependencyAccessibleName(link, lagLabel) {
	const { from, to } = link.target;
	const lag = lagLabel ? `, lag ${lagLabel}` : "";
	return `Dependency: ${from.name} ${DEPENDENCY_TYPE_NAMES[link.type]} ${to.name}${lag}`;
}

//#endregion
//#region src/hooks/useSidebarLayout.ts
function useSidebarLayout(containerRef, options = {}) {
	const { defaultLeftWidth = 220, defaultMiddleWidth = 180, minPanelWidth = 80, onLayoutChange } = options;
	const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
	const [middleWidth, setMiddleWidth] = useState(defaultMiddleWidth);
	const [totalWidth, setTotalWidth] = useState(0);
	const dragRef = useRef(null);
	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		const ro = new ResizeObserver((entries) => {
			setTotalWidth(entries[0]?.contentRect.width ?? el.clientWidth);
		});
		ro.observe(el);
		setTotalWidth(el.clientWidth);
		return () => ro.disconnect();
	}, [containerRef]);
	const timelineLeft = leftWidth + middleWidth;
	const rightWidth = Math.max(0, totalWidth - timelineLeft);
	const layout = {
		leftWidth,
		middleWidth,
		rightWidth,
		timelineLeft,
		totalWidth
	};
	const onLayoutChangeRef = useRef(onLayoutChange);
	onLayoutChangeRef.current = onLayoutChange;
	const lastEmittedRef = useRef(null);
	useEffect(() => {
		const last = lastEmittedRef.current;
		if (last && last.leftWidth === leftWidth && last.middleWidth === middleWidth && last.totalWidth === totalWidth) return;
		const next = {
			leftWidth,
			middleWidth,
			rightWidth,
			timelineLeft,
			totalWidth
		};
		lastEmittedRef.current = next;
		onLayoutChangeRef.current?.(next);
	}, [
		leftWidth,
		middleWidth,
		totalWidth,
		rightWidth,
		timelineLeft
	]);
	return {
		layout,
		leftWidth,
		middleWidth,
		timelineLeft,
		onDividerPointerDown: useCallback((divider) => (e) => {
			e.preventDefault();
			dragRef.current = {
				divider,
				startX: e.clientX,
				startLeft: leftWidth,
				startMiddle: middleWidth
			};
			e.target.setPointerCapture(e.pointerId);
		}, [leftWidth, middleWidth]),
		onDividerPointerMove: useCallback((e) => {
			const drag = dragRef.current;
			if (!drag) return;
			const dx = e.clientX - drag.startX;
			if (drag.divider === "left") {
				const maxLeft = totalWidth - minPanelWidth * 2;
				setLeftWidth(Math.max(minPanelWidth, Math.min(maxLeft, drag.startLeft + dx)));
			} else {
				const maxMiddle = totalWidth - drag.startLeft - minPanelWidth;
				setMiddleWidth(Math.max(minPanelWidth, Math.min(maxMiddle, drag.startMiddle + dx)));
			}
		}, [totalWidth, minPanelWidth]),
		onDividerPointerUp: useCallback((e) => {
			dragRef.current = null;
			try {
				e.target.releasePointerCapture(e.pointerId);
			} catch {}
		}, []),
		setLeftWidth,
		setMiddleWidth
	};
}

//#endregion
//#region src/hooks/useTaskStore.ts
/** External store for granular task updates — only subscribers to changed task re-render */
var TaskStore = class {
	tasks;
	version = 0;
	taskVersions = /* @__PURE__ */ new Map();
	listeners = /* @__PURE__ */ new Set();
	constructor(initial) {
		this.tasks = initial;
		for (const t of initial) this.taskVersions.set(t.id, 0);
	}
	subscribe = (listener) => {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	};
	getSnapshot = () => this.tasks;
	getVersion = () => this.version;
	getTaskVersion(taskId) {
		return this.taskVersions.get(taskId) ?? 0;
	}
	notify() {
		this.version++;
		for (const l of this.listeners) l();
	}
	bumpTask(taskId) {
		this.taskVersions.set(taskId, (this.taskVersions.get(taskId) ?? 0) + 1);
	}
	setTasks(tasks) {
		this.tasks = tasks;
		for (const t of tasks) if (!this.taskVersions.has(t.id)) this.taskVersions.set(t.id, 0);
		this.notify();
	}
	updateTask(taskId, patch) {
		this.tasks = updateTaskInList(this.tasks, taskId, patch);
		this.bumpTask(taskId);
		this.notify();
	}
	applyReplace(tasks) {
		const changed = /* @__PURE__ */ new Set();
		const oldMap = new Map(this.tasks.map((t) => [t.id, t]));
		for (const t of tasks) {
			const old = oldMap.get(t.id);
			if (!old || JSON.stringify(old) !== JSON.stringify(t)) changed.add(t.id);
		}
		const lengthChanged = tasks.length !== oldMap.size;
		if (changed.size === 0 && !lengthChanged) return false;
		this.tasks = tasks;
		for (const id of changed) this.bumpTask(id);
		return true;
	}
	replaceTasks(tasks) {
		if (this.applyReplace(tasks)) this.notify();
	}
	/**
	* Sync tasks from props *during render*. Updates the snapshot and per-task
	* versions immediately so the owning component renders fresh data, but does
	* NOT call listeners — notifying here would trigger setState in subscribed
	* descendants (e.g. TaskBar) while the parent is still rendering, which React
	* forbids ("Cannot update a component while rendering a different one").
	*
	* No deferred notify is needed: the owning component re-renders with the new
	* snapshot and hands each TaskBar its updated task object, and TaskBar's memo
	* comparator inspects the rendered task fields, so changed bars re-render and
	* unchanged bars stay memoised.
	*/
	syncExternalTasks(tasks) {
		this.applyReplace(tasks);
	}
};
function useTaskStore(externalTasks) {
	const storeRef = useRef(null);
	if (!storeRef.current) storeRef.current = new TaskStore(externalTasks);
	const store = storeRef.current;
	const prevExternal = useRef(externalTasks);
	if (prevExternal.current !== externalTasks) {
		store.syncExternalTasks(externalTasks);
		prevExternal.current = externalTasks;
	}
	return {
		tasks: useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot),
		updateTask: useCallback((taskId, patch) => store.updateTask(taskId, patch), [store]),
		store
	};
}
function useTaskVersion(store, taskId) {
	return useSyncExternalStore(store.subscribe, () => store.getTaskVersion(taskId), () => store.getTaskVersion(taskId));
}

//#endregion
//#region src/hooks/useDragPreviewStore.ts
const EMPTY_SNAPSHOT = {
	taskId: null,
	dates: null,
	version: 0
};
/** Ephemeral drag dates for dependency rendering — does not mutate task store. */
var DragPreviewStore = class {
	taskId = null;
	dates = null;
	version = 0;
	snapshot = EMPTY_SNAPSHOT;
	listeners = /* @__PURE__ */ new Set();
	subscribe = (listener) => {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	};
	getSnapshot = () => this.snapshot;
	getVersion() {
		return this.version;
	}
	getPreview(taskId) {
		if (this.taskId !== taskId || !this.dates) return null;
		return this.dates;
	}
	setPreview(taskId, start, end) {
		if (this.taskId === taskId && this.dates && this.dates.start.getTime() === start.getTime() && this.dates.end.getTime() === end.getTime()) return;
		this.taskId = taskId;
		this.dates = {
			start,
			end
		};
		this.version++;
		this.snapshot = {
			taskId,
			dates: this.dates,
			version: this.version
		};
		this.notify();
	}
	clear(taskId) {
		if (!this.dates) return;
		if (taskId !== void 0 && this.taskId !== taskId) return;
		this.taskId = null;
		this.dates = null;
		this.version++;
		this.snapshot = {
			taskId: null,
			dates: null,
			version: this.version
		};
		this.notify();
	}
	notify() {
		for (const listener of this.listeners) listener();
	}
};
function useDragPreviewSnapshot(store) {
	return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

//#endregion
//#region src/context/DragPreviewContext.tsx
const DragPreviewContext = createContext(null);
function DragPreviewProvider({ store, children }) {
	return /* @__PURE__ */ jsx(DragPreviewContext.Provider, {
		value: store,
		children
	});
}
function useDragPreviewStoreOptional() {
	return useContext(DragPreviewContext);
}

//#endregion
//#region src/core/dateMarkings.ts
function defaultIsWeekend(date) {
	const day = date.getDay();
	return day === 0 || day === 6;
}
function dateKey(value) {
	return format$1(toDate(value), "yyyy-MM-dd");
}
function clipToTimelinePixels(segmentStart, segmentEnd, rangeStart, rangeEnd, scale, columnWidth, timelineWidth) {
	const startMs = Math.max(segmentStart.getTime(), rangeStart.getTime());
	const endMs = Math.min(segmentEnd.getTime(), rangeEnd.getTime());
	if (startMs >= endMs) return null;
	const x = Math.max(0, dateToScalePixel(new Date(startMs), rangeStart, scale, columnWidth));
	const width = Math.min(timelineWidth, dateToScalePixel(new Date(endMs), rangeStart, scale, columnWidth)) - x;
	if (width <= 0) return null;
	return {
		x,
		width
	};
}
function eachCalendarDay(rangeStart, rangeEnd, visit) {
	let day = startOfDay(rangeStart);
	const last = startOfDay(rangeEnd);
	while (day.getTime() <= last.getTime()) {
		visit(day);
		day = addDays(day, 1);
	}
}
function normalizeHolidayDates(dates) {
	const map = /* @__PURE__ */ new Map();
	if (!dates) return map;
	dates.forEach((entry, index) => {
		if (typeof entry === "string" || entry instanceof Date) {
			map.set(dateKey(entry), { index });
			return;
		}
		map.set(dateKey(entry.date), {
			label: entry.label,
			index
		});
	});
	return map;
}
function computeDateMarkingRects(range, scale, columnWidth, holidays, blockDates) {
	const timelineWidth = resolveTimelineWidth(range, columnWidth);
	const holidayColor = holidays?.color;
	const isWeekend = holidays?.isWeekend ?? defaultIsWeekend;
	const holidayDateMap = normalizeHolidayDates(holidays?.dates);
	const holidayRects = [];
	const seenHolidayDays = /* @__PURE__ */ new Set();
	const pushHolidayDay = (day, label, sourceIndex) => {
		const key = dateKey(day);
		if (seenHolidayDays.has(key)) return;
		seenHolidayDays.add(key);
		const geom = clipToTimelinePixels(startOfDay(day), endOfDay(day), range.start, range.end, scale, columnWidth, timelineWidth);
		if (!geom) return;
		holidayRects.push({
			key: `holiday-${key}`,
			x: geom.x,
			width: geom.width,
			...holidayColor ? { color: holidayColor } : {},
			kind: "holiday",
			label,
			date: day,
			sourceIndex
		});
	};
	if (holidays?.weekends || holidayDateMap.size > 0) eachCalendarDay(range.start, range.end, (day) => {
		const key = dateKey(day);
		if (holidays?.weekends && isWeekend(day)) {
			pushHolidayDay(day, "Weekend");
			return;
		}
		const entry = holidayDateMap.get(key);
		if (entry) pushHolidayDay(day, entry.label, entry.index);
	});
	const blockRects = [];
	(blockDates ?? []).forEach((block, index) => {
		const blockStart = toDate(block.start);
		const blockEnd = toDate(block.end);
		const geom = clipToTimelinePixels(blockStart, blockEnd, range.start, range.end, scale, columnWidth, timelineWidth);
		if (!geom) return;
		blockRects.push({
			key: `block-${blockStart.getTime()}-${blockEnd.getTime()}-${block.label ?? ""}`,
			x: geom.x,
			width: geom.width,
			...block.color ? { color: block.color } : {},
			kind: "block",
			label: block.label,
			sourceIndex: index
		});
	});
	return {
		holidays: holidayRects,
		blocks: blockRects
	};
}

//#endregion
//#region src/core/draggableMarkers.ts
function resolveDraggableMarkerInteractionFlags(options) {
	const emitDragStart = options.onDragStart != null;
	const emitDrag = options.onDrag != null;
	const emitDragEnd = options.onDragEnd != null;
	const emitDragToSnapPoint = options.onDragToSnapPoint != null;
	const dragEnabled = emitDragStart || emitDrag || emitDragEnd || emitDragToSnapPoint;
	return {
		dragEnabled,
		emitDragStart,
		emitDrag,
		emitDragEnd,
		emitDragToSnapPoint,
		clickEnabled: options.onGanttClick != null,
		useSnapPoints: !!(options.hasSnapPoints && dragEnabled)
	};
}
/** Snap a timeline x coordinate to the nearest column boundary (matches vertical grid lines). */
function snapMarkerX(x, columnWidth, timelineWidth) {
	let snappedX = Math.round(Math.max(0, x) / columnWidth) * columnWidth;
	if (timelineWidth != null) {
		const maxStep = Math.round(timelineWidth / columnWidth);
		snappedX = Math.min(snappedX, maxStep * columnWidth);
	}
	return snappedX;
}
function resolveMarkerStepIndex(x, columnWidth, timelineWidth) {
	return Math.round(snapMarkerX(x, columnWidth, timelineWidth) / columnWidth);
}
function computeDraggableMarkerSnapPoints(snapPoints, range, scale, columnWidth) {
	if (!snapPoints?.length) return [];
	const timelineWidth = resolveTimelineWidth(range, columnWidth);
	const result = [];
	snapPoints.forEach((snapPoint, index) => {
		const date = toDate(snapPoint.date);
		if (date < range.start || date > range.end) return;
		const x = dateToScalePixel(date, range.start, scale, columnWidth);
		if (x < 0 || x > timelineWidth) return;
		result.push({
			snapPoint,
			index,
			x,
			date
		});
	});
	return result;
}
function resolveNearestSnapPoint(x, snapPoints) {
	if (snapPoints.length === 0) return null;
	let nearest = snapPoints[0];
	let minDistance = Math.abs(x - nearest.x);
	for (let i = 1; i < snapPoints.length; i++) {
		const candidate = snapPoints[i];
		const distance = Math.abs(x - candidate.x);
		if (distance < minDistance) {
			minDistance = distance;
			nearest = candidate;
		}
	}
	return nearest;
}
function clampMarkerDate(date, rangeStart, scale, columnWidth, snapToGrid, timelineWidth, timelineBounds) {
	if (timelineBounds) {
		const ms = date.getTime();
		date = new Date(Math.max(timelineBounds.min.getTime(), Math.min(timelineBounds.max.getTime(), ms)));
		const clampedX = dateToScalePixel(date, rangeStart, scale, columnWidth);
		return {
			x: snapToGrid ? snapMarkerX(clampedX, columnWidth, timelineWidth) : clampedX,
			date,
			stepIndex: resolveMarkerStepIndex(snapToGrid ? snapMarkerX(clampedX, columnWidth, timelineWidth) : clampedX, columnWidth, timelineWidth)
		};
	}
	const x = dateToScalePixel(date, rangeStart, scale, columnWidth);
	return {
		x,
		date,
		stepIndex: Math.round(x / columnWidth)
	};
}
function resolveMarkerPositionFromX(x, rangeStart, scale, columnWidth, snapToGrid, timelineWidth, timelineBounds, snapPoints) {
	if (snapPoints?.length) {
		const nearest = resolveNearestSnapPoint(x, snapPoints);
		if (nearest) return {
			...clampMarkerDate(nearest.date, rangeStart, scale, columnWidth, false, timelineWidth, timelineBounds),
			x: nearest.x,
			snapPoint: nearest
		};
	}
	const snappedX = snapToGrid ? snapMarkerX(x, columnWidth, timelineWidth) : Math.max(0, x);
	let date = snapToGrid ? addScaleSteps(rangeStart, resolveMarkerStepIndex(x, columnWidth, timelineWidth), scale) : scalePixelToDate(snappedX, rangeStart, scale, columnWidth);
	if (timelineBounds) return clampMarkerDate(date, rangeStart, scale, columnWidth, snapToGrid, timelineWidth, timelineBounds);
	return {
		x: snappedX,
		date,
		stepIndex: Math.round(snappedX / columnWidth)
	};
}
function computeDraggableMarkerPositions(markers, range, scale, columnWidth) {
	if (!markers?.length) return [];
	const timelineWidth = resolveTimelineWidth(range, columnWidth);
	const result = [];
	markers.forEach((marker, index) => {
		const date = toDate(marker.date);
		if (date < range.start || date > range.end) return;
		const x = dateToScalePixel(date, range.start, scale, columnWidth);
		if (x < 0 || x > timelineWidth) return;
		result.push({
			key: marker.id,
			x,
			label: marker.label,
			color: marker.color,
			draggable: marker.draggable !== false,
			index,
			marker
		});
	});
	return result;
}

//#endregion
//#region src/core/eventMarkers.ts
const DEFAULT_EVENT_MARKER_COLOR = "#64748b";
const TIMELINE_HEADER_HEIGHT = 52;
const LABEL_STAGGER = 36;
function computeEventMarkerPositions(markers, range, scale, columnWidth, headerHeight = TIMELINE_HEADER_HEIGHT) {
	if (!markers?.length) return [];
	const timelineWidth = resolveTimelineWidth(range, columnWidth);
	const result = [];
	markers.forEach((marker, index) => {
		const date = toDate(marker.date);
		if (date < range.start || date > range.end) return;
		const x = dateToScalePixel(date, range.start, scale, columnWidth);
		if (x < 0 || x > timelineWidth) return;
		result.push({
			key: marker.id ?? `event-${index}-${date.getTime()}`,
			x,
			label: marker.label,
			labelTop: marker.labelTop ?? headerHeight + 20 + index * LABEL_STAGGER,
			color: marker.color ?? DEFAULT_EVENT_MARKER_COLOR,
			index,
			marker
		});
	});
	return result;
}

//#endregion
//#region src/components/CustomRows/customRowMetrics.ts
function getCustomRowHeight(row, defaultRowHeight) {
	return row.height ?? defaultRowHeight;
}
function totalCustomRowsHeight(rows, defaultRowHeight) {
	return rows.reduce((sum, row) => sum + getCustomRowHeight(row, defaultRowHeight), 0);
}
function buildCustomRowCellContext(row, columnKey, columnIndex, rowIndex, metrics) {
	return {
		rowId: row.id,
		columnKey,
		columnIndex,
		rowIndex,
		zoomLevel: metrics.zoomLevel,
		rangeStart: metrics.rangeStart,
		rangeEnd: metrics.rangeEnd,
		scale: metrics.scale,
		columnWidth: metrics.columnWidth,
		timelineWidth: metrics.timelineWidth,
		msPerPixel: metrics.msPerPixel,
		rowHeight: getCustomRowHeight(row, metrics.rowHeight),
		scrollLeft: metrics.scrollLeft,
		viewportWidth: metrics.viewportWidth,
		visibleColumnStart: metrics.visibleColumns.startIndex,
		visibleColumnEnd: metrics.visibleColumns.endIndex,
		viewportColumnStart: metrics.viewportColumns.startIndex,
		viewportColumnEnd: metrics.viewportColumns.endIndex,
		columnScrollBufferPercent: metrics.columnScrollBufferPercent,
		meta: row.meta
	};
}

//#endregion
//#region src/core/stickyRows.ts
function partitionTasksBySticky(tasks) {
	const top = [];
	const scroll = [];
	const bottom = [];
	for (const task of tasks) if (task.sticky === "top") top.push(task);
	else if (task.sticky === "bottom") bottom.push(task);
	else scroll.push(task);
	return {
		top,
		scroll,
		bottom
	};
}
function partitionCustomRowsBySticky(rows) {
	const top = [];
	const inline = [];
	const bottom = [];
	for (const row of rows) if (row.sticky === "top") top.push(row);
	else if (row.sticky === "bottom") bottom.push(row);
	else inline.push(row);
	return {
		top,
		inline,
		bottom
	};
}
function computeStickyTopOffsets(heights, headerHeight) {
	const offsets = [];
	let acc = headerHeight;
	for (const height of heights) {
		offsets.push(acc);
		acc += height;
	}
	return offsets;
}
function computeStickyBottomOffsets(heights) {
	const offsets = new Array(heights.length);
	let acc = 0;
	for (let i = heights.length - 1; i >= 0; i--) {
		offsets[i] = acc;
		acc += heights[i];
	}
	return offsets;
}
function taskSectionHeights(tasks, baseRowHeight, showBaseline) {
	return computeRowLayouts(tasks, baseRowHeight, showBaseline).map((layout) => layout.height);
}
function customRowHeights(rows, defaultRowHeight) {
	return rows.map((row) => getCustomRowHeight(row, defaultRowHeight));
}
function totalStickyTimelineBodyHeight(topTasks, scrollTasks, bottomTasks, topCustomRows, inlineCustomRows, bottomCustomRows, rowHeight, showBaseline) {
	const topTaskH = totalRowLayoutHeight(computeRowLayouts(topTasks, rowHeight, showBaseline));
	const scrollH = totalRowLayoutHeight(computeRowLayouts(scrollTasks, rowHeight, showBaseline));
	const bottomTaskH = totalRowLayoutHeight(computeRowLayouts(bottomTasks, rowHeight, showBaseline));
	const topCustomH = totalCustomRowsHeight(topCustomRows, rowHeight);
	const inlineCustomH = totalCustomRowsHeight(inlineCustomRows, rowHeight);
	const bottomCustomH = totalCustomRowsHeight(bottomCustomRows, rowHeight);
	return topTaskH + topCustomH + scrollH + inlineCustomH + bottomCustomH + bottomTaskH;
}
function rowLayoutsForTasks(tasks, baseRowHeight, showBaseline) {
	return computeRowLayouts(tasks, baseRowHeight, showBaseline);
}

//#endregion
//#region src/core/visibleColumns.ts
/** @deprecated Use {@link DEFAULT_COLUMN_SCROLL_BUFFER_PERCENT} */
const DEFAULT_COLUMN_OVERSCAN = 2;
/** Default horizontal buffer (% of viewport width) on each side of the virtual column window. */
const DEFAULT_COLUMN_SCROLL_BUFFER_PERCENT = 10;
function toColumnRange(startIndex, endIndex, columnWidth) {
	return {
		startIndex,
		endIndex,
		startX: startIndex * columnWidth,
		endX: (endIndex + 1) * columnWidth
	};
}
/** Tight viewport column indices (no buffer). */
function getViewportColumnRange(scrollLeft, viewportWidth, columnWidth, columnCount) {
	if (columnCount <= 0 || columnWidth <= 0) return {
		startIndex: 0,
		endIndex: -1,
		startX: 0,
		endX: 0
	};
	return toColumnRange(Math.max(0, Math.floor(scrollLeft / columnWidth)), Math.min(columnCount - 1, Math.ceil((scrollLeft + viewportWidth) / columnWidth) - 1), columnWidth);
}
/** Column indices needed for the viewport plus a horizontal buffer (% of viewport width). */
function computeBufferedColumnIndices(scrollLeft, viewportWidth, columnWidth, columnCount, bufferPercent) {
	if (columnCount <= 0 || columnWidth <= 0) return {
		startIndex: 0,
		endIndex: -1
	};
	const bufferPx = viewportWidth * (bufferPercent / 100);
	return {
		startIndex: Math.max(0, Math.floor((scrollLeft - bufferPx) / columnWidth)),
		endIndex: Math.min(columnCount - 1, Math.ceil((scrollLeft + viewportWidth + bufferPx) / columnWidth) - 1)
	};
}
/**
* Maintain a sticky buffered column window for virtualization.
* Expands when new columns enter the buffer; shrinks only after columns leave the buffer zone.
* Returns the previous range object when indices are unchanged.
*/
function maintainBufferedColumnRange(scrollLeft, viewportWidth, columnWidth, columnCount, bufferPercent, prev) {
	const { startIndex: neededStart, endIndex: neededEnd } = computeBufferedColumnIndices(scrollLeft, viewportWidth, columnWidth, columnCount, bufferPercent);
	if (neededEnd < neededStart) return {
		startIndex: 0,
		endIndex: -1,
		startX: 0,
		endX: 0
	};
	if (!prev || prev.endIndex < prev.startIndex) return toColumnRange(neededStart, neededEnd, columnWidth);
	let startIndex = Math.min(prev.startIndex, neededStart);
	let endIndex = Math.max(prev.endIndex, neededEnd);
	const bufferPx = viewportWidth * (bufferPercent / 100);
	const releaseBeforeX = scrollLeft - bufferPx;
	const releaseAfterX = scrollLeft + viewportWidth + bufferPx;
	while (startIndex < neededStart && (startIndex + 1) * columnWidth <= releaseBeforeX) startIndex++;
	while (endIndex > neededEnd && endIndex * columnWidth >= releaseAfterX) endIndex--;
	if (startIndex === prev.startIndex && endIndex === prev.endIndex) return prev;
	return toColumnRange(startIndex, endIndex, columnWidth);
}
/**
* Compute which column indices intersect the current horizontal viewport.
* @deprecated Prefer {@link maintainBufferedColumnRange} with a percentage buffer.
*/
function getVisibleColumnRange(scrollLeft, viewportWidth, columnWidth, columnCount, overscan = DEFAULT_COLUMN_OVERSCAN) {
	if (columnCount <= 0 || columnWidth <= 0) return {
		startIndex: 0,
		endIndex: -1,
		startX: 0,
		endX: 0
	};
	const bufferPx = overscan * columnWidth;
	return toColumnRange(Math.max(0, Math.floor((scrollLeft - bufferPx) / columnWidth)), Math.min(columnCount - 1, Math.ceil((scrollLeft + viewportWidth + bufferPx) / columnWidth) - 1), columnWidth);
}
/** Keep only rects that overlap a horizontal pixel range. */
function filterRectsInXRange(rects, startX, endX) {
	if (rects.length === 0 || endX <= startX) return [];
	return rects.filter((rect) => rect.x + rect.width >= startX && rect.x <= endX);
}
/**
* Build upper header bands for the visible column window.
* Walks backward from the first visible column so spanning labels (e.g. month) stay aligned.
*/
function buildUpperHeaderBandsForVisibleRange(range, scale, columnWidth, visible, timeZone) {
	const { startIndex, endIndex } = visible;
	if (endIndex < startIndex) return [];
	let bandStartIdx = startIndex;
	const firstLabel = formatScaleSubHeader(addScaleSteps(range.start, startIndex, scale), scale, timeZone);
	while (bandStartIdx > 0) {
		if (formatScaleSubHeader(addScaleSteps(range.start, bandStartIdx - 1, scale), scale, timeZone) !== firstLabel) break;
		bandStartIdx--;
	}
	const bands = [];
	let bandStartX = bandStartIdx * columnWidth;
	let bandLabel = formatScaleSubHeader(addScaleSteps(range.start, bandStartIdx, scale), scale, timeZone);
	for (let i = bandStartIdx + 1; i <= endIndex + 1; i++) {
		const atEnd = i > endIndex;
		const nextLabel = atEnd ? null : formatScaleSubHeader(addScaleSteps(range.start, i, scale), scale, timeZone);
		if (atEnd || nextLabel !== bandLabel) {
			const endX = atEnd ? (endIndex + 1) * columnWidth : i * columnWidth;
			bands.push({
				label: bandLabel,
				x: bandStartX,
				width: endX - bandStartX
			});
			if (!atEnd) {
				bandLabel = nextLabel;
				bandStartX = i * columnWidth;
			}
		}
	}
	return bands;
}
/** Vertical grid line x-positions for the visible column window. */
function getVisibleVerticalLines(visible, columnWidth, timelineWidth) {
	const { startIndex, endIndex } = visible;
	if (endIndex < startIndex) return [];
	const lines = [];
	for (let i = startIndex; i <= endIndex + 1; i++) {
		const x = i * columnWidth;
		if (x <= timelineWidth) lines.push(x);
	}
	if (lines.length === 0 || lines[lines.length - 1] !== timelineWidth) {
		if (visible.endX >= timelineWidth - columnWidth) lines.push(timelineWidth);
	}
	return lines;
}

//#endregion
//#region src/core/stableValue.ts
/** Return the previous object when timeline range values are unchanged. */
function stableTimelineRange(next, prev) {
	if (prev && prev.start.getTime() === next.start.getTime() && prev.end.getTime() === next.end.getTime() && prev.columnCount === next.columnCount && prev.pixelWidth === next.pixelWidth && prev.fixed === next.fixed) return prev;
	return next;
}
/** Stable signature for timeline/custom-row metrics — ignores task-only updates. */
function timelineMetricsSignature(input) {
	return [
		input.zoomLevel,
		input.columnWidth,
		input.timelineWidth,
		input.msPerPixel,
		input.rangeStart.getTime(),
		input.rangeEnd.getTime(),
		input.rangeColumnCount,
		input.rowHeight,
		input.scrollLeft,
		input.viewportWidth,
		input.visibleStart,
		input.visibleEnd,
		input.viewportStart,
		input.viewportEnd,
		input.columnScrollBufferPercent
	].join("|");
}

//#endregion
//#region src/context/GanttDisplayContext.tsx
const GanttDisplayContext = createContext({});
function GanttDisplayProvider({ timezone, children }) {
	return /* @__PURE__ */ jsx(GanttDisplayContext.Provider, {
		value: { timezone },
		children
	});
}
/** Display timezone from `GanttChart`'s `timezone` prop. Undefined means browser local time. */
function useGanttDisplayTimezone() {
	return useContext(GanttDisplayContext).timezone;
}

//#endregion
//#region src/components/CustomRows/AsyncCustomCell.tsx
function metricsRevision(metrics) {
	return [
		metrics.zoomLevel,
		metrics.columnWidth,
		metrics.timelineWidth,
		metrics.msPerPixel,
		metrics.rangeStart.getTime(),
		metrics.rangeEnd.getTime(),
		metrics.rowHeight
	].join("|");
}
const AsyncCustomCell = memo(function AsyncCustomCell$1({ row, columnKey, columnIndex, rowIndex, metrics, emit, timeline = false }) {
	const [content, setContent] = useState(null);
	const [loading, setLoading] = useState(true);
	const metricsRef = useRef(metrics);
	metricsRef.current = metrics;
	const revision = metricsRevision(metrics);
	useEffect(() => {
		let cancelled = false;
		const generator = row.cells[columnKey];
		if (!generator) {
			setContent(null);
			setLoading(false);
			return;
		}
		if (content === null) setLoading(true);
		const ctx = buildCustomRowCellContext(row, columnKey, columnIndex, rowIndex, metricsRef.current);
		Promise.resolve(generator(ctx)).then((result) => {
			if (cancelled) return;
			setContent(result);
			setLoading(false);
			emit("customRowCellReady", {
				rowId: row.id,
				columnKey
			});
		}).catch((error) => {
			if (cancelled) return;
			setContent(null);
			setLoading(false);
			emit("customRowCellError", {
				rowId: row.id,
				columnKey,
				error
			});
		});
		return () => {
			cancelled = true;
		};
	}, [
		row.id,
		columnKey,
		columnIndex,
		rowIndex,
		revision,
		row.meta,
		row.height,
		emit,
		timeline
	]);
	const className = loading ? "rg-custom-cell rg-custom-cell--loading" : "rg-custom-cell";
	if (loading && content === null) return timeline ? /* @__PURE__ */ jsx("div", {
		className,
		children: "…"
	}) : /* @__PURE__ */ jsx("span", {
		className,
		children: "…"
	});
	return timeline ? /* @__PURE__ */ jsx("div", {
		className,
		children: content
	}) : /* @__PURE__ */ jsx("span", {
		className,
		children: content
	});
});

//#endregion
//#region src/components/CustomRows/CustomRowSidebarRows.tsx
function stickyRowStyle$1(position, offset) {
	if (!position || offset === void 0) return void 0;
	return position === "top" ? {
		position: "sticky",
		top: offset,
		zIndex: 2,
		background: "var(--rg-sticky-row-bg, var(--rg-surface))"
	} : {
		position: "sticky",
		bottom: offset,
		zIndex: 2,
		background: "var(--rg-sticky-row-bg, var(--rg-surface))"
	};
}
const CustomRowLeftRows = memo(function CustomRowLeftRows$1({ rows, columns, rowHeight, metrics, emit, stickyPosition, stickyOffsets }) {
	if (rows.length === 0) return null;
	return /* @__PURE__ */ jsx(Fragment, { children: rows.map((row, rowIndex) => {
		const height = getCustomRowHeight(row, rowHeight);
		return /* @__PURE__ */ jsx("div", {
			className: `rg-task-row rg-custom-row-sidebar${stickyPosition ? " rg-row--sticky" : ""}`,
			style: {
				height,
				paddingLeft: 8,
				...stickyRowStyle$1(stickyPosition, stickyOffsets?.[rowIndex])
			},
			"data-row-id": row.id,
			"data-sticky": stickyPosition,
			children: columns.map((col, colIdx) => /* @__PURE__ */ jsx("div", {
				className: "rg-task-cell",
				style: {
					flex: col.flex ?? 1,
					minWidth: col.minWidth
				},
				children: /* @__PURE__ */ jsx(AsyncCustomCell, {
					row,
					columnKey: col.key,
					columnIndex: colIdx,
					rowIndex,
					metrics,
					emit
				})
			}, col.key))
		}, row.id);
	}) });
});
const CustomRowMiddleRows = memo(function CustomRowMiddleRows$1({ rows, columns, rowHeight, metrics, emit, columnOffset = 0, stickyPosition, stickyOffsets }) {
	if (rows.length === 0) return null;
	return /* @__PURE__ */ jsx(Fragment, { children: rows.map((row, rowIndex) => {
		const height = getCustomRowHeight(row, rowHeight);
		return /* @__PURE__ */ jsx("div", {
			className: `rg-task-row rg-custom-row-sidebar${stickyPosition ? " rg-row--sticky" : ""}`,
			style: {
				height,
				...stickyRowStyle$1(stickyPosition, stickyOffsets?.[rowIndex])
			},
			"data-row-id": row.id,
			"data-sticky": stickyPosition,
			children: columns.map((col, colIdx) => /* @__PURE__ */ jsx("div", {
				className: "rg-task-cell",
				style: {
					flex: col.flex ?? 1,
					minWidth: col.minWidth
				},
				children: /* @__PURE__ */ jsx(AsyncCustomCell, {
					row,
					columnKey: col.key,
					columnIndex: columnOffset + colIdx,
					rowIndex,
					metrics,
					emit
				})
			}, col.key))
		}, row.id);
	}) });
});

//#endregion
//#region src/components/Tooltip/TaskTooltip.tsx
/** Tooltip body — position is applied imperatively by `TaskTooltipLayer`. */
function TaskTooltipContent({ task }) {
	const timezone = useGanttDisplayTimezone();
	const start = toDate(task.start);
	const end = toDate(task.end);
	return /* @__PURE__ */ jsxs(Fragment, { children: [
		/* @__PURE__ */ jsx("div", {
			className: "rg-task-tooltip-name",
			children: task.name
		}),
		/* @__PURE__ */ jsxs("div", {
			className: "rg-task-tooltip-row",
			children: [/* @__PURE__ */ jsx("span", {
				className: "rg-task-tooltip-label",
				children: "Start"
			}), /* @__PURE__ */ jsx("span", { children: formatTaskDateTime(start, timezone) })]
		}),
		/* @__PURE__ */ jsxs("div", {
			className: "rg-task-tooltip-row",
			children: [/* @__PURE__ */ jsx("span", {
				className: "rg-task-tooltip-label",
				children: "End"
			}), /* @__PURE__ */ jsx("span", { children: formatTaskDateTime(end, timezone) })]
		})
	] });
}

//#endregion
//#region src/components/Tooltip/taskTooltipController.ts
const OFFSET = 12;
function positionTooltip(el, x, y) {
	if (!el) return;
	el.style.left = `${x + OFFSET}px`;
	el.style.top = `${y + OFFSET}px`;
}
function isTooltipTaskChanged(prev, next) {
	if (!prev) return true;
	return prev.id !== next.id || prev.start !== next.start || prev.end !== next.end || prev.name !== next.name || prev.progress !== next.progress;
}
function createTaskTooltipController() {
	let shell = null;
	let setVisibleTask = () => {};
	let activeTask = null;
	const applyTask = (task) => {
		activeTask = task;
		setVisibleTask(task);
	};
	return {
		register(nextShell, nextSetVisibleTask) {
			shell = nextShell;
			setVisibleTask = nextSetVisibleTask;
		},
		show(task, x, y) {
			if (isTooltipTaskChanged(activeTask, task)) applyTask(task);
			else activeTask = task;
			if (shell) shell.style.display = "";
			positionTooltip(shell, x, y);
		},
		move(x, y) {
			if (!activeTask) return;
			positionTooltip(shell, x, y);
		},
		hide() {
			applyTask(null);
			if (shell) shell.style.display = "none";
		},
		refreshTask(task) {
			if (!activeTask || activeTask.id !== task.id) return;
			if (isTooltipTaskChanged(activeTask, task)) applyTask(task);
			else activeTask = task;
		}
	};
}

//#endregion
//#region src/components/Tooltip/TaskTooltipLayer.tsx
const TaskTooltipContext = createContext(null);
function useTaskTooltipOptional() {
	return useContext(TaskTooltipContext);
}
function TaskTooltipOverlay({ controller, renderTaskTooltip, onTaskChange }) {
	const [task, setTask] = useState(null);
	const taskRef = useRef(null);
	const renderTaskTooltipRef = useRef(renderTaskTooltip);
	const onTaskChangeRef = useRef(onTaskChange);
	renderTaskTooltipRef.current = renderTaskTooltip;
	onTaskChangeRef.current = onTaskChange;
	const setVisibleTask = useCallback((next) => {
		taskRef.current = next;
		setTask(next);
	}, []);
	const shellRef = useCallback((node) => {
		controller.register(node, setVisibleTask);
	}, [controller, setVisibleTask]);
	const stableOnChange = useCallback((patch) => {
		const current = taskRef.current;
		if (!current) return;
		onTaskChangeRef.current(current.id, patch);
		const merged = {
			...current,
			...patch
		};
		taskRef.current = merged;
		controller.refreshTask(merged);
	}, [controller]);
	const content = useMemo(() => {
		if (!task) return null;
		const render = renderTaskTooltipRef.current;
		return render ? render(task, stableOnChange) : /* @__PURE__ */ jsx(TaskTooltipContent, { task });
	}, [task, stableOnChange]);
	return /* @__PURE__ */ jsx("div", {
		ref: shellRef,
		className: !!renderTaskTooltip ? "rg-task-tooltip-shell" : "rg-task-tooltip",
		style: { display: "none" },
		role: "tooltip",
		children: content
	});
}
function TaskTooltipProvider({ enabled, renderTaskTooltip, onTaskChange, children }) {
	const controllerRef = useRef(null);
	if (!controllerRef.current) controllerRef.current = createTaskTooltipController();
	const controller = controllerRef.current;
	const onTaskChangeRef = useRef(onTaskChange);
	onTaskChangeRef.current = onTaskChange;
	const handleTaskChange = useCallback((taskId, patch) => {
		onTaskChangeRef.current(taskId, patch);
	}, []);
	useEffect(() => {
		if (!enabled) controller.hide();
	}, [enabled, controller]);
	return /* @__PURE__ */ jsxs(TaskTooltipContext.Provider, {
		value: enabled ? controller : null,
		children: [children, enabled && /* @__PURE__ */ jsx(TaskTooltipOverlay, {
			controller,
			renderTaskTooltip,
			onTaskChange: handleTaskChange
		})]
	});
}

//#endregion
//#region src/components/TaskList/TaskListPanel.tsx
function rowHeightForTask(_task, index, rowHeight, rowLayouts) {
	return rowLayouts?.[index]?.height ?? rowHeight;
}
function stickyRowStyle(position, offset) {
	if (!position || offset === void 0) return void 0;
	return position === "top" ? {
		position: "sticky",
		top: offset,
		zIndex: 2,
		background: "var(--rg-sticky-row-bg, var(--rg-surface))"
	} : {
		position: "sticky",
		bottom: offset,
		zIndex: 2,
		background: "var(--rg-sticky-row-bg, var(--rg-surface))"
	};
}
function TaskRows({ tasks, sourceTasks, columns, rowHeight, rowLayouts, selectedTaskIds, onToggleCollapse, emit, tooltip, stickyPosition, stickyOffsets }) {
	return /* @__PURE__ */ jsx(Fragment, { children: tasks.map((task, index) => {
		const h = rowHeightForTask(task, index, rowHeight, rowLayouts);
		const selected = selectedTaskIds?.includes(task.id) ?? false;
		return /* @__PURE__ */ jsx("div", {
			"data-task-id": task.id,
			"data-sticky": stickyPosition,
			className: `rg-task-row ${selected ? "rg-task-row--selected" : ""}${stickyPosition ? " rg-row--sticky" : ""}`,
			style: {
				height: h,
				paddingLeft: 8 + task._level * 16,
				...stickyRowStyle(stickyPosition, stickyOffsets?.[index])
			},
			onMouseEnter: (e) => {
				emit("taskHover", {
					task,
					rowIndex: task._rowIndex,
					clientX: e.clientX,
					clientY: e.clientY
				});
				tooltip?.show(task, e.clientX, e.clientY);
			},
			onMouseMove: (e) => tooltip?.move(e.clientX, e.clientY),
			onMouseLeave: () => {
				emit("taskHover", {
					task: null,
					rowIndex: null
				});
				tooltip?.hide();
			},
			onClick: (e) => emit("taskClick", {
				task,
				rowIndex: task._rowIndex,
				ctrlKey: e.ctrlKey,
				metaKey: e.metaKey,
				shiftKey: e.shiftKey
			}),
			children: columns.map((col, colIndex) => {
				const showCollapse = colIndex === 0 && !!onToggleCollapse && taskSupportsCollapse(task, sourceTasks);
				const cellContent = col.render ? col.render({
					task,
					rowIndex: task._rowIndex,
					columnKey: col.key
				}) : col.key === "name" ? task.name : col.key === "progress" ? `${task.progress ?? 0}%` : null;
				return /* @__PURE__ */ jsxs("div", {
					className: "rg-task-cell",
					style: {
						flex: col.flex ?? 1,
						minWidth: col.minWidth
					},
					children: [showCollapse && /* @__PURE__ */ jsx("button", {
						type: "button",
						className: "rg-task-collapse",
						"aria-expanded": !task.collapsed,
						"aria-label": task.collapsed ? "Expand group" : "Collapse group",
						title: task.collapsed ? "Expand" : "Collapse",
						onClick: (e) => {
							e.stopPropagation();
							onToggleCollapse(task.id);
						},
						children: /* @__PURE__ */ jsx("span", {
							className: "rg-task-collapse-icon",
							"aria-hidden": true,
							children: task.collapsed ? "▸" : "▾"
						})
					}), cellContent]
				}, col.key);
			})
		}, task.id);
	}) });
}
const TaskListPanel = memo(function TaskListPanel$1({ tasks, stickyTasks, sourceTasks, columns, rowHeight, rowLayouts, stickyRowLayouts, width, selectedTaskIds, onToggleCollapse, emit, customRows = [], stickyCustomRows, customRowMetrics, stickyOffsets }) {
	const tooltip = useTaskTooltipOptional();
	const topTasks = stickyTasks?.top ?? [];
	const scrollTasks = stickyTasks?.scroll ?? tasks;
	const bottomTasks = stickyTasks?.bottom ?? [];
	const topCustomRows = stickyCustomRows?.top ?? [];
	const inlineCustomRows = stickyCustomRows?.inline ?? customRows;
	const bottomCustomRows = stickyCustomRows?.bottom ?? [];
	return /* @__PURE__ */ jsxs("div", {
		className: "rg-task-list",
		style: { width },
		"data-testid": "task-list-left",
		children: [/* @__PURE__ */ jsx("div", {
			className: "rg-task-list-header",
			children: columns.map((col) => /* @__PURE__ */ jsx("div", {
				className: "rg-task-list-header-cell",
				style: {
					flex: col.flex ?? 1,
					minWidth: col.minWidth
				},
				children: col.title
			}, col.key))
		}), /* @__PURE__ */ jsxs("div", {
			className: "rg-task-list-body",
			children: [
				/* @__PURE__ */ jsx(TaskRows, {
					tasks: topTasks,
					sourceTasks,
					columns,
					rowHeight,
					rowLayouts: stickyRowLayouts?.top,
					selectedTaskIds,
					onToggleCollapse,
					emit,
					tooltip,
					stickyPosition: "top",
					stickyOffsets: stickyOffsets?.topTasks
				}),
				customRowMetrics && topCustomRows.length > 0 && /* @__PURE__ */ jsx(CustomRowLeftRows, {
					rows: topCustomRows,
					columns,
					rowHeight,
					metrics: customRowMetrics,
					emit,
					stickyPosition: "top",
					stickyOffsets: stickyOffsets?.topCustomRows
				}),
				/* @__PURE__ */ jsx(TaskRows, {
					tasks: scrollTasks,
					sourceTasks,
					columns,
					rowHeight,
					rowLayouts: stickyRowLayouts?.scroll ?? rowLayouts,
					selectedTaskIds,
					onToggleCollapse,
					emit,
					tooltip
				}),
				customRowMetrics && inlineCustomRows.length > 0 && /* @__PURE__ */ jsx(CustomRowLeftRows, {
					rows: inlineCustomRows,
					columns,
					rowHeight,
					metrics: customRowMetrics,
					emit
				}),
				customRowMetrics && bottomCustomRows.length > 0 && /* @__PURE__ */ jsx(CustomRowLeftRows, {
					rows: bottomCustomRows,
					columns,
					rowHeight,
					metrics: customRowMetrics,
					emit,
					stickyPosition: "bottom",
					stickyOffsets: stickyOffsets?.bottomCustomRows
				}),
				/* @__PURE__ */ jsx(TaskRows, {
					tasks: bottomTasks,
					sourceTasks,
					columns,
					rowHeight,
					rowLayouts: stickyRowLayouts?.bottom,
					selectedTaskIds,
					onToggleCollapse,
					emit,
					tooltip,
					stickyPosition: "bottom",
					stickyOffsets: stickyOffsets?.bottomTasks
				})
			]
		})]
	});
});
function MiddleTaskRows({ tasks, columns, rowHeight, rowLayouts, stickyPosition, stickyOffsets }) {
	const timezone = useGanttDisplayTimezone();
	return /* @__PURE__ */ jsx(Fragment, { children: tasks.map((task, index) => /* @__PURE__ */ jsx("div", {
		"data-task-id": task.id,
		"data-sticky": stickyPosition,
		className: `rg-task-row${stickyPosition ? " rg-row--sticky" : ""}`,
		style: {
			height: rowHeightForTask(task, index, rowHeight, rowLayouts),
			...stickyRowStyle(stickyPosition, stickyOffsets?.[index])
		},
		children: columns.map((col) => /* @__PURE__ */ jsx("div", {
			className: "rg-task-cell",
			style: {
				flex: col.flex ?? 1,
				minWidth: col.minWidth
			},
			children: col.render ? col.render({
				task,
				rowIndex: task._rowIndex,
				columnKey: col.key
			}) : col.key === "start" ? formatDisplayDate(task._start, timezone) : col.key === "end" ? formatDisplayDate(task._end, timezone) : null
		}, col.key))
	}, task.id)) });
}
const MiddlePanel = memo(function MiddlePanel$1({ tasks, stickyTasks, columns, rowHeight, rowLayouts, stickyRowLayouts, width, customRows = [], stickyCustomRows, customRowMetrics, columnOffset = 0, emit, stickyOffsets }) {
	if (columns.length === 0) return null;
	const topTasks = stickyTasks?.top ?? [];
	const scrollTasks = stickyTasks?.scroll ?? tasks;
	const bottomTasks = stickyTasks?.bottom ?? [];
	const topCustomRows = stickyCustomRows?.top ?? [];
	const inlineCustomRows = stickyCustomRows?.inline ?? customRows;
	const bottomCustomRows = stickyCustomRows?.bottom ?? [];
	return /* @__PURE__ */ jsxs("div", {
		className: "rg-task-list rg-task-list--middle",
		style: { width },
		"data-testid": "task-list-middle",
		children: [/* @__PURE__ */ jsx("div", {
			className: "rg-task-list-header",
			children: columns.map((col) => /* @__PURE__ */ jsx("div", {
				className: "rg-task-list-header-cell",
				style: {
					flex: col.flex ?? 1,
					minWidth: col.minWidth
				},
				children: col.title
			}, col.key))
		}), /* @__PURE__ */ jsxs("div", {
			className: "rg-task-list-body",
			children: [
				/* @__PURE__ */ jsx(MiddleTaskRows, {
					tasks: topTasks,
					columns,
					rowHeight,
					rowLayouts: stickyRowLayouts?.top,
					stickyPosition: "top",
					stickyOffsets: stickyOffsets?.topTasks
				}),
				customRowMetrics && topCustomRows.length > 0 && /* @__PURE__ */ jsx(CustomRowMiddleRows, {
					rows: topCustomRows,
					columns,
					rowHeight,
					metrics: customRowMetrics,
					columnOffset,
					emit,
					stickyPosition: "top",
					stickyOffsets: stickyOffsets?.topCustomRows
				}),
				/* @__PURE__ */ jsx(MiddleTaskRows, {
					tasks: scrollTasks,
					columns,
					rowHeight,
					rowLayouts: stickyRowLayouts?.scroll ?? rowLayouts
				}),
				customRowMetrics && inlineCustomRows.length > 0 && /* @__PURE__ */ jsx(CustomRowMiddleRows, {
					rows: inlineCustomRows,
					columns,
					rowHeight,
					metrics: customRowMetrics,
					columnOffset,
					emit
				}),
				customRowMetrics && bottomCustomRows.length > 0 && /* @__PURE__ */ jsx(CustomRowMiddleRows, {
					rows: bottomCustomRows,
					columns,
					rowHeight,
					metrics: customRowMetrics,
					columnOffset,
					emit,
					stickyPosition: "bottom",
					stickyOffsets: stickyOffsets?.bottomCustomRows
				}),
				/* @__PURE__ */ jsx(MiddleTaskRows, {
					tasks: bottomTasks,
					columns,
					rowHeight,
					rowLayouts: stickyRowLayouts?.bottom,
					stickyPosition: "bottom",
					stickyOffsets: stickyOffsets?.bottomTasks
				})
			]
		})]
	});
});

//#endregion
//#region src/components/Timeline/DateMarkingHighlights.tsx
/** SVG column highlights for the timeline grid body. */
function DateMarkingHighlights({ rects, height }) {
	if (rects.length === 0) return null;
	return /* @__PURE__ */ jsx(Fragment, { children: rects.map((rect) => /* @__PURE__ */ jsx("rect", {
		x: rect.x,
		y: 0,
		width: rect.width,
		height,
		...rect.color ? { fill: rect.color } : {},
		className: `rg-date-marking rg-date-marking--${rect.kind}`,
		"data-testid": `date-marking-${rect.kind}`,
		children: rect.label ? /* @__PURE__ */ jsx("title", { children: rect.label }) : null
	}, rect.key)) });
}
/** HTML column highlights behind the sticky timeline header. */
function DateMarkingHeaderHighlights({ rects }) {
	if (rects.length === 0) return null;
	return /* @__PURE__ */ jsx("div", {
		className: "rg-header-markings",
		"aria-hidden": true,
		children: rects.map((rect) => /* @__PURE__ */ jsx("div", {
			className: `rg-header-marking rg-header-marking--${rect.kind}`,
			style: {
				left: rect.x,
				width: rect.width,
				...rect.color ? { backgroundColor: rect.color } : {}
			},
			title: rect.label
		}, rect.key))
	});
}

//#endregion
//#region src/components/Timeline/pointerDetail.ts
function createPointerDetail(target, e) {
	return {
		target,
		clientX: e.clientX,
		clientY: e.clientY,
		ctrlKey: e.ctrlKey,
		metaKey: e.metaKey,
		shiftKey: e.shiftKey,
		preventDefault: () => e.preventDefault()
	};
}

//#endregion
//#region src/components/Timeline/TimelineHeader.tsx
const TimelineHeader = memo(function TimelineHeader$1({ range, scale, columnWidth, visibleColumns, dateMarkings, interactive = false, emit }) {
	const timezone = useGanttDisplayTimezone();
	const { startIndex, endIndex } = visibleColumns;
	const visibleLowerColumns = useMemo(() => {
		if (endIndex < startIndex) return [];
		const cols = [];
		for (let i = startIndex; i <= endIndex; i++) cols.push({
			date: addScaleSteps(range.start, i, scale),
			x: i * columnWidth
		});
		return cols;
	}, [
		range.start,
		scale,
		columnWidth,
		startIndex,
		endIndex
	]);
	const upperBands = useMemo(() => buildUpperHeaderBandsForVisibleRange(range, scale, columnWidth, visibleColumns, timezone), [
		range,
		scale,
		columnWidth,
		visibleColumns,
		timezone
	]);
	const markingRects = useMemo(() => {
		return filterRectsInXRange([...dateMarkings?.holidays ?? [], ...dateMarkings?.blocks ?? []], visibleColumns.startX, visibleColumns.endX);
	}, [
		dateMarkings,
		visibleColumns.startX,
		visibleColumns.endX
	]);
	const timelineWidth = resolveTimelineWidth(range, columnWidth);
	const resolveHeaderTarget = (clientX, headerEl) => {
		const rect = headerEl.getBoundingClientRect();
		return {
			type: "timeline",
			date: scalePixelToDate((clientX - rect.left) / rect.width * timelineWidth, range.start, scale, columnWidth),
			rowIndex: null
		};
	};
	const handleHeaderClick = (e) => {
		if (!interactive || !emit) return;
		emit("ganttClick", createPointerDetail(resolveHeaderTarget(e.clientX, e.currentTarget), e));
	};
	const handleHeaderContextMenu = (e) => {
		if (!interactive || !emit) return;
		emit("ganttContextMenu", createPointerDetail(resolveHeaderTarget(e.clientX, e.currentTarget), e));
	};
	return /* @__PURE__ */ jsx("div", {
		className: `rg-timeline-header${interactive ? " rg-timeline-header--interactive" : ""}`,
		"data-testid": "timeline-header",
		onClick: interactive ? handleHeaderClick : void 0,
		onContextMenu: interactive ? handleHeaderContextMenu : void 0,
		children: /* @__PURE__ */ jsxs("div", {
			className: "rg-timeline-header-inner",
			children: [
				/* @__PURE__ */ jsx(DateMarkingHeaderHighlights, { rects: markingRects }),
				/* @__PURE__ */ jsx("div", {
					className: "rg-timeline-header-upper",
					children: upperBands.map((band, i) => /* @__PURE__ */ jsx("div", {
						className: "rg-header-cell rg-header-cell--upper",
						style: {
							left: band.x,
							width: band.width
						},
						children: band.label
					}, `u-${band.label}-${band.x}-${i}`))
				}),
				/* @__PURE__ */ jsx("div", {
					className: "rg-timeline-header-lower",
					children: visibleLowerColumns.map((col, i) => /* @__PURE__ */ jsx("div", {
						className: "rg-header-cell rg-header-cell--lower",
						style: {
							left: col.x,
							width: columnWidth
						},
						children: formatScaleHeader(col.date, scale, timezone)
					}, `l-${startIndex + i}`))
				})
			]
		})
	});
});

//#endregion
//#region src/components/Timeline/TaskBar.tsx
const HANDLE_WIDTH = 10;
function TaskBarInner({ task, geometry, columnWidth, scale, store, enableDrag = true, enableResize = true, enableProgressDrag = true, snapToGrid = true, timelineBounds, rangeStart, emit, onTaskUpdate, selected = false }) {
	useTaskVersion(store, task.id);
	const groupRef = useRef(null);
	const dragRef = useRef(null);
	const [isDragging, setIsDragging] = useState(false);
	const [dragPreview, setDragPreview] = useState(null);
	const taskRef = useRef(task);
	taskRef.current = task;
	const msPerPixel = getMsPerPixel(scale, columnWidth);
	const tooltip = useTaskTooltipOptional();
	const dragPreviewStore = useDragPreviewStoreOptional();
	const resolveHoverTask = useCallback((t, start, end) => {
		return start && end && Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) ? {
			...t,
			start: start.toISOString(),
			end: end.toISOString()
		} : t;
	}, []);
	const emitTaskHover = useCallback((t, clientX, clientY, start, end) => {
		const hoverTask = resolveHoverTask(t, start, end);
		emit("taskHover", {
			task: hoverTask,
			rowIndex: t._rowIndex,
			clientX,
			clientY
		});
		return hoverTask;
	}, [emit, resolveHoverTask]);
	const syncTooltip = useCallback((t, clientX, clientY, start, end) => {
		const hoverTask = resolveHoverTask(t, start, end);
		tooltip?.show(hoverTask, clientX, clientY);
		return hoverTask;
	}, [tooltip, resolveHoverTask]);
	const resolveDragDates = useCallback((session, clientX) => {
		const t = taskRef.current;
		if (session.mode === "progress") return {
			start: session.start,
			end: session.end
		};
		const dx = clientX - session.originClientX;
		let { start, end } = pixelDeltaToDates(session.mode, session.start, session.end, dx, msPerPixel);
		if (timelineBounds) ({start, end} = clampTaskDates(start, end, timelineBounds, session.mode === "move" ? "move" : session.mode));
		if (t.type === "milestone") end = new Date(start.getTime());
		return {
			start,
			end
		};
	}, [msPerPixel, timelineBounds]);
	const endDrag = useCallback((session, pointer) => {
		const t = taskRef.current;
		if (session.mode === "progress") {
			let progress$1 = session.progress;
			if (pointer) {
				const relX = pointer.clientX - session.barRect.left;
				progress$1 = Math.max(0, Math.min(100, Math.round(relX / session.barRect.width * 100)));
			} else if (dragPreview?.progress != null) progress$1 = dragPreview.progress;
			onTaskUpdate(t.id, { progress: progress$1 });
			emit("progressChange", {
				task: t,
				progress: progress$1,
				previousProgress: session.progress
			});
			dragPreviewStore?.clear(t.id);
			setDragPreview(null);
			dragRef.current = null;
			setIsDragging(false);
			return;
		}
		let start = session.start;
		let end = session.end;
		if (pointer) ({start, end} = resolveDragDates(session, pointer.clientX));
		else if (dragPreview?.start && dragPreview?.end) {
			start = dragPreview.start;
			end = dragPreview.end;
		}
		const finalized = finalizeDragDates(start, end, scale, snapToGrid, rangeStart);
		start = finalized.start;
		end = finalized.end;
		if (timelineBounds) {
			const clamped = clampTaskDates(start, end, timelineBounds, session.mode === "resize-start" ? "resize-start" : session.mode === "resize-end" ? "resize-end" : "move");
			start = clamped.start;
			end = clamped.end;
		}
		if (t.type === "milestone") end = new Date(start.getTime());
		onTaskUpdate(t.id, {
			start,
			end
		});
		if (pointer) syncTooltip(t, pointer.clientX, pointer.clientY, start, end);
		if (session.mode === "move") emit("taskDragEnd", {
			task: t,
			start,
			end,
			previousStart: session.start,
			previousEnd: session.end
		});
		else if (session.mode.startsWith("resize")) emit("taskResizeEnd", {
			task: t,
			start,
			end,
			edge: session.mode === "resize-start" ? "start" : "end",
			previousStart: session.start,
			previousEnd: session.end
		});
		dragPreviewStore?.clear(t.id);
		setDragPreview(null);
		dragRef.current = null;
		setIsDragging(false);
	}, [
		scale,
		snapToGrid,
		timelineBounds,
		rangeStart,
		onTaskUpdate,
		emit,
		syncTooltip,
		dragPreview,
		resolveDragDates,
		dragPreviewStore
	]);
	useEffect(() => {
		if (!isDragging) return;
		const onPointerMove = (e) => {
			const session = dragRef.current;
			if (!session) return;
			const t = taskRef.current;
			if (session.mode === "progress") {
				const relX = e.clientX - session.barRect.left;
				const progress$1 = Math.max(0, Math.min(100, Math.round(relX / session.barRect.width * 100)));
				setDragPreview({ progress: progress$1 });
				emit("progressChange", {
					task: t,
					progress: progress$1,
					previousProgress: session.progress
				});
				return;
			}
			const { start, end } = resolveDragDates(session, e.clientX);
			if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return;
			setDragPreview({
				start,
				end
			});
			dragPreviewStore?.setPreview(t.id, start, end);
			syncTooltip(t, e.clientX, e.clientY, start, end);
			if (session.mode === "move") emit("taskDrag", {
				task: t,
				start,
				end,
				deltaMs: start.getTime() - session.start.getTime()
			});
			else emit("taskResize", {
				task: t,
				start,
				end,
				edge: session.mode === "resize-start" ? "start" : "end"
			});
		};
		const onPointerUp = (e) => {
			const session = dragRef.current;
			if (!session) return;
			endDrag(session, {
				clientX: e.clientX,
				clientY: e.clientY
			});
		};
		document.addEventListener("pointermove", onPointerMove);
		document.addEventListener("pointerup", onPointerUp);
		document.addEventListener("pointercancel", onPointerUp);
		return () => {
			document.removeEventListener("pointermove", onPointerMove);
			document.removeEventListener("pointerup", onPointerUp);
			document.removeEventListener("pointercancel", onPointerUp);
		};
	}, [
		isDragging,
		emit,
		endDrag,
		syncTooltip,
		resolveDragDates,
		dragPreviewStore
	]);
	const beginDrag = useCallback((mode) => (e) => {
		if (mode === "move" && !enableDrag) return;
		if ((mode === "resize-start" || mode === "resize-end") && !enableResize) return;
		if (mode === "progress" && !enableProgressDrag) return;
		e.preventDefault();
		e.stopPropagation();
		const start = toDate(task.start);
		const end = toDate(task.end);
		const barRect = groupRef.current?.getBoundingClientRect() ?? e.currentTarget.getBoundingClientRect();
		if (mode === "move") emit("taskDragStart", {
			task,
			start,
			end
		});
		else if (mode.startsWith("resize")) emit("taskResizeStart", {
			task,
			edge: mode === "resize-start" ? "start" : "end"
		});
		if (mode === "move" || mode.startsWith("resize")) syncTooltip(task, e.clientX, e.clientY, start, end);
		dragPreviewStore?.clear();
		dragRef.current = {
			mode,
			originClientX: e.clientX,
			start,
			end,
			progress: task.progress ?? 0,
			barRect
		};
		setDragPreview(null);
		setIsDragging(true);
	}, [
		task,
		enableDrag,
		enableResize,
		enableProgressDrag,
		emit,
		syncTooltip,
		dragPreviewStore
	]);
	const renderGeometry = useMemo(() => {
		if (!dragPreview?.start || !dragPreview?.end) return geometry;
		return {
			...geometry,
			x: computeBarXExact(dragPreview.start, rangeStart, scale, columnWidth),
			width: computeBarWidthExact(dragPreview.start, dragPreview.end, scale, columnWidth, rangeStart)
		};
	}, [
		dragPreview,
		geometry,
		rangeStart,
		scale,
		columnWidth
	]);
	const progress = Math.max(0, Math.min(100, dragPreview?.progress ?? task.progress ?? 0));
	const progressWidth = progress >= 100 ? renderGeometry.width : renderGeometry.width * progress / 100;
	const isMilestone = task.type === "milestone";
	const isGroup = task.type === "group";
	const taskElement = isMilestone ? "milestone" : "bar";
	const isReadOnly = !enableDrag && !enableResize && !enableProgressDrag;
	const handleTaskClick = useCallback((e) => {
		emit("taskClick", {
			task,
			rowIndex: task._rowIndex,
			element: taskElement,
			ctrlKey: e.ctrlKey,
			metaKey: e.metaKey,
			shiftKey: e.shiftKey
		});
		emit("ganttClick", createPointerDetail({
			type: "task",
			task,
			rowIndex: task._rowIndex,
			element: taskElement
		}, e));
	}, [
		emit,
		task,
		taskElement
	]);
	const handleTaskDoubleClick = useCallback(() => {
		emit("taskDoubleClick", {
			task,
			rowIndex: task._rowIndex,
			element: taskElement
		});
	}, [
		emit,
		task,
		taskElement
	]);
	const handleTaskContextMenu = useCallback((e) => {
		e.stopPropagation();
		emit("ganttContextMenu", createPointerDetail({
			type: "task",
			task,
			rowIndex: task._rowIndex,
			element: taskElement
		}, e));
	}, [
		emit,
		task,
		taskElement
	]);
	const accentColor = task.color ?? "var(--rg-bar-fill)";
	const barStroke = task.borderColor;
	const barStrokeWidth = barStroke ? 1.5 : 0;
	return /* @__PURE__ */ jsx("g", {
		ref: groupRef,
		className: `rg-bar ${selected ? "rg-bar--selected" : ""} ${isGroup ? "rg-bar--group" : ""} ${isReadOnly ? "rg-bar--readonly" : ""}`,
		"data-task-id": task.id,
		"data-selected": selected || void 0,
		transform: `translate(${renderGeometry.x}, ${renderGeometry.y})`,
		onMouseEnter: (e) => {
			const hoverTask = emitTaskHover(task, e.clientX, e.clientY);
			tooltip?.show(hoverTask, e.clientX, e.clientY);
		},
		onMouseMove: (e) => tooltip?.move(e.clientX, e.clientY),
		onMouseLeave: () => {
			if (dragRef.current) return;
			emit("taskHover", {
				task: null,
				rowIndex: null
			});
			tooltip?.hide();
		},
		onClick: handleTaskClick,
		onDoubleClick: handleTaskDoubleClick,
		onContextMenu: handleTaskContextMenu,
		children: isMilestone ? /* @__PURE__ */ jsxs(Fragment, { children: [
			/* @__PURE__ */ jsx("polygon", {
				className: "rg-bar-milestone",
				points: milestoneDiamondPoints(renderGeometry.width, renderGeometry.height),
				fill: accentColor,
				stroke: barStroke,
				strokeWidth: barStrokeWidth,
				onPointerDown: beginDrag("move")
			}),
			selected && /* @__PURE__ */ jsx("rect", {
				className: "rg-bar-focus-ring",
				x: -4,
				y: -4,
				width: renderGeometry.width + 8,
				height: renderGeometry.height + 8,
				fill: "none",
				stroke: accentColor,
				strokeWidth: 2,
				pointerEvents: "none"
			}),
			/* @__PURE__ */ jsx("text", {
				className: "rg-bar-label",
				x: renderGeometry.width + 6,
				y: renderGeometry.height / 2,
				dominantBaseline: "middle",
				fontSize: 12,
				pointerEvents: "none",
				children: task.name
			})
		] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
			/* @__PURE__ */ jsx("rect", {
				className: "rg-bar-bg",
				width: renderGeometry.width,
				height: renderGeometry.height,
				rx: 4,
				fill: task.color ? accentColor : "var(--rg-bar-bg)",
				fillOpacity: task.color ? .35 : 1,
				stroke: barStroke,
				strokeWidth: barStrokeWidth,
				onPointerDown: beginDrag("move")
			}),
			/* @__PURE__ */ jsx("rect", {
				className: "rg-bar-progress",
				width: progressWidth,
				height: renderGeometry.height,
				rx: 4,
				fill: accentColor,
				pointerEvents: "none"
			}),
			enableResize && /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("rect", {
				className: "rg-bar-handle rg-bar-handle--start",
				x: 0,
				y: 0,
				width: HANDLE_WIDTH,
				height: renderGeometry.height,
				rx: 2,
				onPointerDown: beginDrag("resize-start")
			}), /* @__PURE__ */ jsx("rect", {
				className: "rg-bar-handle rg-bar-handle--end",
				x: renderGeometry.width - HANDLE_WIDTH,
				y: 0,
				width: HANDLE_WIDTH,
				height: renderGeometry.height,
				rx: 2,
				onPointerDown: beginDrag("resize-end")
			})] }),
			enableProgressDrag && /* @__PURE__ */ jsx("rect", {
				className: "rg-bar-progress-handle",
				x: Math.max(0, progressWidth - 4),
				y: renderGeometry.height - 6,
				width: 8,
				height: 10,
				rx: 2,
				onPointerDown: beginDrag("progress")
			}),
			selected && /* @__PURE__ */ jsx("rect", {
				className: "rg-bar-focus-ring",
				x: -4,
				y: -4,
				width: renderGeometry.width + 8,
				height: renderGeometry.height + 8,
				rx: 6,
				fill: "none",
				stroke: accentColor,
				strokeWidth: 2,
				pointerEvents: "none"
			}),
			/* @__PURE__ */ jsx("text", {
				className: "rg-bar-label",
				x: renderGeometry.width + 6,
				y: renderGeometry.height / 2,
				dominantBaseline: "middle",
				fontSize: 12,
				pointerEvents: "none",
				children: task.name
			})
		] })
	});
}
function propsEqual(prev, next) {
	if (prev.selected !== next.selected) return false;
	if (prev.task.id !== next.task.id) return false;
	if (prev.geometry.x !== next.geometry.x) return false;
	if (prev.geometry.width !== next.geometry.width) return false;
	if (prev.geometry.y !== next.geometry.y) return false;
	if (prev.geometry.height !== next.geometry.height) return false;
	if (prev.columnWidth !== next.columnWidth) return false;
	if (prev.scale.id !== next.scale.id) return false;
	if (prev.snapToGrid !== next.snapToGrid) return false;
	if (prev.timelineBounds?.min.getTime() !== next.timelineBounds?.min.getTime()) return false;
	if (prev.timelineBounds?.max.getTime() !== next.timelineBounds?.max.getTime()) return false;
	if (prev.rangeStart.getTime() !== next.rangeStart.getTime()) return false;
	if (prev.store.getTaskVersion(prev.task.id) !== next.store.getTaskVersion(next.task.id)) return false;
	if (prev.task.color !== next.task.color) return false;
	if (prev.task.borderColor !== next.task.borderColor) return false;
	if (prev.task.name !== next.task.name) return false;
	if (prev.task.progress !== next.task.progress) return false;
	if (prev.enableDrag !== next.enableDrag) return false;
	if (prev.enableResize !== next.enableResize) return false;
	if (prev.enableProgressDrag !== next.enableProgressDrag) return false;
	if (prev.task.type !== next.task.type) return false;
	if (prev.task.width !== next.task.width) return false;
	return true;
}
const TaskBar = memo(TaskBarInner, propsEqual);

//#endregion
//#region src/components/Timeline/TimelineGrid.tsx
const TimelineGrid = memo(function TimelineGrid$1({ range, scale, columnWidth, rowLayouts, visibleColumns, dateMarkings }) {
	const totalHeight = totalRowLayoutHeight(rowLayouts);
	const timelineWidth = resolveTimelineWidth(range, columnWidth);
	const markingRects = useMemo(() => {
		return filterRectsInXRange([...dateMarkings?.holidays ?? [], ...dateMarkings?.blocks ?? []], visibleColumns.startX, visibleColumns.endX);
	}, [
		dateMarkings,
		visibleColumns.startX,
		visibleColumns.endX
	]);
	const verticalLines = useMemo(() => getVisibleVerticalLines(visibleColumns, columnWidth, timelineWidth), [
		visibleColumns,
		columnWidth,
		timelineWidth
	]);
	const horizontalLines = useMemo(() => {
		return rowLayouts.map((row) => row.y + row.height);
	}, [rowLayouts]);
	return /* @__PURE__ */ jsxs("svg", {
		className: "rg-timeline-grid",
		width: "100%",
		height: totalHeight,
		viewBox: `0 0 ${timelineWidth} ${totalHeight}`,
		preserveAspectRatio: "none",
		"data-testid": "timeline-grid",
		children: [
			/* @__PURE__ */ jsx("rect", {
				x: 0,
				y: 0,
				width: timelineWidth,
				height: totalHeight,
				className: "rg-grid-fill"
			}),
			/* @__PURE__ */ jsx(DateMarkingHighlights, {
				rects: markingRects,
				height: totalHeight
			}),
			verticalLines.map((x) => /* @__PURE__ */ jsx("line", {
				x1: x,
				y1: 0,
				x2: x,
				y2: totalHeight,
				className: "rg-grid-line rg-grid-line--vertical"
			}, x)),
			horizontalLines.map((y) => /* @__PURE__ */ jsx("line", {
				x1: 0,
				y1: y,
				x2: timelineWidth,
				y2: y,
				className: "rg-grid-line rg-grid-line--horizontal"
			}, y)),
			/* @__PURE__ */ jsx(TodayMarker, {
				range,
				scale,
				columnWidth,
				rowHeight: totalHeight
			})
		]
	});
});
const TodayMarker = memo(function TodayMarker$1({ range, scale, columnWidth, rowHeight }) {
	const today = /* @__PURE__ */ new Date();
	if (today < range.start || today > range.end) return null;
	const x = dateToScalePixel(today, range.start, scale, columnWidth);
	return /* @__PURE__ */ jsx("line", {
		x1: x,
		y1: 0,
		x2: x,
		y2: rowHeight,
		className: "rg-today-marker",
		strokeWidth: 2
	});
});

//#endregion
//#region src/components/Timeline/DependencyLayer.tsx
/**
* Link geometry, following an in-flight drag. Each layer subscribes on its own, so a drag frame
* re-renders the layers and not the timeline body. With interactive links that computes the
* geometry twice per frame (drawn + hit layer); it is linear in the number of links.
*/
function useDependencyLinks({ tasks, range, scale, columnWidth, rowLayouts, showBaseline, dragPreviewStore }) {
	const dragPreview = useDragPreviewSnapshot(dragPreviewStore);
	return useMemo(() => computeDependencyLinks({
		tasks,
		rowLayouts,
		rangeStart: range.start,
		scale,
		columnWidth,
		showBaseline,
		preview: {
			taskId: dragPreview.taskId,
			dates: dragPreview.dates
		}
	}), [
		tasks,
		range.start,
		scale,
		columnWidth,
		rowLayouts,
		showBaseline,
		dragPreview.taskId,
		dragPreview.dates
	]);
}
/** Label text for a link's lag; `''` (no label) when the lag is zero or the formatter says so. */
function dependencyLagLabel(link, format$2) {
	if (link.lag === 0) return "";
	return format$2 ? format$2(link.lag, link.target.dependency) : defaultDependencyLagLabel(link.lag);
}
function dependencyClassName(link, selected) {
	const { dependency } = link.target;
	let cls = `rg-dependency rg-dependency--${link.type.toLowerCase()}`;
	if (selected) cls += " rg-dependency--selected";
	if (dependency.critical) cls += " rg-dependency--critical";
	if (dependency.className) cls += ` ${dependency.className}`;
	return cls;
}
/**
* Draws dependency links under the bars: line, arrowhead and lag label per link, grouped so a
* link's `color`, `className`, selection and `critical` style all three. Not interactive — the
* hit strokes live in `DependencyHitTargets`, inside the bars' SVG.
*/
const DependencyLayer = memo(function DependencyLayer$1({ selectedDependencyIds, formatLag,...layout }) {
	const links = useDependencyLinks(layout);
	const selected = useMemo(() => new Set(selectedDependencyIds), [selectedDependencyIds]);
	if (links.length === 0) return null;
	const totalHeight = totalRowLayoutHeight(layout.rowLayouts);
	return /* @__PURE__ */ jsx("svg", {
		className: "rg-dependency-layer",
		width: resolveTimelineWidth(layout.range, layout.columnWidth),
		height: totalHeight,
		style: { pointerEvents: "none" },
		"aria-hidden": "true",
		"data-testid": "dependency-layer",
		children: links.map((link) => {
			const color = link.target.dependency.color;
			const lagLabel = dependencyLagLabel(link, formatLag);
			return /* @__PURE__ */ jsxs("g", {
				className: dependencyClassName(link, selected.has(link.id)),
				style: color ? { "--rg-dependency-color": color } : void 0,
				"data-dependency-id": link.id,
				"data-dependency-type": link.type,
				children: [
					/* @__PURE__ */ jsx("path", {
						d: link.d,
						className: "rg-dependency-arrow",
						fill: "none"
					}),
					/* @__PURE__ */ jsx("polygon", {
						points: link.head,
						className: "rg-dependency-arrow-head"
					}),
					lagLabel && /* @__PURE__ */ jsx("text", {
						x: link.label.x + 4,
						y: link.label.y,
						className: "rg-dependency-lag",
						dominantBaseline: "middle",
						children: lagLabel
					})
				]
			}, link.id);
		})
	});
});

//#endregion
//#region src/components/Timeline/DependencyHitTargets.tsx
/** The link a delegated event came from, by the hit stroke's `data-dependency-id`. */
function linkOf(byId, e) {
	const id = e.target instanceof Element ? e.target.getAttribute("data-dependency-id") : null;
	return id === null ? void 0 : byId.get(id);
}
/**
* Invisible, wide hit strokes over each link, rendered as the first children of the bars' SVG:
* the bars paint over them (so a bar keeps its own pointer events) while a click on a link in
* the space between bars lands here. Only these strokes take pointer events; the handlers are
* delegated to the group, so each stroke carries only static props.
*
* Each stroke is focusable: Enter/Space selects the link like a click, and the chart turns
* Delete/Backspace into `dependencyDelete` while any link is selected.
*/
const DependencyHitTargets = memo(function DependencyHitTargets$1({ selectedDependencyIds, formatLag, emit, onSelect,...layout }) {
	const links = useDependencyLinks(layout);
	const byId = useMemo(() => new Map(links.map((link) => [link.id, link])), [links]);
	const selected = useMemo(() => new Set(selectedDependencyIds), [selectedDependencyIds]);
	if (links.length === 0) return null;
	const activate = (detail) => {
		onSelect(detail.target.id, !!(detail.ctrlKey || detail.metaKey));
		emit("dependencyClick", detail);
		emit("ganttClick", detail);
	};
	const handleClick = (e) => {
		const link = linkOf(byId, e);
		if (!link) return;
		e.stopPropagation();
		activate(createPointerDetail(link.target, e));
	};
	const handleKeyDown = (e) => {
		if (e.key !== "Enter" && e.key !== " ") return;
		const link = linkOf(byId, e);
		if (!link || !(e.target instanceof Element)) return;
		e.preventDefault();
		const box = e.target.getBoundingClientRect();
		activate(createPointerDetail(link.target, {
			clientX: box.left + box.width / 2,
			clientY: box.top + box.height / 2,
			ctrlKey: e.ctrlKey,
			metaKey: e.metaKey,
			shiftKey: e.shiftKey,
			preventDefault: () => e.preventDefault()
		}));
	};
	const handleContextMenu = (e) => {
		const link = linkOf(byId, e);
		if (!link) return;
		e.stopPropagation();
		const detail = createPointerDetail(link.target, e);
		emit("dependencyContextMenu", detail);
		emit("ganttContextMenu", detail);
	};
	const hover = (phase) => (e) => {
		const link = linkOf(byId, e);
		if (!link) return;
		const detail = {
			target: link.target,
			phase,
			clientX: e.clientX,
			clientY: e.clientY
		};
		emit("dependencyHover", detail);
		emit("ganttHover", detail);
	};
	return /* @__PURE__ */ jsx("g", {
		className: "rg-dependency-hits",
		"data-testid": "dependency-hits",
		onClick: handleClick,
		onKeyDown: handleKeyDown,
		onContextMenu: handleContextMenu,
		onPointerOver: hover("enter"),
		onPointerOut: hover("leave"),
		children: links.map((link) => {
			const isSelected = selected.has(link.id);
			return /* @__PURE__ */ jsx("path", {
				d: link.d,
				className: `rg-dependency-hit${isSelected ? " rg-dependency-hit--selected" : ""}`,
				fill: "none",
				stroke: "transparent",
				pointerEvents: "stroke",
				tabIndex: 0,
				role: "button",
				"aria-pressed": isSelected,
				"aria-label": dependencyAccessibleName(link, dependencyLagLabel(link, formatLag)),
				"data-dependency-id": link.id,
				"data-dependency-type": link.type
			}, link.id);
		})
	});
});

//#endregion
//#region src/components/Timeline/baselineGeometry.ts
const DEFAULT_BASELINE_COLOR = "#e6a23c";
function resolveBaselineColor(task) {
	return task.baseline?.color ?? DEFAULT_BASELINE_COLOR;
}
function computeBaselineGeometry(task, barGeometry, rowY, rowHeight, rangeStart, scale, columnWidth, showBaseline) {
	if (!showBaseline || task._baselineStart == null || task._baselineEnd == null) return null;
	const color = resolveBaselineColor(task);
	if (task.type === "milestone") {
		const size = MILESTONE_DIAMOND_SIZE;
		const centerX = computeBarXExact(task._baselineStart, rangeStart, scale, columnWidth);
		return {
			taskId: task.id,
			kind: "milestone",
			x: centerX - size / 2,
			y: barGeometry.y + MILESTONE_BASELINE_TOP_OFFSET,
			width: size,
			height: size,
			color
		};
	}
	if (!taskHasBarBaseline(task, showBaseline)) return null;
	const x = computeBarXExact(task._baselineStart, rangeStart, scale, columnWidth);
	const width = computeBarWidthExact(task._baselineStart, task._baselineEnd, scale, columnWidth, rangeStart);
	const y = rowY + rowHeight - BASELINE_BOTTOM_PAD - BASELINE_LINE_HEIGHT;
	return {
		taskId: task.id,
		kind: "bar",
		x,
		y,
		width,
		height: BASELINE_LINE_HEIGHT,
		color
	};
}

//#endregion
//#region src/components/Timeline/BaselineLayer.tsx
function BaselineShape({ g, task, rowIndex, interactive, emit }) {
	const element = g.kind === "milestone" ? "milestone" : "bar";
	const handleClick = (e) => {
		if (!interactive || !emit) return;
		e.stopPropagation();
		emit("ganttClick", createPointerDetail({
			type: "baseline",
			task,
			rowIndex,
			element
		}, e));
	};
	const handleContextMenu = (e) => {
		if (!interactive || !emit) return;
		e.stopPropagation();
		emit("ganttContextMenu", createPointerDetail({
			type: "baseline",
			task,
			rowIndex,
			element
		}, e));
	};
	if (g.kind === "milestone") return /* @__PURE__ */ jsx("polygon", {
		className: "rg-baseline-milestone rg-baseline-hit",
		points: milestoneDiamondPoints(g.width, g.height),
		transform: `translate(${g.x}, ${g.y})`,
		fill: g.color,
		onClick: handleClick,
		onContextMenu: handleContextMenu
	});
	return /* @__PURE__ */ jsx("rect", {
		className: "rg-baseline-bar rg-baseline-hit",
		x: g.x,
		y: g.y,
		width: g.width,
		height: g.height,
		rx: 1.5,
		fill: g.color,
		onClick: handleClick,
		onContextMenu: handleContextMenu
	});
}
const BaselineLayer = memo(function BaselineLayer$1({ tasks, barGeometries, rowLayouts, rangeStart, scale, columnWidth, totalHeight, showBaseline, interactive = false, emit }) {
	const shapes = [];
	tasks.forEach((task, i) => {
		const barGeom = barGeometries[i];
		const row = rowLayouts[i];
		const baseline = computeBaselineGeometry(task, barGeom, row.y, row.height, rangeStart, scale, columnWidth, showBaseline);
		if (baseline) shapes.push({
			g: baseline,
			task,
			rowIndex: task._rowIndex
		});
	});
	if (shapes.length === 0) return null;
	return /* @__PURE__ */ jsx("svg", {
		className: `rg-baseline-layer${interactive ? " rg-baseline-layer--interactive" : ""}`,
		width: "100%",
		height: totalHeight,
		"data-testid": "baseline-layer",
		children: shapes.map(({ g, task, rowIndex }) => /* @__PURE__ */ jsx(BaselineShape, {
			g,
			task,
			rowIndex,
			interactive,
			emit
		}, g.taskId))
	});
});

//#endregion
//#region src/components/Timeline/DateMarkingInteractionLayer.tsx
function targetFromRect(rect, blockDates) {
	if (rect.kind === "block") {
		const index = rect.sourceIndex ?? 0;
		const range = blockDates?.[index];
		if (!range) return null;
		return {
			type: "blockDate",
			range,
			index
		};
	}
	if (!rect.date) return null;
	return {
		type: "holiday",
		date: rect.date,
		label: rect.label,
		index: rect.sourceIndex
	};
}
function DateMarkingInteractionLayer({ dateMarkings, blockDates, height, interactive, emit }) {
	if (!interactive || !dateMarkings) return null;
	const rects = [...dateMarkings.holidays, ...dateMarkings.blocks];
	if (rects.length === 0) return null;
	const emitHover = (target, phase, e) => {
		emit("ganttHover", {
			target,
			phase,
			clientX: e.clientX,
			clientY: e.clientY
		});
	};
	return /* @__PURE__ */ jsx("svg", {
		className: "rg-date-marking-interaction",
		width: "100%",
		height,
		children: rects.map((rect) => {
			const handleClick = (e) => {
				e.stopPropagation();
				const target = targetFromRect(rect, blockDates);
				if (!target) return;
				emit("ganttClick", createPointerDetail(target, e));
			};
			const handleContextMenu = (e) => {
				e.stopPropagation();
				const target = targetFromRect(rect, blockDates);
				if (!target) return;
				emit("ganttContextMenu", createPointerDetail(target, e));
			};
			const handleMouseEnter = (e) => {
				const target = targetFromRect(rect, blockDates);
				if (!target) return;
				emitHover(target, "enter", e);
			};
			const handleMouseMove = (e) => {
				const target = targetFromRect(rect, blockDates);
				if (!target) return;
				emitHover(target, "move", e);
			};
			const handleMouseLeave = (e) => {
				emitHover(targetFromRect(rect, blockDates), "leave", e);
			};
			return /* @__PURE__ */ jsx("rect", {
				x: rect.x,
				y: 0,
				width: rect.width,
				height,
				fill: "transparent",
				className: `rg-date-marking-hit rg-date-marking-hit--${rect.kind}`,
				"data-testid": `date-marking-hit-${rect.kind}`,
				onClick: handleClick,
				onContextMenu: handleContextMenu,
				onMouseEnter: handleMouseEnter,
				onMouseMove: handleMouseMove,
				onMouseLeave: handleMouseLeave
			}, rect.key);
		})
	});
}

//#endregion
//#region src/core/timelineInteraction.ts
function resolveRowAtY(y, rowLayouts) {
	for (let i = 0; i < rowLayouts.length; i++) {
		const row = rowLayouts[i];
		if (y >= row.y && y < row.y + row.height) return i;
	}
	return null;
}

//#endregion
//#region src/components/Timeline/TimelineHitLayer.tsx
function TimelineHitLayer({ range, scale, columnWidth, rowLayouts, height, interactive, emit }) {
	if (!interactive) return null;
	const timelineWidth = resolveTimelineWidth(range, columnWidth);
	const resolveTarget = (clientX, clientY, svg) => {
		const rect = svg.getBoundingClientRect();
		const x = (clientX - rect.left) / rect.width * timelineWidth;
		const rowIndex = resolveRowAtY((clientY - rect.top) / rect.height * height, rowLayouts);
		return {
			type: "timeline",
			date: scalePixelToDate(x, range.start, scale, columnWidth),
			rowIndex
		};
	};
	const handleClick = (e) => {
		const svg = e.currentTarget.ownerSVGElement;
		if (!svg) return;
		emit("ganttClick", createPointerDetail(resolveTarget(e.clientX, e.clientY, svg), e));
	};
	const handleContextMenu = (e) => {
		const svg = e.currentTarget.ownerSVGElement;
		if (!svg) return;
		emit("ganttContextMenu", createPointerDetail(resolveTarget(e.clientX, e.clientY, svg), e));
	};
	return /* @__PURE__ */ jsx("svg", {
		className: "rg-timeline-hit",
		width: "100%",
		height,
		viewBox: `0 0 ${timelineWidth} ${height}`,
		preserveAspectRatio: "none",
		"data-testid": "timeline-hit-layer",
		children: /* @__PURE__ */ jsx("rect", {
			x: 0,
			y: 0,
			width: timelineWidth,
			height,
			fill: "transparent",
			className: "rg-timeline-hit-rect",
			onClick: handleClick,
			onContextMenu: handleContextMenu
		})
	});
}

//#endregion
//#region src/components/Timeline/TimelineBody.tsx
const TimelineBody = memo(function TimelineBody$1({ tasks, range, scale, columnWidth, rowLayouts, visibleColumns, store, enableDrag, enableResize, enableProgressDrag, groupSummaryRollup, snapToGrid = true, timelineBounds, dateMarkings, blockDates, showBaseline = true, selectedTaskIds, selectedDependencyIds, formatDependencyLag, onDependencySelect, interactionsEnabled = false, emit, dragPreviewStore, onTaskUpdate }) {
	const geometries = useMemo(() => {
		return tasks.map((task, i) => {
			const row = rowLayouts[i];
			const hasBarBaseline = taskHasBarBaseline(task, showBaseline);
			const barHeight = getTaskBarHeight(task, row.height, hasBarBaseline);
			const barPad = getTaskBarPad(task, row.height, barHeight, hasBarBaseline);
			if (task.type === "milestone") return {
				taskId: task.id,
				...computeMilestoneGeometry(task._start, row.y, row.height, range.start, scale, columnWidth, barHeight)
			};
			return {
				taskId: task.id,
				x: computeBarXExact(task._start, range.start, scale, columnWidth),
				width: computeBarWidthExact(task._start, task._end, scale, columnWidth, range.start),
				y: row.y + barPad,
				height: barHeight
			};
		});
	}, [
		tasks,
		range.start,
		scale,
		columnWidth,
		rowLayouts,
		showBaseline
	]);
	const totalHeight = totalRowLayoutHeight(rowLayouts);
	return /* @__PURE__ */ jsxs("div", {
		className: "rg-timeline-body",
		"data-testid": "timeline-body",
		children: [
			/* @__PURE__ */ jsx(TimelineGrid, {
				range,
				scale,
				columnWidth,
				rowLayouts,
				visibleColumns,
				dateMarkings
			}),
			/* @__PURE__ */ jsx(TimelineHitLayer, {
				range,
				scale,
				columnWidth,
				rowLayouts,
				height: totalHeight,
				interactive: interactionsEnabled,
				emit
			}),
			/* @__PURE__ */ jsx(DateMarkingInteractionLayer, {
				dateMarkings,
				blockDates,
				height: totalHeight,
				interactive: interactionsEnabled,
				emit
			}),
			/* @__PURE__ */ jsx(DependencyLayer, {
				tasks,
				range,
				scale,
				columnWidth,
				rowLayouts,
				showBaseline,
				dragPreviewStore,
				selectedDependencyIds,
				formatLag: formatDependencyLag
			}),
			showBaseline && /* @__PURE__ */ jsx(BaselineLayer, {
				tasks,
				barGeometries: geometries.map((g) => ({
					x: g.x,
					y: g.y,
					width: g.width,
					height: g.height
				})),
				rowLayouts,
				rangeStart: range.start,
				scale,
				columnWidth,
				totalHeight,
				showBaseline,
				interactive: interactionsEnabled,
				emit
			}),
			/* @__PURE__ */ jsxs("svg", {
				className: "rg-timeline-bars",
				width: "100%",
				height: totalHeight,
				children: [onDependencySelect && /* @__PURE__ */ jsx(DependencyHitTargets, {
					tasks,
					range,
					scale,
					columnWidth,
					rowLayouts,
					showBaseline,
					dragPreviewStore,
					selectedDependencyIds,
					formatLag: formatDependencyLag,
					emit,
					onSelect: onDependencySelect
				}), tasks.map((task, i) => {
					if (!shouldRenderTaskBar(task, tasks)) return null;
					const g = geometries[i];
					const flags = resolveTaskInteractionFlags(task, {
						enableDrag: enableDrag ?? true,
						enableResize: enableResize ?? true,
						enableProgressDrag: enableProgressDrag ?? true,
						groupSummaryRollup
					});
					return /* @__PURE__ */ jsx(TaskBar, {
						task,
						geometry: {
							x: g.x,
							y: g.y,
							width: g.width,
							height: g.height
						},
						columnWidth,
						scale,
						rangeStart: range.start,
						store,
						selected: selectedTaskIds?.includes(task.id) ?? false,
						enableDrag: flags.enableDrag,
						enableResize: flags.enableResize,
						enableProgressDrag: flags.enableProgressDrag,
						snapToGrid,
						timelineBounds,
						emit,
						onTaskUpdate
					}, task.id);
				})]
			})
		]
	});
});

//#endregion
//#region src/components/Toolbar/ZoomToolbar.tsx
const ZoomToolbar = memo(function ZoomToolbar$1({ scale, availableScales, onZoomChange }) {
	const availableIds = availableScales.map((s) => s.id);
	const atMin = scale.id === availableScales[0]?.id;
	const atMax = scale.id === availableScales[availableScales.length - 1]?.id;
	return /* @__PURE__ */ jsxs("div", {
		className: "rg-toolbar",
		"data-testid": "zoom-toolbar",
		children: [
			/* @__PURE__ */ jsx("button", {
				type: "button",
				className: "rg-toolbar-btn",
				onClick: () => onZoomChange(nextZoomLevel(scale.id, "out", availableIds)),
				disabled: atMin,
				"aria-label": "Zoom out",
				children: "−"
			}),
			/* @__PURE__ */ jsx("span", {
				className: "rg-toolbar-label",
				children: scale.label
			}),
			/* @__PURE__ */ jsx("button", {
				type: "button",
				className: "rg-toolbar-btn",
				onClick: () => onZoomChange(nextZoomLevel(scale.id, "in", availableIds)),
				disabled: atMax,
				"aria-label": "Zoom in",
				children: "+"
			})
		]
	});
});

//#endregion
//#region src/components/CustomRows/CustomRowsTimeline.tsx
function customRowsTimelinePropsEqual(prev, next) {
	if (prev.rows !== next.rows) return false;
	if (prev.metrics !== next.metrics) return false;
	if (prev.timelineWidth !== next.timelineWidth) return false;
	if (prev.columnCount !== next.columnCount) return false;
	if (prev.rowHeight !== next.rowHeight) return false;
	if (prev.emit !== next.emit) return false;
	if (prev.stickyPosition !== next.stickyPosition) return false;
	if (prev.stickyOffsets !== next.stickyOffsets) return false;
	return true;
}
const CustomRowsTimeline = memo(function CustomRowsTimeline$1({ rows, rowHeight, timelineWidth, metrics, columnCount, emit, stickyPosition, stickyOffsets }) {
	if (rows.length === 0) return null;
	const bands = rows.map((row, rowIndex) => {
		const height = getCustomRowHeight(row, rowHeight);
		const stickyOffset = stickyOffsets?.[rowIndex];
		return /* @__PURE__ */ jsx("div", {
			className: `rg-custom-row-timeline-band${stickyPosition ? " rg-row--sticky" : ""}`,
			style: {
				height,
				width: timelineWidth,
				...stickyPosition && stickyOffset !== void 0 ? {
					position: "sticky",
					top: stickyPosition === "top" ? stickyOffset : void 0,
					bottom: stickyPosition === "bottom" ? stickyOffset : void 0,
					zIndex: 4
				} : {}
			},
			"data-row-id": row.id,
			"data-sticky": stickyPosition,
			"data-testid": stickyPosition && rowIndex === 0 ? `custom-rows-sticky-${stickyPosition}` : void 0,
			children: /* @__PURE__ */ jsx(AsyncCustomCell, {
				row,
				columnKey: "__timeline__",
				columnIndex: columnCount,
				rowIndex,
				metrics,
				emit,
				timeline: true
			})
		}, row.id);
	});
	if (stickyPosition) return /* @__PURE__ */ jsx(Fragment, { children: bands });
	return /* @__PURE__ */ jsx("div", {
		className: "rg-custom-rows-timeline",
		"data-testid": "custom-rows",
		children: bands
	});
}, customRowsTimelinePropsEqual);

//#endregion
//#region src/components/Timeline/StickyTaskTimelineRows.tsx
const StickyTaskTimelineRows = memo(function StickyTaskTimelineRows$1({ tasks, rowLayouts, allTasks, position, stickyOffsets, range, scale, columnWidth, store, enableDrag, enableResize, enableProgressDrag, groupSummaryRollup, snapToGrid = true, timelineBounds, showBaseline = true, selectedTaskIds, emit, onTaskUpdate }) {
	const geometries = useMemo(() => {
		return tasks.map((task, i) => {
			const row = rowLayouts[i];
			const hasBarBaseline = taskHasBarBaseline(task, showBaseline);
			const barHeight = getTaskBarHeight(task, row.height, hasBarBaseline);
			const barPad = getTaskBarPad(task, row.height, barHeight, hasBarBaseline);
			if (task.type === "milestone") return {
				taskId: task.id,
				...computeMilestoneGeometry(task._start, 0, row.height, range.start, scale, columnWidth, barHeight)
			};
			return {
				taskId: task.id,
				x: computeBarXExact(task._start, range.start, scale, columnWidth),
				width: computeBarWidthExact(task._start, task._end, scale, columnWidth, range.start),
				y: barPad,
				height: barHeight
			};
		});
	}, [
		tasks,
		range.start,
		scale,
		columnWidth,
		rowLayouts,
		showBaseline
	]);
	if (tasks.length === 0) return null;
	return /* @__PURE__ */ jsx(Fragment, { children: tasks.map((task, i) => {
		if (!shouldRenderTaskBar(task, allTasks)) return null;
		const row = rowLayouts[i];
		const g = geometries[i];
		const flags = resolveTaskInteractionFlags(task, {
			enableDrag: enableDrag ?? true,
			enableResize: enableResize ?? true,
			enableProgressDrag: enableProgressDrag ?? true,
			groupSummaryRollup
		});
		const stickyOffset = stickyOffsets[i] ?? 0;
		return /* @__PURE__ */ jsx("div", {
			className: "rg-sticky-task-timeline-row",
			style: {
				height: row.height,
				width: "100%",
				position: "sticky",
				top: position === "top" ? stickyOffset : void 0,
				bottom: position === "bottom" ? stickyOffset : void 0,
				zIndex: 4
			},
			"data-task-id": task.id,
			"data-sticky": position,
			"data-testid": i === 0 ? `sticky-task-timeline-${position}` : void 0,
			children: /* @__PURE__ */ jsx("svg", {
				className: "rg-sticky-task-timeline-bars",
				width: "100%",
				height: row.height,
				children: /* @__PURE__ */ jsx(TaskBar, {
					task,
					geometry: {
						x: g.x,
						y: g.y,
						width: g.width,
						height: g.height
					},
					columnWidth,
					scale,
					rangeStart: range.start,
					store,
					selected: selectedTaskIds?.includes(task.id) ?? false,
					enableDrag: flags.enableDrag,
					enableResize: flags.enableResize,
					enableProgressDrag: flags.enableProgressDrag,
					snapToGrid,
					timelineBounds,
					emit,
					onTaskUpdate
				})
			})
		}, task.id);
	}) });
});

//#endregion
//#region src/context/GanttChartContext.tsx
const GanttTimelineContext = createContext(null);
function GanttTimelineProvider({ value, children }) {
	return /* @__PURE__ */ jsx(GanttTimelineContext.Provider, {
		value,
		children
	});
}
/** Timeline scale/range metrics for custom row renderers inside `GanttChart`. */
function useGanttTimeline() {
	const ctx = useContext(GanttTimelineContext);
	if (!ctx) throw new Error("useGanttTimeline must be used within a GanttChart custom row or child component");
	return ctx;
}
function useGanttTimelineOptional() {
	return useContext(GanttTimelineContext);
}

//#endregion
//#region src/components/Timeline/EventMarkersLayer.tsx
const EventMarkersLayer = memo(function EventMarkersLayer$1({ markers, range, scale, columnWidth, totalHeight, headerHeight = TIMELINE_HEADER_HEIGHT, interactive = false, emit }) {
	const resolved = useMemo(() => computeEventMarkerPositions(markers, range, scale, columnWidth, headerHeight), [
		markers,
		range,
		scale,
		columnWidth,
		headerHeight
	]);
	if (resolved.length === 0) return null;
	const handleClick = (marker, index, e) => {
		if (!interactive || !emit) return;
		e.stopPropagation();
		emit("ganttClick", createPointerDetail({
			type: "eventMarker",
			marker,
			index
		}, e));
	};
	const handleContextMenu = (marker, index, e) => {
		if (!interactive || !emit) return;
		e.stopPropagation();
		emit("ganttContextMenu", createPointerDetail({
			type: "eventMarker",
			marker,
			index
		}, e));
	};
	return /* @__PURE__ */ jsx("div", {
		className: `rg-event-markers${interactive ? " rg-event-markers--interactive" : ""}`,
		style: { height: totalHeight },
		"data-testid": "event-markers",
		children: resolved.map((marker) => /* @__PURE__ */ jsxs("div", {
			className: "rg-event-marker rg-event-marker-hit",
			style: {
				left: marker.x,
				"--rg-event-marker-color": marker.color
			},
			tabIndex: interactive ? 0 : -1,
			"aria-label": `Event marker ${marker.label}`,
			onClick: (e) => handleClick(marker.marker, marker.index, e),
			onContextMenu: (e) => handleContextMenu(marker.marker, marker.index, e),
			children: [/* @__PURE__ */ jsx("div", {
				className: "rg-event-marker-label",
				style: { top: marker.labelTop },
				children: marker.label
			}), /* @__PURE__ */ jsx("div", {
				className: "rg-event-marker-arrow",
				style: { top: marker.labelTop + 10 }
			})]
		}, marker.key))
	});
});

//#endregion
//#region src/components/Timeline/DraggableMarkersLayer.tsx
const HIT_WIDTH = 12;
const LABEL_OFFSET = HIT_WIDTH / 2 + 4;
function clientXToTimelineX(clientX, layerRect, timelineWidth) {
	return (clientX - layerRect.left) / layerRect.width * timelineWidth;
}
function setMarkerX(x, lineEl, hitEl) {
	lineEl.setAttribute("x1", String(x));
	lineEl.setAttribute("x2", String(x));
	if (hitEl) hitEl.style.left = `${x - HIT_WIDTH / 2}px`;
}
const DraggableMarkersLayer = memo(function DraggableMarkersLayer$1({ markers, snapPoints, range, scale, columnWidth, totalHeight, snapToGrid = true, timelineBounds, interactionFlags, emit }) {
	const layerRef = useRef(null);
	const lineRefs = useRef(/* @__PURE__ */ new Map());
	const hitRefs = useRef(/* @__PURE__ */ new Map());
	const dragRef = useRef(null);
	const didDragRef = useRef(false);
	const flagsRef = useRef(interactionFlags);
	flagsRef.current = interactionFlags;
	const [isDragging, setIsDragging] = useState(false);
	const { dragEnabled, clickEnabled, useSnapPoints } = interactionFlags;
	const renderHitTargets = dragEnabled || clickEnabled;
	const timelineWidth = resolveTimelineWidth(range, columnWidth);
	const resolved = useMemo(() => computeDraggableMarkerPositions(markers, range, scale, columnWidth), [
		markers,
		range,
		scale,
		columnWidth
	]);
	const resolvedSnapPoints = useMemo(() => useSnapPoints ? computeDraggableMarkerSnapPoints(snapPoints, range, scale, columnWidth) : [], [
		useSnapPoints,
		snapPoints,
		range,
		scale,
		columnWidth
	]);
	const resolvePositionFromX = useCallback((x, snap) => resolveMarkerPositionFromX(x, range.start, scale, columnWidth, snap && !useSnapPoints ? snapToGrid : false, timelineWidth, timelineBounds, snap && useSnapPoints ? resolvedSnapPoints : void 0), [
		range.start,
		scale,
		columnWidth,
		snapToGrid,
		timelineWidth,
		timelineBounds,
		useSnapPoints,
		resolvedSnapPoints
	]);
	const resolvePositionFromClient = useCallback((clientX, snap) => {
		const layer = layerRef.current;
		if (!layer) return {
			x: 0,
			date: /* @__PURE__ */ new Date(),
			stepIndex: 0
		};
		return resolvePositionFromX(clientXToTimelineX(clientX, layer.getBoundingClientRect(), timelineWidth), snap);
	}, [timelineWidth, resolvePositionFromX]);
	const endDrag = useCallback((session, clientX) => {
		const flags = flagsRef.current;
		const position = resolvePositionFromClient(clientX, true);
		const { marker, index, originDate, lineEl, hitEl } = session;
		if (flags.emitDragEnd && emit) emit("draggableMarkerDragEnd", {
			marker,
			index,
			date: position.date,
			previousDate: originDate,
			snapPoint: position.snapPoint?.snapPoint,
			snapPointIndex: position.snapPoint?.index
		});
		if (flags.emitDragToSnapPoint && position.snapPoint && emit) emit("draggableMarkerDragToSnapPoint", {
			marker,
			index,
			snapPoint: position.snapPoint.snapPoint,
			snapPointIndex: position.snapPoint.index,
			date: position.date,
			previousDate: originDate,
			phase: "end"
		});
		setMarkerX(position.x, lineEl, hitEl);
		dragRef.current = null;
		setIsDragging(false);
		lineEl.classList.remove("rg-draggable-marker-line--dragging");
	}, [emit, resolvePositionFromClient]);
	useEffect(() => {
		if (!isDragging) return;
		const onPointerMove = (e) => {
			const session = dragRef.current;
			const layer = layerRef.current;
			const flags = flagsRef.current;
			if (!session || !layer) return;
			didDragRef.current = true;
			const position = resolvePositionFromX(clientXToTimelineX(e.clientX, layer.getBoundingClientRect(), timelineWidth), useSnapPoints);
			setMarkerX(position.x, session.lineEl, session.hitEl);
			if (flags.emitDragToSnapPoint && position.snapPoint && position.snapPoint.index !== session.activeSnapPointIndex && emit) {
				session.activeSnapPointIndex = position.snapPoint.index;
				emit("draggableMarkerDragToSnapPoint", {
					marker: session.marker,
					index: session.index,
					snapPoint: position.snapPoint.snapPoint,
					snapPointIndex: position.snapPoint.index,
					date: position.date,
					previousDate: session.originDate,
					phase: "drag"
				});
			}
			if (flags.emitDrag && emit) emit("draggableMarkerDrag", {
				marker: session.marker,
				index: session.index,
				date: position.date,
				previousDate: session.originDate,
				deltaMs: position.date.getTime() - session.originDate.getTime()
			});
		};
		const onPointerUp = (e) => {
			const session = dragRef.current;
			if (!session) return;
			endDrag(session, e.clientX);
		};
		document.addEventListener("pointermove", onPointerMove);
		document.addEventListener("pointerup", onPointerUp);
		document.addEventListener("pointercancel", onPointerUp);
		return () => {
			document.removeEventListener("pointermove", onPointerMove);
			document.removeEventListener("pointerup", onPointerUp);
			document.removeEventListener("pointercancel", onPointerUp);
		};
	}, [
		isDragging,
		timelineWidth,
		useSnapPoints,
		resolvePositionFromX,
		emit,
		endDrag
	]);
	const beginDrag = useCallback((resolvedMarker) => (e) => {
		const flags = flagsRef.current;
		if (!resolvedMarker.draggable || !flags.dragEnabled) return;
		e.preventDefault();
		e.stopPropagation();
		const lineEl = lineRefs.current.get(resolvedMarker.key);
		if (!lineEl) return;
		const hitEl = hitRefs.current.get(resolvedMarker.key) ?? null;
		didDragRef.current = false;
		const originDate = toDate(resolvedMarker.marker.date);
		const originSnap = useSnapPoints && resolvedSnapPoints.length > 0 ? resolveNearestSnapPoint(resolvedMarker.x, resolvedSnapPoints) : null;
		if (flags.emitDragStart && emit) emit("draggableMarkerDragStart", {
			marker: resolvedMarker.marker,
			index: resolvedMarker.index,
			date: originDate
		});
		lineEl.classList.add("rg-draggable-marker-line--dragging");
		dragRef.current = {
			index: resolvedMarker.index,
			marker: resolvedMarker.marker,
			originDate,
			lineEl,
			hitEl,
			activeSnapPointIndex: originSnap?.index ?? null
		};
		setIsDragging(true);
	}, [
		emit,
		useSnapPoints,
		resolvedSnapPoints
	]);
	const handleClick = (resolvedMarker, e) => {
		if (!flagsRef.current.clickEnabled || !emit || didDragRef.current) return;
		e.stopPropagation();
		emit("ganttClick", createPointerDetail({
			type: "draggableMarker",
			marker: resolvedMarker.marker,
			index: resolvedMarker.index
		}, e));
	};
	if (resolved.length === 0) return null;
	return /* @__PURE__ */ jsxs("div", {
		ref: layerRef,
		className: `rg-draggable-markers${renderHitTargets ? " rg-draggable-markers--interactive" : ""}`,
		style: { height: totalHeight },
		"data-testid": "draggable-markers",
		children: [
			/* @__PURE__ */ jsx("svg", {
				className: "rg-draggable-markers-svg",
				width: "100%",
				height: totalHeight,
				viewBox: `0 0 ${timelineWidth} ${totalHeight}`,
				preserveAspectRatio: "none",
				"aria-hidden": true,
				children: resolved.map((item) => /* @__PURE__ */ jsx("line", {
					ref: (el) => {
						if (el) lineRefs.current.set(item.key, el);
						else lineRefs.current.delete(item.key);
					},
					x1: item.x,
					y1: 0,
					x2: item.x,
					y2: totalHeight,
					className: "rg-draggable-marker-line",
					style: item.color ? { stroke: item.color } : void 0,
					strokeWidth: 2
				}, item.key))
			}),
			!renderHitTargets && resolved.map((item) => item.label && /* @__PURE__ */ jsx("div", {
				className: "rg-draggable-marker-label rg-draggable-marker-label--static",
				style: {
					left: item.x + 4,
					...item.color ? {
						color: item.color,
						borderColor: item.color
					} : {}
				},
				children: item.label
			}, `label-${item.key}`)),
			renderHitTargets && resolved.map((item) => /* @__PURE__ */ jsx("div", {
				ref: (el) => {
					if (el) hitRefs.current.set(item.key, el);
					else hitRefs.current.delete(item.key);
				},
				className: `rg-draggable-marker-hit${dragEnabled && item.draggable ? " rg-draggable-marker-hit--draggable" : ""}`,
				style: {
					left: item.x - HIT_WIDTH / 2,
					width: HIT_WIDTH,
					height: totalHeight
				},
				tabIndex: clickEnabled || dragEnabled && item.draggable ? 0 : -1,
				"aria-label": item.label ?? `Draggable marker ${item.marker.id}`,
				onPointerDown: dragEnabled && item.draggable ? beginDrag(item) : void 0,
				onClick: clickEnabled ? (e) => handleClick(item, e) : void 0,
				children: item.label && /* @__PURE__ */ jsx("div", {
					className: "rg-draggable-marker-label",
					style: {
						left: LABEL_OFFSET,
						...item.color ? {
							color: item.color,
							borderColor: item.color
						} : {}
					},
					children: item.label
				})
			}, `hit-${item.key}`))
		]
	});
});

//#endregion
//#region src/GanttChart.tsx
const DEFAULT_COLUMNS = [{
	key: "name",
	title: "Task",
	flex: 2,
	minWidth: 120
}];
const DEFAULT_MIDDLE_COLUMNS = [{
	key: "start",
	title: "Start",
	flex: 1,
	minWidth: 90
}, {
	key: "end",
	title: "End",
	flex: 1,
	minWidth: 90
}];
const EMPTY_CUSTOM_ROWS = [];
const TEXT_ROLES = new Set([
	"textbox",
	"searchbox",
	"combobox",
	"spinbutton"
]);
/** Whether a key event comes from somewhere Backspace/Delete edit text (incl. inside shadow DOM). */
function isEditableTarget(e) {
	const target = e.nativeEvent.composedPath()[0] ?? e.target;
	if (!(target instanceof Element)) return false;
	if (target instanceof HTMLElement && target.isContentEditable) return true;
	if ([
		"INPUT",
		"TEXTAREA",
		"SELECT"
	].includes(target.tagName)) return true;
	return TEXT_ROLES.has(target.getAttribute("role") ?? "");
}
function GanttChart({ tasks: externalTasks, columns = DEFAULT_COLUMNS, middleColumns = DEFAULT_MIDDLE_COLUMNS, zoomLevel: zoomProp = "week", availableZoomLevels, columnWidth: columnWidthProp, rowHeight = 36, height = 500, width = "100%", className, style, theme = "light", timezone, defaultLeftWidth = 220, defaultMiddleWidth = 180, minPanelWidth = 80, showTaskList = true, showDateColumns = true, showTooltip = false, renderTaskTooltip, holidays, blockDates, eventMarkers, draggableMarkers, draggableMarkerSnapPoints, showBaseline = true, groupSummaryRollup, enableDrag = true, enableResize = true, enableProgressDrag = true, snapToGrid = true, minDate, maxDate, customRows = EMPTY_CUSTOM_ROWS, columnScrollBufferPercent = DEFAULT_COLUMN_SCROLL_BUFFER_PERCENT, onTasksChange, onSidebarLayoutChange, onTaskHover, onTaskClick, onSelectionChange, selectedTaskIds, selectedDependencyIds, formatDependencyLag,...callbacks }) {
	const containerRef = useRef(null);
	const timelineScrollRef = useRef(null);
	const dragPreviewStoreRef = useRef(null);
	if (!dragPreviewStoreRef.current) dragPreviewStoreRef.current = new DragPreviewStore();
	const dragPreviewStore = dragPreviewStoreRef.current;
	const [scaleId, setScaleId] = useState(zoomProp);
	const [viewportWidth, setViewportWidth] = useState(0);
	const [scrollLeft, setScrollLeft] = useState(0);
	const scrollRafRef = useRef(null);
	const pendingScrollLeftRef = useRef(0);
	const [internalSelectedIds, setInternalSelectedIds] = useState([]);
	const [internalSelectedDependencyIds, setInternalSelectedDependencyIds] = useState([]);
	const pendingCenterDateRef = useRef(null);
	const availableScales = useMemo(() => resolveScales(availableZoomLevels), [availableZoomLevels]);
	const scale = useMemo(() => resolveScale(scaleId), [scaleId]);
	const onTaskHoverRef = useRef(onTaskHover);
	onTaskHoverRef.current = onTaskHover;
	const handleTaskHover = useCallback((detail) => {
		onTaskHoverRef.current?.(detail);
	}, []);
	const effectiveSelectedIds = selectedTaskIds ?? internalSelectedIds;
	const effectiveSelectedDependencyIds = selectedDependencyIds ?? internalSelectedDependencyIds;
	const selectionRef = useRef({
		taskIds: [],
		dependencyIds: []
	});
	selectionRef.current = {
		taskIds: effectiveSelectedIds,
		dependencyIds: effectiveSelectedDependencyIds
	};
	const tasksControlled = selectedTaskIds !== void 0;
	const dependenciesControlled = selectedDependencyIds !== void 0;
	const onSelectionChangeRef = useRef(onSelectionChange);
	onSelectionChangeRef.current = onSelectionChange;
	const commitSelection = useCallback((next) => {
		if (!tasksControlled) setInternalSelectedIds(next.taskIds);
		if (!dependenciesControlled) setInternalSelectedDependencyIds(next.dependencyIds);
		onSelectionChangeRef.current?.({
			selectedIds: next.taskIds,
			selectedDependencyIds: next.dependencyIds
		});
	}, [tasksControlled, dependenciesControlled]);
	const handleTaskClick = useCallback((detail) => {
		const multi = !!(detail.ctrlKey || detail.metaKey);
		commitSelection(selectTask(selectionRef.current, detail.task.id, multi));
		onTaskClick?.(detail);
	}, [commitSelection, onTaskClick]);
	const dependencyInteractive = !!(callbacks.onDependencyClick || callbacks.onDependencyContextMenu || callbacks.onDependencyHover || callbacks.onDependencyDelete || dependenciesControlled);
	const formatDependencyLagRef = useRef(formatDependencyLag);
	formatDependencyLagRef.current = formatDependencyLag;
	const stableFormatDependencyLag = useCallback((lag, dependency) => formatDependencyLagRef.current?.(lag, dependency) ?? "", []);
	const hasLagFormatter = formatDependencyLag !== void 0;
	const handleDependencySelect = useCallback((id, multi) => {
		commitSelection(selectDependency(selectionRef.current, id, multi));
	}, [commitSelection]);
	const interactionsEnabled = !!(callbacks.onGanttClick || callbacks.onGanttContextMenu || callbacks.onGanttHover);
	const draggableMarkerInteractionFlags = useMemo(() => resolveDraggableMarkerInteractionFlags({
		onDragStart: callbacks.onDraggableMarkerDragStart,
		onDrag: callbacks.onDraggableMarkerDrag,
		onDragEnd: callbacks.onDraggableMarkerDragEnd,
		onDragToSnapPoint: callbacks.onDraggableMarkerDragToSnapPoint,
		onGanttClick: callbacks.onGanttClick,
		hasSnapPoints: (draggableMarkerSnapPoints?.length ?? 0) > 0
	}), [
		callbacks.onDraggableMarkerDragStart,
		callbacks.onDraggableMarkerDrag,
		callbacks.onDraggableMarkerDragEnd,
		callbacks.onDraggableMarkerDragToSnapPoint,
		callbacks.onGanttClick,
		draggableMarkerSnapPoints
	]);
	const emit = useGanttEmitter({
		...callbacks,
		onTaskHover: handleTaskHover,
		onTaskClick: handleTaskClick,
		onSidebarLayoutChange
	});
	const onSidebarLayoutChangeRef = useRef(onSidebarLayoutChange);
	onSidebarLayoutChangeRef.current = onSidebarLayoutChange;
	const handleSidebarLayoutChange = useCallback((layout) => {
		const leftWidth$1 = showTaskList ? layout.leftWidth : 0;
		const middleWidth$1 = showDateColumns ? layout.middleWidth : 0;
		const timelineLeft$1 = leftWidth$1 + middleWidth$1;
		const effective = {
			...layout,
			leftWidth: leftWidth$1,
			middleWidth: middleWidth$1,
			timelineLeft: timelineLeft$1,
			rightWidth: Math.max(0, layout.totalWidth - timelineLeft$1)
		};
		emit("sidebarLayoutChange", effective);
		onSidebarLayoutChangeRef.current?.(effective);
	}, [
		emit,
		showTaskList,
		showDateColumns
	]);
	const sidebar = useSidebarLayout(containerRef, {
		defaultLeftWidth,
		defaultMiddleWidth,
		minPanelWidth,
		onLayoutChange: handleSidebarLayoutChange
	});
	const leftWidth = showTaskList ? sidebar.leftWidth : 0;
	const middleWidth = showDateColumns ? sidebar.middleWidth : 0;
	const timelineLeft = leftWidth + middleWidth;
	useEffect(() => {
		handleSidebarLayoutChange({
			leftWidth: sidebar.leftWidth,
			middleWidth: sidebar.middleWidth,
			rightWidth: sidebar.layout.rightWidth,
			timelineLeft: sidebar.layout.timelineLeft,
			totalWidth: sidebar.layout.totalWidth
		});
	}, [
		showTaskList,
		showDateColumns,
		sidebar.leftWidth,
		sidebar.middleWidth,
		sidebar.layout.totalWidth,
		handleSidebarLayoutChange
	]);
	const { tasks, updateTask, store } = useTaskStore(externalTasks);
	const resolvedTasks = useMemo(() => resolveTasks(tasks, { groupSummaryRollup }), [tasks, groupSummaryRollup]);
	const columnWidth = getColumnWidth(scale, columnWidthProp);
	const stickyTaskPartitions = useMemo(() => partitionTasksBySticky(resolvedTasks), [resolvedTasks]);
	const stickyCustomRowPartitions = useMemo(() => partitionCustomRowsBySticky(customRows), [customRows]);
	const rowLayouts = useMemo(() => computeRowLayouts(resolvedTasks, rowHeight, showBaseline), [
		resolvedTasks,
		rowHeight,
		showBaseline
	]);
	const stickyRowLayouts = useMemo(() => ({
		top: rowLayoutsForTasks(stickyTaskPartitions.top, rowHeight, showBaseline),
		scroll: rowLayoutsForTasks(stickyTaskPartitions.scroll, rowHeight, showBaseline),
		bottom: rowLayoutsForTasks(stickyTaskPartitions.bottom, rowHeight, showBaseline)
	}), [
		stickyTaskPartitions,
		rowHeight,
		showBaseline
	]);
	const stickyOffsets = useMemo(() => {
		const topTaskHeights = taskSectionHeights(stickyTaskPartitions.top, rowHeight, showBaseline);
		const topCustomHeights = customRowHeights(stickyCustomRowPartitions.top, rowHeight);
		const topTaskOffsets = computeStickyTopOffsets(topTaskHeights, TIMELINE_HEADER_HEIGHT);
		const topCustomOffsets = computeStickyTopOffsets(topCustomHeights, TIMELINE_HEADER_HEIGHT + topTaskHeights.reduce((sum, h) => sum + h, 0));
		const bottomCustomHeights = customRowHeights(stickyCustomRowPartitions.bottom, rowHeight);
		const bottomTaskHeights = taskSectionHeights(stickyTaskPartitions.bottom, rowHeight, showBaseline);
		const bottomSectionOffsets = computeStickyBottomOffsets([...bottomCustomHeights, ...bottomTaskHeights]);
		return {
			topTasks: topTaskOffsets,
			topCustomRows: topCustomOffsets,
			bottomCustomRows: bottomSectionOffsets.slice(0, bottomCustomHeights.length),
			bottomTasks: bottomSectionOffsets.slice(bottomCustomHeights.length)
		};
	}, [
		stickyTaskPartitions,
		stickyCustomRowPartitions,
		rowHeight,
		showBaseline
	]);
	const timelineBounds = useMemo(() => {
		if (minDate == null || maxDate == null) return void 0;
		return {
			min: toDate(minDate),
			max: toDate(maxDate)
		};
	}, [minDate, maxDate]);
	const rangeRef = useRef(null);
	const visibleColumnsRef = useRef(null);
	const range = useMemo(() => {
		const stable = stableTimelineRange(computeTimelineRange(tasks, scale, 2, {
			minDate,
			maxDate
		}), rangeRef.current ?? void 0);
		rangeRef.current = stable;
		return stable;
	}, [
		...minDate != null && maxDate != null ? [] : [tasks],
		scale,
		minDate,
		maxDate
	]);
	const timelineWidth = resolveTimelineWidth(range, columnWidth);
	const msPerPixel = getMsPerPixel(scale, columnWidth);
	const timelineContentHeight = TIMELINE_HEADER_HEIGHT + totalStickyTimelineBodyHeight(stickyTaskPartitions.top, stickyTaskPartitions.scroll, stickyTaskPartitions.bottom, stickyCustomRowPartitions.top, stickyCustomRowPartitions.inline, stickyCustomRowPartitions.bottom, rowHeight, showBaseline);
	const visibleColumns = useMemo(() => {
		const next = maintainBufferedColumnRange(scrollLeft, viewportWidth, columnWidth, range.columnCount, columnScrollBufferPercent, visibleColumnsRef.current);
		visibleColumnsRef.current = next;
		return next;
	}, [
		scrollLeft,
		viewportWidth,
		columnWidth,
		range.columnCount,
		columnScrollBufferPercent
	]);
	const viewportColumns = useMemo(() => getViewportColumnRange(scrollLeft, viewportWidth, columnWidth, range.columnCount), [
		scrollLeft,
		viewportWidth,
		columnWidth,
		range.columnCount
	]);
	useEffect(() => {
		visibleColumnsRef.current = null;
	}, [
		range.columnCount,
		columnWidth,
		scaleId,
		columnScrollBufferPercent
	]);
	const timelineContext = useMemo(() => ({
		zoomLevel: scaleId,
		scale,
		columnWidth,
		timelineWidth,
		range,
		rowHeight,
		msPerPixel,
		scrollLeft,
		viewportWidth,
		visibleColumns,
		viewportColumns,
		columnScrollBufferPercent
	}), [
		scaleId,
		scale,
		columnWidth,
		timelineWidth,
		range,
		rowHeight,
		msPerPixel,
		scrollLeft,
		viewportWidth,
		visibleColumns,
		viewportColumns,
		columnScrollBufferPercent
	]);
	const customRowMetrics = useMemo(() => ({
		zoomLevel: scaleId,
		scale,
		columnWidth,
		timelineWidth,
		msPerPixel,
		rangeStart: range.start,
		rangeEnd: range.end,
		rowHeight,
		scrollLeft,
		viewportWidth,
		visibleColumns,
		viewportColumns,
		columnScrollBufferPercent
	}), [
		scaleId,
		scale,
		columnWidth,
		timelineWidth,
		msPerPixel,
		range,
		rowHeight,
		scrollLeft,
		viewportWidth,
		visibleColumns,
		viewportColumns,
		columnScrollBufferPercent
	]);
	const metricsSignature = timelineMetricsSignature({
		zoomLevel: scaleId,
		columnWidth,
		timelineWidth,
		msPerPixel,
		rangeStart: range.start,
		rangeEnd: range.end,
		rangeColumnCount: range.columnCount,
		rowHeight,
		scrollLeft,
		viewportWidth,
		visibleStart: visibleColumns.startIndex,
		visibleEnd: visibleColumns.endIndex,
		viewportStart: viewportColumns.startIndex,
		viewportEnd: viewportColumns.endIndex,
		columnScrollBufferPercent
	});
	const metricsSignatureRef = useRef(metricsSignature);
	const timelineContextRef = useRef(timelineContext);
	const customRowMetricsRef = useRef(customRowMetrics);
	if (metricsSignatureRef.current !== metricsSignature) {
		metricsSignatureRef.current = metricsSignature;
		timelineContextRef.current = timelineContext;
		customRowMetricsRef.current = customRowMetrics;
	}
	const stableTimelineContext = timelineContextRef.current;
	const stableCustomRowMetrics = customRowMetricsRef.current;
	const sidebarMetricsSignature = [
		scaleId,
		columnWidth,
		timelineWidth,
		msPerPixel,
		range.start.getTime(),
		range.end.getTime(),
		rowHeight,
		columnScrollBufferPercent
	].join("|");
	const sidebarMetricsSignatureRef = useRef(sidebarMetricsSignature);
	const sidebarMetricsRef = useRef(customRowMetrics);
	if (sidebarMetricsSignatureRef.current !== sidebarMetricsSignature) {
		sidebarMetricsSignatureRef.current = sidebarMetricsSignature;
		sidebarMetricsRef.current = customRowMetrics;
	}
	const stableSidebarMetrics = sidebarMetricsRef.current;
	const dateMarkings = useMemo(() => computeDateMarkingRects(range, scale, columnWidth, holidays, blockDates), [
		range,
		scale,
		columnWidth,
		holidays,
		blockDates
	]);
	useEffect(() => {
		const el = timelineScrollRef.current;
		if (!el) return;
		const update = () => {
			setViewportWidth(el.clientWidth);
			setScrollLeft(el.scrollLeft);
		};
		update();
		const ro = new ResizeObserver(update);
		ro.observe(el);
		return () => ro.disconnect();
	}, [timelineLeft]);
	const clampTimelineScroll = useCallback((el) => {
		const maxScroll = Math.max(0, timelineWidth - el.clientWidth);
		if (el.scrollLeft > maxScroll) el.scrollLeft = maxScroll;
		return el.scrollLeft;
	}, [timelineWidth]);
	useLayoutEffect(() => {
		const scrollEl = timelineScrollRef.current;
		if (!scrollEl) return;
		setScrollLeft(clampTimelineScroll(scrollEl));
	}, [
		timelineWidth,
		viewportWidth,
		clampTimelineScroll
	]);
	const zoomChangeInputsRef = useRef({
		scale,
		columnWidth,
		rangeStart: range.start,
		columnWidthProp,
		onZoomChange: callbacks.onZoomChange
	});
	zoomChangeInputsRef.current = {
		scale,
		columnWidth,
		rangeStart: range.start,
		columnWidthProp,
		onZoomChange: callbacks.onZoomChange
	};
	const handleZoomChange = useCallback((newScaleId) => {
		const { scale: curScale, columnWidth: curColumnWidth, rangeStart, columnWidthProp: curColumnWidthProp, onZoomChange } = zoomChangeInputsRef.current;
		const scrollEl = timelineScrollRef.current;
		if (scrollEl && scrollEl.clientWidth > 0) pendingCenterDateRef.current = scalePixelToDate(scrollEl.scrollLeft + scrollEl.clientWidth / 2, rangeStart, curScale, curColumnWidth);
		setScaleId(newScaleId);
		const nextScale = resolveScale(newScaleId);
		const cw = getColumnWidth(nextScale, curColumnWidthProp);
		const detail = {
			zoomLevel: newScaleId,
			scaleId: newScaleId,
			scaleLabel: nextScale.label,
			columnWidth: cw
		};
		emit("zoomChange", detail);
		onZoomChange?.(detail);
	}, [emit]);
	useLayoutEffect(() => {
		const centerDate = pendingCenterDateRef.current;
		if (!centerDate) return;
		pendingCenterDateRef.current = null;
		const scrollEl = timelineScrollRef.current;
		if (!scrollEl) return;
		const centerPx = dateToScalePixel(centerDate, range.start, scale, columnWidth);
		const maxScroll = Math.max(0, timelineWidth - scrollEl.clientWidth);
		scrollEl.scrollLeft = Math.min(maxScroll, Math.max(0, centerPx - scrollEl.clientWidth / 2));
		setScrollLeft(scrollEl.scrollLeft);
	}, [
		scaleId,
		range.start,
		columnWidth,
		timelineWidth,
		scale
	]);
	useEffect(() => {
		if (!availableScales.some((s) => s.id === scaleId)) setScaleId(availableScales[0]?.id ?? "week");
	}, [availableScales, scaleId]);
	const onTimelineScroll = useCallback((e) => {
		const el = e.currentTarget;
		const left = clampTimelineScroll(el);
		pendingScrollLeftRef.current = left;
		if (scrollRafRef.current == null) scrollRafRef.current = requestAnimationFrame(() => {
			scrollRafRef.current = null;
			setScrollLeft(pendingScrollLeftRef.current);
		});
		emit("scroll", {
			scrollLeft: left,
			scrollTop: el.scrollTop
		});
	}, [emit, clampTimelineScroll]);
	useEffect(() => {
		return () => {
			if (scrollRafRef.current != null) cancelAnimationFrame(scrollRafRef.current);
		};
	}, []);
	useEffect(() => {
		setScaleId(zoomProp);
	}, [zoomProp]);
	const syncRowScroll = useCallback((e) => {
		const top = e.currentTarget.scrollTop;
		(containerRef.current?.querySelectorAll(".rg-sync-scroll"))?.forEach((p) => {
			if (p !== e.currentTarget) p.scrollTop = top;
		});
	}, []);
	const handleToggleCollapse = useCallback((taskId) => {
		const source = tasks.find((t) => t.id === taskId);
		if (!source) return;
		const collapsed = !source.collapsed;
		updateTask(taskId, { collapsed });
		if (onTasksChange) onTasksChange(tasks.map((t) => t.id === taskId ? {
			...t,
			collapsed
		} : t));
	}, [
		tasks,
		updateTask,
		onTasksChange
	]);
	const handleTaskUpdate = useCallback((taskId, patch) => {
		const source = tasks.find((t) => t.id === taskId);
		if (!source || source.readOnly) return;
		const mapped = {};
		if (patch.start && patch.end && timelineBounds) {
			const clamped = clampTaskDates(patch.start, patch.end, timelineBounds, "move");
			mapped.start = clamped.start.toISOString();
			mapped.end = clamped.end.toISOString();
		} else {
			if (patch.start) mapped.start = patch.start.toISOString();
			if (patch.end) mapped.end = patch.end.toISOString();
		}
		if (patch.progress !== void 0) mapped.progress = patch.progress;
		updateTask(taskId, mapped);
		if (onTasksChange) onTasksChange(tasks.map((t) => t.id === taskId ? {
			...t,
			...mapped
		} : t));
	}, [
		updateTask,
		onTasksChange,
		tasks,
		timelineBounds
	]);
	const handleTooltipTaskChange = useCallback((taskId, patch) => {
		const source = tasks.find((t) => t.id === taskId);
		if (!source || source.readOnly) return;
		const mapped = {};
		if (patch.name !== void 0) mapped.name = patch.name;
		if (patch.progress !== void 0) mapped.progress = patch.progress;
		if (patch.color !== void 0) mapped.color = patch.color;
		if (patch.borderColor !== void 0) mapped.borderColor = patch.borderColor;
		const hasStart = patch.start !== void 0;
		const hasEnd = patch.end !== void 0;
		if (hasStart || hasEnd) {
			const start = hasStart ? toDate(patch.start) : toDate(source.start);
			const end = hasEnd ? toDate(patch.end) : toDate(source.end);
			if (timelineBounds) {
				const clamped = clampTaskDates(start, end, timelineBounds, "move");
				mapped.start = clamped.start.toISOString();
				mapped.end = clamped.end.toISOString();
			} else {
				if (hasStart) mapped.start = start.toISOString();
				if (hasEnd) mapped.end = end.toISOString();
			}
		}
		if (Object.keys(mapped).length === 0) return;
		updateTask(taskId, mapped);
		if (onTasksChange) onTasksChange(tasks.map((t) => t.id === taskId ? {
			...t,
			...mapped
		} : t));
	}, [
		tasks,
		updateTask,
		onTasksChange,
		timelineBounds
	]);
	const tooltipEnabled = showTooltip || !!renderTaskTooltip;
	const handleKeyDown = useCallback((e) => {
		if (e.key !== "Delete" && e.key !== "Backspace") return;
		if (isEditableTarget(e)) return;
		const ids = selectionRef.current.dependencyIds;
		if (ids.length === 0) return;
		const dependencies = collectDependencyTargets(tasks, new Set(ids));
		if (dependencies.length === 0) return;
		e.preventDefault();
		if (e.repeat) return;
		emit("dependencyDelete", { dependencies });
		if (!dependenciesControlled) {
			const reported = new Set(dependencies.map((d) => d.id));
			commitSelection({
				taskIds: selectionRef.current.taskIds,
				dependencyIds: ids.filter((id) => !reported.has(id))
			});
		}
	}, [
		tasks,
		emit,
		dependenciesControlled,
		commitSelection
	]);
	return /* @__PURE__ */ jsx(GanttDisplayProvider, {
		timezone,
		children: /* @__PURE__ */ jsx(GanttTimelineProvider, {
			value: stableTimelineContext,
			children: /* @__PURE__ */ jsx(DragPreviewProvider, {
				store: dragPreviewStore,
				children: /* @__PURE__ */ jsx("div", {
					ref: containerRef,
					className: `rg-gantt rg-theme-${theme} ${className ?? ""}`.trim(),
					style: {
						width,
						height,
						...style
					},
					"data-testid": "gantt-chart",
					"data-sidebar-left": leftWidth,
					"data-sidebar-middle": middleWidth,
					"data-timeline-left": timelineLeft,
					onKeyDown: dependencyInteractive ? handleKeyDown : void 0,
					children: /* @__PURE__ */ jsxs(TaskTooltipProvider, {
						enabled: tooltipEnabled,
						renderTaskTooltip,
						onTaskChange: handleTooltipTaskChange,
						children: [/* @__PURE__ */ jsx("div", {
							className: "rg-gantt-toolbar-row",
							children: /* @__PURE__ */ jsx(ZoomToolbar, {
								scale,
								availableScales,
								onZoomChange: handleZoomChange
							})
						}), /* @__PURE__ */ jsx("div", {
							className: "rg-gantt-body",
							style: { height: `calc(100% - 40px)` },
							children: /* @__PURE__ */ jsxs("div", {
								className: "rg-panels",
								children: [
									showTaskList && /* @__PURE__ */ jsx("div", {
										className: "rg-panel-scroll rg-sync-scroll",
										style: {
											width: leftWidth,
											overflow: "auto"
										},
										onScroll: syncRowScroll,
										children: /* @__PURE__ */ jsx(TaskListPanel, {
											tasks: resolvedTasks,
											stickyTasks: stickyTaskPartitions,
											sourceTasks: tasks,
											columns,
											rowHeight,
											rowLayouts,
											stickyRowLayouts,
											width: leftWidth,
											selectedTaskIds: effectiveSelectedIds,
											onToggleCollapse: handleToggleCollapse,
											emit,
											customRows,
											stickyCustomRows: stickyCustomRowPartitions,
											customRowMetrics: stableSidebarMetrics,
											stickyOffsets
										})
									}),
									showTaskList && showDateColumns && /* @__PURE__ */ jsx("div", {
										className: "rg-divider",
										role: "separator",
										"aria-orientation": "vertical",
										onPointerDown: sidebar.onDividerPointerDown("left"),
										onPointerMove: sidebar.onDividerPointerMove,
										onPointerUp: sidebar.onDividerPointerUp,
										"data-testid": "divider-left"
									}),
									showDateColumns && /* @__PURE__ */ jsx("div", {
										className: "rg-panel-scroll rg-sync-scroll",
										style: {
											width: middleWidth,
											overflow: "auto"
										},
										onScroll: syncRowScroll,
										children: /* @__PURE__ */ jsx(MiddlePanel, {
											tasks: resolvedTasks,
											stickyTasks: stickyTaskPartitions,
											columns: middleColumns,
											rowHeight,
											rowLayouts,
											stickyRowLayouts,
											width: middleWidth,
											customRows,
											stickyCustomRows: stickyCustomRowPartitions,
											customRowMetrics: stableSidebarMetrics,
											columnOffset: columns.length,
											emit,
											stickyOffsets
										})
									}),
									(showTaskList || showDateColumns) && /* @__PURE__ */ jsx("div", {
										className: "rg-divider",
										role: "separator",
										"aria-orientation": "vertical",
										onPointerDown: sidebar.onDividerPointerDown(showDateColumns ? "middle" : "left"),
										onPointerMove: sidebar.onDividerPointerMove,
										onPointerUp: sidebar.onDividerPointerUp,
										"data-testid": showDateColumns ? "divider-middle" : "divider-left"
									}),
									/* @__PURE__ */ jsx("div", {
										className: "rg-timeline-panel",
										style: {
											flex: 1,
											minWidth: 0
										},
										children: /* @__PURE__ */ jsx("div", {
											ref: timelineScrollRef,
											className: "rg-timeline-scroll rg-sync-scroll",
											onScroll: (e) => {
												onTimelineScroll(e);
												syncRowScroll(e);
											},
											children: /* @__PURE__ */ jsxs("div", {
												className: "rg-timeline-inner",
												style: { width: timelineWidth },
												children: [
													eventMarkers && eventMarkers.length > 0 && /* @__PURE__ */ jsx(EventMarkersLayer, {
														markers: eventMarkers,
														range,
														scale,
														columnWidth,
														totalHeight: timelineContentHeight,
														interactive: interactionsEnabled,
														emit
													}),
													draggableMarkers && draggableMarkers.length > 0 && /* @__PURE__ */ jsx(DraggableMarkersLayer, {
														markers: draggableMarkers,
														snapPoints: draggableMarkerInteractionFlags.useSnapPoints ? draggableMarkerSnapPoints : void 0,
														range,
														scale,
														columnWidth,
														totalHeight: timelineContentHeight,
														snapToGrid,
														timelineBounds,
														interactionFlags: draggableMarkerInteractionFlags,
														emit: draggableMarkerInteractionFlags.dragEnabled || draggableMarkerInteractionFlags.clickEnabled ? emit : void 0
													}),
													/* @__PURE__ */ jsx(TimelineHeader, {
														range,
														scale,
														columnWidth,
														visibleColumns,
														dateMarkings,
														interactive: interactionsEnabled,
														emit
													}),
													/* @__PURE__ */ jsxs("div", {
														className: "rg-timeline-rows",
														children: [
															/* @__PURE__ */ jsx(StickyTaskTimelineRows, {
																tasks: stickyTaskPartitions.top,
																rowLayouts: stickyRowLayouts.top,
																allTasks: resolvedTasks,
																position: "top",
																stickyOffsets: stickyOffsets.topTasks,
																range,
																scale,
																columnWidth,
																store,
																enableDrag,
																enableResize,
																enableProgressDrag,
																groupSummaryRollup,
																snapToGrid,
																timelineBounds,
																showBaseline,
																selectedTaskIds: effectiveSelectedIds,
																emit,
																onTaskUpdate: handleTaskUpdate
															}),
															/* @__PURE__ */ jsx(CustomRowsTimeline, {
																rows: stickyCustomRowPartitions.top,
																rowHeight,
																timelineWidth,
																metrics: stableCustomRowMetrics,
																columnCount: columns.length + middleColumns.length,
																emit,
																stickyPosition: "top",
																stickyOffsets: stickyOffsets.topCustomRows
															}),
															/* @__PURE__ */ jsx(TimelineBody, {
																tasks: stickyTaskPartitions.scroll,
																range,
																scale,
																columnWidth,
																visibleColumns,
																rowLayouts: stickyRowLayouts.scroll,
																store,
																enableDrag,
																enableResize,
																enableProgressDrag,
																groupSummaryRollup,
																snapToGrid,
																timelineBounds,
																dateMarkings,
																blockDates,
																showBaseline,
																selectedTaskIds: effectiveSelectedIds,
																selectedDependencyIds: effectiveSelectedDependencyIds,
																formatDependencyLag: hasLagFormatter ? stableFormatDependencyLag : void 0,
																onDependencySelect: dependencyInteractive ? handleDependencySelect : void 0,
																interactionsEnabled,
																emit,
																dragPreviewStore,
																onTaskUpdate: handleTaskUpdate
															}),
															/* @__PURE__ */ jsx(CustomRowsTimeline, {
																rows: stickyCustomRowPartitions.inline,
																rowHeight,
																timelineWidth,
																metrics: stableCustomRowMetrics,
																columnCount: columns.length + middleColumns.length,
																emit
															}),
															/* @__PURE__ */ jsx(CustomRowsTimeline, {
																rows: stickyCustomRowPartitions.bottom,
																rowHeight,
																timelineWidth,
																metrics: stableCustomRowMetrics,
																columnCount: columns.length + middleColumns.length,
																emit,
																stickyPosition: "bottom",
																stickyOffsets: stickyOffsets.bottomCustomRows
															}),
															/* @__PURE__ */ jsx(StickyTaskTimelineRows, {
																tasks: stickyTaskPartitions.bottom,
																rowLayouts: stickyRowLayouts.bottom,
																allTasks: resolvedTasks,
																position: "bottom",
																stickyOffsets: stickyOffsets.bottomTasks,
																range,
																scale,
																columnWidth,
																store,
																enableDrag,
																enableResize,
																enableProgressDrag,
																groupSummaryRollup,
																snapToGrid,
																timelineBounds,
																showBaseline,
																selectedTaskIds: effectiveSelectedIds,
																emit,
																onTaskUpdate: handleTaskUpdate
															})
														]
													})
												]
											})
										})
									})
								]
							})
						})]
					})
				})
			})
		})
	});
}

//#endregion
//#region src/hooks/useBufferedSegmentCache.ts
/**
* Incrementally cache computed segments keyed by an id.
* Only calls `compute` for keys that newly enter the active set.
* Drops cache entries once they leave the buffered window.
*/
function useBufferedSegmentCache(activeKeys, compute, resetKey) {
	const cacheRef = useRef(/* @__PURE__ */ new Map());
	const resetRef = useRef(resetKey);
	if (resetRef.current !== resetKey) {
		cacheRef.current.clear();
		resetRef.current = resetKey;
	}
	return useMemo(() => {
		const active = new Set(activeKeys);
		const result = [];
		for (const key of activeKeys) {
			if (!cacheRef.current.has(key)) cacheRef.current.set(key, compute(key));
			result.push(cacheRef.current.get(key));
		}
		for (const key of [...cacheRef.current.keys()]) if (!active.has(key)) cacheRef.current.delete(key);
		return result;
	}, [activeKeys.join("\0"), resetKey]);
}

//#endregion
//#region src/hooks/useVirtualColumnSegments.tsx
/**
* Virtualized timeline column segments with incremental caching.
* Only newly entered columns invoke `compute`; existing columns are reused while
* they remain inside the buffered window.
*/
function useVirtualColumnSegments(compute, resetKey) {
	const { visibleColumns, columnWidth, range, scale } = useGanttTimeline();
	const cacheRef = useRef(/* @__PURE__ */ new Map());
	const resetRef = useRef(resetKey);
	const computeRef = useRef(compute);
	computeRef.current = compute;
	if (resetRef.current !== resetKey) {
		cacheRef.current.clear();
		resetRef.current = resetKey;
	}
	return useMemo(() => {
		const { startIndex, endIndex } = visibleColumns;
		if (endIndex < startIndex) return [];
		const active = /* @__PURE__ */ new Set();
		const result = [];
		for (let i = startIndex; i <= endIndex; i++) {
			active.add(i);
			let segment = cacheRef.current.get(i);
			if (!segment) {
				const date = addScaleSteps(range.start, i, scale);
				segment = {
					columnIndex: i,
					x: i * columnWidth,
					width: columnWidth,
					date,
					data: computeRef.current(i, date)
				};
				cacheRef.current.set(i, segment);
			}
			result.push(segment);
		}
		for (const key of [...cacheRef.current.keys()]) if (!active.has(key)) cacheRef.current.delete(key);
		return result;
	}, [
		visibleColumns.startIndex,
		visibleColumns.endIndex,
		columnWidth,
		range.start,
		scale,
		resetKey
	]);
}
/** Memoized absolutely-positioned cell for one virtual timeline column. */
const VirtualColumnCell = memo(function VirtualColumnCell$1({ columnIndex, x, width, className, title, children }) {
	return /* @__PURE__ */ jsx("div", {
		className,
		"data-column-index": columnIndex,
		title,
		style: {
			position: "absolute",
			left: x,
			width,
			top: 0,
			height: "100%"
		},
		children
	});
}, (prev, next) => prev.columnIndex === next.columnIndex && prev.x === next.x && prev.width === next.width && prev.className === next.className && prev.title === next.title && prev.children === next.children);

//#endregion
export { DEFAULT_COLUMN_SCROLL_BUFFER_PERCENT, DEPENDENCY_EDGES, DragPreviewStore, GanttChart, PRESET_SCALES, TaskStore, VirtualColumnCell, ZOOM_LEVELS, addUnit, buildDependencyPath, collectDependencyTargets, computeDependencyLinks, computeTimelineRange, defaultDependencyLagLabel, dependencyId, diffUnits, filterRectsInXRange, format, getColumnWidth, getViewportColumnRange, getVisibleColumnRange, maintainBufferedColumnRange, nextZoomLevel, resolveScale, resolveScales, routeDependency, toDate, useBufferedSegmentCache, useGanttDisplayTimezone, useGanttTimeline, useGanttTimelineOptional, useSidebarLayout, useVirtualColumnSegments };