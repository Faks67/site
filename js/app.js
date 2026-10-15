import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/+esm';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';
import { POLE_CONTENT, CATS, CHANNELS, VALUES, QUICK_REACTIONS, EMOJIS } from './data.js';

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

/* ---------- Outils ---------- */
const $ = (s) => document.querySelector(s);
const root = $('#root');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (d) => new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const fmtTime = (d) => new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const pad2 = (n) => String(n).padStart(2, '0');
const isoD = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const parseD = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseD(s); d.setDate(d.getDate() + n); return isoD(d); };
const dayDiff = (a, b) => Math.round((parseD(b) - parseD(a)) / 864e5);
const startOfWeek = (s) => addDays(s, -((parseD(s).getDay() + 6) % 7));
const today = () => isoD(new Date());
function toast(t) { const el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (el.hidden = true), 2600); }
function fail(e) { console.error(e); toast(e?.message ? 'Erreur : ' + e.message : 'Une erreur est survenue'); }

const ICONS = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  org: '<rect x="9" y="3" width="6" height="5" rx="1"/><rect x="3" y="16" width="6" height="5" rx="1"/><rect x="15" y="16" width="6" height="5" rx="1"/><path d="M12 8v4M6 16v-4h12v4"/>',
  pole: '<circle cx="12" cy="12" r="3"/><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="12" cy="20" r="2"/><path d="M7 7l3 3M17 7l-3 3M12 15v3"/>',
  group: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14c3 0 5 2.4 5 5"/>',
  lib: '<path d="M4 4h5v16H4zM10 4h4v16h-4zM15 5l4-1 3 15-4 1z"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  admin: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 4V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21 10h.1a2 2 0 1 1 0 4z"/>',
  up: '<path d="M12 16V4M6 10l6-6 6 6M4 20h16"/>',
  out: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  euro: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M15 9.8a3.2 3.2 0 1 0 0 4.4M8.5 11.3h5M8.5 12.9h5"/>',
  more: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  belloff: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0M3 3l18 18"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  send: '<path d="M4 12l16-8-6 16-2.5-6.5z"/>'
};
const ico = (k, size) => `<svg viewBox="0 0 24 24" ${size ? `style="width:${size}px;height:${size}px"` : ''} fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k]}</svg>`;

/* ---------- État ---------- */
const S = {
  session: null, me: null,
  members: [], groups: [], poles: [], docs: [], events: [], invitations: [],
  msgs: {}, thumbs: {},
  view: 'accueil', poleTab: 'peda', libCat: 'all', libQ: '', upPole: '', chan: 'annonces',
  reacts: {}, reactPicker: null, emojiOpen: false, push: 'inconnu',
  uploading: '', realtime: null,
  calView: 'mois', calDate: '', calSel: '', evModal: null, calScroll: null, moreOpen: false,
  mapGroups: [], mapPeriod: 90, mapState: null, mapFocus: null,
  vitrine: null, vitrineBusy: false,
  reclamations: [], recTab: 'mes', recFilter: 'en_attente', recBusy: false,
  absences: [], notifCh: ['annonces'], unread: {}, sheet: null
};
const member = (id) => S.members.find((m) => m.id === id);
const grp = (id) => S.groups.find((g) => g.id === id);
const pole = (id) => S.poles.find((p) => p.id === id);
const display = (m) => (m ? `${m.title} ${m.first_name}` : 'Ancien membre');
const initial = (m) => (m ? m.first_name.charAt(0).toUpperCase() : '?');
const isDoyenne = (m) => m.role === 'doyenne' || (m.role === 'principale' && m.pole_id);
// Autorisations que l'administrateur peut donner, action par action
const PERMS = [
  ['calendrier', 'Calendrier', 'Ajouter, modifier et supprimer les événements'],
  ['bibliotheque', 'Bibliothèque', "Supprimer n'importe quel document"],
  ['discussion', 'Discussion', "Supprimer n'importe quel message"],
  ['membres', 'Chefs et groupes', "Ajouter et modifier les chefs, leurs e-mails d'accès et les groupes"],
  ['reclamation', 'Réclamations', 'Demander le remboursement de ses achats'],
  ['remboursement', 'Remboursements', 'Voir toutes les réclamations et valider les remboursements']
];
const can = (p) => !!S.me && (S.me.is_admin || (S.me.permissions || []).includes(p));
const canAdminPage = () => can('membres');
const canRecl = () => can('reclamation') || can('remboursement');
const ROLES = { principale: 'Cheffe principale', doyenne: 'Doyenne', chef: 'Chef / cheftaine', stagiaire: 'Stagiaire' };

/* ---------- Connexion ---------- */
let authMode = 'login', authMsg = '', authErr = '';
function vAuth() {
  const titles = { login: 'Connexion', signup: 'Créer mon compte', reset: 'Mot de passe oublié', newpass: 'Nouveau mot de passe' };
  return `<div class="auth"><form class="card" id="authForm" novalidate>
    <div class="logo"><img src="assets/logo.png" alt="Logo des Travailleurs de l'Imam"><h2>Travailleurs de l'Imam</h2><span style="color:var(--muted)">Espace des chefs et cheftaines</span></div>
    <h3>${titles[authMode]}</h3>
    ${authMode === 'signup' ? '<p style="color:var(--muted);font-size:.9rem">Utilisez l\'adresse e-mail qu\'un administrateur a enregistrée pour vous, puis choisissez votre mot de passe.</p>' : ''}
    ${authMode !== 'newpass' ? '<label class="field" for="email">Adresse e-mail<input id="email" type="email" autocomplete="email" required></label>' : ''}
    ${authMode !== 'reset' ? `<label class="field" for="password">Mot de passe${authMode !== 'login' ? ' (8 caractères minimum)' : ''}<input id="password" type="password" autocomplete="${authMode === 'login' ? 'current-password' : 'new-password'}" minlength="8" required></label>` : ''}
    ${authErr ? `<p class="err" role="alert">${esc(authErr)}</p>` : ''}
    ${authMsg ? `<p class="ok">${esc(authMsg)}</p>` : ''}
    <button class="btn primary block" type="submit">${{ login: 'Se connecter', signup: 'Créer mon compte', reset: 'Recevoir un lien par e-mail', newpass: 'Enregistrer' }[authMode]}</button>
    <div class="row" style="justify-content:space-between;font-size:.9rem">
      ${authMode === 'login' ? '<button type="button" class="linkbtn" data-auth="signup">Première visite ? Créer mon compte</button><button type="button" class="linkbtn" data-auth="reset">Mot de passe oublié</button>' : authMode !== 'newpass' ? '<button type="button" class="linkbtn" data-auth="login">J\'ai déjà un compte</button>' : ''}
    </div>
  </form></div>`;
}
function authError(e) {
  const m = (e?.message || '').toLowerCase();
  if (m.includes('invalid login')) return 'E-mail ou mot de passe incorrect.';
  if (m.includes('database error') || m.includes('non autoris')) return "Cette adresse n'est pas encore autorisée. Demandez à un administrateur de vous ajouter.";
  if (m.includes('already registered')) return 'Un compte existe déjà avec cette adresse. Connectez-vous.';
  if (m.includes('password')) return 'Le mot de passe doit contenir au moins 8 caractères.';
  if (m.includes('rate limit')) return 'Trop de tentatives. Réessayez dans quelques minutes.';
  if (m.includes('email not confirmed')) return "Votre adresse n'est pas encore confirmée. Contactez un administrateur.";
  return e?.message || 'Une erreur est survenue.';
}
root.addEventListener('submit', async (e) => {
  if (e.target.id !== 'authForm') return;
  e.preventDefault();
  const email = $('#email')?.value.trim().toLowerCase();
  const password = $('#password')?.value;
  authErr = ''; authMsg = '';
  const btn = e.target.querySelector('button[type=submit]'); btn.disabled = true;
  try {
    if (authMode === 'login') {
      const { error } = await sb.auth.signInWithPassword({ email, password }); if (error) throw error;
    } else if (authMode === 'signup') {
      if ((password || '').length < 8) throw new Error('password');
      const { data, error } = await sb.auth.signUp({ email, password }); if (error) throw error;
      if (!data.session) { authMode = 'login'; authMsg = 'Compte créé. Confirmez votre adresse avec le lien reçu par e-mail, puis connectez-vous.'; }
    } else if (authMode === 'reset') {
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }); if (error) throw error;
      authMsg = 'Si cette adresse est enregistrée, un lien vient de lui être envoyé.';
    } else if (authMode === 'newpass') {
      const { error } = await sb.auth.updateUser({ password }); if (error) throw error;
      authMode = 'login'; toast('Mot de passe enregistré'); await boot(); return;
    }
  } catch (err) { authErr = authError(err); }
  if (!S.session || authMode !== 'login' || authErr || authMsg) render();
});

/* ---------- Chargement des données ---------- */
async function loadAll() {
  const [m, g, p, d, ev] = await Promise.all([
    sb.from('members').select('*').order('first_name'),
    sb.from('groups').select('*').order('sort'),
    sb.from('poles').select('*').order('sort'),
    sb.from('documents').select('*').order('created_at', { ascending: false }),
    sb.from('events').select('*').order('date')
  ]);
  for (const r of [m, g, p, d, ev]) if (r.error) throw r.error;
  S.members = m.data; S.groups = g.data; S.poles = p.data; S.docs = d.data; S.events = ev.data;
  S.me = S.members.find((x) => x.user_id === S.session.user.id) || null;
  if (can('membres')) {
    const inv = await sb.from('invitations').select('*'); if (!inv.error) S.invitations = inv.data;
  }
  if (canRecl()) {
    const rc = await sb.from('reclamations').select('*').order('created_at', { ascending: false }); if (!rc.error) S.reclamations = rc.data;
  } else S.reclamations = [];
  // Mise à jour 6 : en cas d'erreur (script SQL pas encore lancé), on garde les valeurs précédentes
  const [ab, np] = await Promise.all([
    sb.from('event_absences').select('event_id, occ_date, member_id').gte('occ_date', addDays(today(), -62)),
    S.me ? sb.from('notif_prefs').select('channels').eq('member_id', S.me.id).maybeSingle() : null
  ]);
  if (!ab.error) S.absences = ab.data;
  if (np && !np.error) S.notifCh = np.data ? np.data.channels : ['annonces'];
  loadThumbs();
}
// Message clair quand une table de la mise à jour 6 manque encore dans Supabase
const needSql = (e) => (['42P01', 'PGRST205', 'PGRST202', '42883'].includes(e?.code) ? new Error('lancez d\'abord la mise à jour SQL 06 dans Supabase') : e);
async function loadThumbs() {
  const imgs = S.docs.filter((d) => d.mime_type?.startsWith('image/') && !S.thumbs[d.file_path]);
  if (!imgs.length) return;
  const { data } = await sb.storage.from('documents').createSignedUrls(imgs.map((d) => d.file_path), 3600);
  (data || []).forEach((r) => { if (r.signedUrl) S.thumbs[r.path] = r.signedUrl; });
  if (['bibliotheque', 'accueil', 'poles'].includes(S.view)) render();
}
// Photo de l'accueil : rangée dans le stockage privé (dossier « vitrine »), jamais dans les fichiers publics du site.
const VITRINE = 'vitrine';
async function loadVitrine() {
  const { data, error } = await sb.storage.from('documents').list(VITRINE, { limit: 20, sortBy: { column: 'created_at', order: 'desc' } });
  if (error) return;
  const f = (data || []).find((x) => x.id && /\.(png|webp|jpe?g)$/i.test(x.name));
  const path = f ? `${VITRINE}/${f.name}` : null;
  if (path === S.vitrine?.path) return;
  let url = null;
  if (path) { const r = await sb.storage.from('documents').createSignedUrl(path, 7 * 86400); if (r.error) return; url = r.data.signedUrl; }
  S.vitrine = path ? { path, url, all: data.filter((x) => x.id).map((x) => `${VITRINE}/${x.name}`) } : null;
  if (['accueil', 'administration'].includes(S.view) && !userBusy()) render();
}
async function setVitrine(file) {
  if (!/^image\/(png|webp|jpeg)$/.test(file.type)) return toast('Choisissez une image PNG, WebP ou JPEG.');
  if (file.size > 5 * 1024 * 1024) return toast('Image trop lourde (5 Mo maximum).');
  S.vitrineBusy = true; render();
  const old = S.vitrine?.all || [];
  const path = `${VITRINE}/${Date.now()}.${file.type.split('/')[1].replace('jpeg', 'jpg')}`;
  const { error } = await sb.storage.from('documents').upload(path, file, { contentType: file.type });
  if (!error && old.length) await sb.storage.from('documents').remove(old);
  S.vitrineBusy = false; S.vitrine = null;
  if (error) { render(); return fail(error); }
  await loadVitrine(); render(); toast("Photo de l'accueil mise à jour");
}
async function clearVitrine() {
  if (!S.vitrine) return;
  const { error } = await sb.storage.from('documents').remove(S.vitrine.all);
  if (error) return fail(error);
  S.vitrine = null; render(); toast("Photo de l'accueil retirée");
}
async function loadMessages(ch) {
  const sig = () => JSON.stringify([S.msgs[ch], (S.msgs[ch] || []).map((m) => S.reacts[m.id])]);
  const had = !!S.msgs[ch], before = sig();
  const { data, error } = await sb.from('messages').select('*').eq('channel', ch).order('created_at', { ascending: false }).limit(200);
  if (error) return fail(error);
  S.msgs[ch] = data.reverse();
  const ids = data.map((m) => m.id);
  if (ids.length) {
    const r = await sb.from('message_reactions').select('message_id, member_id, emoji').in('message_id', ids);
    if (!r.error) { ids.forEach((id) => (S.reacts[id] = [])); r.data.forEach((x) => S.reacts[x.message_id].push(x)); }
  }
  if (viewingChat() && S.chan === ch) markRead(ch);
  if (S.view === 'discussion' && S.chan === ch && (!had || sig() !== before)) patchChat(!had);
}
function startRealtime() {
  if (S.realtime) return;
  S.realtime = sb.channel('messages-live')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, ({ new: m }) => {
      if (m.member_id !== S.me?.id) {
        if (viewingChat() && S.chan === m.channel) markRead(m.channel);
        else { S.unread[m.channel] = (S.unread[m.channel] || 0) + 1; paintBadges(); }
      }
      const list = S.msgs[m.channel]; if (!list) return;
      if (!list.some((x) => x.id === m.id)) list.push(m);
      if (S.view === 'discussion' && S.chan === m.channel) patchChat();
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, ({ old }) => {
      for (const ch in S.msgs) S.msgs[ch] = S.msgs[ch].filter((x) => x.id !== old.id);
      if (S.view === 'discussion') patchChat();
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'message_reactions' }, ({ new: x }) => {
      const l = S.reacts[x.message_id] || (S.reacts[x.message_id] = []);
      if (!l.some((y) => y.member_id === x.member_id && y.emoji === x.emoji)) l.push(x);
      if (S.view === 'discussion') patchChat();
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'message_reactions' }, ({ old: x }) => {
      if (S.reacts[x.message_id]) S.reacts[x.message_id] = S.reacts[x.message_id].filter((y) => !(y.member_id === x.member_id && y.emoji === x.emoji));
      if (S.view === 'discussion') patchChat();
    })
    .subscribe();
}

/* ---------- Messages non lus (bulle sur l'onglet Discussion) ---------- */
const viewingChat = () => S.view === 'discussion' && !document.hidden;
const unreadTotal = () => CHANNELS.reduce((t, c) => t + (S.unread[c.id] || 0), 0);
const fmtN = (n) => (n > 99 ? '99+' : String(n));
async function loadUnread() {
  const r = await sb.rpc('unread_counts'); if (r.error) return;
  const u = {}; r.data.forEach((x) => (u[x.channel] = Number(x.n)));
  if (viewingChat()) u[S.chan] = 0;
  S.unread = u; paintBadges();
}
const readTimers = {};
function markRead(ch) {
  if (S.unread[ch]) { S.unread[ch] = 0; paintBadges(); }
  clearTimeout(readTimers[ch]);
  readTimers[ch] = setTimeout(() => sb.rpc('mark_read', { p_channel: ch }).then(() => {}, () => {}), 800);
}
// Met à jour les pastilles sans redessiner la page (le clavier reste ouvert)
function paintBadges() {
  const n = unreadTotal();
  document.querySelectorAll('[data-badge="total"]').forEach((el) => { el.textContent = fmtN(n); el.hidden = !n; });
  document.querySelectorAll('[data-badge-ch]').forEach((el) => { const k = S.unread[el.dataset.badgeCh] || 0; el.textContent = fmtN(k); el.hidden = !k; });
  const dot = $('#chanDot'); if (dot) dot.hidden = !CHANNELS.some((c) => c.id !== S.chan && S.unread[c.id]);
  try { (n ? navigator.setAppBadge?.(n) : navigator.clearAppBadge?.())?.catch?.(() => {}); } catch (e) {}
}

