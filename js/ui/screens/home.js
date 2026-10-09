import { h } from '../dom.js';
import { dayKey, diffDays } from '../../core/dates.js';
import {
  homeStatus, monthCount, dailyCount, totalCount, dueMilestone, referenceMilestones,
  pendingFeedback, backupDue, whyCheckDue, lastBloc3,
} from '../../core/progress.js';
import { nextBloc3 } from '../../core/planner.js';
import { homeLine, goLabel, goSubtitle, plural } from '../../core/texts.js';

const FEEDBACK = [['non', 'Non'], ['une', 'Une fois'], ['plusieurs', 'Plusieurs fois']];

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
  const fb = pendingFeedback(sessions, now);
  if (fb) {
    card = h('div', { class: 'card' },
      h('p', {}, 'Ton dernier rendez-vous : on t’a fait répéter ?'),
      h('div', { class: 'row' }, FEEDBACK.map(([v, label]) => h('button', {
        class: 'btn-small',
        onclick: async () => { await repo.saveSession({ ...fb, feedback: v }); navigate('/home'); },
      }, label))),
      h('button', { class: 'btn-link', onclick: async () => { await repo.saveSession({ ...fb, feedbackSkipped: true }); navigate('/home'); } }, 'Passer'));
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
      h('a', { class: 'btn btn-go', href: '#/session/daily' },
        h('span', {}, goLabel(status)),
        h('small', {}, goSubtitle({ comeback: status.comeback, dueMilestone: due, bloc3: nextBloc3(lastBloc3(sessions)) }))),
      h('a', { class: 'btn btn-rdv', href: '#/session/prerdv' }, 'Avant un rendez-vous · 90 s'))));
}
