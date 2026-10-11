import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/+esm';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';
import { POLE_CONTENT, CATS, CHANNELS, VALUES } from './data.js';

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

/* ---------- Outils ---------- */
const $ = (s) => document.querySelector(s);
const root = $('#root');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (d) => new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const fmtTime = (d) => new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const today = () => new Date().toISOString().slice(0, 10);
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
  out: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11"/>'
};
const ico = (k, size) => `<svg viewBox="0 0 24 24" ${size ? `style="width:${size}px;height:${size}px"` : ''} fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k]}</svg>`;

/* ---------- État ---------- */
const S = {
  session: null, me: null,
  members: [], groups: [], poles: [], docs: [], events: [], invitations: [],
  msgs: {}, thumbs: {},
  view: 'accueil', poleTab: 'peda', libCat: 'all', libQ: '', upPole: '', chan: 'general',
  uploading: '', realtime: null
};
const member = (id) => S.members.find((m) => m.id === id);
const grp = (id) => S.groups.find((g) => g.id === id);
const pole = (id) => S.poles.find((p) => p.id === id);
const display = (m) => (m ? `${m.title} ${m.first_name}` : 'Ancien membre');
const initial = (m) => (m ? m.first_name.charAt(0).toUpperCase() : '?');
const isDoyenne = (m) => m.role === 'doyenne' || (m.role === 'principale' && m.pole_id);
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
  if (S.me?.is_admin) {
    const inv = await sb.from('invitations').select('*'); if (!inv.error) S.invitations = inv.data;
  }
  loadThumbs();
}
async function loadThumbs() {
  const imgs = S.docs.filter((d) => d.mime_type?.startsWith('image/') && !S.thumbs[d.file_path]);
  if (!imgs.length) return;
  const { data } = await sb.storage.from('documents').createSignedUrls(imgs.map((d) => d.file_path), 3600);
  (data || []).forEach((r) => { if (r.signedUrl) S.thumbs[r.path] = r.signedUrl; });
  if (['bibliotheque', 'accueil', 'poles'].includes(S.view)) render();
}
async function loadMessages(ch) {
  const { data, error } = await sb.from('messages').select('*').eq('channel', ch).order('created_at', { ascending: false }).limit(200);
  if (error) return fail(error);
  S.msgs[ch] = data.reverse();
  if (S.view === 'discussion' && S.chan === ch) render();
}
function startRealtime() {
  if (S.realtime) return;
  S.realtime = sb.channel('messages-live')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, ({ new: m }) => {
      const list = S.msgs[m.channel]; if (!list) return;
      if (!list.some((x) => x.id === m.id)) list.push(m);
      if (S.view === 'discussion' && S.chan === m.channel) render();
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, ({ old }) => {
      for (const ch in S.msgs) S.msgs[ch] = S.msgs[ch].filter((x) => x.id !== old.id);
      if (S.view === 'discussion') render();
    })
    .subscribe();
}

/* ---------- Navigation ---------- */
const NAV = [['accueil', 'Accueil', 'home'], ['organigramme', 'Organigramme', 'org'], ['poles', 'Pôles', 'pole'], ['groupes', 'Groupes', 'group'], ['sep', 'Ressources'], ['bibliotheque', 'Bibliothèque', 'lib'], ['calendrier', 'Calendrier', 'cal'], ['discussion', 'Discussion', 'chat']];
function navHtml() {
  const items = NAV.concat(S.me?.is_admin ? [['administration', 'Administration', 'admin']] : []);
  return items.map((n) => n[0] === 'sep' ? `<div class="sep">${n[1]}</div>` : `<button data-v="${n[0]}" ${S.view === n[0] ? 'aria-current="page"' : ''}>${ico(n[2])}<span class="lbl">${n[1]}</span></button>`).join('')
    + `<button data-logout class="mobile-only">${ico('out')}<span class="lbl">Déconnexion</span></button>`;
}
function go(v) { S.view = v; try { history.replaceState(null, '', '#' + v); } catch (e) {} if (v === 'discussion' && !S.msgs[S.chan]) loadMessages(S.chan); render(); window.scrollTo(0, 0); }

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
const nextEvent = () => S.events.find((e) => e.date >= today());

