import { h } from '../dom.js';
import { dayKey, diffDays } from '../../core/dates.js';
import {
  homeStatus, monthCount, dailyCount, totalCount, dueMilestone, referenceMilestones,
  backupDue, whyCheckDue, lastBloc3,
} from '../../core/progress.js';
import { rdvExitCandidate, pendingRdvReturn, rdvStarted, rdvQuestionIds, exitRdv, RDV_EXIT_WINDOW_MS } from '../../core/rdv.js';
import { nextBloc3 } from '../../core/planner.js';
import { homeLine, goLabel, goSubtitle, plural } from '../../core/texts.js';
import { homeBubble, stablePick, motivationLines, stageFor, humeurFor, stade6PlusToday } from '../../core/louarn.js';
import { createRdvCard } from '../components/rdv-card.js';
import { createBulle, createFox } from '../components/fox.js';

/**
 * Louarn sur l'accueil (G §2.1-2.2, maquette §5.1) : le stade en pied à 96 px et sa bulle, à la place de
 * la ligne de contexte. Carte affichée : il se tait. Mode discret ou aucune réplique : la ligne d'origine.
 */
async function louarnLine({ repo, content, sessions, card, status, due, why, seed, today, now }) {
  const daily = dailyCount(sessions);
  const stage = stageFor(daily).id;
  const plain = () => h('div', { class: 'lo-bulle-wrap' }, createFox({ stage, size: 96 }),
    h('p', { class: 'context' }, homeLine({ ...status, dueMilestone: due, why, motivations: content.motivations, seed })));
  const silent = () => createBulle({ texte: null, stage });
  try {
    const [discret, vus, jour, shownOn] = await Promise.all([
      repo.getMeta('renardDiscret', false), repo.getMeta('louarn.vus', []),
      repo.getMeta('louarn.jour', {}), repo.getMeta('louarn.stade6Jour', null),
    ]);
    const b = homeBubble({
      cardShown: Boolean(card), discret, status, dueMilestone: due, dailyCount: daily, why, seed,
      hour: new Date(now).getHours(), bloc3: nextBloc3(lastBloc3(sessions)),
      stade6Plus: stade6PlusToday({ dailyCount: daily, shownOn, todayKey: today }),
    });
    if (card) return silent();
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
function exitButton(exit, { repo, navigate }) {
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
  }, h('span', {}, 'Je sors du RDV'), h('small', {}, `${rdvQuestionIds(exit).length} questions au plus, environ 15 secondes`));
  return btn;
}

export async function render(root, { repo, content, navigate }) {
  const now = Date.now();
  const today = dayKey(now);
  const [y, m] = today.split('-').map(Number);
  const [sessions, recordings, why, lastBackupAt, lastWhyCheck] = await Promise.all([
    repo.listSessions(), repo.listRecordings(), repo.getMeta('why', ''),
    repo.getMeta('lastBackupAt', null), repo.getMeta('lastWhyCheck', 0),
  ]);
  const status = homeStatus(sessions, today);
  const due = dueMilestone(dailyCount(sessions) + 1, referenceMilestones(recordings));
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

  const louarn = await louarnLine({ repo, content, sessions, card, status, due, why, seed, today, now });

  root.replaceChildren(h('div', { class: 'home' },
    h('header', { class: 'top' },
      h('a', { class: 'count', href: '#/progress' }, `${plural(monthCount(sessions, y, m), 'jour')} ce mois-ci ›`),
      h('a', { class: 'gear', href: '#/settings', 'aria-label': 'Réglages' }, '⚙')),
    louarn,
    card,
    backupDue(lastBackupAt, now, total) ? h('a', { class: 'backup-line', href: '#/settings' }, 'Pense à sauvegarder tes données ›') : null,
    h('div', { class: 'actions' },
      exit ? exitButton(exit, { repo, navigate }) : null,
      h('a', { class: status.doneToday ? 'btn btn-calm' : 'btn btn-go', href: '#/session/daily' },
        h('span', {}, goLabel(status)),
        h('small', {}, goSubtitle({ comeback: status.comeback, dueMilestone: due, bloc3: nextBloc3(lastBloc3(sessions)) }))),
      h('a', { class: 'btn btn-rdv', href: '#/session/prerdv' }, 'Avant un rendez-vous · 90 s'))));
  return () => rdvCard?.destroy();
}
