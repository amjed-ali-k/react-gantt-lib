/** Escapes a value for a double-quoted CSS attribute selector (only `"` and `\\` need it). */
export function escapeAttribute(value: string): string {
  return value.replace(/["\\]/g, '\\$&');
}

/** The bar group of `taskId` under `root` (every section: sticky and scrolling rows). */
export function barElement(root: ParentNode, taskId: string): SVGGElement | null {
  return root.querySelector<SVGGElement>(`.rg-bar[data-task-id="${escapeAttribute(taskId)}"]`);
}
