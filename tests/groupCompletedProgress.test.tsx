import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { GanttChart } from '../src/GanttChart';
import { GROUP_COMPLETED_TASKS } from '../demo/groupCompletedDemo';

function getBarProgressWidth(container: HTMLElement, taskId: string): number {
  const group = container.querySelector(`.rg-timeline-bars [data-task-id="${taskId}"]`);
  expect(group).toBeTruthy();
  const progress = group!.querySelector('.rg-bar-progress');
  expect(progress).toBeTruthy();
  return Number(progress!.getAttribute('width'));
}

function getBarBgWidth(container: HTMLElement, taskId: string): number {
  const group = container.querySelector(`.rg-timeline-bars [data-task-id="${taskId}"]`);
  expect(group).toBeTruthy();
  const bg = group!.querySelector('.rg-bar-bg');
  expect(bg).toBeTruthy();
  return Number(bg!.getAttribute('width'));
}

describe('group with 100% completed child tasks', () => {
  it('renders all 5 child bars and the group summary bar', () => {
    const { container } = render(
      <GanttChart
        tasks={GROUP_COMPLETED_TASKS}
        minDate="2026-03-01"
        maxDate="2026-03-31"
        height={400}
      />,
    );

    expect(container.querySelector('.rg-timeline-bars [data-task-id="g-sprint"]')).toBeTruthy();
    for (const id of ['t-done-a', 't-done-b', 't-active', 't-pending-a', 't-pending-b']) {
      expect(container.querySelector(`.rg-timeline-bars [data-task-id="${id}"]`)).toBeTruthy();
    }
  });

  it('fills the full bar width for 100% completed tasks', () => {
    const { container } = render(
      <GanttChart
        tasks={GROUP_COMPLETED_TASKS}
        minDate="2026-03-01"
        maxDate="2026-03-31"
        height={400}
      />,
    );

    for (const id of ['t-done-a', 't-done-b']) {
      const bgWidth = getBarBgWidth(container, id);
      const progressWidth = getBarProgressWidth(container, id);
      expect(bgWidth).toBeGreaterThan(0);
      expect(progressWidth).toBe(bgWidth);
    }
  });

  it('renders partial progress for in-progress tasks', () => {
    const { container } = render(
      <GanttChart
        tasks={GROUP_COMPLETED_TASKS}
        minDate="2026-03-01"
        maxDate="2026-03-31"
        height={400}
      />,
    );

    const bgWidth = getBarBgWidth(container, 't-active');
    const progressWidth = getBarProgressWidth(container, 't-active');
    expect(progressWidth).toBeGreaterThan(0);
    expect(progressWidth).toBeLessThan(bgWidth);
  });

  it('treats progress as a 0–100 scale (not 0–1)', () => {
    const { container } = render(
      <GanttChart
        tasks={[
          {
            id: 'g1',
            name: 'Group',
            type: 'group',
            start: '2026-03-01',
            end: '2026-03-01',
          },
          {
            id: 'wrong-scale',
            name: 'Looks empty at 1%',
            parentId: 'g1',
            start: '2026-03-03',
            end: '2026-03-08',
            progress: 1,
          },
          {
            id: 'correct-scale',
            name: 'Fully filled at 100',
            parentId: 'g1',
            start: '2026-03-10',
            end: '2026-03-15',
            progress: 100,
          },
        ]}
        minDate="2026-03-01"
        maxDate="2026-03-31"
        height={400}
      />,
    );

    const wrongBg = getBarBgWidth(container, 'wrong-scale');
    const wrongProgress = getBarProgressWidth(container, 'wrong-scale');
    const correctBg = getBarBgWidth(container, 'correct-scale');
    const correctProgress = getBarProgressWidth(container, 'correct-scale');

    expect(wrongProgress).toBeLessThan(wrongBg);
    expect(wrongProgress).toBeLessThanOrEqual(wrongBg * 0.02);
    expect(correctProgress).toBe(correctBg);
  });
});
