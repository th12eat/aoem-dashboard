/**
 * Resolve a dot-separated path against an object, e.g.
 *   getPath(data, 'research.opponents') -> data.research.opponents
 *   getPath(data, 'serverTiers')        -> data.serverTiers
 * Returns undefined if any segment is missing. Used to resolve a widget's
 * `bind` into the slice of EventData it renders.
 */
export function getPath(obj: unknown, path: string | undefined): unknown {
  if (!path) return obj;
  let cur: unknown = obj;
  for (const seg of path.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}
