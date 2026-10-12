import { h } from '../dom.js';
import { dayKey, diffDays } from '../../core/dates.js';
import { homeStatus, monthCount, dailyCount, totalCount, backupDue, whyCheckDue, lastBloc3 } from '../../core/progress.js';
import { voiceCheckDue } from '../../core/voice-plan.js';
import { weeklyPointDue } from '../../core/weekly-point.js';
import { bilanDue, bilanControlDue, bilanAnnouncement } from '../../core/bilan-plan.js';
import { rdvExitCandidate, pendingRdvReturn, rdvStarted, rdvQuestionIds, exitRdv, RDV_EXIT_WINDOW_MS } from '../../core/rdv.js';
import { nextBloc3 } from '../../core/planner.js';
import { homeLine, goLabel, goSubtitle, plural, textsFor } from '../../core/texts.js';
import { programGoal } from '../../core/dashboard.js';
import { ofProfil, PROFIL_CHOICES } from '../../core/profil.js';
import {
  homeBubble, stablePick, motivationLines, humeurFor, stade6PlusToday, displayedStage, nextStadeMax, souvenirs, mergeSouvenirs, memoSouvenirs,
} from '../../core/louarn.js';
import { createRdvCard } from '../components/rdv-card.js';
import { createBulle, createFox } from '../components/fox.js';

/**
 * Louarn sur l'accueil (G §2.1-2.2, maquette §5.1) : le stade en pied à 96 px et sa bulle, à la place de
 * la ligne de contexte. Carte affichée : il se tait. Mode discret ou aucune réplique : la ligne d'origine.
 */
async function louarnLine({ repo, content, sessions, mineS, allRecordings, card, status, due, why, seed, today, now, announce }) {
  // Le stade suit le cumul de toutes les séances et ne redescend jamais (meta louarn.stadeMax) ; le bloc
  // du programme suit les séances du profil.
  const daily = dailyCount(sessions);
  const goal = programGoal(content.program);
  const stadeMax = await repo.getMeta('louarn.stadeMax', 0);
  const stage = displayedStage({ total: daily, goal, stadeMax }).stage.id;
  try {
    const max = nextStadeMax(stadeMax, daily, goal);
    const writes = [];
    if (max !== stadeMax) writes.push(repo.setMeta('louarn.stadeMax', max));
    // Les souvenirs obtenus sont mémorisés : un changement de profil ne les efface jamais.
    const stored = await repo.getMeta('louarn.souvenirs', []);
    const memo = memoSouvenirs(mergeSouvenirs(stored, souvenirs(sessions, allRecordings, { goal, profil: content.profil })));
    if (JSON.stringify(memo) !== JSON.stringify(stored ?? [])) writes.push(repo.setMeta('louarn.souvenirs', memo));
    await Promise.all(writes);
  } catch (e) {
    console.error(e);
  }
  const plain = () => h('div', { class: 'lo-bulle-wrap' }, createFox({ stage, size: 96 }),
    h('p', { class: 'context' }, homeLine({ ...status, voiceDue: due, why, motivations: content.motivations, seed })));
  const silent = () => createBulle({ texte: null, stage });
  try {
    const [discret, vus, jour, shownOn] = await Promise.all([
      repo.getMeta('renardDiscret', false), repo.getMeta('louarn.vus', []),
      repo.getMeta('louarn.jour', {}), repo.getMeta('louarn.stade6Jour', null),
    ]);
    const b = homeBubble({
      cardShown: Boolean(card), discret, status, voiceDue: due, dailyCount: dailyCount(mineS), total: daily, why, seed,
      hour: new Date(now).getHours(), bloc3: nextBloc3(lastBloc3(sessions)),
      stade6Plus: stade6PlusToday({ dailyCount: daily, shownOn, todayKey: today, goal }),
      weeks: content.program.weeks.length, profil: content.profil,
    });
    if (card) return silent();
    // Bilan annoncé la veille et le jour même (spec V2 §7), y compris en mode discret : c'est une information.
    if (announce) return createBulle({ texte: announce, stage, humeur: humeurFor('jalon') });
    if (!b) return plain();
    if (b.moment === 'pourquoi') return createBulle({ texte: `Ton pourquoi : « ${why} »`, stage });
    const lines = content.louarn?.repliques;
    if (!lines?.length) return plain();
    const r = stablePick([...lines, ...motivationLines(content.motivations)], { ...b, dayKey: today, scope: 'accueil' },
      { memo: jour?.accueil ?? null, vus: vus ?? [] });
    if (!r.line) return plain();
    if (r.changed) await Promise.all([repo.setMeta('louarn.vus', r.vus), repo.setMeta('louarn.jour', { ...jour, accueil: r.memo })]);
    if (b.moment === 'stade' && shownOn == null) await repo.setMeta('louarn.stade6Jour', today);
    return createBulle({ texte: r.line.texte, stage, humeur: humeurFor(b.moment) });
  } catch (e) {
    console.error(e);
    return card ? silent() : plain();
  }
}

