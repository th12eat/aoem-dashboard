/**
 * Alliance-tag conventions shared by the map editor and the derivation.
 *
 * A node can be held by an alliance outside the scouted top-N per server. To
 * map that without inventing a real tag, the editor assigns a synthetic
 * `OTHER@<server>` occupant. The color resolver recognises this convention and
 * paints it in that server's base corner color (so it reads as "that server,
 * unspecified alliance").
 */

const OTHER_PREFIX = 'OTHER@';

/** The synthetic "Other alliance on <server>" occupant tag. */
export function otherTagFor(server: string): string {
  return `${OTHER_PREFIX}${server}`;
}

/** If `tag` is an `OTHER@<server>` sentinel, return its server; else null. */
export function serverFromOtherTag(tag: string): string | null {
  return tag.startsWith(OTHER_PREFIX) ? tag.slice(OTHER_PREFIX.length) : null;
}

/** Human label for a tag — `OTHER@Era #039` → `Other (#039)`, else the tag. */
export function displayTag(tag: string): string {
  const server = serverFromOtherTag(tag);
  return server ? `Other (${server.replace('Era ', '')})` : tag;
}