function vAccueil() {
  const ev = nextEvent(); const nd = ev ? new Date(ev.date + 'T12:00:00') : null;
  return `<div class="view">
  <div class="hero">
    <div class="main"><span class="eyebrow" style="color:inherit;opacity:.85">Espace des chefs et cheftaines</span>
      <h1>Salam ${esc(display(S.me))} !</h1>
      <p>Retrouvez ici les documents officiels, les comptes rendus, les fiches d'activités et la pédagogie de l'unité, l'organigramme et les pôles.</p>
      <div class="row" style="margin-top:6px"><button class="btn" data-go="bibliotheque">${ico('up')} Déposer un document</button><button class="btn" data-go="discussion" style="background:transparent;color:inherit;border-color:currentColor">${ico('chat')} Discussion</button></div>
      <img class="hands" src="assets/logo.png" alt="">
    </div>
    <div class="card next"><span class="eyebrow">Prochain rendez-vous</span>
      ${ev ? `<div class="date"><span class="d">${nd.getDate()}</span><div><b>${esc(nd.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, (c) => c.toUpperCase()))}</b><div style="color:var(--muted);font-size:.85rem">${esc(ev.title)}</div></div></div>${ev.details ? `<p style="color:var(--muted);font-size:.9rem">${esc(ev.details)}</p>` : ''}` : '<p style="color:var(--muted)">Aucune date à venir pour le moment.</p>'}
      <button class="btn" data-go="calendrier" style="align-self:flex-start">${ico('cal')} Calendrier</button>
    </div>
  </div>
  <div class="stats">
    <div class="stat"><b>${S.members.length}</b><span>chefs et cheftaines</span></div>
    <div class="stat"><b>${S.groups.length}</b><span>groupes</span></div>
    <div class="stat"><b>3</b><span>pôles + fonctions support</span></div>
    <div class="stat"><b>${S.docs.length}</b><span>documents partagés</span></div>
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
  const poleCols = mainPoles.map((p) => {
    const doy = S.members.filter((m) => m.pole_id === p.id && isDoyenne(m));
    const others = S.members.filter((m) => m.pole_id === p.id && !isDoyenne(m));
    return `<div class="col"><div class="node poleNode" style="--k:${p.color}"><div class="n">${esc(p.name)}</div>
      <div class="r">Doyenne : ${doy.length ? doy.map((m) => esc(display(m))).join(', ') : 'à désigner'}</div>
      <div class="r" style="margin-top:6px">${others.length ? others.map((m) => esc(display(m))).join(', ') : 'Membres à attribuer'}</div></div></div>`;
  }).join('');
  const grpCols = S.groups.map((g) => {
    const chefs = S.members.filter((m) => m.group_id === g.id);
    return `<div class="col"><div class="node grp" style="--k:${g.color}"><h4>${esc(g.name)}</h4><div class="r" style="margin-bottom:8px">${g.age_range ? esc(g.age_range) : chefs.length + ' chef' + (chefs.length > 1 ? 's' : '')}</div>
      <div style="display:flex;flex-direction:column;gap:6px">${chefs.map((m) => chefChip(m, [pole(m.pole_id)?.short_name || 'Pôle à attribuer', isDoyenne(m) ? 'doyenne' : ''].filter(Boolean).join(' · '))).join('')}</div></div></div>`;
  }).join('');
  const unassigned = S.members.filter((m) => !m.group_id && m.role !== 'principale');
  const n = Math.max(S.groups.length, 1);
  return `<div class="view">
  <div><span class="eyebrow">Unité 2026/2027</span><h1>Organigramme</h1><p class="lead" style="margin-top:6px">Chaque chef et cheftaine appartient à un groupe et à un pôle. Seuls les adultes figurent ici.${S.me.is_admin ? ' Modifiez les affectations depuis la page Administration.' : ''}</p></div>
  <div class="card org-wrap"><div class="org">
    <div class="row" style="justify-content:center">${top.map((m) => `<div class="node top"><div class="av">${esc(initial(m))}</div><div class="n" style="font-size:1.15rem">${esc(display(m))}</div><div class="r">Cheffe principale de l'unité</div></div>`).join('') || '<div class="node top"><div class="n">Cheffe principale</div><div class="r">à désigner</div></div>'}</div>
    <div class="vline"></div>
    <div class="tier" style="--l:16.5%;--r:16.5%">${poleCols}</div>
    <div class="tier-label">Groupes et leurs chefs</div>
    <div class="tier" style="--l:${50 / n}%;--r:${50 / n}%">${grpCols}</div>
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
    ${mem.length ? `<div class="members">${mem.map((m) => `<div style="width:230px;max-width:100%">${chefChip(m, [grp(m.group_id)?.name, isDoyenne(m) ? 'doyenne' : ''].filter(Boolean).join(' · '))}</div>`).join('')}</div>` : `<div class="empty">Aucun membre attribué pour l'instant.${S.me.is_admin ? ' Attribuez les pôles depuis la page Administration.' : ''}</div>`}</div>
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
    const canDel = S.me.is_admin || d.uploaded_by === S.me.id;
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

