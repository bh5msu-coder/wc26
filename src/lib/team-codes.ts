/**
 * Explicit mapping from football-data.org team identifiers to this app's nation
 * codes. football-data exposes a 3-letter `tla` plus a full `name`. Most TLAs
 * already match our FIFA-style codes, so resolution order is:
 *   1. TEAM_CODE_OVERRIDES[tla]   — hard overrides for known mismatches
 *   2. tla, if it's already one of our nation codes
 *   3. NAME_ALIASES[normalized name]
 *   4. a nation in the DB whose name matches
 *   5. the raw tla as a last resort
 *
 * Fill these tables in as you spot mismatches once real data flows.
 */

// football-data `tla` → our nation code (only the exceptions need listing)
export const TEAM_CODE_OVERRIDES: Record<string, string> = {
  // "RKS": "KOS",  // example: Kosovo
  // "GER": "GER",  // most already line up — add only the ones that differ
};

// normalized full team name → our nation code (fallback when the tla doesn't map)
export const NAME_ALIASES: Record<string, string> = {
  korearepublic: "KOR",
  southkorea: "KOR",
  unitedstates: "USA",
  usa: "USA",
  iranislamicrepublic: "IRN",
  iririran: "IRN",
  iran: "IRN",
  cotedivoire: "CIV",
  ivorycoast: "CIV",
  caboverde: "CPV",
  capeverde: "CPV",
  turkiye: "TUR",
  turkey: "TUR",
};

/** Lowercase, strip accents and punctuation — for forgiving name matching. */
export function normalizeName(name?: string | null): string {
  return (name ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Resolve a football-data team to one of our nation codes.
 * `codeSet` and `nameToCode` are built from the live nation catalog by the caller.
 */
export function resolveNationCode(
  team: { tla?: string | null; name?: string | null },
  codeSet: Set<string>,
  nameToCode: Map<string, string>,
): string {
  const tla = (team.tla ?? "").toUpperCase().trim();
  if (TEAM_CODE_OVERRIDES[tla]) return TEAM_CODE_OVERRIDES[tla];
  if (tla && codeSet.has(tla)) return tla;

  const norm = normalizeName(team.name);
  if (NAME_ALIASES[norm]) return NAME_ALIASES[norm];
  const byName = nameToCode.get(norm);
  if (byName) return byName;

  return tla;
}
