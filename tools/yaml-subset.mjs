// Parseur volontairement limité au format de docs/experts/expert-contenu.md.
// Un vrai parseur YAML lirait « - Lentement : chaque t » comme un objet : on évite.

const unquote = (v) => {
  const t = v.trim();
  if (t.startsWith('"') && t.endsWith('"')) return JSON.parse(t);
  if (t.startsWith("'") && t.endsWith("'")) return t.slice(1, -1).replace(/''/g, "'");
  return t;
};

const scalar = (v) => {
  const t = v.trim();
  if (t === 'null' || t === '~' || t === '') return null;
  if (/^-?\d+$/.test(t)) return Number(t);
  return unquote(t);
};

export function extractYamlBlocks(md) {
  return [...md.matchAll(/```yaml\r?\n([\s\S]*?)```/g)].map((m) => m[1].trimEnd()).join('\n');
}

export function parseYamlSubset(text) {
  const items = [];
  const consignes = [];
  let section = 'items';
  let cur = null;
  let key = null;
  let mode = null;

  text.split(/\r?\n/).forEach((line, i) => {
    const fail = () => { throw new Error(`Ligne ${i + 1} non reconnue : ${line}`); };
    if (/^\s*#/.test(line) || line.trim() === '') return;
    let m;
    if ((m = line.match(/^- id: (.+)$/))) {
      section = 'items';
      cur = { id: scalar(m[1]) };
      items.push(cur);
      mode = null;
      return;
    }
    if (/^consignes_ecoute:\s*$/.test(line)) {
      section = 'consignes';
      cur = null;
      mode = null;
      return;
    }
    if (section === 'consignes') {
      if ((m = line.match(/^ {2}- id: (.+)$/))) {
        cur = { id: scalar(m[1]) };
        consignes.push(cur);
        return;
      }
      if (cur && (m = line.match(/^ {4}(\w+): (.*)$/))) {
        cur[m[1]] = scalar(m[2]);
        return;
      }
      fail();
    }
    if (!cur) fail();
    if ((m = line.match(/^ {2}(\w+):\s*>\s*$/))) { key = m[1]; mode = 'folded'; cur[key] = ''; return; }
    if ((m = line.match(/^ {2}(\w+):\s*$/))) { key = m[1]; mode = 'list'; cur[key] = []; return; }
    if ((m = line.match(/^ {2}(\w+): (.*)$/))) { cur[m[1]] = scalar(m[2]); mode = null; return; }
    if (mode === 'list' && (m = line.match(/^ {4}- (.*)$/))) { cur[key].push(unquote(m[1])); return; }
    if (mode === 'folded' && (m = line.match(/^ {4}(\S.*)$/))) {
      cur[key] = cur[key] ? `${cur[key]} ${m[1].trim()}` : m[1].trim();
      return;
    }
    fail();
  });
  return { items, consignes };
}