function vCal() {
  const up = S.events.filter((e) => e.date >= today()); const past = S.events.filter((e) => e.date < today()).slice(-5).reverse();
  const row = (e) => { const d = new Date(e.date + 'T12:00:00'); return `<div class="it"><div class="dd"><b>${d.getDate()}</b><small>${d.toLocaleDateString('fr-FR', { month: 'short' })}</small></div><div><b>${esc(e.title)}</b><div style="color:var(--muted);font-size:.88rem">${esc(d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}${e.details ? ' · ' + esc(e.details) : ''}</div></div>${S.me.is_admin ? `<button class="btn small danger" data-delevent="${e.id}">Supprimer</button>` : '<span></span>'}</div>`; };
  return `<div class="view">
  <div><span class="eyebrow">Planification</span><h1>Calendrier</h1><p class="lead" style="margin-top:6px">Les samedis scouts ont lieu un samedi sur deux.</p></div>
  <div class="card cal">${up.map(row).join('') || '<div class="empty">Aucune date à venir.</div>'}</div>
  ${S.me.is_admin ? `<form class="card" id="eventForm"><h3 style="margin-bottom:10px">Ajouter une date</h3><div class="formrow">
    <label class="field" for="evDate">Date<input id="evDate" type="date" required></label>
    <label class="field" for="evTitle">Titre<input id="evTitle" value="Samedi scout" required></label>
    <label class="field" for="evDetails">Précisions<input id="evDetails" placeholder="Lieu, horaires…"></label>
    <button class="btn primary" type="submit">Ajouter</button></div></form>` : ''}
  ${past.length ? `<div class="card cal"><h3 style="margin-bottom:6px">Dates passées</h3>${past.map(row).join('')}</div>` : ''}
  </div>`;
}

