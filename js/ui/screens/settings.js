import { h } from '../dom.js';
import { dayKey } from '../../core/dates.js';
import { calendarUrl, alarmLabel } from '../../core/reminder.js';
import { exportAll, readBackup, importBackup } from '../../data/backup.js';
import { setSpeechEnabled } from '../../platform/speech.js';
import { setHapticsEnabled } from '../../platform/haptics.js';
import { storageStatus } from '../../platform/storage.js';
import { APP_VERSION } from '../../version.js';
import { createFox } from '../components/fox.js';
import { PROFIL_CHOICES, PROFIL_CHANGE_WARNING, profilLine } from '../../core/profil.js';

const section = (title, ...children) => h('section', {}, h('h2', {}, title), children);

function checkbox(label, checked, onChange) {
  const input = h('input', { type: 'checkbox', checked, onchange: () => onChange(input.checked) });
  return h('label', { class: 'check' }, input, label);
}

/**
 * « Ton profil » (spec profils §2) : le profil actuel, et les deux autres. Avant de changer, une confirmation
 * sur place : la mesure de la voix repart de zéro, les séances sont gardées.
 */
function profilSection({ content, applyProfil, navigate }) {
  const current = PROFIL_CHOICES.find((c) => c.value === content.profil) ?? PROFIL_CHOICES[0];
  const box = h('div', { class: 'stack' });
  const list = () => box.replaceChildren(
    h('p', {}, h('strong', {}, current.label), ` · ${current.hint}`),
    ...PROFIL_CHOICES.filter((c) => c.value !== current.value).map((c) => h('button', { class: 'btn-secondary', onclick: () => ask(c) }, `Passer en ${profilLine(c)}`)));
  const ask = (c) => box.replaceChildren(
    h('p', {}, `Passer en ${c.label} ?`),
    h('p', { class: 'muted' }, PROFIL_CHANGE_WARNING),
    h('div', { class: 'row' },
      h('button', {
        class: 'btn-small',
        onclick: async (e) => {
          e.currentTarget.disabled = true;
          try {
            await applyProfil(c.value);
            navigate('/settings', { replace: true });
          } catch (err) {
            console.error(err);
            list();
          }
        },
      }, 'Changer'),
      h('button', { class: 'btn-small', onclick: list }, 'Annuler')));
  list();
  return box;
}

