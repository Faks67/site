// Fonction Supabase « files » : range les documents de la bibliothèque sur Backblaze B2 (10 Go gratuits)
// au lieu du stockage Supabase (1 Go). Le bucket B2 reste privé :
// - envoi : le fichier passe par cette fonction, qui le dépose sur B2 (aucun réglage CORS à faire chez Backblaze) ;
// - lecture : la fonction donne des liens temporaires (1 heure) pour les documents enregistrés dans la base ;
// - suppression : seulement un fichier qui n'est plus lié à aucun document ni message (la base décide qui peut supprimer) ;
// - pièces jointes de la discussion (mise à jour SQL 15) : lisibles par ceux qui voient le canal,
//   effacées chaque nuit au bout de 30 jours par la tâche programmée.
// Seuls les chefs et cheftaines connectés peuvent l'utiliser.
//
// À créer dans Supabase : Edge Functions > Deploy a new function > Via Editor,
// nom « files », coller ce fichier, puis Deploy. Laisser « Verify JWT » désactivé (la fonction vérifie elle-même).
// Secrets à ajouter (Edge Functions > Secrets) : B2_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET, B2_ENDPOINT, B2_REGION.

import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import { AwsClient } from 'npm:aws4fetch@1.0.20';

const MAX_BYTES = 25 * 1048576;
const READ_SECONDS = 3600;
const KEEP_DAYS = 30;
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-files-action, x-file-name',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// Connexion à B2 avec les secrets ; null si un secret manque (le site garde alors le stockage Supabase)
function b2() {
  const keyId = Deno.env.get('B2_KEY_ID'), key = Deno.env.get('B2_APPLICATION_KEY'), bucket = Deno.env.get('B2_BUCKET');
  const endpoint = (Deno.env.get('B2_ENDPOINT') || '').trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const region = (Deno.env.get('B2_REGION') || '').trim() || /^s3\.([^.]+)\./.exec(endpoint)?.[1] || '';
  if (!keyId || !key || !bucket || !endpoint || !region) return null;
  const aws = new AwsClient({ accessKeyId: keyId.trim(), secretAccessKey: key.trim(), service: 's3', region });
  const url = (path: string) => `https://${endpoint}/${encodeURIComponent(bucket.trim())}/${path.split('/').map(encodeURIComponent).join('/')}`;
  return { aws, url };
}
// Les fichiers B2 sont reconnus à leur chemin : b2/<identifiant>/<nom>
const isB2Path = (p: unknown): p is string => typeof p === 'string' && /^b2\/[\w-]+\/[\w.-]+$/.test(p);
// Même règle que public.can_see_channel (mises à jour SQL 09 et 12)
type Me = { id: string; is_admin: boolean; pole_id: string | null; pole_ids: string[] | null; chat_channels: string[] | null };
const seesChannel = (m: Me, ch: string) => ['annonces', 'general'].includes(ch) || m.is_admin || m.pole_id === ch
  || (m.pole_ids || []).includes(ch) || (m.chat_channels || []).includes(ch);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Tâche programmée de la nuit : pièces jointes de plus de 30 jours (reconnue grâce à sa clé secrète)
    if (req.headers.get('x-cron-key')) {
      const { data: k } = await admin.from('app_secrets').select('value').eq('key', 'cron_key').maybeSingle();
      if (!k?.value || req.headers.get('x-cron-key') !== k.value) return json({ error: 'accès refusé' }, 403);
      const s3 = b2(); if (!s3) return json({ error: 'b2_absent' }, 503);
      const before = new Date(Date.now() - KEEP_DAYS * 86400000).toISOString();
      const { data: old } = await admin.from('messages').select('id, attach_path').not('attach_path', 'is', null).lt('created_at', before).limit(500);
      const done: number[] = [];
      for (const m of old || []) {
        const r = await s3.aws.fetch(s3.url(m.attach_path), { method: 'DELETE' });
        if (r.ok || r.status === 404) done.push(m.id); else console.error('B2 ménage', r.status, await r.text());
      }
      if (done.length) await admin.from('messages').update({ attach_path: null, attach_expired: true }).in('id', done);
      return json({ purged: done.length });
    }

    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const { data: auth } = await admin.auth.getUser(token);
    if (!auth?.user) return json({ error: 'non connecté' }, 401);
    const { data: me } = await admin.from('members').select('id, is_admin, pole_id, pole_ids, chat_channels').eq('user_id', auth.user.id).maybeSingle();
    if (!me) return json({ error: 'accès refusé' }, 403);

    const s3 = b2();
    if (!s3) return json({ error: 'b2_absent' }, 503);
    // L'action et le nom du fichier arrivent dans les en-têtes (l'adresse peut perdre ses paramètres en chemin)
    const q = new URL(req.url).searchParams;
    const action = req.headers.get('x-files-action') || q.get('action');
    const fileName = (() => { try { return decodeURIComponent(req.headers.get('x-file-name') || ''); } catch { return ''; } })() || q.get('name');

    // Envoi : le corps de la requête est le fichier lui-même
    if (action === 'upload') {
      const safe = (fileName || 'fichier').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '_').slice(-80) || 'fichier';
      const body = new Uint8Array(await req.arrayBuffer());
      if (!body.length) return json({ error: 'fichier vide' }, 400);
      if (body.length > MAX_BYTES) return json({ error: 'fichier trop lourd (25 Mo maximum)' }, 413);
      const path = `b2/${crypto.randomUUID()}/${safe}`;
      const r = await s3.aws.fetch(s3.url(path), {
        method: 'PUT', body,
        headers: { 'Content-Type': req.headers.get('Content-Type') || 'application/octet-stream' }
      });
      if (!r.ok) { console.error('B2 envoi', r.status, await r.text()); return json({ error: `Backblaze a refusé le fichier (${r.status})` }, 502); }
      return json({ path, size: body.length });
    }

    const body = await req.json().catch(() => ({}));

    // Lecture : liens temporaires, seulement pour des documents de la bibliothèque
    // ou des pièces jointes d'un canal que la personne peut voir
    if (body.action === 'read') {
      const asked = (Array.isArray(body.paths) ? body.paths : []).filter(isB2Path).slice(0, 200);
      if (!asked.length) return json({ urls: {} });
      const { data: docs } = await admin.from('documents').select('file_path').in('file_path', asked);
      const ok = new Set<string>((docs || []).map((d: { file_path: string }) => d.file_path));
      const rest = asked.filter((p: string) => !ok.has(p));
      if (rest.length) {
        const { data: msgs } = await admin.from('messages').select('attach_path, channel').in('attach_path', rest);
        for (const m of msgs || []) if (seesChannel(me as Me, m.channel)) ok.add(m.attach_path);
      }
      const urls: Record<string, string> = {};
      for (const file_path of ok) {
        const u = new URL(s3.url(file_path));
        u.searchParams.set('X-Amz-Expires', String(READ_SECONDS));
        const signed = await s3.aws.sign(new Request(u, { method: 'GET' }), { aws: { signQuery: true } });
        urls[file_path] = signed.url;
      }
      return json({ urls });
    }

    // Suppression : le document a déjà été retiré de la base (qui vérifie les droits) ; on efface le fichier s'il n'est plus utilisé
    if (body.action === 'delete') {
      if (!isB2Path(body.path)) return json({ error: 'chemin invalide' }, 400);
      const { data: still } = await admin.from('documents').select('id').eq('file_path', body.path).maybeSingle();
      const { data: inChat } = await admin.from('messages').select('id').eq('attach_path', body.path).limit(1);
      if (still || inChat?.length) return json({ error: 'document encore présent' }, 409);
      const r = await s3.aws.fetch(s3.url(body.path), { method: 'DELETE' });
      if (!r.ok && r.status !== 404) { console.error('B2 suppression', r.status, await r.text()); return json({ error: `suppression impossible (${r.status})` }, 502); }
      return json({ ok: true });
    }

    return json({ error: 'action inconnue' }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
