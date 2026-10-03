/** The bar group of `taskId` under `root` (every section: sticky and scrolling rows). */
export function barElement(root: ParentNode, taskId: string): SVGGElement | null {
  // Inside a double-quoted attribute selector only `"` and `\` need escaping.
  const id = taskId.replace(/["\\]/g, '\\$&');
  return root.querySelector<SVGGElement>(`.rg-bar[data-task-id="${id}"]`);
}
