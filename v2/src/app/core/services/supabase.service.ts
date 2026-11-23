import { Injectable } from '@angular/core';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

/**
 * Core Supabase client singleton — a verbatim port of activity-tracker's
 * SupabaseService so the two apps stay convergent (they share ONE Supabase
 * project; eventual end-state merges the dashboards into activity-tracker).
 *
 * Every other service that touches Supabase goes through this (auth, db, rpc)
 * so the client is created exactly once with consistent auth options.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private readonly supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabase.url, environment.supabase.anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  }

  /** The underlying client (auth, storage, realtime…). */
  get client(): SupabaseClient {
    return this.supabase;
  }

  /** Shortcut for `client.auth`. */
  get auth() {
    return this.supabase.auth;
  }

  /** Shortcut for `client.from(table)`. */
  from(table: string) {
    return this.supabase.from(table);
  }
}
