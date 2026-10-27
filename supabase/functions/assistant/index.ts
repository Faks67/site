// Fonction Supabase « assistant » : l'assistant des chefs, propulsé par Gemini (formule gratuite de Google).
// La clé Gemini reste ici, jamais dans le site. Seuls les chefs et cheftaines connectés peuvent l'utiliser,
// dans la limite de questions par jour fixée par la mise à jour SQL 22 (public.ai_limits).
// Les conversations ne sont pas enregistrées : le site envoie les derniers messages à chaque question.
// La réponse est envoyée au fur et à mesure (le site l'affiche pendant qu'elle s'écrit).
//
// À créer dans Supabase : Edge Functions > Deploy a new function > Via Editor,
// nom « assistant », coller ce fichier, puis Deploy. Laisser « Verify JWT » désactivé (la fonction vérifie elle-même).
// Secret à ajouter (Edge Functions > Secrets) : GEMINI_API_KEY (clé créée sur aistudio.google.com).
// Facultatif : GEMINI_MODEL pour changer de modèle (par défaut gemini-3.8-flash).

import { createClient } from 'npm:@supabase/supabase-js@2.117.2';

const MODEL = (Deno.env.get('GEMINI_MODEL') || 'gemini-3.8-flash').trim();
// Modèles de secours, essayés si le premier est surchargé chez Google (erreur 503) ou n'existe plus
const FALLBACKS = ['gemini-flash-latest', 'gemini-flash-lite-latest'];
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
- Réponds en français, chaleureusement et clairement. Mets en forme en Markdown simple : titres ###, listes, **gras**. Pas de tableaux. Va droit au but : environ 200 mots au plus, sauf si on te demande un programme détaillé.
- Religion : tu peux raconter de façon générale et consensuelle la vie des prophètes et des Ahlul Bayt (as), le sens des fêtes et des valeurs, pour une veillée ou une activité. Mais tu ne donnes JAMAIS d'avis juridique (fiqh : halal/haram, validité d'une prière ou d'un jeûne, purification…) : explique gentiment qu'il vaut mieux demander au responsable religieux ou au bureau de son marja' (par exemple sistani.org). N'invente jamais de verset, de hadith ou de référence ; si tu en évoques un, reste général et conseille de vérifier. Évite les sujets polémiques.
- Sécurité des enfants d'abord : encadrement suffisant, premiers secours, autorisations des parents, météo.
- Ne demande pas d'informations personnelles sur les enfants (noms, santé…) ; si on t'en donne, ne les répète pas.
- Pour le calendrier et l'équipe, utilise seulement les données ci-dessous ; si l'information n'y est pas, dis-le simplement. Pour montrer un événement, écris en plus d'une phrase, seul sur sa ligne : [[ev:IDENTIFIANT]] (l'application affiche alors une carte).

${APP_HELP}`;

type Msg = { role: 'user' | 'model'; text: string };

// Réflexion réduite au minimum : la réponse commence bien plus vite.
// Si le modèle refuse un réglage, on essaie le suivant (et on retient celui qui marche).
const THINK: (Record<string, string> | null)[] = [{ thinkingLevel: 'minimal' }, { thinkingLevel: 'low' }, null];
const thinkOk: Record<string, number> = {};
const busy = (st: number) => st === 503 || st === 500 || st === 429;
async function gemini(key: string, contents: unknown, system: string) {
  let last = new Response('{}', { status: 404 });
  for (const model of [MODEL, ...FALLBACKS.filter((m) => m !== MODEL)]) {
    for (let i = thinkOk[model] || 0; i < THINK.length; i++) {
      const generationConfig = { temperature: 0.8, maxOutputTokens: 4096, ...(THINK[i] ? { thinkingConfig: THINK[i] } : {}) };
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents, generationConfig })
      });
      if (r.status === 400 && THINK[i]) { const t = await r.text(); if (/think/i.test(t)) continue; return new Response(t, { status: 400 }); }
      if (r.ok) { thinkOk[model] = i; return r; }
      if (r.status === 404 || busy(r.status)) { console.warn('Gemini', model, r.status, '→ modèle suivant'); await r.body?.cancel(); last = new Response('{}', { status: r.status }); break; }
      return r;
    }
  }
  return last;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method === 'GET') return json({ ok: true }); // réveil de la fonction par le site
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    // Vérification du jeton et recherche du chef en même temps (le chef n'est gardé que si le jeton est valide)
    let sub = '';
    try { sub = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub || ''; } catch { /* jeton illisible */ }
    const [{ data: auth }, { data: me }] = await Promise.all([admin.auth.getUser(token),
      admin.from('members').select('id, first_name, title').eq('user_id', sub || '00000000-0000-0000-0000-000000000000').maybeSingle()]);
    if (!auth?.user || auth.user.id !== sub) return json({ error: 'non connecté' }, 401);
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
    let r = await gemini(key, contents, system);
    if (busy(r.status)) { await new Promise((ok) => setTimeout(ok, 1500)); r = await gemini(key, contents, system); } // Google surchargé : un nouvel essai
    if (!r.ok || !r.body) {
      await admin.rpc('ai_refund', { p_member: me.id });
      console.error('Gemini', r.status, (await r.text().catch(() => '')).slice(0, 500));
      return json({ error: busy(r.status) ? 'gemini_occupe' : r.status === 400 || r.status === 403 ? 'cle_refusee' : `Gemini a répondu ${r.status}` }, r.status === 429 ? 429 : 502);
    }
    // Réponse en direct : une ligne JSON par morceau de texte, puis une ligne de fin
    const enc = new TextEncoder(), line = (o: unknown) => enc.encode(JSON.stringify(o) + '\n');
    const stream = new ReadableStream({
      async start(ctl) {
        const rd = r.body!.pipeThrough(new TextDecoderStream()).getReader();
        let buf = '', any = false, blocked = false;
        try {
          for (;;) {
            const { value, done } = await rd.read(); if (done) break; buf += value;
            let i; while ((i = buf.indexOf('\n')) >= 0) {
              const l = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
              if (!l.startsWith('data:')) continue;
              let d; try { d = JSON.parse(l.slice(5)); } catch { continue; }
              const c = d.candidates?.[0];
              const t = (c?.content?.parts || []).filter((p: { thought?: boolean }) => !p.thought).map((p: { text?: string }) => p.text || '').join('');
              if (t) { any = true; ctl.enqueue(line({ t })); }
              if (c?.finishReason === 'SAFETY' || d.promptFeedback?.blockReason) blocked = true;
            }
          }
        } catch (e) { console.error('flux Gemini', e); }
        if (any) ctl.enqueue(line({ done: true, remaining: take.data.remaining, limit: take.data.limit }));
        else { await admin.rpc('ai_refund', { p_member: me.id }); ctl.enqueue(line({ error: blocked ? 'bloque' : 'vide' })); }
        ctl.close();
      }
    });
    return new Response(stream, { headers: { ...cors, 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-cache' } });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
