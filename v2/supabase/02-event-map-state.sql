-- ============================================================================
-- Event map state — live occupancy/routes/strongholds, persisted to the DB
-- ============================================================================
-- The dashboards' outward data (points, rosters, diplomacy…) still comes from
-- the static 1.0 JSON pipeline. This table holds ONLY the interactive map's
-- live STATE (the three keys the map editor edits), so a Strategist's edits in
-- /admin show up live on /dashboards for everyone — no redeploy.
--
-- One row per event slug. state/routes/strongholds are JSONB blobs matching the
-- shapes the app already uses (MapNodeState map, {actual,planned} routes,
-- StrongholdState[]). Writing is gated to strategist+ via RLS; reading is open
-- to any signed-in user (the dashboards are behind the auth wall anyway).
--
-- Depends on 01-dashboard-access.sql (dashboard_access table). Paste + Run.
-- ============================================================================

CREATE TABLE IF NOT EXISTS event_map_state (
  slug         TEXT PRIMARY KEY,
  state        JSONB NOT NULL DEFAULT '{}'::jsonb,   -- node id → { occupant, siege, connected, active }
  routes       JSONB NOT NULL DEFAULT '{"actual":[],"planned":[]}'::jsonb,
  strongholds  JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE event_map_state IS
  'Live map state per event slug (occupancy/routes/strongholds). Edited by strategist+, read by any signed-in user.';

-- keep updated_at fresh
CREATE OR REPLACE FUNCTION event_map_state_touch()
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

DROP TRIGGER IF EXISTS trg_event_map_state_touch ON event_map_state;
CREATE TRIGGER trg_event_map_state_touch
  BEFORE UPDATE ON event_map_state
  FOR EACH ROW EXECUTE FUNCTION event_map_state_touch();

-- ── helper: may the caller edit live state? (strategist OR developer) ─────────
-- SECURITY DEFINER so the policy reads dashboard_access without recursing
-- through ITS rls. Mirrors is_dashboard_developer() from 01.
CREATE OR REPLACE FUNCTION can_edit_live_state(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.dashboard_access
    WHERE user_id = uid AND role IN ('strategist', 'developer')
  );
$$;

REVOKE ALL ON FUNCTION can_edit_live_state(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION can_edit_live_state(UUID) TO authenticated;

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE event_map_state ENABLE ROW LEVEL SECURITY;

-- Read: any signed-in user (dashboards live behind the auth wall).
DROP POLICY IF EXISTS "signed-in users read map state" ON event_map_state;
CREATE POLICY "signed-in users read map state"
  ON event_map_state FOR SELECT
  TO authenticated
  USING (true);

-- Write: strategist+ only. This is the real enforcement — a member flipping a
-- client flag still can't persist a map edit, because the DB rejects it.
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

-- (No delete policy — map state is never deleted, only updated/reset to empty.)