/* ---------- Rafraîchissement automatique ---------- */
// Tant que l'appli est ouverte : les données sont rechargées régulièrement et au retour sur l'appli,
// la discussion se reconnecte si le téléphone l'a coupée, et une nouvelle version du site s'installe toute seule.
const REFRESH_MS = 30000;
const VERSION_MS = 120000;
const VERSION_FILES = ['index.html', 'js/app.js', 'js/data.js', 'js/config.js', 'assets/style.css'];
let lastRefresh = 0, lastVersionCheck = 0, siteVersion = null, updateReady = false;
// Quelqu'un est en train d'écrire ou d'envoyer : on ne redessine pas la page sous ses doigts.
function userBusy() {
  const a = document.activeElement;
  if (a && a.matches('input, textarea, select') && !['msgIn', 'libQ'].includes(a.id)) return true;
  return !!S.uploading || S.recBusy || S.evModal?.mode === 'edit' || S.moreOpen || !!S.reactPicker || S.emojiOpen;
}
async function refreshData() {
  if (!S.me || document.hidden || !navigator.onLine) return;
  lastRefresh = Date.now();
  const snap = () => JSON.stringify([S.members, S.groups, S.poles, S.docs, S.events, S.invitations, S.reclamations, S.absences, S.notifCh]);
  const before = snap();
  try { await loadAll(); } catch (e) { return; }
  if (!S.me) return render();
  loadVitrine(); loadUnread();
  if (S.realtime && S.realtime.state !== 'joined' && S.realtime.state !== 'joining') { sb.removeChannel(S.realtime); S.realtime = null; }
  startRealtime();
  // Les autres salons seront rechargés à leur ouverture ; celui affiché est rechargé tout de suite.
  for (const ch in S.msgs) if (ch !== S.chan || S.view !== 'discussion') delete S.msgs[ch];
  if (S.view === 'discussion') await loadMessages(S.chan);
  const changed = before !== snap();
  if (!changed || userBusy()) return;
  if (S.evModal?.mode === 'view') {
    const o = S.evModal.occ; const e = S.events.find((x) => x.id === o.e.id);
    if (!e) S.evModal = null; else S.evModal = { mode: 'view', occ: { ...o, e } };
  }
  if (S.view === 'localisation') refreshMap(); else if (S.view !== 'discussion') render();
}
// Première lecture : la copie déjà chargée par le navigateur (la version qui tourne) ; ensuite : celle du serveur.
async function fileStamp(f, first) {
  const r = await fetch(f, first ? { cache: 'force-cache' } : { method: 'HEAD', cache: 'no-store' });
  return r.ok ? (r.headers.get('etag') || r.headers.get('last-modified') || '') : '';
}
async function checkVersion() {
  if (document.hidden || updateReady) return;
  lastVersionCheck = Date.now();
  const first = siteVersion === null;
  let v; try { v = (await Promise.all(VERSION_FILES.map((f) => fileStamp(f, first)))).join('|'); } catch (e) { return; }
  if (!v.replace(/\|/g, '')) return;
  if (first) { siteVersion = v; return; }
  if (v === siteVersion) return;
  // Nouvelle version : on remplace les fichiers gardés en mémoire par le navigateur, puis on recharge.
  try { await Promise.all(VERSION_FILES.map((f) => fetch(f, { cache: 'reload' }))); } catch (e) { return; }
  updateReady = true; applyUpdate();
}
function applyUpdate() {
  if (!updateReady || userBusy() || $('#msgIn')?.value) return;
  location.reload();
}
function wakeUp() {
  if (document.hidden) return;
  if (Date.now() - lastRefresh > 5000) refreshData();
  if (Date.now() - lastVersionCheck > 15000) checkVersion();
  if (S.me && viewingChat()) markRead(S.chan);
  applyUpdate();
}
document.addEventListener('visibilitychange', wakeUp);
window.addEventListener('focus', wakeUp);
window.addEventListener('online', wakeUp);
window.addEventListener('pageshow', (e) => { if (e.persisted) wakeUp(); });
setInterval(() => {
  if (document.hidden) return;
  if (Date.now() - lastRefresh >= REFRESH_MS) refreshData();
  if (Date.now() - lastVersionCheck >= VERSION_MS) checkVersion();
  applyUpdate();
}, 5000);
checkVersion();

/* ---------- Navigation ---------- */
const NAV = [['accueil', 'Accueil', 'home'], ['organigramme', 'Organigramme', 'org'], ['poles', 'Pôles', 'pole'], ['groupes', 'Groupes', 'group'], ['sep', 'Ressources'], ['bibliotheque', 'Bibliothèque', 'lib'], ['calendrier', 'Calendrier', 'cal'], ['localisation', 'Localisation', 'pin'], ['discussion', 'Discussion', 'chat']];
function navHtml() {
  const items = NAV.concat(canRecl() ? [['reclamations', 'Réclamations', 'euro']] : [], canAdminPage() ? [['administration', 'Administration', 'admin']] : []);
  return items.map((n) => n[0] === 'sep' ? `<div class="sep">${n[1]}</div>` : `<button data-v="${n[0]}" ${S.view === n[0] ? 'aria-current="page"' : ''}>${ico(n[2])}<span class="lbl">${n[1]}</span>${n[0] === 'discussion' ? badge('total', true) : ''}</button>`).join('')
    + `<button data-logout class="mobile-only">${ico('out')}<span class="lbl">Déconnexion</span></button>`;
}
// Sur téléphone : barre d'onglets en bas de l'écran, et « Plus » pour le reste
const TABS = [['accueil', 'Accueil', 'home'], ['calendrier', 'Calendrier', 'cal'], ['discussion', 'Discussion', 'chat'], ['localisation', 'Localisation', 'pin']];
function tabbarHtml() {
  const more = [['bibliotheque', 'Documents', 'lib'], ['organigramme', 'Organigramme', 'org'], ['poles', 'Pôles', 'pole'], ['groupes', 'Groupes', 'group']].concat(canRecl() ? [['reclamations', 'Réclamations', 'euro']] : [], canAdminPage() ? [['administration', 'Administration', 'admin']] : []);
  const inMore = more.some((x) => x[0] === S.view);
  return `<nav class="tabbar" aria-label="Menu">${TABS.map(([k, l, i]) => `<button data-v="${k}" ${S.view === k ? 'aria-current="page"' : ''}><span class="ticon">${ico(i)}${k === 'discussion' ? badge('total') : ''}</span><span>${l}</span></button>`).join('')}
    <button data-more aria-expanded="${S.moreOpen}" ${inMore ? 'aria-current="page"' : ''}>${ico('more')}<span>Plus</span></button></nav>
  ${S.moreOpen ? `<div class="sheetwrap" data-closemore><div class="card moresheet" role="dialog" aria-label="Plus de pages"><div class="grab"></div>
    ${more.map(([k, l, i]) => `<button data-v="${k}" ${S.view === k ? 'aria-current="page"' : ''}>${ico(i)}<span>${l}</span></button>`).join('')}
    <div class="whoami"><span>Connecté·e : <b>${esc(display(S.me))}</b></span><button class="btn small" data-logout>${ico('out')} Se déconnecter</button></div></div></div>` : ''}`;
}
// Pastille rouge du nombre de messages non lus (« total » ou un canal)
function badge(key, inline) {
  const n = key === 'total' ? unreadTotal() : S.unread[key] || 0;
  return `<b class="nbadge${inline ? ' inl' : ''}" ${key === 'total' ? 'data-badge="total"' : `data-badge-ch="${key}"`} ${n ? '' : 'hidden'} aria-label="messages non lus">${fmtN(n)}</b>`;
}
function go(v) {
  S.view = v; S.moreOpen = false; S.evModal = null; S.sheet = null;
  try { history.replaceState(null, '', '#' + v); } catch (e) {}
  if (v === 'discussion') { if (!S.msgs[S.chan]) loadMessages(S.chan); else markRead(S.chan); }
  render(); window.scrollTo(0, 0);
}
function bellHtml() {
  const on = S.push === 'actif' && S.notifCh.length > 0;
  return `<button class="bell${on ? ' on' : ''}" id="bell" data-notif aria-label="Notifications${on ? ' activées' : ' désactivées'}" title="Notifications">${ico(on ? 'bell' : 'belloff')}</button>`;
}
function paintBell() { const b = $('#bell'); if (b) b.outerHTML = bellHtml(); }

/* ---------- Vues ---------- */
function chefChip(m, sub) {
  const g = grp(m.group_id); const po = pole(m.pole_id);
  const s = sub ?? [g?.name, po?.short_name].filter(Boolean).join(' · ');
  return `<div class="chef" style="--k:${g?.color || 'var(--green)'}"><div class="av">${esc(initial(m))}</div><div style="min-width:0"><span>${esc(display(m))}</span><small>${esc(s)}</small></div></div>`;
}
function docRow(d) {
  const c = CATS.find((c) => c.id === d.category) || CATS[0];
  return `<div class="it"><div class="ficon" style="--k:${c.k}">${esc(ext(d))}</div><div style="min-width:0"><button class="linkbtn t" style="text-decoration:none;color:var(--fg);text-align:left" data-open="${esc(d.id)}">${esc(d.title)}</button><div class="m">${esc(c.name)} · ${fmtDate(d.created_at)}</div></div></div>`;
}
const ext = (d) => (d.file_path.split('.').pop() || 'FICHIER').toUpperCase().slice(0, 4);
const nextEvent = () => occurrences(today(), addDays(today(), 400))[0];

/* ---------- Présences aux rendez-vous (présent par défaut, on n'enregistre que les absences) ---------- */
// Chefs concernés : ceux des groupes de l'événement (sans groupe coché : toute l'unité) et ceux qui n'ont pas de groupe
const concerned = (e) => { const gs = e.group_ids || []; return S.members.filter((m) => !gs.length || !m.group_id || gs.includes(m.group_id)); };
const isAbsent = (o, mid) => S.absences.some((a) => a.event_id === o.e.id && a.occ_date === o.start && a.member_id === mid);
const absentsOf = (o) => S.absences.filter((a) => a.event_id === o.e.id && a.occ_date === o.start).map((a) => member(a.member_id)).filter(Boolean);
const absAttrs = (o, mid, absent) => `data-absev="${esc(o.e.id)}" data-absday="${o.start}" data-absmem="${mid}" data-absset="${absent ? 1 : 0}"`;
function presenceCtl(o) {
  if (!concerned(o.e).some((m) => m.id === S.me.id)) return '';
  const abs = isAbsent(o, S.me.id);
  return `<div class="presence"><span>Ma présence</span><div class="seg" role="group" aria-label="Ma présence">
    <button ${absAttrs(o, S.me.id, false)} aria-pressed="${!abs}">Présent·e</button><button class="no" ${absAttrs(o, S.me.id, true)} aria-pressed="${abs}">Absent·e</button></div></div>`;
}
function presenceBlock(o) {
  const conc = concerned(o.e), ab = absentsOf(o);
  const list = can('calendrier')
    ? `<div class="grpchips" role="group" aria-label="Présence de chaque chef">${conc.map((m) => { const a = isAbsent(o, m.id); return `<button type="button" class="abschip" ${absAttrs(o, m.id, !a)} aria-pressed="${a}">${esc(display(m))}</button>`; }).join('')}</div><small class="hint">Touchez un nom pour le passer absent·e (rouge) ou présent·e.</small>`
    : `<p style="color:var(--muted);font-size:.9rem">${ab.length ? `Absent${ab.length > 1 ? 's' : ''} : <b style="color:var(--fg)">${ab.map((m) => esc(display(m))).join(', ')}</b>` : 'Tout le monde est présent pour le moment.'}</p>`;
  return `<div class="presbox"><div class="row" style="justify-content:space-between"><b>Présence des chefs · ${conc.length - ab.length}/${conc.length}</b></div>${presenceCtl(o)}${list}</div>`;
}
async function setAbsence(eid, day, mid, absent) {
  const row = { event_id: eid, occ_date: day, member_id: mid };
  const same = (a) => a.event_id === eid && a.occ_date === day && a.member_id === mid;
  if (S.absences.some(same) === absent) return;
  const prev = S.absences;
  S.absences = absent ? [...prev, row] : prev.filter((a) => !same(a)); render();
  const r = absent ? await sb.from('event_absences').insert(row) : await sb.from('event_absences').delete().match(row);
  if (r.error && r.error.code !== '23505') { S.absences = prev; render(); return fail(needSql(r.error)); }
  if (mid === S.me.id) toast(absent ? 'Absence enregistrée' : 'Présence enregistrée');
}
// Le jour du prochain rendez-vous : qui est absent, quels groupes partent en sortie
function nextDay() {
  const o = nextEvent(); if (!o) return null;
  const day = o.start < today() ? today() : o.start;
  const occs = occOn(occurrences(day, day), day);
  const keys = new Set(occs.map((x) => x.e.id + '|' + x.start));
  const absents = new Map();
  S.absences.filter((a) => keys.has(a.event_id + '|' + a.occ_date)).forEach((a) => {
    const m = member(a.member_id); if (!m) return;
    const t = occs.find((x) => x.e.id === a.event_id)?.e.title;
    const cur = absents.get(m.id) || { m, titles: [] }; if (t && !cur.titles.includes(t)) cur.titles.push(t); absents.set(m.id, cur);
  });
  const sorties = occs.filter((x) => x.e.category === 'sortie');
  const gids = new Set(); sorties.forEach((x) => ((x.e.group_ids || []).length ? x.e.group_ids : S.groups.map((g) => g.id)).forEach((g) => gids.add(g)));
  return { day, occs, absents: [...absents.values()], sorties, groups: S.groups.filter((g) => gids.has(g.id)) };
}

/* Cartes de l'accueil : un toucher ouvre le détail, deux touchers ouvrent l'onglet concerné */
let statTap = null;
function statClick(k) {
  if (statTap?.k === k) { clearTimeout(statTap.t); statTap = null; return statGo(k); }
  clearTimeout(statTap?.t);
  statTap = { k, t: setTimeout(() => { statTap = null; statOpen(k); }, 280) };
}
function statOpen(k) {
  if (k === 'docs') return toast('Touchez deux fois pour ouvrir la Bibliothèque');
  S.sheet = 'stat:' + k; render();
}
function statGo(k) {
  if (k === 'absents') { const nd = nextDay(); S.calView = 'mois'; S.calDate = S.calSel = nd?.day || today(); return go('calendrier'); }
  if (k === 'sorties') return go('localisation');
  if (k === 'recl') { S.recTab = 'gestion'; S.recFilter = 'en_attente'; return go('reclamations'); }
  return go('bibliotheque');
}
function statSheet(k) {
  const nd = nextDay(), dayTxt = nd ? fmtLong(nd.day, { weekday: 'long', day: 'numeric', month: 'long' }) : '';
  let eyebrow = 'Prochain rendez-vous · ' + dayTxt, title = '', body = '', go = '';
  if (k === 'absents') {
    title = 'Chefs et cheftaines absents'; go = 'Ouvrir le calendrier';
    body = !nd ? '<div class="empty">Aucun rendez-vous à venir.</div>' : nd.absents.length
      ? `<div class="sheetlist">${nd.absents.map(({ m, titles }) => chefChip(m, [grp(m.group_id)?.name, nd.occs.length > 1 ? titles.join(', ') : ''].filter(Boolean).join(' · '))).join('')}</div>`
      : '<div class="empty">Personne ne s\'est déclaré absent. Chacun peut indiquer son absence depuis l\'accueil ou le calendrier.</div>';
  } else if (k === 'sorties') {
    title = 'Groupes en sortie'; go = 'Voir sur la carte';
    body = !nd || !nd.sorties.length ? '<div class="empty">Aucune sortie prévue ce jour-là. Une sortie est un événement de catégorie « Sortie ou camp » dans le calendrier.</div>'
      : `<div class="sheetlist">${nd.sorties.map((o) => `<div class="sortie" style="--k:${evColor(o.e)}"><b>${esc(o.e.title)}</b>${grpPills(o.e)}
        ${o.e.location || o.e.address ? `<p>📍 ${o.e.location ? `<b>${esc(o.e.location)}</b>` : ''}${o.e.location && o.e.address ? '<br>' : ''}${esc(o.e.address || '')}</p>` : '<p style="color:var(--muted)">Lieu pas encore indiqué</p>'}
        <small>${esc(occWhen(o))}</small>${hasCoords(o.e) ? `<div class="row">${placeLinks(o.e)}</div>` : ''}</div>`).join('')}</div>`;
  } else if (k === 'recl') {
    const p = recPending(); eyebrow = 'Remboursements'; title = `Réclamations ouvertes · ${euros(sumOf(p))}`; go = 'Gérer les réclamations';
    body = p.length ? `<div class="sheetlist">${p.map((r) => { const by = member(r.member_id); return `<div class="recrow"><div style="min-width:0;flex:1">${by ? chefChip(by, r.description.length > 60 ? r.description.slice(0, 57) + '…' : r.description) : '<b>Ancien membre</b>'}</div><b class="amt">${euros(r.amount)}</b></div>`; }).join('')}</div>`
      : '<div class="empty">Aucune réclamation en attente : tout est remboursé.</div>';
  }
  return `<div class="modal" data-closemodal><div class="card sheet" role="dialog" aria-modal="true" aria-labelledby="shTitle">
    <div class="row" style="justify-content:space-between;align-items:flex-start;flex-wrap:nowrap"><div><span class="eyebrow">${esc(eyebrow)}</span><h2 id="shTitle" style="margin-top:4px">${esc(title)}</h2></div><button class="btn small" data-closemodal aria-label="Fermer">✕</button></div>
    ${body}<div class="row" style="justify-content:flex-end"><button class="btn primary" data-statgo="${k}">${go} →</button></div></div></div>`;
}

