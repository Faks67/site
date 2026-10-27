// Fonction Supabase « notify » : envoie une notification sur les téléphones des chefs et cheftaines
// - quand un message est publié dans un canal qu'ils suivent (choix fait dans le site avec le bouton cloche ;
//   par défaut : les annonces seulement), ou quand on les mentionne (@Prénom) ;
//   les canaux des pôles ne sont envoyés qu'aux chefs qui y ont accès ;
// - 10 minutes avant Fajr, Dhuhr et Maghrib pour ceux qui ont coché « Heures de prière »
//   (appel automatique toutes les 5 minutes par la tâche programmée de la mise à jour SQL 08).
//
// À créer dans Supabase : Edge Functions > Deploy a new function > Via Editor,
// nom « notify », coller ce fichier, puis Deploy.
// Les clés de notification sont créées automatiquement au premier appel.

import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import webpush from 'npm:web-push@3.6.7';

const SITE_URL = 'https://scoutbaytulmahdi.github.io/';
const TIME_ZONE = 'Europe/Paris';
const PRAYER_LEAD_MIN = 10;
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const CHANNEL_NAMES: Record<string, string> = {
  annonces: 'Annonces', general: 'Général', peda: 'Pédagogie',
  formation: 'Formation & Relève', event: 'Événementiel', voyage: 'Voyages', support: 'Logistique & trésorerie'
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// deno-lint-ignore no-explicit-any
type Db = any;

async function vapidKeys(admin: Db) {
  const { data } = await admin.from('app_secrets').select('key, value').in('key', ['vapid_public', 'vapid_private']);
  const pub = data?.find((r: { key: string }) => r.key === 'vapid_public')?.value;
  const priv = data?.find((r: { key: string }) => r.key === 'vapid_private')?.value;
  if (pub && priv) return { publicKey: pub, privateKey: priv };
  const k = webpush.generateVAPIDKeys();
  // ignoreDuplicates : si deux appels créent les clés en même temps, la première gagne
  await admin.from('app_secrets').upsert(
    [{ key: 'vapid_public', value: k.publicKey }, { key: 'vapid_private', value: k.privateKey }],
    { onConflict: 'key', ignoreDuplicates: true }
  );
  const { data: again } = await admin.from('app_secrets').select('key, value').in('key', ['vapid_public', 'vapid_private']);
  const p2 = again?.find((r: { key: string }) => r.key === 'vapid_public')?.value;
  const k2 = again?.find((r: { key: string }) => r.key === 'vapid_private')?.value;
  if (!p2 || !k2) throw new Error("impossible d'enregistrer les clés : la mise à jour SQL 02 a-t-elle été lancée ?");
  return { publicKey: p2, privateKey: k2 };
}

type Sub = { endpoint: string; p256dh: string; auth: string; member_id: string };
// Envoie à chaque appareil ; les abonnements expirés sont supprimés
async function sendAll(admin: Db, subs: Sub[], payload: string, ttl = 86400) {
  let sent = 0;
  const expired: string[] = [];
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: ttl, urgency: 'high' });
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) expired.push(s.endpoint);
      else console.error('envoi impossible', code, (e as Error).message);
    }
  }));
  if (expired.length) await admin.from('push_subscriptions').delete().in('endpoint', expired);
  return sent;
}
// Canaux des pôles : seulement les chefs du pôle, les administrateurs et ceux à qui l'accès a été ouvert
// (même règle que public.can_see_channel, mises à jour SQL 09 et 12). Les canaux des pôles sont lus dans la table
// des pôles : un nouveau pôle n'oblige pas à redéployer la fonction.
const OPEN_CHANNELS = ['annonces', 'general', 'prieres'];
type Member = { id: string; is_admin: boolean; pole_id: string | null; pole_ids: string[] | null; chat_channels: string[] | null };
async function allowedMembers(admin: Db, channel: string): Promise<Set<string>> {
  // Conversation privée « dm:<chef>:<chef> » : les deux chefs seulement (mise à jour SQL 17)
  if (channel.startsWith('dm:')) return new Set(channel.split(':').slice(1, 3));
  const { data } = await admin.from('members').select('id, is_admin, pole_id, pole_ids, chat_channels');
  const { data: poles } = await admin.from('poles').select('id');
  const isPole = !OPEN_CHANNELS.includes(channel) && (poles || []).some((p: { id: string }) => p.id === channel);
  return new Set((data || []).filter((m: Member) => !isPole || m.is_admin || m.pole_id === channel
    || (m.pole_ids || []).includes(channel)
    || (m.chat_channels || []).includes(channel)).map((m: Member) => m.id));
}
// Chefs en train d'utiliser l'appli (mise à jour SQL 19) : ils voient le message dans l'appli, pas de notification
async function activeMembers(admin: Db): Promise<Set<string>> {
  const { data, error } = await admin.from('members').select('id').gt('active_until', new Date().toISOString());
  return new Set(error ? [] : (data || []).map((m: { id: string }) => m.id));
}
// Appareils des chefs qui suivent ce canal (sans choix enregistré : les annonces)
async function followers(admin: Db, channel: string, exceptMember?: string): Promise<Sub[]> {
  let q = admin.from('push_subscriptions').select('endpoint, p256dh, auth, member_id');
  if (exceptMember) q = q.neq('member_id', exceptMember);
  const { data: all } = await q;
  const { data: prefs } = await admin.from('notif_prefs').select('member_id, channels');
  const follows = new Map((prefs || []).map((p: { member_id: string; channels: string[] }) => [p.member_id, p.channels]));
  const allowed = await allowedMembers(admin, channel);
  return (all || []).filter((s: Sub) => allowed.has(s.member_id) && (follows.get(s.member_id) ?? ['annonces']).includes(channel));
}