function vChat() {
  const c = CHANNELS.find((x) => x.id === S.chan); let lastH = '';
  const chans = CHANNELS.map((x) => { let h = ''; if (x.h !== lastH) { h = `<div class="h">${esc(x.h)}</div>`; lastH = x.h; } return h + `<button data-chan="${x.id}" aria-current="${x.id === S.chan}"># ${esc(x.name)}</button>`; }).join('');
  const list = S.msgs[S.chan];
  return `<div class="view">
  <div><span class="eyebrow">Entre chefs et cheftaines</span><h1>Discussion</h1></div>
  <div class="card chat"><nav class="chans" aria-label="Fils de discussion">${chans}</nav>
    <section class="thread"><header><b># ${esc(c.name)}</b></header>
      <div class="msgs" id="msgs">${!list ? '<p style="color:var(--muted)">Chargement…</p>' : list.length ? list.map((m) => {
        const a = member(m.member_id); const k = grp(a?.group_id)?.color || 'var(--muted)';
        const canDel = S.me.is_admin || m.member_id === S.me.id;
        return `<div class="msg" style="--k:${k}"><div class="av">${esc(initial(a))}</div><div class="b"><div class="h"><b>${esc(display(a))}</b>${esc(fmtTime(m.created_at))}${canDel ? `<button class="del" data-delmsg="${m.id}" aria-label="Supprimer le message">Supprimer</button>` : ''}</div><p>${esc(m.body)}</p></div></div>`;
      }).join('') : '<p style="color:var(--muted)">Aucun message pour l\'instant. Écrivez le premier !</p>'}</div>
      <form class="compose" id="compose"><textarea id="msgIn" placeholder="Écrire dans # ${esc(c.name)}" aria-label="Message" maxlength="4000"></textarea><button class="btn primary" type="submit">Envoyer</button></form>
    </section></div></div>`;
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
  if (!S.me.is_admin) return '<div class="view"><div class="empty">Page réservée aux administrateurs.</div></div>';
  const inv = (id) => S.invitations.find((i) => i.member_id === id)?.email || '';
  const opts = (arr, val, empty) => `<option value="">${empty}</option>` + arr.map((x) => `<option value="${x.id}" ${x.id === val ? 'selected' : ''}>${esc(x.name)}</option>`).join('');
  const row = (m) => `<tr data-member="${m.id}">
    <td><select data-f="title">${['Chef', 'Cheftaine', 'Tata'].map((t) => `<option ${t === m.title ? 'selected' : ''}>${t}</option>`).join('')}</select></td>
    <td><input data-f="first_name" value="${esc(m.first_name)}" aria-label="Prénom"></td>
    <td><select data-f="group_id">${opts(S.groups, m.group_id, 'Aucun')}</select></td>
    <td><select data-f="pole_id">${opts(S.poles, m.pole_id, 'À attribuer')}</select></td>
    <td><select data-f="role">${Object.entries(ROLES).map(([k, v]) => `<option value="${k}" ${k === m.role ? 'selected' : ''}>${v}</option>`).join('')}</select></td>
    <td><input data-f="email" type="email" value="${esc(inv(m.id))}" placeholder="adresse@exemple.fr" aria-label="E-mail"></td>
    <td style="text-align:center"><input data-f="is_admin" type="checkbox" ${m.is_admin ? 'checked' : ''} aria-label="Administrateur"></td>
    <td style="font-size:.8rem;color:var(--muted)">${m.user_id ? 'Compte créé' : inv(m.id) ? 'Invité' : 'Pas d\'accès'}</td>
    <td style="white-space:nowrap"><button class="btn small" data-savemember>Enregistrer</button> <button class="btn small danger" data-delmember>Retirer</button></td></tr>`;
  return `<div class="view">
  <div><span class="eyebrow">Réservé aux administrateurs</span><h1>Administration</h1>
    <p class="lead" style="margin-top:6px">Ajoutez l'e-mail d'un chef pour lui donner accès : il pourra ensuite créer son compte depuis la page de connexion. Pour retirer un accès, effacez son e-mail ou retirez la personne.</p></div>
  ${storageGauge()}
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

/* ---------- Rendu ---------- */
function render() {
  if (!S.session) { root.innerHTML = vAuth(); return; }
  if (authMode === 'newpass') { root.innerHTML = vAuth(); return; }
  if (!S.me) {
    root.innerHTML = `<div class="auth"><div class="card"><div class="logo"><img src="assets/logo.png" alt=""><h2>Accès en attente</h2></div><p>Votre compte (${esc(S.session.user.email)}) n'est relié à aucun chef ou cheftaine. Demandez à un administrateur d'ajouter cette adresse dans la page Administration, puis reconnectez-vous.</p><button class="btn block" data-logout>Se déconnecter</button></div></div>`;
    return;
  }
  const V = { accueil: vAccueil, organigramme: vOrg, poles: vPoles, groupes: vGroupes, bibliotheque: vBiblio, calendrier: vCal, discussion: vChat, administration: vAdmin };
  const active = document.activeElement?.id; const pos = document.activeElement?.selectionStart;
  root.innerHTML = `<div class="app"><aside class="side">
    <div class="brand"><img src="assets/logo.png" alt="Logo des Travailleurs de l'Imam"><div><b>Travailleurs<br>de l'Imam</b><small>Scouts · Bayt ul Mahdi</small></div></div>
    <nav class="nav" aria-label="Menu principal">${navHtml()}</nav>
    <div class="who"><label>Connecté·e</label><b>${esc(display(S.me))}</b><button class="logout" data-logout>Se déconnecter</button></div>
  </aside><main id="main">${(V[S.view] || vAccueil)()}</main></div>`;
  const m = $('#msgs'); if (m) m.scrollTop = m.scrollHeight;
  if (active === 'libQ') { const i = $('#libQ'); i.focus(); try { i.setSelectionRange(pos, pos); } catch (e) {} }
  if (active === 'msgIn') $('#msgIn')?.focus();
}

/* ---------- Événements ---------- */
root.addEventListener('click', async (e) => {
  const t = e.target;
  const a = t.closest('[data-auth]'); if (a) { authMode = a.dataset.auth; authErr = authMsg = ''; render(); return; }
  if (t.closest('[data-logout]')) { await sb.auth.signOut(); return; }
  const nv = t.closest('button[data-v]'); if (nv) return go(nv.dataset.v);
  const g = t.closest('[data-go]'); if (g) { if (g.dataset.setpole) S.upPole = g.dataset.setpole; return go(g.dataset.go); }
  const p = t.closest('[data-pole]'); if (p) { S.poleTab = p.dataset.pole; return render(); }
  const c = t.closest('[data-cat]'); if (c) { S.libCat = c.dataset.cat; return render(); }
  const ch = t.closest('[data-chan]'); if (ch) { S.chan = ch.dataset.chan; if (!S.msgs[S.chan]) loadMessages(S.chan); return render(); }
  const o = t.closest('[data-open]'); if (o) return openDoc(o.dataset.open);
  const dd = t.closest('[data-deldoc]'); if (dd) return confirmThen(dd, 'Confirmer la suppression', async () => {
    const d = S.docs.find((x) => x.id === dd.dataset.deldoc);
    const r = await sb.from('documents').delete().eq('id', d.id); if (r.error) return fail(r.error);
    await sb.storage.from('documents').remove([d.file_path]);
    S.docs = S.docs.filter((x) => x.id !== d.id); render(); toast('Document supprimé');
  });
  const dm = t.closest('[data-delmsg]'); if (dm) return confirmThen(dm, 'Confirmer', async () => {
    const r = await sb.from('messages').delete().eq('id', dm.dataset.delmsg); if (r.error) return fail(r.error);
    S.msgs[S.chan] = S.msgs[S.chan].filter((x) => String(x.id) !== dm.dataset.delmsg); render();
  });
  const de = t.closest('[data-delevent]'); if (de) return confirmThen(de, 'Confirmer', async () => {
    const r = await sb.from('events').delete().eq('id', de.dataset.delevent); if (r.error) return fail(r.error);
    S.events = S.events.filter((x) => x.id !== de.dataset.delevent); render(); toast('Date supprimée');
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
  const patch = { title: f('title').value, first_name: f('first_name').value.trim(), group_id: f('group_id').value || null, pole_id: f('pole_id').value || null, role: f('role').value, is_admin: f('is_admin').checked };
  if (!patch.first_name) return toast('Le prénom est obligatoire');
  try {
    const r = await sb.from('members').update(patch).eq('id', id).select().single(); if (r.error) throw r.error;
    await setInvitation(id, f('email').value.trim().toLowerCase());
    const fresh = await sb.from('members').select('*').eq('id', id).single();
    Object.assign(member(id), fresh.data || r.data); render(); toast('Enregistré');
  } catch (e) { fail(e); }
}

root.addEventListener('change', (e) => {
  if (e.target.id === 'upFile' && e.target.files.length) addFiles(e.target.files);
  if (e.target.id === 'upPole') S.upPole = e.target.value;
});
root.addEventListener('input', (e) => { if (e.target.id === 'libQ') { S.libQ = e.target.value; render(); } });
root.addEventListener('submit', async (e) => {
  const id = e.target.id;
  if (id === 'compose') {
    e.preventDefault(); const v = $('#msgIn').value.trim(); if (!v) return;
    $('#msgIn').value = '';
    const r = await sb.from('messages').insert({ channel: S.chan, member_id: S.me.id, body: v }).select().single();
    if (r.error) { $('#msgIn').value = v; return fail(r.error); }
    const list = S.msgs[S.chan] || (S.msgs[S.chan] = []); if (!list.some((x) => x.id === r.data.id)) list.push(r.data);
    render(); $('#msgIn')?.focus();
  }
  if (id === 'eventForm') {
    e.preventDefault();
    const r = await sb.from('events').insert({ date: $('#evDate').value, title: $('#evTitle').value.trim(), details: $('#evDetails').value.trim() || null }).select().single();
    if (r.error) return fail(r.error);
    S.events.push(r.data); S.events.sort((a, b) => a.date.localeCompare(b.date)); render(); toast('Date ajoutée');
  }
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
root.addEventListener('keydown', (e) => { if (e.target.id === 'msgIn' && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.target.form.requestSubmit(); } });
['dragover', 'dragenter'].forEach((t) => root.addEventListener(t, (e) => { const d = e.target.closest('#drop'); if (d) { e.preventDefault(); d.classList.add('over'); } }));
root.addEventListener('dragleave', (e) => { const d = e.target.closest('#drop'); if (d) d.classList.remove('over'); });
root.addEventListener('drop', (e) => { const d = e.target.closest('#drop'); if (d) { e.preventDefault(); d.classList.remove('over'); if (e.dataTransfer.files.length && !S.uploading) addFiles(e.dataTransfer.files); } });

/* ---------- Démarrage ---------- */
async function boot() {
  const { data } = await sb.auth.getSession();
  S.session = data.session;
  if (S.session) {
    try { await loadAll(); } catch (e) { fail(e); }
    if (S.me) startRealtime();
  }
  const h = (location.hash || '').slice(1); if (/^[a-z]+$/.test(h) && h !== S.view && [...NAV.map((n) => n[0]), 'administration'].includes(h)) S.view = h;
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
boot();