/** « Je sors du RDV » : l'heure de sortie donne la durée réelle, puis les questions arrivent aussitôt. */
function exitButton(exit, { repo, navigate, texts }) {
  const btn = h('button', {
    class: 'btn btn-out',
    onclick: async () => {
      btn.disabled = true;
      try {
        // Version stockée : la carte a pu commencer le retour entre-temps, la durée devient alors déclarée.
        // Écran resté ouvert au-delà des 4 h : le tap est ignoré, l'accueil se redessine avec la carte.
        const fresh = (await repo.getSession(exit.id)) ?? exit;
        const now = Date.now();
        if (fresh.rdvEndedAt == null && !rdvStarted(fresh) && now - fresh.endedAt < RDV_EXIT_WINDOW_MS) {
          await repo.saveSession(exitRdv(fresh, now));
        }
      } catch (e) {
        console.error(e);
      }
      navigate('/home');
    },
  }, h('span', {}, texts.rdvExit), h('small', {}, `${plural(rdvQuestionIds(exit).length, 'question')} au plus, environ 15 secondes`));
  return btn;
}

/**
 * Utilisateur d'avant les profils (onboarded, sans meta profil) : une carte unique, qui bloque l'accueil
 * jusqu'à la réponse. Pro ne change rien ; les séances sont gardées dans tous les cas.
 */
function profilCard({ applyProfil, navigate }) {
  let busy = false;
  const pick = async (value) => {
    if (busy) return;
    busy = true;
    try {
      await applyProfil(value);
    } catch (e) {
      console.error(e);
      busy = false;
      return;
    }
    navigate('/home', { replace: true });
  };
  return h('div', { class: 'home' },
    h('div', { class: 'card profil-card' },
      h('p', { class: 'rdv-q' }, 'Ton profil ?'),
      h('p', { class: 'muted small' }, 'Une seule fois. Tu pourras le changer dans les Réglages.'),
      h('div', { class: 'answers' }, PROFIL_CHOICES.map((c) => h('button', { class: 'btn-answer', onclick: () => pick(c.value) },
        h('span', {}, c.label), h('small', {}, c.hint))))));
}