export async function render(root, { repo, content, applyProfil, navigate }) {
  const [why, objective, prefs, lastBackupAt, discret] = await Promise.all([
    repo.getMeta('why', ''), repo.getMeta('objective', content.extras.objectifDefaut),
    repo.getSettings(), repo.getMeta('lastBackupAt', null), repo.getMeta('renardDiscret', false),
  ]);
  const appUrl = location.origin + location.pathname;

  const objField = h('input', { class: 'field', type: 'text', value: objective });
  const whyField = h('textarea', { class: 'field', rows: 3 });
  whyField.value = why;
  const savedNote = h('p', { class: 'muted' });

  const time = h('input', { class: 'field', type: 'time', value: prefs.reminderTime });
  time.addEventListener('change', async () => { prefs.reminderTime = time.value || '08:30'; await repo.setMeta('settings', prefs); });
  const reminderNote = h('p', { class: 'muted' });

  const backupInfo = h('p', { class: 'muted' }, lastBackupAt
    ? `Dernière sauvegarde : ${new Date(lastBackupAt).toLocaleDateString('fr-FR')}`
    : 'Aucune sauvegarde pour l’instant.');
  const fileInput = h('input', {
    type: 'file', accept: '.json,application/json', hidden: true,
    onchange: async () => {
      const file = fileInput.files[0];
      if (!file) return;
      try {
        const p = await readBackup(file);
        if (!confirm(`${p.data.sessions.length} séances et ${p.data.recordings.length} enregistrements : importer ?`)) return;
        const r = await importBackup(p);
        backupInfo.textContent = `Restauré : ${r.sessions} séances, ${r.recordings} enregistrements.`;
        // Le plus sûr : on repart d'un démarrage propre (profil restauré, contenu, réanalyse des mesures de la voix).
        setTimeout(() => location.reload(), 800);
      } catch (e) {
        backupInfo.textContent = e.message;
      }
    },
  });

  async function doExport() {
    backupInfo.textContent = 'Préparation…';
    const blob = await exportAll(APP_VERSION);
    const name = `ohmaparole-sauvegarde-${dayKey(Date.now())}.json`;
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    await repo.setMeta('lastBackupAt', Date.now());
    backupInfo.textContent = `Enregistré dans Téléchargements : ${name}`;
  }

  const storageInfo = h('p', { class: 'muted' }, '…');
  storageStatus().then(({ persisted, usedMb }) => {
    storageInfo.textContent = `Stockage protégé : ${persisted ? 'oui' : 'non'} · ${usedMb} Mo utilisés`;
  });

  root.replaceChildren(h('div', { class: 'settings' },
    h('a', { class: 'back', href: '#/home' }, '‹ Accueil'),
    h('h1', {}, 'Réglages'),
    section('Ton profil', profilSection({ content, applyProfil, navigate })),
    section('Ton objectif et ton pourquoi',
      h('label', { class: 'label' }, 'Objectif'), objField,
      h('label', { class: 'label' }, 'Pourquoi'), whyField,
      h('button', {
        class: 'btn-secondary',
        onclick: async () => {
          await repo.setMeta('objective', objField.value.trim());
          await repo.setMeta('why', whyField.value.trim());
          savedNote.textContent = 'Enregistré.';
        },
      }, 'Enregistrer'),
      savedNote),
    section('Rappel quotidien',
      time,
      h('a', {
        class: 'btn-secondary', href: '#', target: '_blank', rel: 'noopener',
        onclick: (e) => { e.currentTarget.href = calendarUrl({ dateKey: dayKey(Date.now()), time: time.value || '08:30', why: whyField.value, appUrl }); },
      }, 'Créer le rappel dans Google Agenda'),
      h('button', {
        class: 'btn-link',
        onclick: async () => {
          try { await navigator.clipboard.writeText(alarmLabel(whyField.value)); reminderNote.textContent = 'Nom d’alarme copié.'; } catch { reminderNote.textContent = alarmLabel(whyField.value); }
        },
      }, 'Copier le nom pour une alarme'),
      reminderNote),
    section('Guidage',
      checkbox('Voix de guidage', prefs.voice, async (v) => { prefs.voice = v; setSpeechEnabled(v); await repo.setMeta('settings', prefs); }),
      checkbox('Vibrations', prefs.vibrate, async (v) => { prefs.vibrate = v; setHapticsEnabled(v); await repo.setMeta('settings', prefs); }),
      // G §2.4 : désactivé par défaut. Le stade reste visible, seuls les grands moments parlent.
      checkbox([
        createFox({ stage: 'portrait', size: 32, decorative: true }),
        h('span', {}, 'Renard discret', h('span', { class: 'check-hint' }, 'Il reste là, mais ne parle que pour les grands moments.')),
      ], discret === true, async (v) => { await repo.setMeta('renardDiscret', v); })),
    section('Sauvegarde',
      backupInfo,
      h('button', { class: 'btn-secondary', onclick: doExport }, 'Sauvegarder mes données'),
      h('button', { class: 'btn-link', onclick: () => fileInput.click() }, 'Restaurer une sauvegarde'),
      fileInput),
    section('Stockage', storageInfo),
    section('À savoir',
      h('p', {}, content.extras.noteClinique),
      h('ul', {}, content.extras.gardeFous.map((g) => h('li', {}, g)))),
    h('p', { class: 'muted' }, `OhMaParole · version ${APP_VERSION}`)));
}
