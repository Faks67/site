// Fonction Supabase « notify » : envoie une notification sur les téléphones
// des chefs et cheftaines quand un message est publié dans un canal qu'ils suivent
// (choix fait dans le site avec le bouton cloche ; par défaut : les annonces seulement).
//
// À créer dans Supabase : Edge Functions > Deploy a new function > Via Editor,
// nom « notify », coller ce fichier, puis Deploy.
// Les clés de notification sont créées automatiquement au premier appel.

import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import webpush from 'npm:web-push@3.6.7';

const SITE_URL = 'https://faks67.github.io/site/';
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const CHANNEL_NAMES: Record<string, string> = {
  annonces: 'Annonces', general: 'Général', peda: 'Pédagogie',
  formation: 'Formation & Relève', event: 'Événementiel', support: 'Logistique & trésorerie'
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// deno-lint-ignore no-explicit-any
async function vapidKeys(admin: any) {
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Seuls les chefs et cheftaines connectés peuvent utiliser la fonction
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const { data: auth } = await admin.auth.getUser(token);
    if (!auth?.user) return json({ error: 'non connecté' }, 401);
    const { data: me } = await admin.from('members').select('id, title, first_name').eq('user_id', auth.user.id).maybeSingle();
    if (!me) return json({ error: 'accès refusé' }, 403);

    const keys = await vapidKeys(admin);
    const body = await req.json().catch(() => ({}));

    if (body.action === 'key') return json({ publicKey: keys.publicKey });

    if (body.action === 'notify') {
      const { data: msg } = await admin.from('messages').select('id, channel, member_id, body').eq('id', body.message_id).maybeSingle();
      if (!msg || msg.member_id !== me.id) return json({ error: 'message introuvable' }, 400);

      webpush.setVapidDetails(SITE_URL, keys.publicKey, keys.privateKey);
      const { data: all } = await admin.from('push_subscriptions').select('endpoint, p256dh, auth, member_id').neq('member_id', me.id);
      // Canaux suivis par chaque chef (sans choix enregistré : les annonces)
      const { data: prefs } = await admin.from('notif_prefs').select('member_id, channels');
      const follows = new Map((prefs || []).map((p: { member_id: string; channels: string[] }) => [p.member_id, p.channels]));
      const subs = (all || []).filter((s: { member_id: string }) => (follows.get(s.member_id) ?? ['annonces']).includes(msg.channel));
      const isAnnonce = msg.channel === 'annonces';
      const payload = JSON.stringify({
        title: isAnnonce ? `📣 ${me.title} ${me.first_name}` : `# ${CHANNEL_NAMES[msg.channel] || msg.channel} · ${me.title} ${me.first_name}`,
        body: msg.body.length > 180 ? msg.body.slice(0, 177) + '…' : msg.body,
        url: SITE_URL + (isAnnonce ? '#annonces' : '#chat-' + msg.channel),
        // Une notification par annonce ; pour les autres canaux, la dernière remplace la précédente
        tag: isAnnonce ? 'annonce-' + msg.id : 'chat-' + msg.channel,
        renotify: !isAnnonce
      });

      let sent = 0;
      const expired: string[] = [];
      await Promise.all((subs || []).map(async (s: { endpoint: string; p256dh: string; auth: string }) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400, urgency: 'high' });
          sent++;
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) expired.push(s.endpoint);
          else console.error('envoi impossible', code, (e as Error).message);
        }
      }));
      if (expired.length) await admin.from('push_subscriptions').delete().in('endpoint', expired);
      return json({ sent, total: subs?.length || 0 });
    }

    return json({ error: 'action inconnue' }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
