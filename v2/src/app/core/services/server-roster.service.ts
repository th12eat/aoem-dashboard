import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

/** One alliance in a server's canonical roster. */
export interface RosterAllianceEntry {
  tag: string;
  name: string;
}

/**
 * Reads a server's canonical alliance roster (tag + name) from the globally-
 * shared `server_rosters` table — keyed by server number, NOT by event type.
 * Every event's data-editor prefills our server's four alliances from here, so
 * the admin never retypes them per occurrence. Writes are RLS-gated to the
 * dashboard's top role (the future "super admin" roster dashboard); this
 * service only reads. Returns [] (never throws) on any error.
 */
@Injectable({ providedIn: 'root' })
export class ServerRosterService {
  private readonly supabase = inject(SupabaseService);

  /** The alliances for a server number, in display order. [] if none/err. */
  async forServer(serverNumber: number): Promise<RosterAllianceEntry[]> {
    try {
      const { data, error } = await this.supabase
        .from('server_rosters')
        .select('alliances')
        .eq('server_number', serverNumber)
        .maybeSingle();
      if (error || !data) return [];
      const list = (data.alliances ?? []) as unknown[];
      return list
        .map(a => {
          const o = (a && typeof a === 'object' ? a : {}) as Record<string, unknown>;
          return { tag: String(o['tag'] ?? ''), name: String(o['name'] ?? '') };
        })
        .filter(a => a.tag);
    } catch {
      return [];
    }
  }
}
