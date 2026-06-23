import { describe, it, expect, vi } from 'vitest';
import { createTaskTooltipController } from '../src/components/Tooltip/taskTooltipController';

describe('createTaskTooltipController', () => {
  it('moves tooltip imperatively without calling setVisibleTask', () => {
    const shell = document.createElement('div');
    const setVisibleTask = vi.fn();
    const controller = createTaskTooltipController();
    controller.register(shell, setVisibleTask);

    const task = { id: 't1', name: 'A', start: '2026-01-01', end: '2026-01-02' };
    controller.show(task, 10, 20);
    expect(setVisibleTask).toHaveBeenCalledTimes(1);
    expect(shell.style.left).toBe('22px');
    expect(shell.style.top).toBe('32px');

    setVisibleTask.mockClear();
    controller.show(task, 30, 40);
    expect(setVisibleTask).not.toHaveBeenCalled();
    expect(shell.style.left).toBe('42px');

    setVisibleTask.mockClear();
    controller.move(30, 40);
    expect(setVisibleTask).not.toHaveBeenCalled();
    expect(shell.style.left).toBe('42px');
    expect(shell.style.top).toBe('52px');

    controller.hide();
    expect(setVisibleTask).toHaveBeenCalledTimes(1);
    expect(setVisibleTask).toHaveBeenLastCalledWith(null);
    expect(shell.style.display).toBe('none');
  });

  it('refreshTask updates content only when task fields change', () => {
    const shell = document.createElement('div');
    const setVisibleTask = vi.fn();
    const controller = createTaskTooltipController();
    controller.register(shell, setVisibleTask);

    const task = { id: 't1', name: 'A', start: '2026-01-01', end: '2026-01-02' };
    controller.show(task, 0, 0);
    setVisibleTask.mockClear();

    controller.refreshTask({ ...task, name: 'B' });
    expect(setVisibleTask).toHaveBeenCalledTimes(1);

    setVisibleTask.mockClear();
    controller.refreshTask({ ...task, name: 'B' });
    expect(setVisibleTask).not.toHaveBeenCalled();
  });
});
