/**
 * Access model — roles + the capabilities they grant.
 *
 * Deliberately a CAPABILITY ladder, not scattered role checks: consumers ask
 * `can('edit-geometry')`, never `role === 'developer'`. That keeps the role
 * taxonomy swappable — when Supabase OAuth lands, a profile's `role` claim
 * ("Strategist" / "Developer") maps to one of these and nothing downstream
 * changes.
 *
 * Tiers are cumulative supersets:
 *   member     → view the outward dashboards only (never sees /admin exists)
 *   strategist → + edit LIVE STATE (occupancy/siege/routes) + future data entry
 *   developer  → + edit GEOMETRY (semi-permanent map structure; node pos/attrs)
 */
export type Role = 'member' | 'strategist' | 'developer';

export type Capability = 'view-dashboard' | 'edit-live-state' | 'edit-geometry';

/** Capabilities granted by each role (cumulative). */
const ROLE_CAPABILITIES: Record<Role, readonly Capability[]> = {
  member: ['view-dashboard'],
  strategist: ['view-dashboard', 'edit-live-state'],
  developer: ['view-dashboard', 'edit-live-state', 'edit-geometry'],
};

/** True if `role` grants `capability`. Pure — the unit-test target. */
export function roleHas(role: Role, capability: Capability): boolean {
  return ROLE_CAPABILITIES[role].includes(capability);
}

/** Map an external role string (e.g. a Supabase "Strategist" claim, a ?role=
 * param) to a known Role, defaulting to the least-privileged `member`. */
export function parseRole(raw: string | null | undefined): Role {
  switch ((raw ?? '').trim().toLowerCase()) {
    case 'developer':
    case 'dev':
      return 'developer';
    case 'strategist':
      return 'strategist';
    default:
      return 'member';
  }
}
