-- ============================================================================
-- 06-server-rosters.sql — our own server's canonical alliance roster
-- ============================================================================
-- A SINGLE globally-shared table (NOT event-type specific): the alliance tags +
-- names for a server, keyed by server number. Every event's data-editor
-- prefills the roster for our server from here, so the admin never retypes our
-- four tags/names per occurrence. One row per server; today only our server
-- (Era 8) is seeded, but the schema supports others.
--
-- Writes are gated to the dashboard's top role (`developer`) — the eventual
-- "super admin" dashboard that edits this table will require it. Reads are open
-- to any signed-in user (the editor needs them).
--
-- Depends on 01 (is_dashboard_developer). Paste + Run.
-- ============================================================================

CREATE TABLE IF NOT EXISTS server_rosters (
  server_number INTEGER PRIMARY KEY,
  -- [{ "tag": "...", "name": "..." }, ...] in display order.
  alliances     JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by    UUID
);

COMMENT ON TABLE server_rosters IS
  'Canonical per-server alliance roster (tag+name), shared across every KvK event data editor. Keyed by server number.';

-- ── seed our server (Era 8) with the current four alliances ──────────────────
-- Values lifted verbatim from data/live/tme.json (superscript glyphs preserved).
INSERT INTO server_rosters (server_number, alliances) VALUES
  (8, '[
    {"tag": "ʀ★ᴡ", "name": "ʀᴀɢᴇᴡᴀʀʀɪᴏʀꜱ"},
    {"tag": "ʀ★ɢ", "name": "ʀᴀɢᴇᴏꜰɢᴏᴅꜱ"},
    {"tag": "ʀ★ᴍ", "name": "ᴍʏᴛʜɪᴄ"},
    {"tag": "ʀ★ᴜ", "name": "ʀᴀɢᴇᴜɴɪᴏɴ"}
  ]'::jsonb)
ON CONFLICT (server_number) DO NOTHING;

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE server_rosters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "signed-in users read rosters" ON server_rosters;
CREATE POLICY "signed-in users read rosters"
  ON server_rosters FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "developers write rosters (insert)" ON server_rosters;
CREATE POLICY "developers write rosters (insert)"
  ON server_rosters FOR INSERT TO authenticated
  WITH CHECK (is_dashboard_developer(auth.uid()));

DROP POLICY IF EXISTS "developers write rosters (update)" ON server_rosters;
CREATE POLICY "developers write rosters (update)"
  ON server_rosters FOR UPDATE TO authenticated
  USING (is_dashboard_developer(auth.uid()))
  WITH CHECK (is_dashboard_developer(auth.uid()));
