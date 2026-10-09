import { h } from '../dom.js';
import { dayKey, diffDays } from '../../core/dates.js';
import {
  homeStatus, monthCount, dailyCount, totalCount, dueMilestone, referenceMilestones,
  backupDue, whyCheckDue, lastBloc3,
} from '../../core/progress.js';
import { rdvExitCandidate, pendingRdvReturn, rdvStarted, rdvQuestionIds, exitRdv } from '../../core/rdv.js';
import { nextBloc3 } from '../../core/planner.js';
import { homeLine, goLabel, goSubtitle, plural } from '../../core/texts.js';
import { createRdvCard } from '../components/rdv-card.js';

/** « Je sors du RDV » : l'heure de sortie donne la durée réelle, puis les questions arrivent aussitôt. */
function exitButton(exit, { repo, navigate }) {
  const btn = h('button', {
    class: 'btn btn-out',
    onclick: async () => {
      btn.disabled = true;
      try {
        // Version stockée : la carte a pu commencer le retour entre-temps, la durée devient alors déclarée.
        const fresh = (await repo.getSession(exit.id)) ?? exit;
        if (fresh.rdvEndedAt == null && !rdvStarted(fresh)) await repo.saveSession(exitRdv(fresh, Date.now()));
      } catch (e) {
        console.error(e);
      }
      navigate('/home');
    },
  }, h('span', {}, 'Je sors du RDV'), h('small', {}, `${rdvQuestionIds(exit).length} questions, environ 15 secondes`));
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

  root.replaceChildren(h('div', { class: 'home' },
    h('header', { class: 'top' },
      h('a', { class: 'count', href: '#/progress' }, `${plural(monthCount(sessions, y, m), 'jour')} ce mois-ci ›`),
      h('a', { class: 'gear', href: '#/settings', 'aria-label': 'Réglages' }, '⚙')),
    h('p', { class: 'context' }, homeLine({ ...status, dueMilestone: due, why, motivations: content.motivations, seed })),
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
