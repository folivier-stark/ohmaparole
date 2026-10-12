import { h } from '../dom.js';
import { dayKey } from '../../core/dates.js';
import { variant, plural, FIN_PARTIELLE, voiceEndMessage, textsFor } from '../../core/texts.js';
import { programGoal } from '../../core/dashboard.js';
import { ofProfil } from '../../core/profil.js';
import { dailyCount } from '../../core/progress.js';
import { voiceJalonTag, calibrationRemaining, sessionsUntilControl, abPair } from '../../core/voice-plan.js';
import {
  stagesFor, sessionCounts, souvenirs, endCelebration, stablePick, pickLine, rememberLine, stageFor, humeurFor,
} from '../../core/louarn.js';
import { createPlayer } from '../../audio/player.js';
import { createCompare } from '../components/compare.js';
import { createBulle, createFox, createStageUp, reducedMotion } from '../components/fox.js';
import { createMiniSentier } from '../components/parcours.js';

/**
 * Louarn à la fin d'une séance (G §2.2, §4.4, maquettes §5.3 et §5.4) : une seule bulle, à la place du
 * message de fin. Montée de stade, souvenirs et thème se fêtent aussi en mode discret, sans animation.
 * Sans réplique (mode discret, ou louarn.json absent) : le message de fin d'origine, en texte simple.
 */
async function louarnEnd({ repo, content, s, sessions, recs, voiceRecs }) {
  const fallback = s.completed ? variant(textsFor(content.profil).FIN, s.sessionNumber ?? 0) : FIN_PARTIELLE;
  const counts = sessionCounts(sessions, s);
  const goal = programGoal(content.program);
  const stage = stageFor(counts.newCount, goal).id;
  const [discret, fetes, vus, jour] = await Promise.all([
    repo.getMeta('renardDiscret', false), repo.getMeta('louarn.fetes', []),
    repo.getMeta('louarn.vus', []), repo.getMeta('louarn.jour', {}),
  ]);
  const c = endCelebration({
    ...counts, session: s, souvenirs: souvenirs(sessions, recs, { goal, profil: content.profil }), fetes: fetes ?? [],
    todayKey: dayKey(Date.now()), hour: new Date().getHours(), discret, jalon: voiceJalonTag(s, voiceRecs),
    sessionsPerWeek: content.program.sessionsPerWeek ?? 4, weeks: content.program.weeks.length, profil: content.profil,
  });
  const lines = content.louarn?.repliques ?? [];
  const writes = [];
  if (c.fetes.length !== (fetes ?? []).length) writes.push(repo.setMeta('louarn.fetes', c.fetes));

  let seen = vus ?? [];
  let texte = null;
  if (c.bubble) {
    const r = stablePick(lines, { ...c.bubble, dayKey: s.dateKey, scope: s.id }, { memo: jour?.fin ?? null, vus: seen });
    if (r.line) texte = r.line.texte;
    if (r.changed) { seen = r.vus; writes.push(repo.setMeta('louarn.jour', { ...jour, fin: r.memo })); }
  }
  // Fins de bloc : la réplique du nouveau bloc (ou des langues) sous la bulle de stade.
  const second = c.secondary ? pickLine(lines, { ...c.secondary, dayKey: s.dateKey, recentIds: seen }) : null;
  if (second) seen = rememberLine(seen, second.id);
  if (seen !== vus) writes.push(repo.setMeta('louarn.vus', seen));
  await Promise.all(writes);

  const nodes = [];
  if (c.stage) {
    // Maquette §5.4 : le stade grandit, son nom, puis la bulle (pointe vers le renard).
    nodes.push(h('div', { class: 'lo-bulle-wrap lo-bulle-colonne' },
      createStageUp({ from: c.stage.from, to: c.stage.to, animate: !discret }),
      h('p', { class: 'lo-stade-nom' }, stagesFor(goal)[c.stage.to - 1].nom),
      texte ? h('p', { class: 'lo-bulle' }, texte) : h('p', { class: 'end-msg' }, fallback)));
  } else if (texte) {
    nodes.push(createBulle({
      texte, stage, humeur: humeurFor(c.bubble.moment), vertical: true, size: 120, animate: discret ? null : 'saut',
    }));
  } else {
    nodes.push(h('div', { class: 'lo-bulle-wrap lo-bulle-colonne' },
      createFox({ stage, humeur: 'content', size: 120 }),
      h('p', { class: 'end-msg' }, fallback)));
  }
  if (second) nodes.push(h('p', { class: 'lo-suite' }, second.texte));
  const appear = !discret && !reducedMotion();
  for (const sv of c.celebrate) {
    nodes.push(h('p', { class: appear ? 'lo-souvenir lo-nouveau lo-apparait' : 'lo-souvenir lo-nouveau' },
      createFox({ stage: 'portrait', size: 32, humeur: 'content', decorative: true }),
      h('span', {}, 'Nouveau souvenir : ', h('strong', {}, sv.nom))));
  }
  if (c.next) nodes.push(h('p', { class: 'lo-suite muted' }, `Prochain : ${c.next.stage.nom}, dans ${plural(c.next.remaining, 'séance')}`));
  if (c.miniSentier) nodes.push(createMiniSentier({ dailyCount: counts.newCount, program: content.program, animate: !discret }));
  return nodes;
}

