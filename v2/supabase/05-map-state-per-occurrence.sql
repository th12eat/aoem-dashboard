-- ============================================================================
-- 05-map-state-per-occurrence.sql — key map state to an OCCURRENCE, not a type
-- ============================================================================
-- event_map_state was keyed (slug, kind) = the event TYPE, so every occurrence
-- of a type (e.g. each Desolate) shared one map. Now that events are per-
-- occurrence (events table, 04), the map must be too: a new occurrence should
-- start with an empty map, and two occurrences of the same type keep separate
-- maps. We add `event_id` and repoint the key to (event_id, kind).
--
-- Migration strategy (non-destructive): add a nullable event_id, backfill the
-- existing (slug,kind) live rows to each type's CURRENT occurrence if one
-- exists, then switch the primary key. Legacy rows whose type has no occurrence
-- keep event_id NULL and are simply ignored by the new (event_id, kind) reads
-- (the app falls back to the static JSON for those, unchanged).
--
-- Depends on 02/03 (event_map_state) + 04 (events). Paste + Run.
-- ============================================================================

ALTER TABLE event_map_state
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE CASCADE;

-- Backfill: attach each existing (slug,kind) row to that type's latest
-- published occurrence (else latest awaiting/complete) so the current live map
-- isn't lost when we repoint the key.
UPDATE event_map_state ems
SET event_id = (
  SELECT e.id FROM events e
  WHERE e.type_slug = ems.slug
  ORDER BY (e.status = 'published') DESC, e.start_date DESC
  LIMIT 1
)
WHERE ems.event_id IS NULL;

-- Repoint the primary key to (event_id, kind). Rows with a null event_id
-- (no occurrence for that type yet) can't be in the new PK, so park them under
-- a unique index on the legacy (slug, kind) instead — harmless, unread.
ALTER TABLE event_map_state DROP CONSTRAINT IF EXISTS event_map_state_pkey;

-- A partial unique index keeps the legacy slug-keyed rows valid + de-duped.
CREATE UNIQUE INDEX IF NOT EXISTS event_map_state_legacy_key
  ON event_map_state (slug, kind)
  WHERE event_id IS NULL;

-- The new canonical key: one map (per kind) per occurrence.
CREATE UNIQUE INDEX IF NOT EXISTS event_map_state_event_key
  ON event_map_state (event_id, kind)
  WHERE event_id IS NOT NULL;

-- ── RLS (unchanged; re-assert for idempotency) ───────────────────────────────
ALTER TABLE event_map_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "signed-in users read map state" ON event_map_state;
CREATE POLICY "signed-in users read map state"
  ON event_map_state FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "strategists write map state (insert)" ON event_map_state;
CREATE POLICY "strategists write map state (insert)"
  ON event_map_state FOR INSERT TO authenticated
  WITH CHECK (can_edit_live_state(auth.uid()));

DROP POLICY IF EXISTS "strategists write map state (update)" ON event_map_state;
CREATE POLICY "strategists write map state (update)"
  ON event_map_state FOR UPDATE TO authenticated
  USING (can_edit_live_state(auth.uid()))
  WITH CHECK (can_edit_live_state(auth.uid()));
