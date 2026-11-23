import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { DashboardAuthService } from './dashboard-auth.service';

export type OccurrenceStatus = 'awaiting' | 'published' | 'complete';

/** One occurrence row (no doc — the lightweight list/resolve shape). */
export interface EventOccurrence {
  id: string;
  typeSlug: string;
  startDate: string; // 'YYYY-MM-DD'
  status: OccurrenceStatus;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface OccurrenceRow {
  id: string;
  type_slug: string;
  start_date: string;
  status: OccurrenceStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

function toOccurrence(r: OccurrenceRow): EventOccurrence {
  return {
    id: r.id,
    typeSlug: r.type_slug,
    startDate: r.start_date,
    status: r.status,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/**
 * Resolves which OCCURRENCE of an event type to show and persists occurrence
 * lifecycle (create / publish / complete / delete). Sibling of MapStateStore;
 * does NOT replace EventRegistryService — the registry still owns the static
 * TYPE template (config/geometry/tabs); this owns the per-occurrence rows in
 * the `events` + `event_data` tables. Reads return []/null on error (never
 * throws) so the datasource can fall back to static JSON.
 */
@Injectable({ providedIn: 'root' })
export class EventService {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(DashboardAuthService);

  /** All occurrences of a type, newest start_date first. */
  async listOccurrences(typeSlug: string): Promise<EventOccurrence[]> {
    try {
      const { data, error } = await this.supabase
        .from('events')
        .select('*')
        .eq('type_slug', typeSlug)
        .order('start_date', { ascending: false });
      if (error || !data) return [];
      return (data as OccurrenceRow[]).map(toOccurrence);
    } catch {
      return [];
    }
  }

  /** Every occurrence across all types (admin list), newest first. */
  async listAll(): Promise<EventOccurrence[]> {
    try {
      const { data, error } = await this.supabase
        .from('events')
        .select('*')
        .order('start_date', { ascending: false });
      if (error || !data) return [];
      return (data as OccurrenceRow[]).map(toOccurrence);
    } catch {
      return [];
    }
  }

  /** The "current/live" occurrence for a type: latest published, else latest
   * awaiting, else latest complete. Null when the type has no DB rows yet. */
  async resolveCurrent(typeSlug: string): Promise<EventOccurrence | null> {
    const all = await this.listOccurrences(typeSlug); // already start_date DESC
    return (
      all.find(o => o.status === 'published') ??
      all.find(o => o.status === 'awaiting') ??
      all.find(o => o.status === 'complete') ??
      null
    );
  }

  /** A specific occurrence by start date (the /history/:date route). */
  async resolveByDate(typeSlug: string, startDate: string): Promise<EventOccurrence | null> {
    try {
      const { data, error } = await this.supabase
        .from('events')
        .select('*')
        .eq('type_slug', typeSlug)
        .eq('start_date', startDate)
        .maybeSingle();
      if (error || !data) return null;
      return toOccurrence(data as OccurrenceRow);
    } catch {
      return null;
    }
  }

  /** The instance-data doc for an occurrence, or null if none stored yet
   * (→ datasource falls back to static JSON). */
  async loadDoc(eventId: string): Promise<Record<string, unknown> | null> {
    try {
      const { data, error } = await this.supabase
        .from('event_data')
        .select('doc')
        .eq('event_id', eventId)
        .maybeSingle();
      if (error || !data) return null;
      return (data.doc ?? null) as Record<string, unknown> | null;
    } catch {
      return null;
    }
  }

  // ── writes (RLS enforces strategist+ / developer) ───────────────────────────
  /** Create an occurrence (status defaults 'awaiting'). */
  async createOccurrence(typeSlug: string, startDate: string): Promise<{ id: string | null; error: string | null }> {
    const { data, error } = await this.supabase
      .from('events')
      .insert({ type_slug: typeSlug, start_date: startDate, created_by: this.auth.getUserId() })
      .select('id')
      .single();
    if (error) return { id: null, error: error.message };
    return { id: (data as { id: string }).id, error: null };
  }

  async setStatus(id: string, status: OccurrenceStatus): Promise<{ error: string | null }> {
    const { error } = await this.supabase.from('events').update({ status }).eq('id', id);
    return { error: error?.message ?? null };
  }

  /** Save/replace an occurrence's instance-data doc (future editor uses this). */
  async saveDoc(eventId: string, doc: Record<string, unknown>): Promise<{ error: string | null }> {
    const { error } = await this.supabase
      .from('event_data')
      .upsert({ event_id: eventId, doc, updated_by: this.auth.getUserId() }, { onConflict: 'event_id' });
    return { error: error?.message ?? null };
  }

  /** Developer-only hard delete (archive via status is the norm). */
  async deleteOccurrence(id: string): Promise<{ error: string | null }> {
    const { error } = await this.supabase.from('events').delete().eq('id', id);
    return { error: error?.message ?? null };
  }
}
