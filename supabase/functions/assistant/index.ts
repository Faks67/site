// Fonction Supabase « assistant » : l'assistant des chefs, propulsé par Gemini (formule gratuite de Google).
// La clé Gemini reste ici, jamais dans le site. Seuls les chefs et cheftaines connectés peuvent l'utiliser,
// dans la limite de questions par jour fixée par la mise à jour SQL 22 (public.ai_limits).
// Les conversations ne sont pas enregistrées : le site envoie les derniers messages à chaque question.
//
// À créer dans Supabase : Edge Functions > Deploy a new function > Via Editor,
// nom « assistant », coller ce fichier, puis Deploy. Laisser « Verify JWT » désactivé (la fonction vérifie elle-même).
// Secret à ajouter (Edge Functions > Secrets) : GEMINI_API_KEY (clé créée sur aistudio.google.com).
// Facultatif : GEMINI_MODEL pour changer de modèle (par défaut gemini-3.8-flash).

import { createClient } from 'npm:@supabase/supabase-js@2.117.2';

const MODEL = (Deno.env.get('GEMINI_MODEL') || 'gemini-3.8-flash').trim();
const FALLBACK = 'gemini-flash-latest'; // si le modèle n'existe plus
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const APP_HELP = `Fonctionnement de l'application (site installable sur téléphone) :
- Accueil : prochain rendez-vous et présence (Présent·e / Absent·e), prochaine prière, statistiques, carte « Question du jour ».
- Calendrier : sorties, réunions, réunions de pôle (visibles seulement par les chefs choisis), absences à signaler.
- Discussion : canaux (Annonces, Général, pôles) et messages privés ; « Nouveau » pour écrire à un chef ; bouton + pour photo, document, sondage, position, événement ; micro pour un vocal ; appui long sur une conversation pour l'épingler ; les pièces jointes sont effacées au bout de 30 jours.
- Localisation : carte des lieux.
- Défi : une question islamique par jour à minuit, 30 secondes, jusqu'à 100 points, classement sur 2 semaines.
- Présences, Documents (bibliothèque), Organigramme, Pôles, Groupes, Réclamations ; Administration pour les administrateurs.
- La cloche en haut active les notifications ; le thème clair/sombre se choisit en bas du menu (ordinateur) ou dans « Plus ».`;

const SYSTEM = `Tu es l'assistant de l'application des chefs et cheftaines des « Travailleurs de l'Imam » (Scouts Bayt ul Mahdi), un mouvement scout musulman chiite en France. Devise : « Le bonheur de l'Imam est la plus belle des récompenses ».

Tu aides les chefs à :
- trouver des idées d'activités (grands jeux, veillées, sorties, ateliers, camps, jeux d'intérieur), adaptées à l'âge, au nombre d'enfants, au lieu et à la durée, en respectant les valeurs islamiques (horaires de prière, nourriture halal, pudeur, bienveillance) ;
- rédiger (annonces aux parents, messages aux chefs, programmes) ;
- organiser (déroulés, listes de matériel, répartition des rôles) ;
- comprendre l'application.

Règles :
- Réponds en français, chaleureusement et clairement. Mets en forme en Markdown simple : titres ###, listes, **gras**. Pas de tableaux. Reste concis (environ 250 mots au plus) sauf si on te demande un programme détaillé.
- Religion : tu peux raconter de façon générale et consensuelle la vie des prophètes et des Ahlul Bayt (as), le sens des fêtes et des valeurs, pour une veillée ou une activité. Mais tu ne donnes JAMAIS d'avis juridique (fiqh : halal/haram, validité d'une prière ou d'un jeûne, purification…) : explique gentiment qu'il vaut mieux demander au responsable religieux ou au bureau de son marja' (par exemple sistani.org). N'invente jamais de verset, de hadith ou de référence ; si tu en évoques un, reste général et conseille de vérifier. Évite les sujets polémiques.
- Sécurité des enfants d'abord : encadrement suffisant, premiers secours, autorisations des parents, météo.
- Ne demande pas d'informations personnelles sur les enfants (noms, santé…) ; si on t'en donne, ne les répète pas.
- Pour le calendrier et l'équipe, utilise seulement les données ci-dessous ; si l'information n'y est pas, dis-le simplement. Pour montrer un événement, écris en plus d'une phrase, seul sur sa ligne : [[ev:IDENTIFIANT]] (l'application affiche alors une carte).

${APP_HELP}`;

type Msg = { role: 'user' | 'model'; text: string };

async function gemini(key: string, model: string, contents: unknown, system: string) {
  return await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents, generationConfig: { temperature: 0.8, maxOutputTokens: 4096 } })
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const { data: auth } = await admin.auth.getUser(token);
    if (!auth?.user) return json({ error: 'non connecté' }, 401);
    const { data: me } = await admin.from('members').select('id, first_name, title').eq('user_id', auth.user.id).maybeSingle();
    if (!me) return json({ error: 'accès refusé' }, 403);
    const key = (Deno.env.get('GEMINI_API_KEY') || '').trim();
    if (!key) return json({ error: 'cle_absente' }, 503);

    const body = await req.json().catch(() => ({}));
    const msgs: Msg[] = (Array.isArray(body.messages) ? body.messages : [])
      .filter((m: Msg) => (m?.role === 'user' || m?.role === 'model') && typeof m.text === 'string' && m.text.trim())
      .slice(-12).map((m: Msg) => ({ role: m.role, text: m.text.slice(0, 4000) }));
    while (msgs.length && msgs[0].role !== 'user') msgs.shift();
    if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return json({ error: 'question vide' }, 400);
    const context = typeof body.context === 'string' ? body.context.slice(0, 8000) : '';

    const take = await admin.rpc('ai_take', { p_member: me.id });
    if (take.error) return json({ error: take.error.code === 'PGRST202' ? 'sql_absent' : take.error.message }, 500);
    if (take.data.error) return json(take.data, 429);

    const system = `${SYSTEM}\n\nDonnées de l'application au moment de la question :\nChef qui te parle : ${me.title || ''} ${me.first_name || ''}\n${context}`;
    const contents = msgs.map((m) => ({ role: m.role, parts: [{ text: m.text }] }));
    let r = await gemini(key, MODEL, contents, system);
    if (r.status === 404) r = await gemini(key, FALLBACK, contents, system);
    const out = await r.json().catch(() => ({}));
    if (!r.ok) {
      await admin.rpc('ai_refund', { p_member: me.id });
      console.error('Gemini', r.status, JSON.stringify(out).slice(0, 500));
      return json({ error: r.status === 429 ? 'gemini_occupe' : r.status === 400 || r.status === 403 ? 'cle_refusee' : `Gemini a répondu ${r.status}` }, r.status === 429 ? 429 : 502);
    }
    const cand = out.candidates?.[0];
    const text = (cand?.content?.parts || []).filter((p: { thought?: boolean }) => !p.thought).map((p: { text?: string }) => p.text || '').join('').trim();
    if (!text) {
      await admin.rpc('ai_refund', { p_member: me.id });
      return json({ error: cand?.finishReason === 'SAFETY' || out.promptFeedback?.blockReason ? 'bloque' : 'vide' }, 502);
    }
    return json({ text, remaining: take.data.remaining, limit: take.data.limit });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
