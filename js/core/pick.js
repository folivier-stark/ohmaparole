/** Hash FNV-1a 32 bits, stable. */
export function hashString(s) {
  let h = 2166136261;
  for (const ch of s) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Choisit le candidat joué le moins récemment.
 * history : ids, le plus récent en premier. Départage par hash(seed:id).
 */
export function pickLeastRecent(candidates, history, seed) {
  if (!candidates.length) throw new Error('pickLeastRecent : aucun candidat');
  const rank = (id) => {
    const i = history.indexOf(id);
    return i === -1 ? Infinity : i;
  };
  const scored = candidates.map((c) => ({ c, r: rank(c.id), t: hashString(`${seed}:${c.id}`) }));
  scored.sort((a, b) => (b.r - a.r) || (a.t - b.t));
  return scored[0].c;
}
