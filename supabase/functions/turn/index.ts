// Fonction Supabase « turn » (facultative) : relais Cloudflare pour les appels audio/vidéo.
// Sans elle, les appels marchent quand même la plupart du temps ; le relais aide les réseaux
// qui bloquent les connexions directes (certaines 4G, box ou réseaux d'entreprise).
// Les images et le son restent chiffrés : le relais ne fait que les transmettre.
//
// À créer dans Supabase : Edge Functions > Deploy a new function > Via Editor,
// nom « turn », coller ce fichier, puis Deploy. Laisser « Verify JWT » désactivé (la fonction vérifie elle-même).
// Secrets à ajouter (Edge Functions > Secrets) : CF_TURN_KEY_ID et CF_TURN_API_TOKEN
// (Cloudflare : Realtime > TURN Server > Create, compte gratuit sans carte bancaire).

import { createClient } from 'npm:@supabase/supabase-js@2.117.2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const { data: auth } = await admin.auth.getUser(token);
    if (!auth?.user) return json({ error: 'non connecté' }, 401);
    const keyId = (Deno.env.get('CF_TURN_KEY_ID') || '').trim(), apiToken = (Deno.env.get('CF_TURN_API_TOKEN') || '').trim();
    if (!keyId || !apiToken) return json({ iceServers: [] }); // pas de relais configuré
    const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(keyId)}/credentials/generate-ice-servers`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl: 86400 })
    });
    const out = await r.json().catch(() => ({}));
    if (!r.ok) { console.error('Cloudflare TURN', r.status, JSON.stringify(out).slice(0, 300)); return json({ iceServers: [] }); }
    const list = Array.isArray(out.iceServers) ? out.iceServers : out.iceServers ? [out.iceServers] : [];
    return json({ iceServers: list, ttl: 86400 });
  } catch (e) {
    console.error(e);
    return json({ iceServers: [] });
  }
});
