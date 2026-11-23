import type {
  MapGeometry,
  MapNodeGeo,
  MapNodeState,
  MapNodeView,
  MapRoute,
  MapView,
  AllianceHoldings,
  BuffColumn,
  StrongholdState,
  StrongholdView,
} from '@shared/models/map.model';
import type { Kingdom } from '@shared/models/event-data.model';
import { shadeSpread } from '@shared/utils/numeric';
import { serverFromOtherTag } from '@shared/utils/alliance-tag';

/** Energy / placer gold per hour a node yields while occupied. Geometry may
 * specify it explicitly (energyPerHour); otherwise fall back to the DD rates by
 * node type/transition (cities 8k; Z2→Z3 gate 8k; Z2↔Z2 4k; Z1→Z2 3k; else 0). */
function nodePerHour(n: MapNodeGeo): number {
  if (typeof n.energyPerHour === 'number') return n.energyPerHour;
  if (n.type === 'city') return 8000;
  if (n.type === 'gate') {
    if (n.transition === 'Z2->Z3') return 8000;
    if (n.transition === 'Z2<->Z2') return 4000;
    return 3000; // Z1->Z2
  }
  return 0;
}

/**
 * Derive the full {@link MapView} from static geometry + live state. Single
 * source of truth for the map AND every derived table (buffs, placer balances,
 * node counts, achievements).
 *
 * Rules:
 *   • active   — schedule-gated: today ≥ eventStart + activeDayOffset (state
 *                override wins).
 *   • occupied — one alliance (state.occupant).
 *   • connected— DERIVED: a node is connected for its occupant iff it is
 *                reachable from one of that alliance's strongholds (SH in its Z1
 *                corner, or an SSH) through that alliance's ESTABLISHED
 *                (non-building) routes. Severing from Z1 disconnects downstream
 *                unless an SSH seeds it. If an alliance has NO stronghold data
 *                (historical files), we fall back to the explicit state.connected
 *                flag so older data still renders.
 *   • buffActive — buff counts only while connected AND occupied.
 *   • placerPerHour — accrues while OCCUPIED (independent of connection).
 *
 * Pure + deterministic (caller passes nowMs → works with the preview clock).
 */