export async function render(root, { repo, content, navigate, needsProfil = false, applyProfil }) {
  if (needsProfil) {
    root.replaceChildren(profilCard({ applyProfil, navigate }));
    return undefined;
  }
  const now = Date.now();
  const today = dayKey(now);
  const [y, m] = today.split('-').map(Number);
  const [sessions, allRecordings, why, lastBackupAt, lastWhyCheck] = await Promise.all([
    repo.listSessions(), repo.listRecordings(), repo.getMeta('why', ''),
    repo.getMeta('lastBackupAt', null), repo.getMeta('lastWhyCheck', 0),
  ]);
  // La mesure de la voix est propre au profil : un profil déjà utilisé la retrouve (spec profils §2).
  const recordings = ofProfil(allRecordings, content.profil);
  const texts = textsFor(content.profil);
  const status = homeStatus(sessions, today);
  // Programme, bilans et point de la semaine suivent les séances du profil : un nouveau profil commence au
  // début, un profil déjà utilisé reprend où il en était (relecture du 12/10). En Pro : toutes les séances.
  const mineS = ofProfil(sessions, content.profil);
  const n = dailyCount(mineS) + 1;
  // Bilan du jour (il remplace la séance) ou, sinon, mesure de la voix due (calibration ou contrôle).
  const contentReady = Boolean(content.mesure?.textesInedits?.length);
  const knownTexts = (content.mesure?.textesInedits ?? []).map((t) => t.id);
  const bilanNext = bilanDue({ sessionNumber: n, sessions: mineS, comeback: status.comeback, contentReady });
  const bilanToday = bilanNext ? 'bilan'
    : !status.comeback && bilanControlDue({ sessionNumber: n, sessions: mineS, contentReady, knownTexts }) ? 'controle' : null;
  const due = bilanToday ? null : voiceCheckDue(recordings, dailyCount(mineS), { todayKey: today });
  // La veille (séance d'avant faite) ou le jour même ; rien un jour de reprise ; un bilan reporté est annoncé.
  const pendingToday = sessions.some((x) => x.dateKey === today && x.bilan?.kind === 'bilan' && x.bilan.complete === false);
  const announce = bilanAnnouncement({ due: bilanNext, doneToday: status.doneToday, pendingToday });
  const total = totalCount(sessions);
  const seed = diffDays('2026-01-01', today);

  let card = null;
  let rdvCard = null;
  const exit = rdvExitCandidate(sessions, now);
  const rdvPending = pendingRdvReturn(sessions, now);
  if (rdvPending) {
    rdvCard = createRdvCard({ session: rdvPending, repo, onDone: () => navigate('/home') });
    card = rdvCard.el;
  } else if (why && whyCheckDue(total, lastWhyCheck)) {
    card = h('div', { class: 'card' },
      h('p', {}, 'Ton pourquoi tient toujours ?'),
      h('p', { class: 'why' }, `« ${why} »`),
      h('div', { class: 'row' },
        h('button', { class: 'btn-small', onclick: async () => { await repo.setMeta('lastWhyCheck', total); navigate('/home'); } }, 'Oui'),
        h('button', { class: 'btn-small', onclick: async () => { await repo.setMeta('lastWhyCheck', total); navigate('/settings'); } }, 'Je le reformule')));
  }

  const louarn = await louarnLine({ repo, content, sessions, mineS, allRecordings, card, status, due, why, seed, today, now, announce });

  root.replaceChildren(h('div', { class: 'home' },
    h('header', { class: 'top' },
      h('a', { class: 'count', href: '#/progress' }, `${plural(monthCount(sessions, y, m), 'jour')} ce mois-ci ›`),
      h('a', { class: 'gear', href: '#/settings', 'aria-label': 'Réglages' }, '⚙')),
    louarn,
    card,
    backupDue(lastBackupAt, now, total) ? h('a', { class: 'backup-line', href: '#/settings' }, 'Pense à sauvegarder tes données ›') : null,
    h('div', { class: 'actions' },
      exit ? exitButton(exit, { repo, navigate, texts }) : null,
      h('a', { class: status.doneToday ? 'btn btn-calm' : 'btn btn-go', href: '#/session/daily' },
        h('span', {}, goLabel({ ...status, bilan: bilanToday })),
        h('small', {}, goSubtitle({
          comeback: status.comeback, voiceDue: due, bloc3: nextBloc3(lastBloc3(sessions)), bilan: bilanToday,
          point: !bilanToday && contentReady && Boolean(weeklyPointDue({ sessionNumber: n, sessions: mineS, voiceCheck: due, comeback: status.comeback })),
        }))),
      h('a', { class: 'btn btn-rdv', href: '#/session/prerdv' }, texts.rdvButton))));
  return () => rdvCard?.destroy();
}