function vAccueil() {
  const o = nextEvent(); const ev = o?.e; const nd = o ? parseD(o.start) : null; const nx = nextDay();
  const dayShort = nx ? cap(parseD(nx.day).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })) : 'aucun rendez-vous';
  const stat = (k, n, label, sub, tone) => `<button class="stat" data-stat="${k}" style="--k:${tone}" aria-label="${esc(n + ' ' + label)}. Touchez pour le détail, deux fois pour ouvrir l'onglet."><b>${esc(n)}</b><span>${esc(label)}</span><small>${esc(sub)}</small></button>`;
  const nAbs = nx ? nx.absents.length : 0, nOut = nx ? nx.groups.length : 0, pend = recPending();
  return `<div class="view">
  <div class="hero">
    <div class="main${S.vitrine ? ' withphoto' : ''}"><span class="eyebrow" style="color:inherit;opacity:.85">Espace des chefs et cheftaines</span>
      <h1>Salam ${esc(display(S.me))} !</h1>
      <p class="herotxt">Retrouvez ici les documents officiels, les comptes rendus, les fiches d'activités et la pédagogie de l'unité, l'organigramme et les pôles.</p>
      <div class="row herobtns" style="margin-top:6px"><button class="btn" data-go="bibliotheque">${ico('up')} Déposer un document</button><button class="btn" data-go="discussion" style="background:transparent;color:inherit;border-color:currentColor">${ico('chat')} Discussion</button></div>
      ${S.vitrine ? `<figure class="vitrine"><span class="vglow"></span><img src="${esc(S.vitrine.url)}" alt="Des enfants de l'unité fiers de leur plaque de cookies"></figure>` : '<img class="hands" src="assets/logo.png" alt="">'}
    </div>
    <div class="card next"><span class="eyebrow">Prochain rendez-vous</span>
      ${ev ? `<div class="date"><span class="d">${nd.getDate()}</span><div><b>${esc(nd.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, (c) => c.toUpperCase()))}</b><div style="color:var(--muted);font-size:.85rem">${esc(ev.title)}${isTimed(o) ? ' · ' + fmtHM(ev.start_time) : ''}${ev.location ? ' · ' + esc(ev.location) : ''}</div></div></div>${ev.details ? `<p style="color:var(--muted);font-size:.9rem">${esc(ev.details)}</p>` : ''}${presenceCtl(o)}` : '<p style="color:var(--muted)">Aucune date à venir pour le moment.</p>'}
      <button class="btn" data-go="calendrier" style="align-self:flex-start">${ico('cal')} Calendrier</button>
    </div>
  </div>
  <div>
    <div class="stats">
      ${stat('absents', nAbs, nAbs > 1 ? 'chefs et cheftaines absents' : 'chef ou cheftaine absent·e', dayShort, 'var(--c-red)')}
      ${stat('sorties', nOut, nOut > 1 ? 'groupes en sortie' : 'groupe en sortie', dayShort, 'var(--c-blue)')}
      ${can('remboursement') ? stat('recl', pend.length, pend.length > 1 ? 'réclamations ouvertes' : 'réclamation ouverte', euros(sumOf(pend)) + ' à rembourser', 'var(--c-yellow)') : ''}
      ${stat('docs', S.docs.length, S.docs.length > 1 ? 'documents partagés' : 'document partagé', 'Bibliothèque', 'var(--c-purple)')}
    </div>
    <p class="stathint">Touchez une carte pour le détail, deux fois pour ouvrir l'onglet.</p>
  </div>
  <div class="grid g2">
    <div class="card"><div class="row" style="justify-content:space-between;margin-bottom:8px"><h3>Derniers documents</h3><button class="btn" data-go="bibliotheque">Tout voir</button></div>
      ${S.docs.length ? `<div class="list">${S.docs.slice(0, 5).map(docRow).join('')}</div>` : '<div class="empty">Aucun document pour le moment. Déposez le premier depuis la Bibliothèque.</div>'}</div>
    <div class="card" style="display:flex;flex-direction:column;gap:12px"><h3>Nos valeurs</h3>
      <div class="values">${VALUES.map((v) => `<span>${v}</span>`).join('')}</div>
      <div class="obj"><b>Comment l'unité grandit</b><div class="chain"><span>Les référentes gèrent les groupes</span><i>→</i><span>les stagiaires apprennent</span><i>→</i><span>les grandes découvrent le rôle de cheffe</span><i>→</i><span>les doyennes développent l'unité de demain</span></div></div>
    </div>
  </div></div>`;
}

