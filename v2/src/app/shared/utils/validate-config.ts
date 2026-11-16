import {
  EventDashboardConfig,
  WIDGET_KINDS,
  WidgetKind,
} from '@shared/models/event-dashboard-config.model';

/**
 * Runtime validation for an EventDashboardConfig. This guards the
 * "non-coder authors a config" path (Phase D loads config from JSON/DB), and
 * doubles as the highest-value unit test target for the typed configs we ship
 * now. Returns a list of human-readable problems; empty = valid.
 *
 * Note: `bind` paths are validated structurally (non-empty string) here; we
 * cannot know the EventData shape for arbitrary events, so a dangling bind is
 * surfaced at render time by the widget host, not here.
 */
export function validateConfig(config: unknown): string[] {
  const errors: string[] = [];
  const kinds = new Set<WidgetKind>(WIDGET_KINDS);

  if (!config || typeof config !== 'object') {
    return ['config must be an object'];
  }
  const c = config as Partial<EventDashboardConfig>;

  if (!c.slug || typeof c.slug !== 'string') errors.push('slug is required and must be a string');
  if (!c.kvkTheme || typeof c.kvkTheme !== 'string') errors.push('kvkTheme is required and must be a string');
  if (!c.titleKey || typeof c.titleKey !== 'string') errors.push('titleKey is required and must be a string');

  if (!c.dataSource || typeof c.dataSource !== 'object') {
    errors.push('dataSource is required');
  } else {
    const ds = c.dataSource as { kind?: string };
    if (ds.kind !== 'static' && ds.kind !== 'supabase') {
      errors.push(`dataSource.kind must be "static" or "supabase" (got "${String(ds.kind)}")`);
    }
  }

  if (!Array.isArray(c.tabs) || c.tabs.length === 0) {
    errors.push('tabs must be a non-empty array');
  } else {
    const seen = new Set<string>();
    c.tabs.forEach((tab, ti) => {
      if (!tab.id) errors.push(`tabs[${ti}].id is required`);
      else if (seen.has(tab.id)) errors.push(`duplicate tab id "${tab.id}"`);
      else seen.add(tab.id);
      if (!tab.labelKey) errors.push(`tabs[${ti}].labelKey is required`);
      if (!Array.isArray(tab.widgets) || tab.widgets.length === 0) {
        errors.push(`tabs[${ti}] (${tab.id ?? '?'}) must have at least one widget`);
        return;
      }
      tab.widgets.forEach((w, wi) => {
        if (!kinds.has(w.kind)) {
          errors.push(`tabs[${ti}].widgets[${wi}] has unknown kind "${String(w.kind)}"`);
        }
        if (w.bind !== undefined && (typeof w.bind !== 'string' || w.bind.length === 0)) {
          errors.push(`tabs[${ti}].widgets[${wi}].bind must be a non-empty string when present`);
        }
      });
    });
  }

  return errors;
}