export async function render(root, { repo, content, navigate, params }) {
  const s = await repo.getSession(params[0]);
  if (!s) { navigate('/home'); return; }
  const [recs, sessions] = await Promise.all([repo.listRecordings(), repo.listSessions()]);
  const mine = recs.filter((r) => r.sessionId === s.id);
  // La mesure de la voix est propre au profil, depuis le dernier changement ; les souvenirs, eux, ne se perdent pas.
  const voiceRecs = ofProfil(recs, content.profil, content.profilSince);
  const cleanups = [];
  let louarn;
  try {
    louarn = await louarnEnd({ repo, content, s, sessions, recs, voiceRecs });
  } catch (e) {
    console.error(e);
    louarn = [h('p', { class: 'end-msg' }, s.completed ? variant(textsFor(content.profil).FIN, s.sessionNumber ?? 0) : FIN_PARTIELLE)];
  }
  const children = [h('div', { class: 'dot-fill' }), ...louarn];

  const take = mine.at(-1);
  if (take) {
    const player = createPlayer();
    cleanups.push(() => player.stop());
    children.push(h('button', { class: 'btn-secondary', onclick: async () => player.play(await repo.getAudio(take.id)) }, '▶ Réécouter ta prise du jour'));
  }

  // Bloc « Mesure de ta voix » (spec V2 §4) : où en est la calibration, et l'A/B après un contrôle.
  if (s.voiceCheck) {
    const validTakes = mine.filter((r) => r.kind === 'reference' && r.voiceCheck).length;
    children.push(h('p', { class: 'milestone' }, voiceEndMessage({
      voiceCheck: s.voiceCheck, validTakes, calibrationRemaining: calibrationRemaining(voiceRecs),
      untilControl: sessionsUntilControl(voiceRecs, dailyCount(sessions)),
    })));
    const pair = s.voiceCheck === 'controle' && validTakes >= 2 ? abPair(voiceRecs) : null;
    if (pair) {
      const cmp = await createCompare({ repo, a: pair.a, b: pair.b, labelA: pair.labelA, labelB: pair.labelB });
      if (cmp) { children.push(cmp.el); cleanups.push(cmp.destroy); }
    }
  }

  if ((s.sessionNumber ?? 0) >= 3 && !(await repo.getMeta('clinicalNoteShown', false))) {
    await repo.setMeta('clinicalNoteShown', true);
    children.push(h('div', { class: 'card' }, h('p', { class: 'label' }, 'À savoir'), h('p', {}, content.extras.noteClinique)));
  }

  children.push(h('button', { class: 'btn btn-go', onclick: () => navigate('/home', { replace: true }) }, 'Fermer'));
  root.replaceChildren(h('div', { class: 'end' }, children));
  return () => cleanups.forEach((f) => f());
}
