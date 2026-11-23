-- ============================================================================
-- Dual map state — split event_map_state into LIVE and PLAN maps per event
-- ============================================================================
-- Each event now has TWO independent map states:
--   • live — real-time control across ALL 4 servers' alliances
--   • plan — our-server's pre-set plan (differs from live; set ahead of time)
-- Both share the same column shapes; a `kind` discriminator + composite PK
-- (slug, kind) lets one table hold both without duplicating columns.
--
-- Existing rows (keyed on slug only) become the 'live' row via the default.
-- A 'plan' row is created on first Save of the plan map; until then the
-- dashboard falls back to the live map for the Plan toggle.
--
-- Depends on 02-event-map-state.sql. RLS + touch trigger are unchanged (they
-- are row-level and PK-agnostic); re-asserted below for idempotency. Paste+Run.
-- ============================================================================

ALTER TABLE event_map_state
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'live'
  CHECK (kind IN ('live', 'plan'));

-- Repoint the primary key from (slug) to (slug, kind).
ALTER TABLE event_map_state DROP CONSTRAINT IF EXISTS event_map_state_pkey;
ALTER TABLE event_map_state ADD PRIMARY KEY (slug, kind);

COMMENT ON TABLE event_map_state IS
  'Live + plan map state per event (two rows per slug, discriminated by kind). Edited by strategist+, read by any signed-in user.';

-- ── RLS (re-assert; unchanged from 02 — PK shape does not affect row policies) ─
ALTER TABLE event_map_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "signed-in users read map state" ON event_map_state;
CREATE POLICY "signed-in users read map state"
  ON event_map_state FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "strategists write map state (insert)" ON event_map_state;
CREATE POLICY "strategists write map state (insert)"
  ON event_map_state FOR INSERT
  TO authenticated
  WITH CHECK (can_edit_live_state(auth.uid()));

DROP POLICY IF EXISTS "strategists write map state (update)" ON event_map_state;
CREATE POLICY "strategists write map state (update)"
  ON event_map_state FOR UPDATE
  TO authenticated
  USING (can_edit_live_state(auth.uid()))
  WITH CHECK (can_edit_live_state(auth.uid()));