/* ---------- Heures de prière : même calcul que js/prieres.js (méthode Jafari) ---------- */
const rad = (d: number) => (d * Math.PI) / 180, deg = (r: number) => (r * 180) / Math.PI;
const dsin = (d: number) => Math.sin(rad(d)), dcos = (d: number) => Math.cos(rad(d)), dtan = (d: number) => Math.tan(rad(d));
const darcsin = (x: number) => deg(Math.asin(x)), darccos = (x: number) => deg(Math.acos(x));
const darctan2 = (y: number, x: number) => deg(Math.atan2(y, x)), darccot = (x: number) => deg(Math.atan(1 / x));
const fix = (a: number, b: number) => { a -= b * Math.floor(a / b); return a < 0 ? a + b : a; };
const diff = (a: number, b: number) => fix(b - a, 24);
function julian(y: number, m: number, d: number) {
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
}
function sun(jd: number) {
  const D = jd - 2451545.0;
  const g = fix(357.529 + 0.98560028 * D, 360), q = fix(280.459 + 0.98564736 * D, 360);
  const L = fix(q + 1.915 * dsin(g) + 0.02 * dsin(2 * g), 360), e = 23.439 - 0.00000036 * D;
  const RA = darctan2(dcos(e) * dsin(L), dcos(L)) / 15;
  return { decl: darcsin(dsin(e) * dsin(L)), eqt: q / 15 - fix(RA, 24) };
}
function prayerTimes(y: number, m: number, d: number, lat: number, lng: number): Record<string, Date> {
  const jDate = julian(y, m, d) - lng / (15 * 24);
  const midDay = (t: number) => fix(12 - sun(jDate + t).eqt, 24);
  const angleTime = (a: number, t: number, ccw = false) => {
    const decl = sun(jDate + t).decl;
    const v = (1 / 15) * darccos((-dsin(a) - dsin(decl) * dsin(lat)) / (dcos(decl) * dcos(lat)));
    return midDay(t) + (ccw ? -v : v);
  };
  let h: Record<string, number> = { fajr: 5, sunrise: 6, dhuhr: 12, sunset: 18, maghrib: 18 };
  for (let i = 0; i < 2; i++) {
    const t = (k: string) => h[k] / 24;
    h = { fajr: angleTime(16, t('fajr'), true), sunrise: angleTime(0.833, t('sunrise'), true), dhuhr: midDay(t('dhuhr')),
      sunset: angleTime(0.833, t('sunset')), maghrib: angleTime(4, t('maghrib')) };
  }
  for (const k in h) h[k] -= lng / 15;
  const night = diff(h.sunset, h.sunrise);
  const cap = (k: string, a: number, ccw: boolean) => {
    const max = (a / 60) * night, base = ccw ? h.sunrise : h.sunset;
    if (isNaN(h[k]) || (ccw ? diff(h[k], base) : diff(base, h[k])) > max) h[k] = base + (ccw ? -max : max);
  };
  cap('fajr', 16, true); cap('maghrib', 4, false);
  const base = Date.UTC(y, m - 1, d), out: Record<string, Date> = {};
  for (const k of ['fajr', 'dhuhr', 'maghrib']) out[k] = new Date(base + Math.round(h[k] * 60) * 60000);
  return out;
}
const PRAYER_NAMES: Record<string, string> = { fajr: 'Fajr', dhuhr: 'Dhuhr', maghrib: 'Maghrib' };
const DEFAULT_PLACE = { name: 'Paris', lat: 48.8566, lng: 2.3522 };

