-- ============================================================================
-- 00-schema-migrations.sql — a tiny ledger of which migration files were applied
-- ============================================================================
-- There's no automatic migration runner here (each NN-*.sql is pasted + run by
-- hand in the Supabase SQL editor). That made "did I already run 03/05?" an
-- archaeology problem. This table is the answer: after running each file, record
-- it here, and `SELECT * FROM schema_migrations ORDER BY filename` tells you the
-- applied set at a glance.
--
-- Run this FIRST (it's 00), then backfill the ones you've already applied (the
-- INSERT at the bottom seeds 01–07 as a convenience — edit it to match reality
-- if your state differs). Every NN-*.sql hereafter ends with its own one-line
-- INSERT so the ledger stays current automatically.
--
-- No dependencies. Idempotent. Paste + Run.
-- ============================================================================

CREATE TABLE IF NOT EXISTS schema_migrations (
  filename    TEXT PRIMARY KEY,      -- e.g. '04-events.sql'
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  note        TEXT
);

COMMENT ON TABLE schema_migrations IS
  'Hand-maintained ledger of applied supabase/NN-*.sql files. Record each file after running it.';

-- Readable by any signed-in user (so the app/devs can check state); writes are
-- effectively admin-only in practice (done from the SQL editor as the owner).
ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "signed-in users read migrations" ON schema_migrations;
CREATE POLICY "signed-in users read migrations"
  ON schema_migrations FOR SELECT TO authenticated USING (true);

-- ── seed the already-applied set (01–07). Adjust if your DB differs. ─────────
INSERT INTO schema_migrations (filename, note) VALUES
  ('01-dashboard-access.sql',       'roles + is_dashboard_developer/can_edit_live_state'),
  ('02-event-map-state.sql',        'event_map_state table'),
  ('03-map-state-dual.sql',         'kind column + (slug,kind) PK'),
  ('04-events.sql',                 'events + event_data'),
  ('05-map-state-per-occurrence.sql','event_id + per-occurrence keys'),
  ('06-server-rosters.sql',         'shared per-server roster'),
  ('07-backfill-events.sql',        'seed 22 historical occurrences')
ON CONFLICT (filename) DO NOTHING;