function vOrg() {
  const top = S.members.filter((m) => m.role === 'principale');
  const mainPoles = S.poles.filter((p) => p.id !== 'support');
  const tag = (m) => `<span class="otag" style="--k:${grp(m.group_id)?.color || 'var(--green)'}">${esc(display(m))}</span>`;
  const poleCols = mainPoles.map((p) => {
    const doy = S.members.filter((m) => m.pole_id === p.id && isDoyenne(m));
    const others = S.members.filter((m) => m.pole_id === p.id && !isDoyenne(m));
    return `<div class="col"><div class="node poleNode" style="--k:${p.color}"><div class="n">${esc(p.name)}</div>
      <div class="olbl">Doyenne</div><div class="otags">${doy.length ? doy.map(tag).join('') : '<span class="r">à désigner</span>'}</div>
      <div class="olbl">Membres</div><div class="otags">${others.length ? others.map(tag).join('') : '<span class="r">à attribuer</span>'}</div></div></div>`;
  }).join('');
  const ochef = (m) => `<div class="ochef" style="--k:${grp(m.group_id)?.color || 'var(--green)'}"><div class="av">${esc(initial(m))}</div><div><small>${esc(m.title)}${isDoyenne(m) ? ' · doyenne' : ''}</small><b>${esc(m.first_name)}</b><small>${esc(pole(m.pole_id)?.short_name || 'Pôle à attribuer')}</small></div></div>`;
  const grpCols = S.groups.map((g) => {
    const chefs = S.members.filter((m) => m.group_id === g.id);
    return `<div class="col"><div class="node grp" style="--k:${g.color}"><h4>${esc(g.name)}</h4><div class="r">${g.age_range ? esc(g.age_range) + ' · ' : ''}${chefs.length} chef${chefs.length > 1 ? 's' : ''}</div>
      <div class="ochefs">${chefs.map(ochef).join('') || '<span class="r">Aucun chef</span>'}</div></div></div>`;
  }).join('');
  const unassigned = S.members.filter((m) => !m.group_id && m.role !== 'principale');
  return `<div class="view wide">
  <div><span class="eyebrow">Unité 2026/2027</span><h1>Organigramme</h1><p class="lead" style="margin-top:6px">Chaque chef et cheftaine appartient à un groupe et à un pôle. Seuls les adultes figurent ici.${can('membres') ? ' Modifiez les affectations depuis la page Administration.' : ''}</p></div>
  <div class="card org-wrap"><div class="org">
    <div class="row" style="justify-content:center">${top.map((m) => `<div class="node top"><div class="av">${esc(initial(m))}</div><div class="n" style="font-size:1.15rem">${esc(display(m))}</div><div class="r">Cheffe principale de l'unité</div></div>`).join('') || '<div class="node top"><div class="n">Cheffe principale</div><div class="r">à désigner</div></div>'}</div>
    <div class="vline"></div>
    <div class="otier" style="--n:${mainPoles.length}">${poleCols}</div>
    <div class="tier-label">Groupes et leurs chefs</div>
    <div class="otier" style="--n:${Math.max(S.groups.length, 1)}">${grpCols}</div>
  </div></div>
  ${unassigned.length ? `<div class="card"><h3 style="margin-bottom:8px">Sans groupe</h3><div class="members">${unassigned.map((m) => `<div style="width:220px;max-width:100%">${chefChip(m)}</div>`).join('')}</div></div>` : ''}
  </div>`;
}

function vPoles() {
  const p = pole(S.poleTab) || S.poles[0]; if (!p) return '<div class="view"><div class="empty">Aucun pôle.</div></div>';
  const c = POLE_CONTENT[p.id] || { tag: '', lead: '', mission: '', missions: [], compo: [], blocks: [] };
  const mem = S.members.filter((m) => m.pole_id === p.id);
  const doy = mem.filter(isDoyenne);
  const pd = S.docs.filter((d) => d.pole_id === p.id);
  return `<div class="view">
  <div><span class="eyebrow">Restructuration 2026/2027</span><h1>Les pôles</h1></div>
  <div class="tabs" role="tablist">${S.poles.map((x) => `<button role="tab" data-pole="${x.id}" aria-selected="${x.id === p.id}"><span class="dot" style="--k:${x.color}"></span>${esc(x.short_name)}</button>`).join('')}</div>
  <div class="pole-head" style="--k:${p.color}"><span class="eyebrow" style="color:${p.color}">${esc(c.tag)}</span><h2>${esc(p.name)}</h2>
    <div style="color:var(--muted);font-weight:700">${p.id === 'support' ? esc(c.lead) : `Doyenne · ${esc(c.lead)} : ${doy.length ? doy.map((m) => esc(display(m))).join(', ') : 'à désigner'}`}</div>
    ${c.motto ? `<div class="motto">${esc(c.motto)}</div>` : ''}<p class="lead">${esc(c.mission)}</p></div>
  ${c.objectif ? `<div class="obj"><b>Objectif annuel</b>${esc(c.objectif)}</div>` : ''}
  <div class="grid g3">
    ${c.missions.length ? `<div class="card"><h3 style="margin-bottom:8px">Missions</h3><ul class="clean">${c.missions.map((m) => `<li>${esc(m)}</li>`).join('')}</ul></div>` : ''}
    ${c.compo.length ? `<div class="card"><h3 style="margin-bottom:8px">Composition</h3><ul class="clean">${c.compo.map((m) => `<li>${esc(m)}</li>`).join('')}</ul><div class="pill" style="margin-top:10px">Total : ${esc(c.total)}</div></div>` : ''}
    ${c.blocks.map((b) => `<div class="card"><h3 style="margin-bottom:8px">${esc(b[0])}</h3><ul class="clean">${b[1].map((m) => `<li>${esc(m)}</li>`).join('')}</ul></div>`).join('')}
  </div>
  <div class="card"><h3 style="margin-bottom:10px">Membres du pôle</h3>
    ${mem.length ? `<div class="members">${mem.map((m) => `<div style="width:230px;max-width:100%">${chefChip(m, [grp(m.group_id)?.name, isDoyenne(m) ? 'doyenne' : ''].filter(Boolean).join(' · '))}</div>`).join('')}</div>` : `<div class="empty">Aucun membre attribué pour l'instant.${can('membres') ? ' Attribuez les pôles depuis la page Administration.' : ''}</div>`}</div>
  <div class="card"><div class="row" style="justify-content:space-between;margin-bottom:6px"><h3>Documents du pôle</h3><button class="btn" data-go="bibliotheque" data-setpole="${p.id}">${ico('up')} Ajouter</button></div>
    ${pd.length ? `<div class="list">${pd.map(docRow).join('')}</div>` : '<div class="empty">Pas encore de document pour ce pôle.</div>'}</div>
  </div>`;
}

function vGroupes() {
  return `<div class="view">
  <div><span class="eyebrow">Un samedi sur deux</span><h1>Les groupes</h1><p class="lead" style="margin-top:6px">Les enfants de 4 à 17 ans sont répartis en groupes, chacun encadré par ses chefs et cheftaines.</p></div>
  <div class="grid g3">${S.groups.map((g) => `<div class="card" style="border-top:5px solid ${g.color};display:flex;flex-direction:column;gap:10px"><h2 style="font-size:1.3rem">${esc(g.name)}</h2>
    <div style="display:flex;flex-direction:column;gap:6px">${S.members.filter((m) => m.group_id === g.id).map((m) => chefChip(m)).join('') || '<div class="empty">Aucun chef attribué.</div>'}</div>
    <div class="row"><span class="pill">${g.age_range ? esc(g.age_range) : "Tranche d'âge à renseigner"}</span></div></div>`).join('')}</div>
  </div>`;
}

function vBiblio() {
  const q = S.libQ.toLowerCase();
  const list = S.docs.filter((d) => (S.libCat === 'all' || d.category === S.libCat) && (!q || d.title.toLowerCase().includes(q)));
  return `<div class="view">
  <div><span class="eyebrow">Banque de données de l'unité</span><h1>Bibliothèque</h1><p class="lead" style="margin-top:6px">Documents officiels, comptes rendus de réunion, fiches d'activités, pédagogie et photos, partagés entre tous les chefs et cheftaines.</p></div>
  <div class="drop" id="drop">
    ${ico('up', 30)}
    <b style="color:var(--fg)">Glissez vos fichiers ici ou choisissez-les</b><span>PDF, Word, Excel, photos… 25 Mo maximum par fichier. Les photos sont allégées automatiquement.</span>
    <div class="upform">
      <label for="upCat">Catégorie<select id="upCat">${CATS.map((c) => `<option value="${c.id}">${c.name}</option>`).join('')}</select></label>
      <label for="upPole">Pôle<select id="upPole"><option value="">Toute l'unité</option>${S.poles.map((p) => `<option value="${p.id}" ${S.upPole === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
      <label for="upFile">Fichiers<input type="file" id="upFile" multiple ${S.uploading ? 'disabled' : ''}></label>
    </div>
    ${S.uploading ? `<span class="progress">${esc(S.uploading)}</span>` : ''}
  </div>
  <div class="toolbar"><input type="search" id="libQ" placeholder="Rechercher un document" value="${esc(S.libQ)}" aria-label="Rechercher">
    <div class="chips"><button data-cat="all" aria-pressed="${S.libCat === 'all'}">Tout</button>${CATS.map((c) => `<button data-cat="${c.id}" aria-pressed="${S.libCat === c.id}">${c.name}</button>`).join('')}</div></div>
  <div class="docs">${list.map((d) => {
    const c = CATS.find((c) => c.id === d.category) || CATS[0]; const po = pole(d.pole_id); const by = member(d.uploaded_by);
    const canDel = can('bibliotheque') || d.uploaded_by === S.me.id;
    const th = S.thumbs[d.file_path];
    return `<div class="card doc"><div class="thumb">${th ? `<img src="${esc(th)}" alt="" loading="lazy">` : `<div class="ficon" style="--k:${c.k}">${esc(ext(d))}</div>`}</div>
      <button class="linkbtn t" style="text-decoration:none;color:var(--fg);text-align:left" data-open="${esc(d.id)}">${esc(d.title)}</button>
      <div class="row"><span class="pill"><span class="dot" style="--k:${c.k}"></span>${esc(c.name)}</span>${po ? `<span class="pill">${esc(po.short_name)}</span>` : ''}</div>
      <div class="m">${fmtDate(d.created_at)} · ${esc(display(by))}${d.size_bytes ? ' · ' + (d.size_bytes / 1048576).toFixed(1).replace('.', ',') + ' Mo' : ''}</div>
      <div class="actions"><button class="btn small" data-open="${esc(d.id)}">Ouvrir</button>${canDel ? `<button class="btn small danger" data-deldoc="${esc(d.id)}">Supprimer</button>` : ''}</div></div>`;
  }).join('') || '<div class="empty">Aucun document ne correspond.</div>'}</div>
  </div>`;
}

async function compressImage(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 400 * 1024) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.82));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch (e) { return file; }
}
async function addFiles(files) {
  const cat = $('#upCat').value; const pl = $('#upPole').value || null;
  const arr = [...files]; let done = 0;
  for (const f0 of arr) {
    S.uploading = `Envoi ${done + 1} sur ${arr.length} : ${f0.name}`; render();
    try {
      const f = await compressImage(f0);
      if (f.size > 25 * 1048576) throw new Error(`${f0.name} dépasse 25 Mo`);
      const safe = f.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '_').slice(-80);
      const path = `${crypto.randomUUID()}/${safe}`;
      const up = await sb.storage.from('documents').upload(path, f, { contentType: f.type || undefined });
      if (up.error) throw up.error;
      const isImg = (f.type || '').startsWith('image/');
      const row = { title: f0.name.replace(/\.[^.]+$/, ''), category: isImg && cat !== 'activite' && cat !== 'peda' ? 'photo' : cat, pole_id: pl, file_path: path, mime_type: f.type || null, size_bytes: f.size, uploaded_by: S.me.id };
      const ins = await sb.from('documents').insert(row).select().single();
      if (ins.error) { await sb.storage.from('documents').remove([path]); throw ins.error; }
      S.docs.unshift(ins.data); done++;
    } catch (e) { fail(e); }
  }
  S.uploading = ''; render(); loadThumbs();
  if (done) toast(done > 1 ? `${done} fichiers ajoutés` : 'Fichier ajouté');
}
async function openDoc(id) {
  const d = S.docs.find((x) => x.id === id); if (!d) return;
  const w = window.open('', '_blank');
  const { data, error } = await sb.storage.from('documents').createSignedUrl(d.file_path, 3600);
  if (error) { w?.close(); return fail(error); }
  if (w) w.location = data.signedUrl; else location.href = data.signedUrl;
}

/* ---------- Calendrier (vues jour, semaine, mois, année, comme dans Teams) ---------- */
const EV_CATS = [
  ['samedi', 'Samedi scout', 'var(--green)'], ['reunion', 'Réunion', 'var(--c-blue)'], ['sortie', 'Sortie ou camp', 'var(--c-red)'],
  ['formation', 'Formation', 'var(--c-purple)'], ['autre', 'Autre', 'var(--c-yellow)']
];
const REPEATS = { none: 'Ne se répète pas', weekly: 'Chaque semaine', biweekly: 'Toutes les 2 semaines', monthly: 'Chaque mois' };
const evColor = (e) => (EV_CATS.find((c) => c[0] === e.category) || EV_CATS[0])[2];
const CAL_VIEWS = [['jour', 'Jour'], ['semaine', 'Semaine'], ['mois', 'Mois'], ['annee', 'Année']];
const HOUR_H = 48;
const fmtHM = (t) => (t ? t.slice(0, 5).replace(':', 'h') : '');
const toMin = (t) => { const [h, m] = (t || '00:00').split(':').map(Number); return h * 60 + m; };
const cap = (s) => s.replace(/^./, (c) => c.toUpperCase());
const fmtLong = (s, opt = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) => cap(parseD(s).toLocaleDateString('fr-FR', opt));

// Toutes les occurrences (événements répétés compris) qui touchent la période [from, to]
function occurrences(from, to) {
  const out = [];
  for (const e of S.events) {
    const len = e.end_date ? Math.max(0, dayDiff(e.date, e.end_date)) : 0;
    const rep = e.repeat && e.repeat !== 'none' ? e.repeat : null;
    const last = rep ? (e.repeat_until && e.repeat_until < to ? e.repeat_until : to) : e.date;
    const d0 = parseD(e.date);
    for (let i = 0; i < 1000; i++) {
      let s;
      if (!rep) { if (i) break; s = e.date; }
      else if (rep === 'monthly') {
        const t = new Date(d0.getFullYear(), d0.getMonth() + i, d0.getDate());
        if (t.getDate() !== d0.getDate()) continue; // pas de 31 dans ce mois
        s = isoD(t);
      } else s = addDays(e.date, i * (rep === 'weekly' ? 7 : 14));
      if (s > last) break;
      const end = addDays(s, len);
      if (end >= from) out.push({ e, start: s, end, key: e.id + '|' + s });
    }
  }
  return out.sort((a, b) => a.start.localeCompare(b.start) || (b.e.all_day - a.e.all_day) || (a.e.start_time || '').localeCompare(b.e.start_time || ''));
}
const occOn = (list, day) => list.filter((o) => o.start <= day && o.end >= day);
const isTimed = (o) => !o.e.all_day && o.start === o.end && o.e.start_time;
function occWhen(o) {
  const e = o.e;
  const range = o.start === o.end ? fmtLong(o.start) : `Du ${fmtLong(o.start, { weekday: 'long', day: 'numeric', month: 'long' }).toLowerCase()} au ${fmtLong(o.end).toLowerCase()}`;
  if (e.all_day || !e.start_time) return range + (o.start === o.end ? ', toute la journée' : '');
  return `${range}, ${fmtHM(e.start_time)}${e.end_time ? ' – ' + fmtHM(e.end_time) : ''}`;
}
function calTitle() {
  const d = S.calDate, v = S.calView;
  if (v === 'jour') return fmtLong(d);
  if (v === 'annee') return d.slice(0, 4);
  if (v === 'mois') return cap(parseD(d).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }));
  const a = startOfWeek(d), b = addDays(a, 6), pa = parseD(a), pb = parseD(b);
  if (pa.getMonth() === pb.getMonth()) return `${pa.getDate()} – ${pb.getDate()} ${pb.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
  return `${pa.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${pb.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}
function calMove(n) {
  const v = S.calView, d = parseD(S.calDate);
  if (v === 'jour') S.calDate = addDays(S.calDate, n);
  else if (v === 'semaine') S.calDate = addDays(S.calDate, 7 * n);
  else if (v === 'mois') S.calDate = isoD(new Date(d.getFullYear(), d.getMonth() + n, 1));
  else S.calDate = isoD(new Date(d.getFullYear() + n, 0, 1));
  if (v === 'mois') S.calSel = S.calDate.slice(0, 7) === today().slice(0, 7) ? today() : S.calDate;
}
const chip = (o, day) => {
  const t = isTimed(o) ? `<i>${fmtHM(o.e.start_time)}</i> ` : '';
  const cont = day && o.start < day ? ' cont' : '';
  return `<button class="evchip${o.e.all_day || !isTimed(o) ? ' full' : ''}${cont}" style="--k:${evColor(o.e)}" data-occ="${esc(o.key)}" title="${esc(o.e.title)}">${t}${esc(o.e.title)}</button>`;
};
function dayList(list, day) {
  const items = occOn(list, day);
  return `<div class="card daypanel"><div class="row" style="justify-content:space-between"><h3>${esc(fmtLong(day, { weekday: 'long', day: 'numeric', month: 'long' }))}</h3>${can('calendrier') ? `<button class="btn small" data-evnew="${day}">+ Ajouter</button>` : ''}</div>
    ${items.length ? `<div class="agenda">${items.map((o) => `<button class="agitem" style="--k:${evColor(o.e)}" data-occ="${esc(o.key)}"><span class="when">${isTimed(o) ? fmtHM(o.e.start_time) + (o.e.end_time ? '<br>' + fmtHM(o.e.end_time) : '') : 'Journée'}</span><span><b>${esc(o.e.title)}</b>${o.e.location || o.e.address ? `<small>${esc(o.e.location || o.e.address)}</small>` : ''}</span></button>`).join('')}</div>` : '<p style="color:var(--muted)">Rien de prévu ce jour-là.</p>'}</div>`;
}
function vMonth() {
  const d = parseD(S.calDate), first = isoD(new Date(d.getFullYear(), d.getMonth(), 1));
  const start = startOfWeek(first), lastDay = isoD(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  const weeks = Math.ceil((dayDiff(start, lastDay) + 1) / 7), end = addDays(start, weeks * 7 - 1);
  const list = occurrences(start, end), td = today(), sel = S.calSel || td;
  let cells = '';
  for (let i = 0; i < weeks * 7; i++) {
    const day = addDays(start, i), items = occOn(list, day), out = day.slice(0, 7) !== first.slice(0, 7);
    cells += `<div class="mcell${out ? ' out' : ''}${day === td ? ' today' : ''}${day === sel ? ' sel' : ''}" data-calday="${day}"><span class="num">${parseD(day).getDate()}</span>
      <div class="mchips">${items.slice(0, 3).map((o) => chip(o, day)).join('')}${items.length > 3 ? `<span class="more">+${items.length - 3}</span>` : ''}</div></div>`;
  }
  return `<div class="card mgrid-wrap"><div class="mhead">${['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'].map((x) => `<span>${x}</span>`).join('')}</div><div class="mgrid">${cells}</div></div>${dayList(list, sel)}`;
}
function vTimeGrid(nDays) {
  const start = nDays === 1 ? S.calDate : startOfWeek(S.calDate), days = Array.from({ length: nDays }, (_, i) => addDays(start, i));
  const list = occurrences(start, days[nDays - 1]), td = today(), now = new Date();
  const allday = days.map((day) => `<div class="adcell" data-calday="${day}">${occOn(list, day).filter((o) => !isTimed(o)).map((o) => chip(o, day)).join('')}</div>`).join('');
  const cols = days.map((day) => {
    const timed = occOn(list, day).filter(isTimed).map((o) => ({ o, s: toMin(o.e.start_time), f: Math.max(toMin(o.e.end_time || '') || 0, toMin(o.e.start_time) + 30) }));
    // Événements qui se chevauchent : côte à côte
    timed.sort((a, b) => a.s - b.s || b.f - a.f);
    let group = [], groupEnd = -1; const placed = [];
    const flush = () => { const n = Math.max(...group.map((g) => g.col)) + 1; group.forEach((g) => (g.n = n)); placed.push(...group); group = []; };
    for (const t of timed) {
      if (t.s >= groupEnd && group.length) flush();
      const used = new Set(group.filter((g) => g.f > t.s).map((g) => g.col)); let c = 0; while (used.has(c)) c++;
      t.col = c; group.push(t); groupEnd = Math.max(groupEnd, t.f);
    }
    if (group.length) flush();
    const evs = placed.map((t) => `<button class="tev" style="--k:${evColor(t.o.e)};top:${(t.s / 60) * HOUR_H}px;height:${Math.max(22, ((t.f - t.s) / 60) * HOUR_H - 2)}px;left:calc(${(t.col / t.n) * 100}% + 2px);width:calc(${100 / t.n}% - 4px)" data-occ="${esc(t.o.key)}"><b>${esc(t.o.e.title)}</b><span>${fmtHM(t.o.e.start_time)}${t.o.e.end_time ? ' – ' + fmtHM(t.o.e.end_time) : ''}${t.o.e.location ? ' · ' + esc(t.o.e.location) : ''}</span></button>`).join('');
    const nowLine = day === td ? `<div class="nowline" style="top:${((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR_H}px"></div>` : '';
    return `<div class="tcol${day === td ? ' today' : ''}">${Array.from({ length: 24 }, (_, h) => `<div class="slot" data-slot="${day}|${h}"></div>`).join('')}${evs}${nowLine}</div>`;
  }).join('');
  const heads = days.map((day) => { const p = parseD(day); return `<button class="thd${day === td ? ' today' : ''}" data-calgoday="${day}"><small>${p.toLocaleDateString('fr-FR', { weekday: 'short' })}</small><b>${p.getDate()}</b></button>`; }).join('');
  return `<div class="card tgrid-wrap"><div class="tgrid" style="--days:${nDays}">
    <div class="trow thead"><div class="tlbl"></div>${heads}</div>
    <div class="trow tallday"><div class="tlbl">Journée</div>${allday}</div>
    <div class="tscroll" id="tscroll"><div class="trow tbody"><div class="tlbl hours">${Array.from({ length: 24 }, (_, h) => `<span style="top:${h * HOUR_H}px">${h ? pad2(h) + ':00' : ''}</span>`).join('')}</div>${cols}</div></div>
  </div></div>`;
}
function vYear() {
  const y = Number(S.calDate.slice(0, 4)), list = occurrences(`${y}-01-01`, `${y}-12-31`), td = today();
  const busy = {}; list.forEach((o) => { for (let d = o.start, i = 0; d <= o.end && i < 366; d = addDays(d, 1), i++) busy[d] = busy[d] || evColor(o.e); });
  const months = Array.from({ length: 12 }, (_, m) => {
    const first = isoD(new Date(y, m, 1)), start = startOfWeek(first), n = new Date(y, m + 1, 0).getDate();
    const lead = dayDiff(start, first);
    let cells = '<span></span>'.repeat(lead);
    for (let d = 1; d <= n; d++) { const day = isoD(new Date(y, m, d)); cells += `<button class="yd${busy[day] ? ' busy' : ''}${day === td ? ' today' : ''}" ${busy[day] ? `style="--k:${busy[day]}"` : ''} data-calgoday="${day}" aria-label="${esc(fmtLong(day))}${busy[day] ? ', événement prévu' : ''}">${d}</button>`; }
    return `<div class="card ymonth"><button class="linkbtn ytitle" data-calgomonth="${first}">${cap(new Date(y, m, 1).toLocaleDateString('fr-FR', { month: 'long' }))}</button><div class="ygrid">${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((x) => `<span class="yh">${x}</span>`).join('')}${cells}</div></div>`;
  }).join('');
  return `<div class="yearwrap">${months}</div>`;
}
function evModal() {
  const m = S.evModal; if (!m) return '';
  if (m.mode === 'view') {
    const o = m.occ, e = o.e, by = member(e.created_by), cat = EV_CATS.find((c) => c[0] === e.category) || EV_CATS[0];
    return `<div class="modal" data-closemodal><div class="card sheet" role="dialog" aria-modal="true" aria-labelledby="evTitle">
      <div class="row" style="justify-content:space-between;align-items:flex-start"><div><span class="pill"><span class="dot" style="--k:${cat[2]}"></span>${cat[1]}</span><h2 id="evTitle" style="margin-top:8px">${esc(e.title)}</h2></div><button class="btn small" data-closemodal aria-label="Fermer">✕</button></div>
      <p><b>${esc(occWhen(o))}</b></p>
      ${e.repeat && e.repeat !== 'none' ? `<p style="color:var(--muted)">${REPEATS[e.repeat]}${e.repeat_until ? " jusqu'au " + esc(fmtLong(e.repeat_until).toLowerCase()) : ''}</p>` : ''}
      ${grpPills(e)}
      ${e.location || e.address ? `<p>📍 ${e.location ? `<b>${esc(e.location)}</b>` : ''}${e.location && e.address ? '<br>' : ''}${esc(e.address || '')}</p>` : ''}
      ${hasCoords(e) ? `<div class="row">${placeLinks(e)}<button class="btn small" data-mapfocus="${e.id}">${ico('pin')} Voir sur la carte</button></div>` : ''}
      ${e.details ? `<p style="white-space:pre-wrap">${esc(e.details)}</p>` : ''}
      ${presenceBlock(o)}
      ${by ? `<p style="color:var(--muted);font-size:.85rem">Ajouté par ${esc(display(by))}</p>` : ''}
      ${can('calendrier') ? `<div class="row" style="justify-content:flex-end"><button class="btn danger" data-evdel="${e.id}">${e.repeat && e.repeat !== 'none' ? 'Supprimer la série' : 'Supprimer'}</button><button class="btn primary" data-evedit="${esc(o.key)}">Modifier</button></div>` : ''}
    </div></div>`;
  }
  const e = m.ev;
  return `<div class="modal" data-closemodal><form class="card sheet" id="evForm" role="dialog" aria-modal="true" aria-labelledby="evFormTitle">
    <div class="row" style="justify-content:space-between"><h2 id="evFormTitle">${e.id ? "Modifier l'événement" : 'Nouvel événement'}</h2><button type="button" class="btn small" data-closemodal aria-label="Fermer">✕</button></div>
    <label class="field" for="efTitle">Titre<input id="efTitle" required maxlength="120" value="${esc(e.title || '')}" placeholder="Ex. Samedi scout, réunion des chefs…"></label>
    <div class="formrow">
      <label class="field" for="efCat">Catégorie<select id="efCat">${EV_CATS.map((c) => `<option value="${c[0]}" ${c[0] === (e.category || 'samedi') ? 'selected' : ''}>${c[1]}</option>`).join('')}</select></label>
      <label class="field check" for="efAllDay"><span>Toute la journée</span><input id="efAllDay" type="checkbox" ${e.all_day ? 'checked' : ''}></label>
    </div>
    <div class="dtgrid">
      <label class="field" for="efStart">Début<input id="efStart" type="date" required value="${esc(e.date || '')}"></label>
      <label class="field timef" for="efStartT" ${e.all_day ? 'hidden' : ''}>Heure<input id="efStartT" type="time" step="900" value="${esc((e.start_time || '14:00').slice(0, 5))}"></label>
      <label class="field" for="efEnd">Fin<input id="efEnd" type="date" required value="${esc(e.end_date || e.date || '')}"></label>
      <label class="field timef" for="efEndT" ${e.all_day ? 'hidden' : ''}>Heure<input id="efEndT" type="time" step="900" value="${esc((e.end_time || '17:00').slice(0, 5))}"></label>
    </div>
    <div class="formrow">
      <label class="field" for="efRepeat">Répétition<select id="efRepeat">${Object.entries(REPEATS).map(([k, v]) => `<option value="${k}" ${k === (e.repeat || 'none') ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label class="field" for="efUntil" id="efUntilWrap" ${!e.repeat || e.repeat === 'none' ? 'hidden' : ''}>Jusqu'au<input id="efUntil" type="date" value="${esc(e.repeat_until || '')}"></label>
    </div>
    <div class="field"><span>Groupes concernés</span><div class="grpchips" role="group" aria-label="Groupes concernés">${S.groups.map((g) => `<button type="button" data-evgrp="${g.id}" aria-pressed="${(e.group_ids || []).includes(g.id)}" style="--k:${g.color}"><span class="dot"></span>${esc(g.name)}</button>`).join('')}</div><small class="hint">Aucun groupe coché : l'événement concerne toute l'unité.</small></div>
    <label class="field" for="efLoc">Nom du lieu<input id="efLoc" maxlength="160" value="${esc(e.location || '')}" placeholder="Ex. Housseynia, base de loisirs…"></label>
    <div class="field addr"><label for="efAddr">Adresse</label>
      <div class="addrbox"><input id="efAddr" autocomplete="off" spellcheck="false" maxlength="200" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="efAddrList" placeholder="Tapez une adresse, ex. 17 rue…" value="${esc(e.address || '')}" ${hasCoords(e) ? `data-lat="${e.lat}" data-lng="${e.lng}" data-ok="1"` : ''}>
      <ul id="efAddrList" class="addrlist" role="listbox" hidden></ul></div>
      <small class="hint" id="efAddrHint">${hasCoords(e) ? '✓ Adresse vérifiée' : 'Choisissez une adresse dans les suggestions (toutes les adresses de France).'}</small></div>
    <label class="field" for="efDetails">Précisions<textarea id="efDetails" maxlength="2000">${esc(e.details || '')}</textarea></label>
    <p class="err" id="efErr" role="alert" hidden></p>
    <div class="row" style="justify-content:flex-end"><button type="button" class="btn" data-closemodal>Annuler</button><button class="btn primary" type="submit">Enregistrer</button></div>
  </form></div>`;
}
function vCal() {
  const v = S.calView;
  const body = v === 'jour' ? vTimeGrid(1) : v === 'semaine' ? vTimeGrid(7) : v === 'annee' ? vYear() : vMonth();
  return `<div class="view wide">
  <div><span class="eyebrow">Planification</span><h1>Calendrier</h1></div>
  <div class="calbar">
    <div class="row"><button class="btn" data-caltoday>Aujourd'hui</button><span class="row" style="gap:4px"><button class="btn icon" data-calnav="-1" aria-label="Période précédente">‹</button><button class="btn icon" data-calnav="1" aria-label="Période suivante">›</button></span><h2 class="caltitle">${esc(calTitle())}</h2></div>
    <div class="row"><div class="seg" role="group" aria-label="Affichage">${CAL_VIEWS.map(([k, l]) => `<button data-calview="${k}" aria-pressed="${v === k}">${l}</button>`).join('')}</div>
      ${can('calendrier') ? `<button class="btn primary" data-evnew="">+ Nouvel événement</button>` : ''}</div>
  </div>
  <div class="legend">${EV_CATS.map((c) => `<span><span class="dot" style="--k:${c[2]}"></span>${c[1]}</span>`).join('')}</div>
  ${body}
  </div>`;
}
function findOcc(key) {
  const [id, start] = key.split('|'); const e = S.events.find((x) => String(x.id) === id); if (!e) return null;
  const len = e.end_date ? dayDiff(e.date, e.end_date) : 0;
  return { e, start, end: addDays(start, len), key };
}
function newEventDraft(day, hour) {
  const d = day || (S.calView === 'mois' ? S.calSel || today() : S.calDate);
  const h = hour ?? null;
  return { date: d, end_date: d, all_day: h === null, start_time: h === null ? '14:00' : pad2(h) + ':00', end_time: h === null ? '17:00' : pad2(Math.min(h + 1, 23)) + ':' + (h >= 23 ? '59' : '00'), category: 'samedi', repeat: 'none' };
}
async function saveEvent() {
  const v = (id) => $(id).value.trim();
  const allDay = $('#efAllDay').checked, start = v('#efStart'), end = v('#efEnd') || start;
  const err = (t) => { const el = $('#efErr'); el.textContent = t; el.hidden = false; };
  if (!v('#efTitle')) return err('Indiquez un titre.');
  if (!start) return err('Indiquez la date de début.');
  if (end < start) return err('La fin doit être après le début.');
  if (!allDay && end === start && v('#efEndT') && v('#efEndT') <= v('#efStartT')) return err("L'heure de fin doit être après l'heure de début.");
  const addrOk = $('#efAddr').dataset.ok === '1' && !!v('#efAddr');
  if (v('#efAddr') && !addrOk) return err("Choisissez l'adresse dans la liste des suggestions pour qu'elle apparaisse sur la carte.");
  const repeat = $('#efRepeat').value;
  if (repeat !== 'none' && v('#efUntil') && v('#efUntil') < start) return err('La date de fin de répétition doit être après le début.');
  const row = {
    title: v('#efTitle'), category: $('#efCat').value, date: start, end_date: end === start ? null : end, all_day: allDay,
    start_time: allDay ? null : v('#efStartT') || null, end_time: allDay ? null : v('#efEndT') || null,
    location: v('#efLoc') || null, group_ids: [...document.querySelectorAll('[data-evgrp][aria-pressed="true"]')].map((b) => b.dataset.evgrp),
    address: addrOk ? v('#efAddr') : null, lat: addrOk ? Number($('#efAddr').dataset.lat) : null, lng: addrOk ? Number($('#efAddr').dataset.lng) : null, details: v('#efDetails') || null, repeat, repeat_until: repeat === 'none' ? null : v('#efUntil') || null
  };
  const id = S.evModal.ev.id;
  const r = id ? await sb.from('events').update(row).eq('id', id).select().single() : await sb.from('events').insert({ ...row, created_by: S.me.id }).select().single();
  if (r.error) return fail(r.error);
  S.events = S.events.filter((x) => x.id !== r.data.id).concat(r.data).sort((a, b) => a.date.localeCompare(b.date));
  S.evModal = null; render(); toast(id ? 'Événement modifié' : 'Événement ajouté');
}

function reactionsHtml(m, canDel) {
  const list = S.reacts[m.id] || [];
  const groups = {};
  list.forEach((x) => { (groups[x.emoji] = groups[x.emoji] || []).push(x.member_id); });
  const chips = Object.entries(groups).map(([e, who]) => {
    const mine = who.includes(S.me.id);
    const names = who.map((id) => display(member(id))).join(', ');
    return `<button class="react${mine ? ' mine' : ''}" data-react="${m.id}" data-emoji-r="${esc(e)}" title="${esc(names)}" aria-label="${esc(e)} ${who.length}, ${esc(names)}">${esc(e)} <span>${who.length}</span></button>`;
  }).join('');
  const picker = S.reactPicker === m.id ? `<span class="quick">${QUICK_REACTIONS.map((e) => `<button data-react="${m.id}" data-emoji-r="${e}" aria-label="Réagir ${e}">${e}</button>`).join('')}</span>` : '';
  return `<div class="reacts">${chips}<button class="react add" data-reactpick="${m.id}" aria-label="Ajouter une réaction" aria-expanded="${S.reactPicker === m.id}">${S.reactPicker === m.id ? '×' : '☺︎+'}</button>${picker}${canDel ? `<button class="del" data-delmsg="${m.id}" aria-label="Supprimer le message">Supprimer</button>` : ''}</div>`;
}
const chanObj = () => CHANNELS.find((x) => x.id === S.chan) || CHANNELS[0];
const chanLabel = (c) => `${c.announce ? '📣' : '#'} ${esc(c.name)}`;
const hm = (d) => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
function dayLabel(d) {
  const s = isoD(new Date(d)), t = today();
  if (s === t) return "Aujourd'hui";
  if (s === addDays(t, -1)) return 'Hier';
  return fmtLong(s, { weekday: 'long', day: 'numeric', month: 'long', ...(s.slice(0, 4) !== t.slice(0, 4) ? { year: 'numeric' } : {}) });
}
// Bulles façon messagerie : les miennes à droite, les messages qui se suivent du même auteur sont regroupés
function msgsHtml() {
  const c = chanObj(), list = S.msgs[S.chan];
  if (!list) return '<p class="chatempty">Chargement…</p>';
  if (!list.length) return `<p class="chatempty">${c.announce ? 'Aucune annonce pour l\'instant.' : 'Aucun message pour l\'instant. Écrivez le premier !'}</p>`;
  let prev = null;
  return list.map((m) => {
    const a = member(m.member_id), mine = m.member_id === S.me.id, k = grp(a?.group_id)?.color || 'var(--muted)';
    const day = isoD(new Date(m.created_at)), newDay = !prev || isoD(new Date(prev.created_at)) !== day;
    const cont = !newDay && prev.member_id === m.member_id && new Date(m.created_at) - new Date(prev.created_at) < 5 * 60000;
    prev = m;
    const canDel = can('discussion') || mine;
    return `${newDay ? `<div class="daysep"><span>${esc(dayLabel(m.created_at))}</span></div>` : ''}<div class="msg${mine ? ' mine' : ''}${cont ? ' cont' : ''}" style="--k:${k}">
      ${mine ? '' : `<div class="av">${esc(initial(a))}</div>`}<div class="b">${!mine && !cont ? `<div class="mwho">${esc(display(a))}</div>` : ''}
      <div class="bubble"><p>${esc(m.body)}</p><time datetime="${esc(m.created_at)}">${hm(m.created_at)}</time></div>
      ${reactionsHtml(m, canDel)}</div></div>`;
  }).join('');
}
// Redessine seulement la liste des messages : la zone d'écriture garde le focus et le clavier reste ouvert
function patchChat(toBottom) {
  const box = $('#msgs');
  if (!box || box.dataset.chan !== S.chan || S.view !== 'discussion') return render();
  const near = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
  box.innerHTML = msgsHtml();
  if (near || toBottom) box.scrollTop = box.scrollHeight;
  paintBadges();
}
function vChat() {
  const c = chanObj(), other = CHANNELS.some((x) => x.id !== S.chan && S.unread[x.id]);
  return `<div class="view chatview">
  <div class="chathead"><h1>Discussion</h1>
    <button class="chanbtn" data-chanpick aria-haspopup="dialog" aria-label="Canal : ${esc(c.name)}. Changer de canal"><span>${chanLabel(c)}</span><i class="cdot" id="chanDot" ${other ? '' : 'hidden'}></i>${ico('down')}</button></div>
  <div class="card chat">
    <div class="msgs" id="msgs" data-chan="${S.chan}">${msgsHtml()}</div>
    <div class="emojis" id="emojis" role="group" aria-label="Emojis" ${S.emojiOpen ? '' : 'hidden'}>${EMOJIS.map((e) => `<button type="button" data-emoji="${e}">${e}</button>`).join('')}</div>
    <form class="compose" id="compose"><button type="button" class="cbtn" data-emojitoggle aria-label="Emojis" aria-expanded="${S.emojiOpen}">😊</button><textarea id="msgIn" rows="1" placeholder="${c.announce ? 'Écrire une annonce' : 'Écrire un message'}" aria-label="Message" maxlength="4000"></textarea><button class="cbtn send" type="submit" aria-label="${c.announce ? 'Publier' : 'Envoyer'}">${ico('send')}</button></form>
  </div></div>`;
}
function chanSheet() {
  let lastH = '';
  const items = CHANNELS.map((x) => { let h = ''; if (x.h !== lastH) { h = `<div class="chh">${esc(x.h)}</div>`; lastH = x.h; } return h + `<button class="chanitem" data-chan="${x.id}" aria-current="${x.id === S.chan}"><span>${chanLabel(x)}</span>${badge(x.id, true)}</button>`; }).join('');
  return `<div class="modal" data-closemodal><div class="card sheet chansheet" role="dialog" aria-modal="true" aria-labelledby="chTitle">
    <div class="row" style="justify-content:space-between"><h2 id="chTitle">Canaux</h2><button class="btn small" data-closemodal aria-label="Fermer">✕</button></div>${items}</div></div>`;
}
function notifSheet() {
  const st = S.push;
  const dev = st === 'actif' ? `<div class="notifdev ok"><span><b>🔔 Activées sur cet appareil</b><small>Vous êtes prévenu·e pour les canaux cochés ci-dessous.</small></span><button class="btn small" data-push="off">Couper ici</button></div>`
    : st === 'non-supporte' ? `<div class="notifdev"><span><b>Pas disponible ici</b><small>${isIOS() && !isStandalone() ? 'Sur iPhone, ajoutez d\'abord le site à l\'écran d\'accueil (bouton Partager, puis « Sur l\'écran d\'accueil »), ouvrez-le depuis l\'icône, puis revenez ici.' : 'Ce navigateur ne permet pas les notifications. Essayez avec Chrome, Firefox, Edge ou Safari récent.'}</small></span></div>`
    : st === 'refuse' ? '<div class="notifdev"><span><b>Bloquées</b><small>Les notifications sont bloquées pour ce site. Autorisez-les dans les réglages du téléphone ou du navigateur, puis rechargez la page.</small></span></div>'
    : '<div class="notifdev"><span><b>Désactivées sur cet appareil</b><small>Activez-les pour être prévenu·e même quand le site est fermé.</small></span><button class="btn small primary" data-push="on">Activer</button></div>';
  return `<div class="modal" data-closemodal><div class="card sheet" role="dialog" aria-modal="true" aria-labelledby="ntTitle">
    <div class="row" style="justify-content:space-between"><h2 id="ntTitle">Notifications</h2><button class="btn small" data-closemodal aria-label="Fermer">✕</button></div>
    ${dev}
    <div class="row" style="justify-content:space-between"><b>Me prévenir pour</b><span class="row" style="gap:6px"><button class="btn small" data-notifall="all">Tout</button><button class="btn small" data-notifall="none">Aucun</button></span></div>
    <div class="switches">${CHANNELS.map((c) => `<button class="switchrow" role="switch" data-notifch="${c.id}" aria-checked="${S.notifCh.includes(c.id)}"><span>${chanLabel(c)}</span><i class="sw" aria-hidden="true"></i></button>`).join('')}</div>
    <small class="hint">Vos choix valent pour tous vos appareils. Pour ne plus rien recevoir, choisissez « Aucun » ou coupez les notifications sur ce téléphone.</small>
  </div></div>`;
}
async function setNotifCh(next) {
  const prev = S.notifCh; S.notifCh = CHANNELS.map((c) => c.id).filter((id) => next.includes(id)); render();
  const r = await sb.from('notif_prefs').upsert({ member_id: S.me.id, channels: S.notifCh, updated_at: new Date().toISOString() });
  if (r.error) { S.notifCh = prev; render(); fail(needSql(r.error)); }
}

/* ---------- Notifications sur téléphone (Web Push) ---------- */
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
function b64ToBytes(b64) {
  const s = atob((b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}
async function swReg() { return navigator.serviceWorker.register('sw.js'); }
async function checkPush() {
  if (!pushSupported()) { S.push = 'non-supporte'; return; }
  if (Notification.permission === 'denied') { S.push = 'refuse'; return; }
  try {
    const reg = await swReg(); const sub = await reg.pushManager.getSubscription();
    S.push = sub && Notification.permission === 'granted' ? 'actif' : 'inactif';
  } catch (e) { S.push = 'inactif'; }
}
async function enablePush() {
  if (!pushSupported()) { S.push = 'non-supporte'; return render(); }
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { S.push = perm === 'denied' ? 'refuse' : 'inactif'; return render(); }
    const reg = await swReg(); await navigator.serviceWorker.ready;
    const k = await sb.functions.invoke('notify', { body: { action: 'key' } });
    if (k.error || !k.data?.publicKey) throw new Error("le service de notifications n'est pas encore installé");
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(k.data.publicKey) });
    const j = sub.toJSON();
    await sb.from('push_subscriptions').delete().eq('endpoint', j.endpoint);
    const r = await sb.from('push_subscriptions').insert({ endpoint: j.endpoint, member_id: S.me.id, p256dh: j.keys.p256dh, auth: j.keys.auth });
    if (r.error) throw r.error;
    S.push = 'actif'; toast('Notifications activées');
  } catch (e) { fail(e); }
  render();
}
async function disablePush() {
  try {
    const reg = await swReg(); const sub = await reg.pushManager.getSubscription();
    if (sub) { await sb.from('push_subscriptions').delete().eq('endpoint', sub.endpoint); await sub.unsubscribe(); }
    S.push = 'inactif'; toast('Notifications désactivées');
  } catch (e) { fail(e); }
  render();
}
async function toggleReaction(id, emoji) {
  const l = S.reacts[id] || (S.reacts[id] = []);
  const mine = l.find((x) => x.member_id === S.me.id && x.emoji === emoji);
  S.reactPicker = null;
  if (mine) {
    S.reacts[id] = l.filter((x) => x !== mine); patchChat();
    const r = await sb.from('message_reactions').delete().match({ message_id: id, member_id: S.me.id, emoji });
    if (r.error) { l.push(mine); fail(r.error); patchChat(); }
  } else {
    const x = { message_id: id, member_id: S.me.id, emoji }; l.push(x); patchChat();
    const r = await sb.from('message_reactions').insert(x);
    if (r.error && r.error.code !== '23505') { S.reacts[id] = S.reacts[id].filter((y) => y !== x); fail(r.error); patchChat(); }
  }
}

// Espace de stockage gratuit Supabase : 1 Go. Calculé à partir de la taille des documents enregistrés.
const STORAGE_LIMIT = 1024 * 1048576;
function storageGauge() {
  const used = S.docs.reduce((t, d) => t + (d.size_bytes || 0), 0);
  const pct = Math.min(100, (used / STORAGE_LIMIT) * 100);
  const state = pct >= 90 ? 'var(--c-red)' : pct >= 75 ? 'var(--c-yellow)' : 'var(--green)';
  const mo = (used / 1048576).toLocaleString('fr-FR', { maximumFractionDigits: 1 });
  return `<div class="card"><div class="row" style="justify-content:space-between;margin-bottom:8px"><h3>Espace de stockage</h3><b style="font-variant-numeric:tabular-nums">${mo} Mo sur 1 Go</b></div>
    <div class="gauge" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct.toFixed(0)}" aria-label="Espace de stockage utilisé"><span style="width:${Math.max(pct, 0.5)}%;background:${state}"></span></div>
    <p style="color:var(--muted);font-size:.85rem;margin-top:8px">${pct.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} % utilisés par ${S.docs.length} document${S.docs.length > 1 ? 's' : ''}.${pct >= 75 ? ' Pensez à supprimer les fichiers inutiles ou à mettre les vidéos sur YouTube.' : ''}</p></div>
`;
}

function vAdmin() {
  if (!canAdminPage()) return '<div class="view"><div class="empty">Page réservée aux administrateurs.</div></div>';
  const admin = S.me.is_admin;
  const inv = (id) => S.invitations.find((i) => i.member_id === id)?.email || '';
  const opts = (arr, val, empty) => `<option value="">${empty}</option>` + arr.map((x) => `<option value="${x.id}" ${x.id === val ? 'selected' : ''}>${esc(x.name)}</option>`).join('');
  const row = (m) => {
    const ro = !admin && m.is_admin ? 'disabled' : ''; // la fiche d'un administrateur n'est modifiable que par un administrateur
    return `<tr data-member="${m.id}">
    <td><select data-f="title" ${ro}>${['Chef', 'Cheftaine', 'Tata'].map((t) => `<option ${t === m.title ? 'selected' : ''}>${t}</option>`).join('')}</select></td>
    <td><input data-f="first_name" value="${esc(m.first_name)}" aria-label="Prénom" ${ro}></td>
    <td><select data-f="group_id" ${ro}>${opts(S.groups, m.group_id, 'Aucun')}</select></td>
    <td><select data-f="pole_id" ${ro}>${opts(S.poles, m.pole_id, 'À attribuer')}</select></td>
    <td><select data-f="role" ${ro}>${Object.entries(ROLES).map(([k, v]) => `<option value="${k}" ${k === m.role ? 'selected' : ''}>${v}</option>`).join('')}</select></td>
    <td><input data-f="email" type="email" value="${esc(inv(m.id))}" placeholder="adresse@exemple.fr" aria-label="E-mail" ${ro}></td>
    <td style="text-align:center">${admin ? `<input data-f="is_admin" type="checkbox" ${m.is_admin ? 'checked' : ''} aria-label="Administrateur">` : m.is_admin ? 'Oui' : ''}</td>
    <td style="font-size:.8rem;color:var(--muted)">${m.user_id ? 'Compte créé' : inv(m.id) ? 'Invité' : 'Pas d\'accès'}</td>
    <td style="white-space:nowrap">${ro ? '' : '<button class="btn small" data-savemember>Enregistrer</button> <button class="btn small danger" data-delmember>Retirer</button>'}</td></tr>`;
  };
  const permRow = (m) => `<tr><td><b>${esc(display(m))}</b>${m.user_id ? '' : '<small style="display:block;color:var(--muted)">Pas encore de compte</small>'}</td>${m.is_admin
    ? `<td colspan="${PERMS.length}" style="color:var(--green-ink);font-weight:700">Administrateur : toutes les autorisations</td>`
    : PERMS.map(([k, l]) => `<td style="text-align:center"><input type="checkbox" data-perm="${k}" data-pmember="${m.id}" ${(m.permissions || []).includes(k) ? 'checked' : ''} aria-label="${esc(l)} pour ${esc(display(m))}"></td>`).join('')}</tr>`;
  return `<div class="view">
  <div><span class="eyebrow">${admin ? 'Réservé aux administrateurs' : 'Gestion des chefs et des groupes'}</span><h1>Administration</h1>
    <p class="lead" style="margin-top:6px">Ajoutez l'e-mail d'un chef pour lui donner accès : il pourra ensuite créer son compte depuis la page de connexion. Pour retirer un accès, effacez son e-mail ou retirez la personne.</p></div>
  ${storageGauge()}
  ${admin ? `<div class="card vitrineadm"><div>${S.vitrine ? `<img src="${esc(S.vitrine.url)}" alt="">` : `<span>${ico('up')}</span>`}</div><div style="min-width:0"><h3>Photo de l'accueil</h3>
    <p style="color:var(--muted);font-size:.9rem;margin:4px 0 10px">Elle s'affiche en haut de l'accueil avec un effet animé. Une image détourée (PNG sans fond) rend le mieux. Elle reste privée : seuls les chefs connectés la voient.</p>
    <div class="row"><label class="btn small${S.vitrineBusy ? ' disabled' : ''}">${ico('up')} ${S.vitrineBusy ? 'Envoi…' : S.vitrine ? 'Changer la photo' : 'Choisir une photo'}<input type="file" id="vitrineFile" accept="image/png,image/webp,image/jpeg" hidden ${S.vitrineBusy ? 'disabled' : ''}></label>
    ${S.vitrine ? '<button class="btn small danger" data-vitrineclear>Retirer</button>' : ''}</div></div></div>` : ''}
  ${admin ? `<div class="card"><h3>Autorisations</h3><p style="color:var(--muted);font-size:.9rem;margin:4px 0 10px">Cochez ce que chaque chef peut faire en plus de consulter, déposer des documents et écrire. Chaque case est enregistrée tout de suite. Seuls les administrateurs donnent des autorisations.</p>
    <div class="tablewrap"><table class="perms"><thead><tr><th>Chef ou cheftaine</th>${PERMS.map(([k, l, d]) => `<th title="${esc(d)}">${esc(l)}<small>${esc(d)}</small></th>`).join('')}</tr></thead>
    <tbody>${S.members.map(permRow).join('')}</tbody></table></div></div>` : ''}
  <div class="card"><h3 style="margin-bottom:10px">Chefs et cheftaines</h3><div class="tablewrap"><table class="admin">
    <thead><tr><th>Titre</th><th>Prénom</th><th>Groupe</th><th>Pôle</th><th>Rôle</th><th>E-mail d'accès</th><th>Admin</th><th>Accès</th><th></th></tr></thead>
    <tbody>${S.members.map(row).join('')}</tbody></table></div></div>
  <form class="card" id="addMember"><h3 style="margin-bottom:10px">Ajouter une personne</h3><div class="formrow">
    <label class="field" for="nmTitle">Titre<select id="nmTitle"><option>Cheftaine</option><option>Chef</option><option>Tata</option></select></label>
    <label class="field" for="nmName">Prénom<input id="nmName" required></label>
    <label class="field" for="nmGroup">Groupe<select id="nmGroup">${opts(S.groups, '', 'Aucun')}</select></label>
    <label class="field" for="nmPole">Pôle<select id="nmPole">${opts(S.poles, '', 'À attribuer')}</select></label>
    <label class="field" for="nmRole">Rôle<select id="nmRole">${Object.entries(ROLES).map(([k, v]) => `<option value="${k}" ${k === 'chef' ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
    <label class="field" for="nmEmail">E-mail (facultatif)<input id="nmEmail" type="email"></label>
    <button class="btn primary" type="submit">Ajouter</button></div></form>
  <div class="card"><h3 style="margin-bottom:10px">Tranches d'âge des groupes</h3><div class="formrow">
    ${S.groups.map((g) => `<label class="field" for="age-${g.id}">${esc(g.name)}<input id="age-${g.id}" data-age="${g.id}" value="${esc(g.age_range || '')}" placeholder="ex. 7 à 9 ans"></label>`).join('')}
    <button class="btn" data-saveages>Enregistrer les âges</button></div></div>
  </div>`;
}

/* ---------- Réclamations (remboursement des achats payés par les chefs) ---------- */
const REC_STATUS = { en_attente: ['En attente', 'var(--c-yellow)'], rembourse: ['Remboursée', 'var(--green)'], refuse: ['Refusée', 'var(--c-red)'] };
const euros = (n) => Number(n).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
const sumOf = (list) => list.reduce((t, r) => t + Number(r.amount), 0);
const recPending = () => S.reclamations.filter((r) => r.status === 'en_attente');
function recCard(r, manage) {
  const [label, k] = REC_STATUS[r.status] || REC_STATUS.en_attente;
  const by = member(r.member_id), g = grp(r.group_id), pb = member(r.processed_by), pending = r.status === 'en_attente';
  return `<div class="card recl" style="--k:${k}">
    <div class="rhead"><b class="amt">${euros(r.amount)}</b><span class="pill"><span class="dot" style="--k:${k}"></span>${label}</span></div>
    ${manage ? (by ? chefChip(by) : '<div class="m">Ancien membre</div>') : ''}
    <p class="rdesc">${esc(r.description)}</p>
    <div class="m">Achat du ${fmtDate(r.purchase_date)}${g ? ' · ' + esc(g.name) : " · Toute l'unité"} · demandé le ${fmtDate(r.created_at)}</div>
    ${pending ? '' : `<div class="rnote">${label}${r.processed_at ? ' le ' + fmtDate(r.processed_at) : ''}${pb ? ' par ' + esc(display(pb)) : ''}${r.admin_note ? ' : ' + esc(r.admin_note) : ''}</div>`}
    <div class="row">${r.receipt_path ? `<button class="btn small" data-recreceipt="${r.id}">Voir le justificatif</button>` : '<span class="m">Pas de justificatif</span>'}
      ${!manage && pending && r.member_id === S.me.id ? `<button class="btn small danger" data-recdel="${r.id}">Annuler la demande</button>` : ''}
      ${manage && !pending ? `<button class="btn small" data-recreset="${r.id}">Remettre en attente</button>` : ''}</div>
    ${manage && pending ? `<div class="rproc"><label class="field" for="note-${r.id}">Note (obligatoire pour un refus)<input id="note-${r.id}" maxlength="500" placeholder="Ex. virement du 14/10, espèces…"></label>
      <div class="row"><button class="btn small primary" data-recset="rembourse" data-recid="${r.id}">✓ Marquer remboursée</button><button class="btn small danger" data-recset="refuse" data-recid="${r.id}">Refuser</button></div></div>` : ''}
  </div>`;
}
function recMine() {
  const mine = S.reclamations.filter((r) => r.member_id === S.me.id);
  const wait = mine.filter((r) => r.status === 'en_attente');
  return `<form class="card recform" id="recForm" novalidate><h3>Nouvelle réclamation</h3>
    <div class="formrow">
      <label class="field" for="rcAmount">Montant (€)<input id="rcAmount" inputmode="decimal" autocomplete="off" required placeholder="Ex. 12,50"></label>
      <label class="field" for="rcDate">Date de l'achat<input id="rcDate" type="date" required max="${today()}" value="${today()}"></label>
      <label class="field" for="rcGroup">Pour<select id="rcGroup"><option value="">Toute l'unité</option>${S.groups.map((g) => `<option value="${g.id}" ${g.id === S.me.group_id ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select></label>
    </div>
    <label class="field" for="rcDesc">Description<textarea id="rcDesc" required maxlength="1000" placeholder="Ce qui a été acheté, où, et pour quelle activité. Ex. goûter et matériel de bricolage pour le samedi scout du 7 novembre (Carrefour)."></textarea></label>
    <label class="field" for="rcFile">Justificatif : photo du ticket de caisse ou facture (recommandé)<input id="rcFile" type="file" accept="image/*,application/pdf"></label>
    <p class="err" id="rcErr" role="alert" hidden></p>
    <div class="row" style="justify-content:flex-end"><button class="btn primary" type="submit">Envoyer la réclamation</button></div>
  </form>
  <div class="row" style="justify-content:space-between"><h3>Mes réclamations</h3>${wait.length ? `<span class="pill">${euros(sumOf(wait))} en attente de remboursement</span>` : ''}</div>
  ${mine.length ? `<div class="recs">${mine.map((r) => recCard(r, false)).join('')}</div>` : '<div class="empty">Aucune réclamation pour le moment.</div>'}`;
}
function recManage() {
  const all = S.reclamations, by = (st) => all.filter((r) => r.status === st);
  const F = [['en_attente', 'En attente'], ['rembourse', 'Remboursées'], ['refuse', 'Refusées'], ['all', 'Toutes']];
  // En attente : la plus ancienne en premier, comme une file d'attente
  const list = S.recFilter === 'all' ? all : S.recFilter === 'en_attente' ? by('en_attente').reverse() : by(S.recFilter);
  return `<div class="stats recstats">
    <div class="stat"><b>${by('en_attente').length}</b><span>en attente</span></div>
    <div class="stat"><b>${euros(sumOf(by('en_attente')))}</b><span>à rembourser</span></div>
    <div class="stat"><b>${euros(sumOf(by('rembourse')))}</b><span>déjà remboursés</span></div>
    <div class="stat"><b>${all.length}</b><span>réclamation${all.length > 1 ? 's' : ''} au total</span></div>
  </div>
  <div class="chips">${F.map(([k, l]) => `<button data-recfilter="${k}" aria-pressed="${S.recFilter === k}">${l} (${k === 'all' ? all.length : by(k).length})</button>`).join('')}</div>
  ${list.length ? `<div class="recs">${list.map((r) => recCard(r, true)).join('')}</div>` : `<div class="empty">${S.recFilter === 'en_attente' ? 'Aucune réclamation en attente : tout est remboursé.' : 'Aucune réclamation ici.'}</div>`}`;
}
function vRecl() {
  if (!canRecl()) return '<div class="view"><div class="empty">Page réservée aux personnes autorisées par un administrateur.</div></div>';
  const both = can('reclamation') && can('remboursement');
  const tab = !can('remboursement') ? 'mes' : !can('reclamation') ? 'gestion' : S.recTab;
  const n = recPending().length;
  return `<div class="view">
  <div><span class="eyebrow">Remboursement des achats</span><h1>Réclamations</h1>
    <p class="lead" style="margin-top:6px">${tab === 'mes' ? "Vous avez payé de votre poche un achat pour l'unité ? Faites votre demande ici avec le ticket de caisse, et suivez son statut jusqu'au remboursement." : 'Toutes les demandes de remboursement des chefs et cheftaines. Une fois le remboursement fait, marquez la réclamation comme remboursée : la personne le voit tout de suite.'}</p></div>
  ${both ? `<div><div class="seg" role="group" aria-label="Affichage"><button data-rectab="mes" aria-pressed="${tab === 'mes'}">Mes réclamations</button><button data-rectab="gestion" aria-pressed="${tab === 'gestion'}">Toutes${n ? ` (${n} en attente)` : ''}</button></div></div>` : ''}
  ${tab === 'mes' ? recMine() : recManage()}
  </div>`;
}
async function submitRecl(form) {
  const err = (t) => { const el = $('#rcErr'); el.textContent = t; el.hidden = false; };
  const raw = $('#rcAmount').value.replace(/[\s€]/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(raw) || Number(raw) <= 0) return err('Indiquez un montant valide, par exemple 12,50.');
  if (Number(raw) >= 100000) return err('Ce montant est trop élevé.');
  const date = $('#rcDate').value;
  if (!date) return err("Indiquez la date de l'achat.");
  if (date > today()) return err("La date de l'achat ne peut pas être dans le futur.");
  const description = $('#rcDesc').value.trim();
  if (!description) return err('Décrivez ce qui a été acheté et pour quelle activité.');
  const f0 = $('#rcFile').files[0];
  $('#rcErr').hidden = true;
  const btn = form.querySelector('[type=submit]'); btn.disabled = true; btn.textContent = 'Envoi…'; S.recBusy = true;
  let path = null;
  try {
    if (f0) {
      const f = await compressImage(f0);
      if (f.size > 10 * 1048576) throw new Error('le justificatif dépasse 10 Mo');
      const ext = (f.name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'jpg';
      path = `${S.session.user.id}/${crypto.randomUUID()}.${ext}`;
      const up = await sb.storage.from('justificatifs').upload(path, f, { contentType: f.type || undefined });
      if (up.error) { path = null; throw up.error; }
    }
    const r = await sb.from('reclamations').insert({ member_id: S.me.id, amount: Number(raw), purchase_date: date, description, group_id: $('#rcGroup').value || null, receipt_path: path }).select().single();
    if (r.error) throw r.error;
    S.reclamations.unshift(r.data); S.recBusy = false; render(); toast('Réclamation envoyée');
  } catch (e) {
    console.error(e);
    if (path) await sb.storage.from('justificatifs').remove([path]);
    S.recBusy = false; btn.disabled = false; btn.textContent = 'Envoyer la réclamation';
    err('Erreur : ' + (e?.message || "la réclamation n'a pas pu être envoyée"));
  }
}
async function setRecStatus(id, status) {
  const r0 = S.reclamations.find((x) => x.id === id); if (!r0) return;
  const note = status === 'en_attente' ? null : $('#note-' + id)?.value.trim() || null;
  if (status === 'refuse' && !note) { toast('Indiquez la raison du refus dans la note.'); $('#note-' + id)?.focus(); return; }
  const r = await sb.from('reclamations').update({ status, admin_note: note }).eq('id', id).select().single();
  if (r.error) return fail(r.error);
  Object.assign(r0, r.data); render();
  toast({ rembourse: 'Réclamation marquée remboursée', refuse: 'Réclamation refusée', en_attente: 'Réclamation remise en attente' }[status]);
}
async function openReceipt(id) {
  const r0 = S.reclamations.find((x) => x.id === id); if (!r0?.receipt_path) return;
  const w = window.open('', '_blank');
  const { data, error } = await sb.storage.from('justificatifs').createSignedUrl(r0.receipt_path, 3600);
  if (error) { w?.close(); return fail(error); }
  if (w) w.location = data.signedUrl; else location.href = data.signedUrl;
}

/* ---------- Adresses (Base Adresse Nationale) et carte des activités ---------- */
const hasCoords = (e) => e && e.lat != null && e.lng != null;
const evGroups = (e) => (e.group_ids || []).map(grp).filter(Boolean);
const grpPills = (e) => { const gs = evGroups(e); return `<div class="row" style="gap:6px">${gs.length ? gs.map((g) => `<span class="pill"><span class="dot" style="--k:${g.color}"></span>${esc(g.name)}</span>`).join('') : '<span class="pill"><span class="dot"></span>Toute l\'unité</span>'}</div>`; };
const placeLinks = (e) => `<a class="btn small" href="https://waze.com/ul?ll=${e.lat},${e.lng}&navigate=yes" target="_blank" rel="noopener">Waze</a><a class="btn small" href="https://www.google.com/maps/dir/?api=1&destination=${e.lat},${e.lng}" target="_blank" rel="noopener">Google Maps</a>`;

// Service public et gratuit de l'IGN : toutes les adresses de France, sans clé
const GEOCODER = 'https://data.geopf.fr/geocodage/search';
let addrTimer = null, addrCtrl = null, addrItems = [], addrActive = -1;
function addrInput(inp) {
  delete inp.dataset.ok; delete inp.dataset.lat; delete inp.dataset.lng;
  $('#efAddrHint').textContent = 'Choisissez une adresse dans les suggestions (toutes les adresses de France).';
  clearTimeout(addrTimer);
  const q = inp.value.trim();
  if (q.length < 3) return addrClose();
  addrTimer = setTimeout(async () => {
    addrCtrl?.abort(); addrCtrl = new AbortController();
    try {
      // Priorité aux adresses proches de l'Île-de-France, sans exclure le reste du pays
      const r = await fetch(`${GEOCODER}?q=${encodeURIComponent(q)}&autocomplete=1&limit=7&lat=48.85&lon=2.35`, { signal: addrCtrl.signal });
      const j = await r.json();
      addrItems = (j.features || []).map((f) => ({ label: f.properties.label, ctx: f.properties.context, type: f.properties.type, lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] }));
      addrShow();
    } catch (e) { if (e.name !== 'AbortError') { addrItems = []; addrShow('Recherche d\'adresse indisponible pour le moment.'); } }
  }, 180);
}
function addrShow(msg) {
  const ul = $('#efAddrList'); if (!ul) return;
  addrActive = -1;
  ul.innerHTML = addrItems.length ? addrItems.map((a, i) => `<li role="option" id="addr-${i}" data-addr="${i}"><b>${esc(a.label)}</b><small>${esc(a.ctx || '')}</small></li>`).join('') : `<li class="none">${esc(msg || 'Aucune adresse trouvée. Vérifiez l\'orthographe ou ajoutez la ville.')}</li>`;
  ul.hidden = false; $('#efAddr').setAttribute('aria-expanded', 'true');
}
function addrClose() { const ul = $('#efAddrList'); if (ul) ul.hidden = true; $('#efAddr')?.setAttribute('aria-expanded', 'false'); addrActive = -1; }
function addrPick(i) {
  const a = addrItems[i], inp = $('#efAddr'); if (!a || !inp) return;
  inp.value = a.label; inp.dataset.lat = a.lat; inp.dataset.lng = a.lng; inp.dataset.ok = '1';
  $('#efAddrHint').textContent = '✓ Adresse vérifiée'; addrClose();
}
function addrKey(e) {
  const ul = $('#efAddrList'); if (!ul || ul.hidden || !addrItems.length) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault(); addrActive = (addrActive + (e.key === 'ArrowDown' ? 1 : -1) + addrItems.length) % addrItems.length;
    ul.querySelectorAll('li').forEach((li, i) => li.setAttribute('aria-selected', i === addrActive));
    $('#efAddr').setAttribute('aria-activedescendant', 'addr-' + addrActive);
  } else if (e.key === 'Enter') { e.preventDefault(); addrPick(Math.max(addrActive, 0)); }
  else if (e.key === 'Escape') { e.stopPropagation(); addrClose(); }
}

// Carte : MapLibre (libre) + fonds de carte OpenFreeMap (gratuits, sans clé), chargés seulement sur cet onglet
const MAP_JS = 'https://cdn.jsdelivr.net/npm/maplibre-gl@5.24.0/dist/maplibre-gl.js';
const MAP_CSS = 'https://cdn.jsdelivr.net/npm/maplibre-gl@5.24.0/dist/maplibre-gl.css';
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const IDF = { center: [2.35, 48.78], zoom: 8.7 };
const PERIODS = [[30, '30 prochains jours'], [90, '3 prochains mois'], [365, '12 prochains mois']];
let mapLib = null, mapInst = null, mapMarkers = [];
function loadMapLib() {
  if (!mapLib) mapLib = new Promise((ok, ko) => {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = MAP_CSS; document.head.append(l);
    const sc = document.createElement('script'); sc.src = MAP_JS; sc.onload = () => ok(window.maplibregl); sc.onerror = () => { mapLib = null; ko(new Error('carte indisponible')); }; document.head.append(sc);
  });
  return mapLib;
}
// Une ligne par activité : la prochaine date des événements qui se répètent
function mapItems() {
  const from = today(), to = addDays(from, S.mapPeriod);
  const seen = new Set(), out = [];
  for (const o of occurrences(from, to)) {
    if (!hasCoords(o.e) || seen.has(o.e.id)) continue;
    const gs = o.e.group_ids || [];
    if (S.mapGroups.length && gs.length && !gs.some((g) => S.mapGroups.includes(g))) continue;
    seen.add(o.e.id); out.push(o);
  }
  return out;
}
const pinColor = (e) => { const gs = evGroups(e); return gs.length === 1 ? gs[0].color : gs.length ? `conic-gradient(${gs.map((g, i) => `${g.color} ${(i / gs.length) * 360}deg ${((i + 1) / gs.length) * 360}deg`).join(',')})` : 'var(--green)'; };
const shortWhen = (o) => `${cap(parseD(o.start).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }))}${isTimed(o) ? ' · ' + fmtHM(o.e.start_time) : ''}`;
function mapListHtml(items) {
  if (!items.length) return `<div class="empty">Aucune activité avec une adresse sur cette période.${can('calendrier') ? ' Ajoutez une adresse à un événement depuis le Calendrier.' : ''}</div>`;
  return items.map((o) => `<button class="mapitem" data-mapgo="${o.e.id}"><span class="mpin" style="--pin:${pinColor(o.e)}"></span><span><small>${esc(shortWhen(o))}</small><b>${esc(o.e.title)}</b><small>${esc(o.e.location ? o.e.location + ' · ' : '')}${esc(o.e.address)}</small></span></button>`).join('');
}
function popupHtml(list) {
  return list.map((o) => `<div class="mpop"><small>${esc(shortWhen(o))}</small><b>${esc(o.e.title)}</b>${grpPills(o.e)}<small>${esc(o.e.location ? o.e.location + ' · ' : '')}${esc(o.e.address)}</small></div>`).join('<hr>')
    + `<div class="row" style="gap:6px;margin-top:8px">${placeLinks(list[0].e)}</div>`;
}
function vMap() {
  return `<div class="view wide">
  <div><span class="eyebrow">Prochaines activités</span><h1>Localisation</h1></div>
  <div class="maplayout">
    <aside class="card mapside">
      <div class="field"><span>Groupes</span><div class="grpchips" role="group" aria-label="Filtrer par groupe">
        <button type="button" data-mapgrp="" aria-pressed="${!S.mapGroups.length}"><span class="dot"></span>Tous</button>
        ${S.groups.map((g) => `<button type="button" data-mapgrp="${g.id}" aria-pressed="${S.mapGroups.includes(g.id)}" style="--k:${g.color}"><span class="dot"></span>${esc(g.name)}</button>`).join('')}</div></div>
      <label class="field" for="mapPeriod">Période<select id="mapPeriod">${PERIODS.map(([d, l]) => `<option value="${d}" ${d === S.mapPeriod ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <div class="maplist" id="mapList">${mapListHtml(mapItems())}</div>
    </aside>
    <div class="mapbox card"><div id="map" role="region" aria-label="Carte des activités"></div>
      <div class="maptools"><button class="btn small" data-mapidf>Île-de-France</button><button class="btn small" data-mapfr>France entière</button></div>
      <div class="maploading" id="mapLoading">Chargement de la carte…</div></div>
  </div></div>`;
}
async function initMap() {
  const el = $('#map'); if (!el) return;
  let ml; try { ml = await loadMapLib(); } catch (e) { $('#mapLoading').textContent = 'La carte ne peut pas être chargée. Vérifiez la connexion internet.'; return; }
  if (!el.isConnected) return;
  mapInst?.remove();
  const st = S.mapState || IDF;
  mapInst = new ml.Map({ container: el, style: MAP_STYLE, center: st.center, zoom: st.zoom, attributionControl: { compact: true }, cooperativeGestures: false, maxPitch: 0, dragRotate: false });
  mapInst.touchZoomRotate.disableRotation();
  mapInst.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right');
  mapInst.addControl(new ml.GeolocateControl({ positionOptions: { enableHighAccuracy: true } }), 'top-right');
  mapInst.addControl(new ml.FullscreenControl(), 'top-right');
  mapInst.addControl(new ml.ScaleControl({ unit: 'metric' }), 'bottom-left');
  mapInst.on('load', () => $('#mapLoading')?.remove());
  mapInst.on('moveend', () => { if (mapInst) S.mapState = { center: mapInst.getCenter().toArray(), zoom: mapInst.getZoom() }; });
  drawMarkers();
  if (S.mapFocus) { const id = S.mapFocus; S.mapFocus = null; focusOnMap(id); }
}
function drawMarkers() {
  if (!mapInst || !window.maplibregl) return;
  mapMarkers.forEach((m) => m.remove()); mapMarkers = [];
  // Activités au même endroit : un seul repère
  const spots = new Map();
  for (const o of mapItems()) { const k = o.e.lat.toFixed(5) + ',' + o.e.lng.toFixed(5); (spots.get(k) || spots.set(k, []).get(k)).push(o); }
  for (const list of spots.values()) {
    const e = list[0].e, el = document.createElement('button');
    el.className = 'mappin'; el.type = 'button'; el.style.setProperty('--pin', pinColor(e));
    el.setAttribute('aria-label', list.map((o) => o.e.title).join(', '));
    el.innerHTML = `<span><i>${list.length > 1 ? list.length : esc(initial({ first_name: e.title }))}</i></span>`;
    const popup = new maplibregl.Popup({ offset: 30, maxWidth: '300px', closeButton: true }).setHTML(popupHtml(list));
    const mk = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([e.lng, e.lat]).setPopup(popup).addTo(mapInst);
    mk._ids = list.map((o) => o.e.id); mapMarkers.push(mk);
  }
}
function refreshMap() {
  const l = $('#mapList'); if (l) l.innerHTML = mapListHtml(mapItems());
  document.querySelectorAll('[data-mapgrp]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.mapgrp ? S.mapGroups.includes(b.dataset.mapgrp) : !S.mapGroups.length));
  drawMarkers();
}
function focusOnMap(id) {
  const mk = mapMarkers.find((m) => m._ids.includes(id)); if (!mk || !mapInst) return;
  mapMarkers.forEach((m) => m.getPopup()?.isOpen() && m.togglePopup());
  mapInst.flyTo({ center: mk.getLngLat(), zoom: Math.max(mapInst.getZoom(), 14), speed: 1.4 });
  mk.togglePopup();
  if (matchMedia('(max-width:860px)').matches) $('#map')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/* ---------- Rendu ---------- */
function render() {
  if (!S.session) { root.innerHTML = vAuth(); return; }
  if (authMode === 'newpass') { root.innerHTML = vAuth(); return; }
  if (!S.me) {
    root.innerHTML = `<div class="auth"><div class="card"><div class="logo"><img src="assets/logo.png" alt=""><h2>Accès en attente</h2></div><p>Votre compte (${esc(S.session.user.email)}) n'est relié à aucun chef ou cheftaine. Demandez à un administrateur d'ajouter cette adresse dans la page Administration, puis reconnectez-vous.</p><button class="btn block" data-logout>Se déconnecter</button></div></div>`;
    return;
  }
  const V = { reclamations: vRecl, localisation: vMap, accueil: vAccueil, organigramme: vOrg, poles: vPoles, groupes: vGroupes, bibliotheque: vBiblio, calendrier: vCal, discussion: vChat, administration: vAdmin };
  const active = document.activeElement?.id; const pos = document.activeElement?.selectionStart;
  const draft = $('#msgIn')?.value;
  const sheet = S.view === 'calendrier' && S.evModal ? evModal() : S.sheet === 'notif' ? notifSheet() : S.sheet === 'chan' ? chanSheet() : S.sheet?.startsWith('stat:') ? statSheet(S.sheet.slice(5)) : '';
  // Discussion : la page ne défile plus, seuls les messages défilent
  document.documentElement.classList.toggle('chatmode', S.view === 'discussion');
  root.innerHTML = `<div class="app"><aside class="side">
    <div class="topline"><div class="brand"><img src="assets/logo.png" alt="Logo des Travailleurs de l'Imam"><div><b>Travailleurs<br>de l'Imam</b><small>Scouts · Bayt ul Mahdi</small></div></div>${bellHtml()}</div>
    <nav class="nav" aria-label="Menu principal">${navHtml()}</nav>
    <div class="who"><label>Connecté·e</label><b>${esc(display(S.me))}</b><button class="logout" data-logout>Se déconnecter</button></div>
  </aside><main id="main">${(V[S.view] || vAccueil)()}</main>${tabbarHtml()}${sheet}</div>`;
  const m = $('#msgs'); if (m) m.scrollTop = m.scrollHeight;
  if (S.view === 'localisation') initMap(); else if (mapInst) { mapInst.remove(); mapInst = null; mapMarkers = []; }
  const ts = $('#tscroll'); if (ts) { ts.scrollTop = S.calScroll ?? 7 * HOUR_H; ts.addEventListener('scroll', () => (S.calScroll = ts.scrollTop), { passive: true }); }
  if (active === 'libQ') { const i = $('#libQ'); i.focus(); try { i.setSelectionRange(pos, pos); } catch (e) {} }
  if (draft && $('#msgIn')) { $('#msgIn').value = draft; growMsg(); }
  if (active === 'msgIn') { const i = $('#msgIn'); i?.focus(); try { i.setSelectionRange(pos, pos); } catch (e) {} }
  if (!$('#msgIn')) document.documentElement.classList.remove('typing');
}

/* ---------- Écran fixe : pas de zoom avec les doigts, la discussion suit le clavier ---------- */
// La zone d'écriture grandit avec le texte (jusqu'à un tiers de l'écran), puis défile
function growMsg() {
  const i = $('#msgIn'); if (!i) return;
  i.style.height = 'auto';
  const max = Math.round((window.visualViewport?.height || innerHeight) * 0.33);
  i.style.height = Math.min(i.scrollHeight + 2, max) + 'px';
  i.style.overflowY = i.scrollHeight + 2 > max ? 'auto' : 'hidden';
}
// Hauteur réellement visible (sans le clavier) : la discussion s'y ajuste
function syncViewport() {
  const v = window.visualViewport, st = document.documentElement.style;
  st.setProperty('--vvh', (v ? v.height : innerHeight) + 'px');
  st.setProperty('--vvtop', (v ? v.offsetTop : 0) + 'px');
  const m = $('#msgs'); if (m && document.activeElement?.id === 'msgIn') m.scrollTop = m.scrollHeight;
}
window.visualViewport?.addEventListener('resize', syncViewport);
window.visualViewport?.addEventListener('scroll', syncViewport);
addEventListener('resize', syncViewport);
syncViewport();
// iPhone ignore « user-scalable=no » : on bloque nous-mêmes le pincement (la carte garde son propre zoom)
document.addEventListener('gesturestart', (e) => { if (!e.target.closest?.('.maplibregl-map')) e.preventDefault(); });
document.addEventListener('touchmove', (e) => { if (e.touches.length > 1 && !e.target.closest?.('.maplibregl-map')) e.preventDefault(); }, { passive: false });
// Pendant l'écriture, la barre d'onglets du bas disparaît pour laisser la place
document.addEventListener('focusin', (e) => { if (e.target.id === 'msgIn') { document.documentElement.classList.add('typing'); setTimeout(syncViewport, 50); } });
document.addEventListener('focusout', (e) => {
  if (e.target.id !== 'msgIn') return;
  setTimeout(() => { if (document.activeElement?.id !== 'msgIn') { document.documentElement.classList.remove('typing'); syncViewport(); } }, 120);
});
// Toucher le bouton Envoyer ou Emojis ne ferme pas le clavier
root.addEventListener('mousedown', (e) => { if (e.target.closest('.compose .cbtn') && document.activeElement?.id === 'msgIn') e.preventDefault(); });

/* ---------- Événements ---------- */
root.addEventListener('click', async (e) => {
  const t = e.target;
  const a = t.closest('[data-auth]'); if (a) { authMode = a.dataset.auth; authErr = authMsg = ''; render(); return; }
  if (t.closest('[data-logout]')) { await sb.auth.signOut(); return; }
  const nv = t.closest('button[data-v]'); if (nv) return go(nv.dataset.v);
  if (t.closest('[data-more]')) { S.moreOpen = !S.moreOpen; return render(); }
  if (t.closest('[data-vitrineclear]')) return clearVitrine();
  if (t.matches('[data-closemore]')) { S.moreOpen = false; return render(); }
  // Carte et adresses
  const ad = t.closest('[data-addr]'); if (ad) return addrPick(Number(ad.dataset.addr));
  const eg = t.closest('[data-evgrp]'); if (eg) { eg.setAttribute('aria-pressed', eg.getAttribute('aria-pressed') !== 'true'); return; }
  const mg = t.closest('[data-mapgrp]'); if (mg) { const id = mg.dataset.mapgrp; S.mapGroups = !id ? [] : S.mapGroups.includes(id) ? S.mapGroups.filter((x) => x !== id) : [...S.mapGroups, id]; return refreshMap(); }
  const mgo = t.closest('[data-mapgo]'); if (mgo) return focusOnMap(mgo.dataset.mapgo);
  const mf = t.closest('[data-mapfocus]'); if (mf) { S.mapFocus = mf.dataset.mapfocus; const e = S.events.find((x) => String(x.id) === mf.dataset.mapfocus); if (e) S.mapState = { center: [e.lng, e.lat], zoom: 14 }; return go('localisation'); }
  if (t.closest('[data-mapidf]')) return mapInst?.flyTo({ ...IDF, speed: 1.6 });
  if (t.closest('[data-mapfr]')) return mapInst?.fitBounds([[-5.2, 41.3], [9.6, 51.1]], { padding: 30 });
  // Calendrier
  if (t.matches('[data-closemodal]') || t.closest('button[data-closemodal]')) { S.evModal = null; S.sheet = null; return render(); }
  // Accueil, présences, notifications, canaux
  const st = t.closest('[data-stat]'); if (st) return statClick(st.dataset.stat);
  const sg = t.closest('[data-statgo]'); if (sg) return statGo(sg.dataset.statgo);
  const ab = t.closest('[data-absev]'); if (ab) return setAbsence(ab.dataset.absev, ab.dataset.absday, ab.dataset.absmem, ab.dataset.absset === '1');
  if (t.closest('[data-notif]')) { S.sheet = 'notif'; return render(); }
  if (t.closest('[data-chanpick]')) { S.sheet = 'chan'; return render(); }
  const nc = t.closest('[data-notifch]'); if (nc) { const id = nc.dataset.notifch; return setNotifCh(S.notifCh.includes(id) ? S.notifCh.filter((x) => x !== id) : [...S.notifCh, id]); }
  const na = t.closest('[data-notifall]'); if (na) return setNotifCh(na.dataset.notifall === 'all' ? CHANNELS.map((c) => c.id) : []);
  const cv = t.closest('[data-calview]'); if (cv) { S.calView = cv.dataset.calview; if (S.calView === 'mois') S.calSel = S.calSel || S.calDate; return render(); }
  const cn = t.closest('[data-calnav]'); if (cn) { calMove(Number(cn.dataset.calnav)); return render(); }
  if (t.closest('[data-caltoday]')) { S.calDate = S.calSel = today(); S.calScroll = null; return render(); }
  const cg = t.closest('[data-calgoday]'); if (cg) { S.calDate = S.calSel = cg.dataset.calgoday; S.calView = 'jour'; return render(); }
  const cm = t.closest('[data-calgomonth]'); if (cm) { S.calDate = S.calSel = cm.dataset.calgomonth; S.calView = 'mois'; return render(); }
  const oc = t.closest('[data-occ]'); if (oc) { const o = findOcc(oc.dataset.occ); if (o) { S.evModal = { mode: 'view', occ: o }; render(); } return; }
  const en = t.closest('[data-evnew]'); if (en) { S.evModal = { mode: 'edit', ev: newEventDraft(en.dataset.evnew || null) }; render(); $('#efTitle')?.focus(); return; }
  const ee = t.closest('[data-evedit]'); if (ee) { const o = findOcc(ee.dataset.evedit); if (o) { S.evModal = { mode: 'edit', ev: { ...o.e } }; render(); $('#efTitle')?.focus(); } return; }
  const ed = t.closest('[data-evdel]'); if (ed) return confirmThen(ed, 'Confirmer la suppression', async () => {
    const r = await sb.from('events').delete().eq('id', ed.dataset.evdel); if (r.error) return fail(r.error);
    S.events = S.events.filter((x) => String(x.id) !== ed.dataset.evdel); S.evModal = null; render(); toast('Événement supprimé');
  });
  const sl = t.closest('[data-slot]'); if (sl && can('calendrier')) { const [d, h] = sl.dataset.slot.split('|'); S.evModal = { mode: 'edit', ev: newEventDraft(d, Number(h)) }; render(); $('#efTitle')?.focus(); return; }
  const cd = t.closest('[data-calday]'); if (cd) { if (S.calView === 'mois') { S.calSel = cd.dataset.calday; return render(); } if (can('calendrier')) { S.evModal = { mode: 'edit', ev: newEventDraft(cd.dataset.calday) }; render(); $('#efTitle')?.focus(); } return; }
  // Réclamations
  const rt = t.closest('[data-rectab]'); if (rt) { S.recTab = rt.dataset.rectab; return render(); }
  const rf = t.closest('[data-recfilter]'); if (rf) { S.recFilter = rf.dataset.recfilter; return render(); }
  const rr = t.closest('[data-recreceipt]'); if (rr) return openReceipt(rr.dataset.recreceipt);
  const rs = t.closest('[data-recset]'); if (rs) return setRecStatus(rs.dataset.recid, rs.dataset.recset);
  const rz = t.closest('[data-recreset]'); if (rz) return confirmThen(rz, 'Confirmer', () => setRecStatus(rz.dataset.recreset, 'en_attente'));
  const rd = t.closest('[data-recdel]'); if (rd) return confirmThen(rd, "Confirmer l'annulation", async () => {
    const r0 = S.reclamations.find((x) => x.id === rd.dataset.recdel); if (!r0) return;
    const r = await sb.from('reclamations').delete().eq('id', r0.id).select(); if (r.error) return fail(r.error);
    if (!r.data.length) { toast('Cette réclamation vient d\'être traitée : elle ne peut plus être annulée.'); return refreshData(); }
    if (r0.receipt_path) await sb.storage.from('justificatifs').remove([r0.receipt_path]);
    S.reclamations = S.reclamations.filter((x) => x.id !== r0.id); render(); toast('Réclamation annulée');
  });
  const g = t.closest('[data-go]'); if (g) { if (g.dataset.setpole) S.upPole = g.dataset.setpole; if (g.dataset.rectabgo) { S.recTab = g.dataset.rectabgo; S.recFilter = 'en_attente'; } return go(g.dataset.go); }
  const p = t.closest('[data-pole]'); if (p) { S.poleTab = p.dataset.pole; return render(); }
  const c = t.closest('[data-cat]'); if (c) { S.libCat = c.dataset.cat; return render(); }
  const ch = t.closest('[data-chan]'); if (ch) {
    S.chan = ch.dataset.chan; S.sheet = null; S.emojiOpen = false; S.reactPicker = null;
    try { history.replaceState(null, '', '#chat-' + S.chan); } catch (e) {}
    if (!S.msgs[S.chan]) loadMessages(S.chan); else markRead(S.chan);
    return render();
  }
  const o = t.closest('[data-open]'); if (o) return openDoc(o.dataset.open);
  const rx = t.closest('[data-emoji-r]'); if (rx) return toggleReaction(Number(rx.dataset.react), rx.dataset.emojiR);
  const rp = t.closest('[data-reactpick]'); if (rp) { const id = Number(rp.dataset.reactpick); S.reactPicker = S.reactPicker === id ? null : id; return patchChat(); }
  const et = t.closest('[data-emojitoggle]'); if (et) {
    S.emojiOpen = !S.emojiOpen; $('#emojis').hidden = !S.emojiOpen; et.setAttribute('aria-expanded', S.emojiOpen);
    const m = $('#msgs'); if (m && S.emojiOpen) m.scrollTop = m.scrollHeight;
    return;
  }
  const em = t.closest('[data-emoji]'); if (em) {
    const i = $('#msgIn'); const a = i.selectionStart ?? i.value.length, b = i.selectionEnd ?? a;
    i.value = i.value.slice(0, a) + em.dataset.emoji + i.value.slice(b); const p = a + em.dataset.emoji.length; i.setSelectionRange(p, p); growMsg(); return;
  }
  const pu = t.closest('[data-push]'); if (pu) return pu.dataset.push === 'on' ? enablePush() : disablePush();
  const dd = t.closest('[data-deldoc]'); if (dd) return confirmThen(dd, 'Confirmer la suppression', async () => {
    const d = S.docs.find((x) => x.id === dd.dataset.deldoc);
    const r = await sb.from('documents').delete().eq('id', d.id); if (r.error) return fail(r.error);
    await sb.storage.from('documents').remove([d.file_path]);
    S.docs = S.docs.filter((x) => x.id !== d.id); render(); toast('Document supprimé');
  });
  const dm = t.closest('[data-delmsg]'); if (dm) return confirmThen(dm, 'Confirmer', async () => {
    const r = await sb.from('messages').delete().eq('id', dm.dataset.delmsg); if (r.error) return fail(r.error);
    S.msgs[S.chan] = S.msgs[S.chan].filter((x) => String(x.id) !== dm.dataset.delmsg); patchChat();
  });
  const sm = t.closest('[data-savemember]'); if (sm) return saveMember(sm.closest('tr'));
  const rm = t.closest('[data-delmember]'); if (rm) return confirmThen(rm, 'Confirmer le retrait', async () => {
    const id = rm.closest('tr').dataset.member;
    const r = await sb.from('members').delete().eq('id', id); if (r.error) return fail(r.error);
    S.members = S.members.filter((x) => x.id !== id); S.invitations = S.invitations.filter((i) => i.member_id !== id); render(); toast('Personne retirée');
  });
  if (t.closest('[data-saveages]')) {
    for (const inp of document.querySelectorAll('[data-age]')) {
      const r = await sb.from('groups').update({ age_range: inp.value.trim() || null }).eq('id', inp.dataset.age); if (r.error) return fail(r.error);
      grp(inp.dataset.age).age_range = inp.value.trim() || null;
    }
    toast('Tranches d\'âge enregistrées');
  }
});
// Confirmation en deux clics (les boîtes de dialogue du navigateur sont évitées)
function confirmThen(btn, label, fn) {
  if (btn.dataset.armed) { delete btn.dataset.armed; fn().catch(fail); return; }
  btn.dataset.armed = '1'; const old = btn.textContent; btn.textContent = label;
  setTimeout(() => { if (btn.isConnected && btn.dataset.armed) { delete btn.dataset.armed; btn.textContent = old; } }, 4000);
}
async function setInvitation(memberId, email) {
  const cur = S.invitations.find((i) => i.member_id === memberId);
  if (cur && cur.email === email) return;
  if (cur) { const r = await sb.from('invitations').delete().eq('member_id', memberId); if (r.error) throw r.error; }
  S.invitations = S.invitations.filter((i) => i.member_id !== memberId);
  if (email) {
    const r = await sb.from('invitations').insert({ email, member_id: memberId }).select().single();
    if (r.error) throw (r.error.code === '23505' ? new Error('cette adresse est déjà utilisée par une autre personne') : r.error);
    S.invitations.push(r.data);
  }
}
async function saveMember(tr) {
  const id = tr.dataset.member; const f = (k) => tr.querySelector(`[data-f="${k}"]`);
  const patch = { title: f('title').value, first_name: f('first_name').value.trim(), group_id: f('group_id').value || null, pole_id: f('pole_id').value || null, role: f('role').value };
  if (f('is_admin')) patch.is_admin = f('is_admin').checked;
  if (!patch.first_name) return toast('Le prénom est obligatoire');
  try {
    const r = await sb.from('members').update(patch).eq('id', id).select().single(); if (r.error) throw r.error;
    await setInvitation(id, f('email').value.trim().toLowerCase());
    const fresh = await sb.from('members').select('*').eq('id', id).single();
    Object.assign(member(id), fresh.data || r.data); render(); toast('Enregistré');
  } catch (e) { fail(e); }
}

async function savePerm(box) {
  const m = member(box.dataset.pmember); if (!m) return;
  const next = new Set(m.permissions || []); box.checked ? next.add(box.dataset.perm) : next.delete(box.dataset.perm);
  const r = await sb.from('members').update({ permissions: [...next] }).eq('id', m.id).select().single();
  if (r.error) { box.checked = !box.checked; return fail(r.error); }
  m.permissions = r.data.permissions; toast('Autorisation enregistrée');
}
root.addEventListener('change', (e) => {
  if (e.target.id === 'upFile' && e.target.files.length) addFiles(e.target.files);
  if (e.target.id === 'upPole') S.upPole = e.target.value;
  if (e.target.id === 'vitrineFile' && e.target.files[0]) setVitrine(e.target.files[0]);
  if (e.target.id === 'efAllDay') document.querySelectorAll('.timef').forEach((x) => (x.hidden = e.target.checked));
  if (e.target.id === 'efRepeat') $('#efUntilWrap').hidden = e.target.value === 'none';
  if (e.target.id === 'efStart' && ($('#efEnd').value < e.target.value || !$('#efEnd').value)) $('#efEnd').value = e.target.value;
  if (e.target.dataset.perm) savePerm(e.target);
  if (e.target.id === 'mapPeriod') { S.mapPeriod = Number(e.target.value); refreshMap(); }
});
root.addEventListener('input', (e) => { if (e.target.id === 'efAddr') addrInput(e.target); });
root.addEventListener('focusout', (e) => { if (e.target.id === 'efAddr') setTimeout(addrClose, 150); });
root.addEventListener('input', (e) => { if (e.target.id === 'libQ') { S.libQ = e.target.value; render(); } });
root.addEventListener('submit', async (e) => {
  const id = e.target.id;
  if (id === 'compose') {
    e.preventDefault(); const v = $('#msgIn').value.trim(); if (!v) return;
    const chan = S.chan;
    $('#msgIn').value = ''; growMsg();
    const r = await sb.from('messages').insert({ channel: chan, member_id: S.me.id, body: v }).select().single();
    if (r.error) { if ($('#msgIn') && !$('#msgIn').value) { $('#msgIn').value = v; growMsg(); } return fail(r.error); }
    const list = S.msgs[chan] || (S.msgs[chan] = []); if (!list.some((x) => x.id === r.data.id)) list.push(r.data);
    if (S.emojiOpen) { S.emojiOpen = false; const ep = $('#emojis'); if (ep) ep.hidden = true; $('[data-emojitoggle]')?.setAttribute('aria-expanded', 'false'); }
    if (S.chan === chan) patchChat(true);
    // Notifications : envoyées aux chefs qui suivent ce canal (choix fait avec la cloche)
    const n = await sb.functions.invoke('notify', { body: { action: 'notify', message_id: r.data.id } });
    if (chan === 'annonces') {
      if (n.error) toast("Annonce publiée, mais les notifications n'ont pas pu être envoyées");
      else toast(`Annonce publiée et envoyée à ${n.data.sent} appareil${n.data.sent > 1 ? 's' : ''}`);
    }
  }
  if (id === 'evForm') { e.preventDefault(); return saveEvent(); }
  if (id === 'recForm') { e.preventDefault(); if (!S.recBusy) submitRecl(e.target); return; }
  if (id === 'addMember') {
    e.preventDefault();
    const row = { title: $('#nmTitle').value, first_name: $('#nmName').value.trim(), group_id: $('#nmGroup').value || null, pole_id: $('#nmPole').value || null, role: $('#nmRole').value };
    const email = $('#nmEmail').value.trim().toLowerCase();
    const r = await sb.from('members').insert(row).select().single(); if (r.error) return fail(r.error);
    S.members.push(r.data); S.members.sort((a, b) => a.first_name.localeCompare(b.first_name, 'fr'));
    try { await setInvitation(r.data.id, email); } catch (err) { fail(err); }
    render(); toast('Personne ajoutée');
  }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && (S.evModal || S.moreOpen || S.sheet)) { S.evModal = null; S.moreOpen = false; S.sheet = null; render(); } });
root.addEventListener('keydown', (e) => { if (e.target.id === 'efAddr') addrKey(e); }, true);
// Sur ordinateur, Entrée envoie (Maj + Entrée pour aller à la ligne) ; sur téléphone, Entrée va à la ligne
const touchScreen = () => matchMedia('(pointer: coarse)').matches;
root.addEventListener('keydown', (e) => { if (e.target.id === 'msgIn' && e.key === 'Enter' && !e.shiftKey && !e.isComposing && !touchScreen()) { e.preventDefault(); e.target.form.requestSubmit(); } });
root.addEventListener('input', (e) => { if (e.target.id === 'msgIn') growMsg(); });
['dragover', 'dragenter'].forEach((t) => root.addEventListener(t, (e) => { const d = e.target.closest('#drop'); if (d) { e.preventDefault(); d.classList.add('over'); } }));
/* Appui long sur une réaction : affiche qui l'a mise (utile sur téléphone, où le survol n'existe pas) */
const whobox = $('#whobox');
let press = null, pressShown = false;
function hideWho() { whobox.hidden = true; }
function showWho(chip) {
  const who = (S.reacts[chip.dataset.react] || []).filter((x) => x.emoji === chip.dataset.emojiR);
  if (!who.length) return;
  whobox.innerHTML = `<b>${esc(chip.dataset.emojiR)} ${who.length}</b>${who.map((x) => `<span>${esc(display(member(x.member_id)))}</span>`).join('')}`;
  whobox.hidden = false;
  const r = chip.getBoundingClientRect(), w = whobox.offsetWidth, h = whobox.offsetHeight;
  whobox.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px';
  whobox.style.top = (r.top - h - 8 < 8 ? r.bottom + 8 : r.top - h - 8) + 'px';
  navigator.vibrate?.(15);
}
function cancelPress() { if (press) { clearTimeout(press.t); press = null; } }
root.addEventListener('pointerdown', (e) => {
  const chip = e.target.closest('.react[data-emoji-r]');
  if (!chip) return;
  pressShown = false;
  press = { x: e.clientX, y: e.clientY, t: setTimeout(() => { pressShown = true; press = null; showWho(chip); }, 450) };
});
root.addEventListener('pointermove', (e) => { if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10) cancelPress(); });
['pointerup', 'pointercancel'].forEach((t) => root.addEventListener(t, cancelPress));
// Après un appui long, le relâchement ne doit pas ajouter ou retirer la réaction
root.addEventListener('click', (e) => { if (pressShown && e.target.closest('.react[data-emoji-r]')) { e.stopImmediatePropagation(); pressShown = false; } }, true);
root.addEventListener('contextmenu', (e) => { if (e.target.closest('.react[data-emoji-r]')) e.preventDefault(); });
document.addEventListener('pointerdown', (e) => { if (!whobox.hidden && !e.target.closest('.react[data-emoji-r]')) hideWho(); });
addEventListener('scroll', hideWho, true);
root.addEventListener('dragleave', (e) => { const d = e.target.closest('#drop'); if (d) d.classList.remove('over'); });
root.addEventListener('drop', (e) => { const d = e.target.closest('#drop'); if (d) { e.preventDefault(); d.classList.remove('over'); if (e.dataTransfer.files.length && !S.uploading) addFiles(e.dataTransfer.files); } });

/* ---------- Démarrage ---------- */
async function boot() {
  S.calDate = S.calSel = today();
  const { data } = await sb.auth.getSession();
  S.session = data.session;
  if (S.session) {
    try { await loadAll(); lastRefresh = Date.now(); } catch (e) { fail(e); }
    if (S.me) { startRealtime(); loadVitrine(); loadUnread(); }
  }
  const h = (location.hash || '').slice(1), hc = /^chat-([a-z]+)$/.exec(h);
  if (h === 'annonces') { S.view = 'discussion'; S.chan = 'annonces'; }
  else if (hc && CHANNELS.some((c) => c.id === hc[1])) { S.view = 'discussion'; S.chan = hc[1]; }
  else if (/^[a-z]+$/.test(h) && h !== S.view && [...NAV.map((n) => n[0]), 'administration', 'reclamations'].includes(h)) S.view = h;
  if (S.me) checkPush().then(() => { if (S.sheet === 'notif') render(); else paintBell(); });
  if (S.view === 'discussion' && S.me) loadMessages(S.chan);
  render();
}
sb.auth.onAuthStateChange((event, session) => {
  if (event === 'PASSWORD_RECOVERY') { authMode = 'newpass'; S.session = session; render(); return; }
  const changed = (session?.user?.id || null) !== (S.session?.user?.id || null);
  S.session = session;
  if (event === 'SIGNED_OUT') { S.me = null; S.msgs = {}; if (S.realtime) { sb.removeChannel(S.realtime); S.realtime = null; } authMode = 'login'; render(); return; }
  if (changed && session) setTimeout(boot, 0);
});
// Ouverture depuis une notification : #annonces ou #chat-<canal>
window.addEventListener('hashchange', () => {
  const m = /^#(?:chat-)?([a-z]+)$/.exec(location.hash);
  const ch = m && CHANNELS.find((c) => c.id === m[1] && (location.hash.startsWith('#chat-') || c.id === 'annonces'));
  if (ch && S.me) { S.view = 'discussion'; S.chan = ch.id; S.sheet = null; loadMessages(ch.id); render(); }
});
boot();
