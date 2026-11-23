-- ============================================================================
-- 04-events.sql — Event occurrences + instance-data documents
-- ============================================================================
-- Each OCCURRENCE of an event type (stormlands/desolate/tme/behemoth/primordial)
-- is one `events` row, keyed (type_slug, start_date). `event_data` holds the
-- full EventData-raw document (eventConfig + scouting/points/diplomacy/…) as a
-- single JSONB doc — the exact shape normalizeEventData() already consumes, so
-- the datasource swap is shape-preserving and the (future) data-entry editor
-- just reads/writes sections of `doc`.
--
-- The datasource reads the DB first and falls back to the committed static
-- data/live/<type_slug>.json for legacy events with no row yet.
--
-- status gates the dashboard:
--   awaiting  → header + "Awaiting Matchmaking…" only (body hidden)
--   published → full dashboard
--   complete  → full dashboard (a finished event stays viewable as history)
--
-- Depends on 01-dashboard-access.sql (can_edit_live_state, is_dashboard_developer).
-- Paste this whole file into Supabase → SQL Editor and run it.
--
-- NOTE (deferred migration): event_map_state (02/03) stays keyed by the TYPE
-- slug for the current live occurrence. A future 05-*.sql will add event_id to
-- it and repoint the PK to (event_id, kind) so map state is per-occurrence;
-- safe to defer while there is at most one live occurrence per type.
-- ============================================================================

-- ── occurrences ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_slug   TEXT NOT NULL,                       -- stormlands | desolate | tme | behemoth | primordial
  start_date  DATE NOT NULL,                       -- occurrence key in the URL (/history/<YYYY-MM-DD>)
  status      TEXT NOT NULL DEFAULT 'awaiting'
                CHECK (status IN ('awaiting', 'published', 'complete')),
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (type_slug, start_date)
);

COMMENT ON TABLE events IS
  'One row per event occurrence, keyed (type_slug, start_date). status gates the dashboard: awaiting=header-only, published=full, complete=past.';

CREATE INDEX IF NOT EXISTS idx_events_type_start ON events (type_slug, start_date DESC);

-- ── instance-data document (1:1 with events) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS event_data (
  event_id    UUID PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
  doc         JSONB NOT NULL DEFAULT '{}'::jsonb,  -- EventData-raw shape (eventConfig + data sections)
  updated_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE event_data IS
  'Full instance-data document per occurrence (EventData-raw shape). Mirrors data/live/<slug>.json; datasource reads this first, falls back to static JSON.';

-- ── touch trigger (shared) ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION events_touch()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_events_touch ON events;
CREATE TRIGGER trg_events_touch
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION events_touch();

DROP TRIGGER IF EXISTS trg_event_data_touch ON event_data;
CREATE TRIGGER trg_event_data_touch
  BEFORE UPDATE ON event_data
  FOR EACH ROW EXECUTE FUNCTION events_touch();

-- ── RLS: events ───────────────────────────────────────────────────────────────
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "signed-in users read events" ON events;
CREATE POLICY "signed-in users read events"
  ON events FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "strategists create events" ON events;
CREATE POLICY "strategists create events"
  ON events FOR INSERT TO authenticated
  WITH CHECK (can_edit_live_state(auth.uid()));

DROP POLICY IF EXISTS "strategists update events" ON events;
CREATE POLICY "strategists update events"
  ON events FOR UPDATE TO authenticated
  USING (can_edit_live_state(auth.uid()))
  WITH CHECK (can_edit_live_state(auth.uid()));

DROP POLICY IF EXISTS "developers delete events" ON events;
CREATE POLICY "developers delete events"
  ON events FOR DELETE TO authenticated
  USING (is_dashboard_developer(auth.uid()));

-- ── RLS: event_data ───────────────────────────────────────────────────────────
ALTER TABLE event_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "signed-in users read event_data" ON event_data;
CREATE POLICY "signed-in users read event_data"
  ON event_data FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "strategists write event_data (insert)" ON event_data;
CREATE POLICY "strategists write event_data (insert)"
  ON event_data FOR INSERT TO authenticated
  WITH CHECK (can_edit_live_state(auth.uid()));

DROP POLICY IF EXISTS "strategists write event_data (update)" ON event_data;
CREATE POLICY "strategists write event_data (update)"
  ON event_data FOR UPDATE TO authenticated
  USING (can_edit_live_state(auth.uid()))
  WITH CHECK (can_edit_live_state(auth.uid()));

DROP POLICY IF EXISTS "developers delete event_data" ON event_data;
CREATE POLICY "developers delete event_data"
  ON event_data FOR DELETE TO authenticated
  USING (is_dashboard_developer(auth.uid()));
