-- ============================================================================
-- Dashboard access control — role/capability gating for the AoEM v2 dashboards
-- ============================================================================
-- Runs on the SHARED Supabase project (same one as activity-tracker). This is
-- deliberately INDEPENDENT of activity-tracker's `user_profiles.role`
-- (super_admin|admin|member): the two apps share only the auth identity, not
-- their role taxonomies. A dashboard `developer` is unrelated to an AT
-- `super_admin`. Nothing here touches any activity-tracker table.
--
-- Roles (capability ladder, cumulative):
--   member     → view dashboards only (the DEFAULT — no row needed)
--   strategist → + edit live state (occupancy/siege/routes)
--   developer  → + edit map geometry (node positions/attributes)
--
-- Paste this whole file into Supabase → SQL Editor and run it. Then follow the
-- SEEDING block at the bottom to grant yourself `developer`.
--
-- PREREQUISITE (already satisfied on the shared project): the dashboard's
-- username/password + member-join + recovery flows reuse activity-tracker's
-- existing tables (user_profiles, servers, invitation_tokens) and RPCs
-- (check_username_available, validate_invitation_token, get_recovery_question,
-- reset_password_with_recovery). This file adds ONLY the dashboard role table;
-- it does not re-create or alter any of those.
-- ============================================================================

-- ── table ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dashboard_access (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'strategist', 'developer')),
  note       TEXT,                                   -- optional: who/why, for your own bookkeeping
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE dashboard_access IS
  'AoEM dashboard role grants, independent of activity-tracker user_profiles.role.';

-- keep updated_at fresh
CREATE OR REPLACE FUNCTION dashboard_access_touch()
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

DROP TRIGGER IF EXISTS trg_dashboard_access_touch ON dashboard_access;
CREATE TRIGGER trg_dashboard_access_touch
  BEFORE UPDATE ON dashboard_access
  FOR EACH ROW EXECUTE FUNCTION dashboard_access_touch();

-- ── helper: is the caller a dashboard developer? ─────────────────────────────
-- SECURITY DEFINER so the policy can read dashboard_access without recursing
-- through its own RLS (the AT "infinite recursion" lesson). Locked-down:
-- execute granted only to authenticated, search_path pinned.
CREATE OR REPLACE FUNCTION is_dashboard_developer(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.dashboard_access
    WHERE user_id = uid AND role = 'developer'
  );
$$;

REVOKE ALL ON FUNCTION is_dashboard_developer(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_dashboard_developer(UUID) TO authenticated;

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE dashboard_access ENABLE ROW LEVEL SECURITY;

-- Read: a user may read their OWN grant (the app looks up can() by this), and a
-- developer may read all grants (future admin UI to manage roles).
DROP POLICY IF EXISTS "read own or developer reads all" ON dashboard_access;
CREATE POLICY "read own or developer reads all"
  ON dashboard_access FOR SELECT
  USING (user_id = auth.uid() OR is_dashboard_developer(auth.uid()));

-- Write (insert/update/delete): developers only. This is the real enforcement —
-- a client flipping localStorage can't grant itself a role, because the DB
-- rejects the write. No self-insert policy (that would be privilege escalation).
DROP POLICY IF EXISTS "developers manage grants (insert)" ON dashboard_access;
CREATE POLICY "developers manage grants (insert)"
  ON dashboard_access FOR INSERT
  WITH CHECK (is_dashboard_developer(auth.uid()));

DROP POLICY IF EXISTS "developers manage grants (update)" ON dashboard_access;
CREATE POLICY "developers manage grants (update)"
  ON dashboard_access FOR UPDATE
  USING (is_dashboard_developer(auth.uid()));

DROP POLICY IF EXISTS "developers manage grants (delete)" ON dashboard_access;
CREATE POLICY "developers manage grants (delete)"
  ON dashboard_access FOR DELETE
  USING (is_dashboard_developer(auth.uid()));

-- ============================================================================
-- SEEDING — grant yourself `developer` (bootstrap: RLS can't let you self-grant,
-- so do it once from the SQL editor, which runs as the table owner / bypasses
-- RLS). Pick ONE option.
-- ============================================================================
--
-- OPTION A — by your Supabase user id (you already said you can provide it):
--
--   INSERT INTO dashboard_access (user_id, role, note)
--   VALUES ('PASTE-YOUR-AUTH-UID-HERE', 'developer', 'TommyTorpedo — bootstrap')
--   ON CONFLICT (user_id) DO UPDATE SET role = 'developer';
--
-- OPTION B — by your Discord identity, if you don't have the uid handy. This
-- finds the auth user whose Discord username matches and grants developer:
--
--   INSERT INTO dashboard_access (user_id, role, note)
--   SELECT id, 'developer', 'TommyTorpedo — bootstrap'
--   FROM auth.users
--   WHERE raw_user_meta_data->>'user_name' = 'YOUR_DISCORD_USERNAME'
--      OR raw_user_meta_data->>'full_name' = 'YOUR_DISCORD_DISPLAY_NAME'
--   ON CONFLICT (user_id) DO UPDATE SET role = 'developer';
--
-- Verify:
--   SELECT da.role, u.raw_user_meta_data->>'full_name' AS discord
--   FROM dashboard_access da JOIN auth.users u ON u.id = da.user_id;
-- ============================================================================