// Appelée toutes les 5 minutes : prévient 10 minutes avant chaque prière, une seule fois
async function prayerAlerts(admin: Db) {
  const { data: st } = await admin.from('app_settings').select('value').eq('key', 'prayer_place').maybeSingle();
  const place = st?.value?.lat != null ? st.value : DEFAULT_PLACE;
  const now = Date.now();
  const due: { day: string; key: string; at: Date }[] = [];
  for (const off of [-1, 0, 1]) {
    const d = new Date(now + off * 86400000), y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, dd = d.getUTCDate();
    const t = prayerTimes(y, m, dd, place.lat, place.lng);
    for (const k in t) {
      const alertAt = t[k].getTime() - PRAYER_LEAD_MIN * 60000;
      // Fenêtre un peu plus large que 5 minutes pour ne rien rater si un appel a du retard
      if (alertAt <= now && alertAt > now - 9 * 60000) due.push({ day: `${y}-${String(m).padStart(2, '0')}-${String(dd).padStart(2, '0')}`, key: k, at: t[k] });
    }
  }
  let sent = 0;
  for (const p of due) {
    const { data: fresh } = await admin.from('prayer_sent').upsert({ day: p.day, prayer: p.key }, { onConflict: 'day,prayer', ignoreDuplicates: true }).select();
    if (!fresh?.length) continue; // déjà annoncée
    const subs = await followers(admin, 'prieres');
    if (!subs.length) continue;
    const hhmm = p.at.toLocaleTimeString('fr-FR', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
    sent += await sendAll(admin, subs, JSON.stringify({
      title: `🕌 ${PRAYER_NAMES[p.key]} à ${hhmm}`,
      body: `Dans ${PRAYER_LEAD_MIN} minutes · ${place.name}`,
      url: SITE_URL + '#prieres',
      tag: 'priere',
      renotify: true
    }), 3600);
  }
  return { due: due.length, sent };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const body = await req.json().catch(() => ({}));

    // Tâche programmée (heures de prière) : reconnue grâce à sa clé secrète
    if (body.action === 'prayers') {
      const { data: k } = await admin.from('app_secrets').select('value').eq('key', 'cron_key').maybeSingle();
      if (!k?.value || req.headers.get('x-cron-key') !== k.value) return json({ error: 'accès refusé' }, 403);
      const keys = await vapidKeys(admin);
      webpush.setVapidDetails(SITE_URL, keys.publicKey, keys.privateKey);
      return json(await prayerAlerts(admin));
    }

    // Sinon : seuls les chefs et cheftaines connectés peuvent utiliser la fonction
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const { data: auth } = await admin.auth.getUser(token);
    if (!auth?.user) return json({ error: 'non connecté' }, 401);
    const { data: me } = await admin.from('members').select('id, title, first_name').eq('user_id', auth.user.id).maybeSingle();
    if (!me) return json({ error: 'accès refusé' }, 403);

    const keys = await vapidKeys(admin);
    if (body.action === 'key') return json({ publicKey: keys.publicKey });

    if (body.action === 'notify') {
      const { data: msg } = await admin.from('messages').select('*').eq('id', body.message_id).maybeSingle();
      if (!msg || msg.member_id !== me.id) return json({ error: 'message introuvable' }, 400);

      webpush.setVapidDetails(SITE_URL, keys.publicKey, keys.privateKey);
      const isAnnonce = msg.channel === 'annonces', isDm = msg.channel.startsWith('dm:');
      const url = SITE_URL + (isAnnonce ? '#annonces' : '#chat-' + msg.channel);
      const text = msg.poll_options ? `📊 Sondage : ${msg.body}` : msg.body;
      const short = text.length > 180 ? text.slice(0, 177) + '…' : text;

      // Chefs mentionnés (@Prénom) : prévenus même s'ils ne suivent pas ce canal, s'ils y ont accès
      const allowed = await allowedMembers(admin, msg.channel);
      const tagged = new Set<string>((msg.mentions || []).filter((id: string) => id !== me.id && allowed.has(id)));
      let tagSubs: Sub[] = [];
      if (tagged.size) {
        const { data } = await admin.from('push_subscriptions').select('endpoint, p256dh, auth, member_id').in('member_id', [...tagged]);
        tagSubs = data || [];
      }
      // Message privé : l'autre chef est toujours prévenu (pas de choix de canal à faire)
      let subs: Sub[];
      if (isDm) {
        const other = [...allowed].find((id) => id !== me.id);
        const { data } = other ? await admin.from('push_subscriptions').select('endpoint, p256dh, auth, member_id').eq('member_id', other) : { data: [] };
        subs = data || [];
      } else subs = (await followers(admin, msg.channel, me.id)).filter((s) => !tagged.has(s.member_id));
      const active = await activeMembers(admin);
      subs = subs.filter((s) => !active.has(s.member_id)); tagSubs = tagSubs.filter((s) => !active.has(s.member_id));
      // Appel (mise à jour SQL 23) : « Appel de … », qui reste affiché jusqu'à ce qu'on le touche
      if (msg.call_id) {
        const video = msg.body.startsWith('📹');
        const sentCall = await sendAll(admin, subs, JSON.stringify({
          title: `${video ? '📹' : '📞'} ${isDm ? `Appel de ${me.title} ${me.first_name}` : `Appel dans ${CHANNEL_NAMES[msg.channel] || msg.channel}`}`,
          body: isDm ? 'Touchez pour répondre' : `${me.title} ${me.first_name} a lancé un appel ${video ? 'vidéo' : 'audio'} · touchez pour rejoindre`,
          url: SITE_URL + '#chat-' + msg.channel,
          tag: 'call-' + msg.call_id,
          renotify: true,
          requireInteraction: true
        }));
        return json({ sent: sentCall, total: subs.length });
      }
      const sent = await sendAll(admin, subs, JSON.stringify({
        title: isDm ? `💬 ${me.title} ${me.first_name}` : isAnnonce ? `📣 ${me.title} ${me.first_name}` : `# ${CHANNEL_NAMES[msg.channel] || msg.channel} · ${me.title} ${me.first_name}`,
        body: short,
        url,
        // Une notification par annonce ; pour les autres canaux, la dernière remplace la précédente
        tag: isAnnonce ? 'annonce-' + msg.id : 'chat-' + msg.channel,
        renotify: !isAnnonce
      }));
      const sentTags = tagSubs.length && !isDm ? await sendAll(admin, tagSubs, JSON.stringify({
        title: `@ ${me.title} ${me.first_name} vous a mentionné·e · ${CHANNEL_NAMES[msg.channel] || msg.channel}`,
        body: short,
        url,
        tag: 'mention-' + msg.id,
        renotify: true
      })) : 0;
      return json({ sent: sent + sentTags, total: subs.length + tagSubs.length });
    }

    return json({ error: 'action inconnue' }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