export function deriveMapView(
  geometry: MapGeometry,
  state: Record<string, MapNodeState>,
  routes: { actual: MapRoute[]; planned: MapRoute[] },
  strongholds: StrongholdState[],
  kingdoms: Kingdom[],
  allianceServer: Record<string, string>,
  eventStartMs: number,
  nowMs: number,
): MapView {
  const kByServer = new Map(kingdoms.map(k => [k.server, k]));
  const geoById = new Map(geometry.nodes.map(n => [n.id, n]));
  const dayMs = 86400000;

  // Per-alliance distinct shade of its server colour.
  const byServerTags = new Map<string, string[]>();
  for (const [tag, server] of Object.entries(allianceServer)) {
    const list = byServerTags.get(server) ?? [];
    if (!list.includes(tag)) list.push(tag);
    byServerTags.set(server, list);
  }
  const shadeOf = new Map<string, string>();
  for (const [server, tags] of byServerTags) {
    const base = kByServer.get(server)?.color ?? '#8a90a5';
    const shades = shadeSpread(base, tags.length);
    tags.forEach((tag, i) => shadeOf.set(tag, shades[i]));
  }
  // Resolve a tag's server — an `OTHER@<server>` sentinel names its server
  // directly; otherwise fall back to the scouting-derived allianceServer map.
  const serverOf = (tag: string) => serverFromOtherTag(tag) ?? allianceServer[tag] ?? '';
  const shade = (tag: string) => shadeOf.get(tag) ?? kByServer.get(serverOf(tag))?.color ?? '#8a90a5';

  // ── derive connectivity per alliance ──────────────────────────────────────
  // Build an undirected adjacency per owner from ESTABLISHED routes (not
  // building/pathing), then BFS from that owner's stronghold anchors.
  const adjByOwner = new Map<string, Map<string, Set<string>>>();
  for (const r of routes.actual) {
    if (r.building || r.lifecycle === 'pathing') continue; // still being built — no connection yet
    if (r.cut) continue; // enemy severed this edge — it no longer conducts connectivity
    const adj = adjByOwner.get(r.owner) ?? new Map<string, Set<string>>();
    for (let i = 0; i < r.path.length - 1; i++) {
      const a = r.path[i];
      const b = r.path[i + 1];
      (adj.get(a) ?? adj.set(a, new Set()).get(a)!).add(b);
      (adj.get(b) ?? adj.set(b, new Set()).get(b)!).add(a);
    }
    adjByOwner.set(r.owner, adj);
  }
  // Seeds per owner: explicit DD strongholds (attachedTo a node) PLUS Stormlands
  // stronghold-nodes (geometry seed:true) that this owner currently occupies.
  const seedsByOwner = new Map<string, string[]>();
  const addSeed = (owner: string, nodeId: string) => {
    const list = seedsByOwner.get(owner) ?? [];
    if (!list.includes(nodeId)) list.push(nodeId);
    seedsByOwner.set(owner, list);
  };
  for (const sh of strongholds) addSeed(sh.owner, sh.attachedTo);
  // Geometry seed:true nodes (SL Basic/Advanced Strongholds) seed for their
  // occupant — but SL allows only ONE active forward stronghold per owner at a
  // time (plus the Z1 SH). So if an owner flags any occupied seed node with
  // `activeSeed`, only the flagged one(s) seed; otherwise (legacy/no flag) all
  // occupied seed nodes seed, preserving prior behaviour. DD SSH are explicit
  // strongholds[] (not seed:true), so they're unaffected either way.
  const occupiedSeedNodes = new Map<string, { id: string; active: boolean }[]>();
  for (const n of geometry.nodes) {
    if (!n.seed) continue;
    const st = state[n.id] ?? {};
    if (!st.occupant) continue;
    const list = occupiedSeedNodes.get(st.occupant) ?? [];
    list.push({ id: n.id, active: st.activeSeed === true });
    occupiedSeedNodes.set(st.occupant, list);
  }
  for (const [owner, list] of occupiedSeedNodes) {
    const flagged = list.filter(s => s.active);
    const seeds = flagged.length ? flagged : list;
    for (const s of seeds) addSeed(owner, s.id);
  }
  const ownersWithSeed = new Set(seedsByOwner.keys());

  // Reachable node-set per owner, BFS from that owner's seeds over established routes.
  const reachableByOwner = new Map<string, Set<string>>();
  for (const [owner, seeds] of seedsByOwner) {
    const reach = new Set<string>();
    const adj = adjByOwner.get(owner) ?? new Map();
    const queue = [...seeds];
    for (const s of seeds) reach.add(s);
    while (queue.length) {
      const cur = queue.shift()!;
      for (const nxt of adj.get(cur) ?? []) {
        if (!reach.has(nxt)) {
          reach.add(nxt);
          queue.push(nxt);
        }
      }
    }
    reachableByOwner.set(owner, reach);
  }
  const isConnected = (nodeId: string, owner: string, explicit: boolean | undefined): boolean => {
    if (ownersWithSeed.has(owner)) return reachableByOwner.get(owner)?.has(nodeId) ?? false;
    return explicit !== false; // fallback for seed-less (historical) data
  };

  const nodes: MapNodeView[] = geometry.nodes.map(n => {
    const st = state[n.id] ?? {};
    const scheduledActive =
      n.activeDayOffset == null
        ? true
        : Number.isFinite(eventStartMs) && nowMs >= eventStartMs + n.activeDayOffset * dayMs;
    const active = st.active != null ? st.active : scheduledActive;
    const occupant = st.occupant ?? null;
    const connected = !!occupant && isConnected(n.id, occupant, st.connected);
    const siege = st.siege === true && !!occupant;
    const buffActive = !!occupant && connected && !!n.buff;
    const placerPerHour = occupant ? nodePerHour(n) : 0;
    return { ...n, occupant, connected, siege, active, buffActive, placerPerHour };
  });

  // ── holdings aggregate ────────────────────────────────────────────────────
  const byTag = new Map<string, AllianceHoldings>();
  const ensure = (tag: string): AllianceHoldings => {
    let h = byTag.get(tag);
    if (!h) {
      const server = serverOf(tag);
      const k = kByServer.get(server);
      h = {
        tag,
        server,
        color: k?.color ?? '#8a90a5',
        shade: shade(tag),
        rgb: k?.rgb ?? '138,144,165',
        buffs: [],
        placerPerHour: 0,
        cities: 0,
        gates: 0,
        towers: 0,
        aaru: false,
      };
      byTag.set(tag, h);
    }
    return h;
  };
  for (const n of nodes) {
    if (!n.occupant) continue;
    const h = ensure(n.occupant);
    h.placerPerHour += n.placerPerHour;
    if (n.type === 'city') h.cities++;
    else if (n.type === 'gate') h.gates++;
    else if (n.type === 'tower') h.towers++;
    else if (n.type === 'aaru') h.aaru = true;
    if (n.buffActive && n.buff && !h.buffs.includes(n.buff.key)) h.buffs.push(n.buff.key);
  }

  // Buff columns = the distinct buffs present in this event's geometry, in first
  // appearance order (per-event, data-driven — Stormlands shows Attack/Defense,
  // DD shows Health/Attack/Defense/DmgRed/Damage).
  const buffColumns: BuffColumn[] = [];
  const seenBuff = new Set<string>();
  for (const n of geometry.nodes) {
    if (n.buff && !seenBuff.has(n.buff.key)) {
      seenBuff.add(n.buff.key);
      buffColumns.push({ key: n.buff.key, label: n.buff.label });
    }
  }

  // ── position strongholds for rendering ────────────────────────────────────
  const badgeByServer = new Map(geometry.serverBadges.map(b => [b.server, b]));
  const hl = null; // fade handled in the widget; derivation keeps fade=false
  const strongholdViews: StrongholdView[] = strongholds
    .map((sh): StrongholdView | null => {
      const anchor = geoById.get(sh.attachedTo);
      if (!anchor) return null;
      let x = anchor.x;
      let y = anchor.y;
      const towardCorner = (dist: number): boolean => {
        // Push the symbol from the gate toward this owner's corner (the lower-
        // zone side), so an SH on a Z1 gate sits in Z1 and an SSH on a Z2→Z3
        // gate sits in Z2 — never inside the higher zone it gates into.
        const badge = badgeByServer.get(serverOf(sh.owner));
        if (!badge) return false;
        const dx = badge.x - anchor.x;
        const dy = badge.y - anchor.y;
        const len = Math.hypot(dx, dy) || 1;
        x = anchor.x + (dx / len) * dist;
        y = anchor.y + (dy / len) * dist;
        return true;
      };
      if (sh.kind === 'sh') {
        // SH sits on the corner→gate lane, just OUTSIDE the gate toward the corner.
        towardCorner(3.0);
      } else if (anchor.type === 'gate') {
        // SSH on a gate also sits on the lower-zone (corner) side of the gate.
        if (!towardCorner(2.6)) {
          x = anchor.x + 2.4;
          y = anchor.y - 2.4;
        }
      } else {
        // SSH beside a normal node.
        x = anchor.x + 2.4;
        y = anchor.y - 2.4;
      }
      return { owner: sh.owner, kind: sh.kind, x, y, color: shade(sh.owner), siege: !!sh.siege, fade: !!hl };
    })
    .filter((s): s is StrongholdView => s !== null);

  // Enrich actual routes with derived connectivity: an edge is `active` iff its
  // owner has a seed AND every node on it is reachable over non-cut edges; a cut
  // edge is `severed` (and never active) so the renderer can show it broken.
  const derivedActual = routes.actual.map(r => {
    const reach = reachableByOwner.get(r.owner);
    const active = !r.cut && !!reach && r.path.every(id => reach.has(id));
    return { ...r, active, severed: !!r.cut };
  });

  return {
    nodes,
    routes: { actual: derivedActual, planned: routes.planned },
    strongholds: strongholdViews,
    holdings: [...byTag.values()],
    buffColumns,
    ourServer: kingdoms.find(k => k.us)?.server ?? '',
  };
}
