-- =====================================================================
-- Mise à jour 20 : le Défi du jour (une question QCM par jour, classement sur 2 semaines)
--   - une question par jour, mise en jeu à minuit (heure de Paris) ;
--   - manches de 2 semaines, du lundi au dimanche de la semaine suivante :
--     semaine 1 = islam de base (niveau 1), semaine 2 = Ahlul Bayt et fiqh ja'farite (niveau 2) ;
--   - 30 secondes pour répondre, chronométrées par le serveur ;
--     bonne réponse : 100 points, moins 5 points toutes les 2 secondes ; mauvaise réponse ou temps écoulé : 0.
-- La bonne réponse n'est jamais envoyée au téléphone avant que le chef ait répondu :
-- les tables ne sont lisibles qu'à travers les fonctions ci-dessous.
-- Les questions sont ajoutées par le script 21-defi-questions.sql.
-- À coller une seule fois dans Supabase : SQL Editor > New query > Run.
-- Le script peut être relancé sans danger.
-- =====================================================================

create table if not exists public.quiz_questions (
  id int primary key,
  level smallint not null check (level in (1, 2)),
  theme text not null,
  question text not null,
  choices text[] not null check (cardinality(choices) = 4),
  answer smallint not null check (answer between 0 and 3),
  explanation text,
  active boolean not null default true
);

-- La question tirée pour chaque jour (gardée : tout le monde a la même)
create table if not exists public.quiz_days (
  day date primary key,
  question_id int not null references public.quiz_questions(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Une ligne par chef et par jour : ouverture (début du chrono), puis réponse
create table if not exists public.quiz_answers (
  member_id uuid not null references public.members(id) on delete cascade,
  day date not null,
  question_id int not null references public.quiz_questions(id) on delete cascade,
  opened_at timestamptz not null default now(),
  answered_at timestamptz,
  choice smallint,
  correct boolean not null default false,
  points int not null default 0,
  ms int,
  primary key (member_id, day)
);
create index if not exists quiz_answers_day on public.quiz_answers (day);

-- Aucune règle d'accès : personne ne lit ces tables directement (seulement par les fonctions)
alter table public.quiz_questions enable row level security;
alter table public.quiz_days enable row level security;
alter table public.quiz_answers enable row level security;

-- ---------- Calendrier du Défi ------------------------------------------------
-- Jour en cours à Paris
create or replace function public.quiz_today() returns date
language sql stable as $$ select (now() at time zone 'Europe/Paris')::date $$;

-- Manche d'un jour : début (lundi), fin (dimanche suivant), semaine 1 ou 2.
-- Première manche : lundi 26 octobre 2026.
create or replace function public.quiz_round(d date, out round_start date, out round_end date, out week int)
language sql immutable as $$
  select s, s + 13, case when d - s < 7 then 1 else 2 end
  from (select date '2026-10-26' + 14 * floor((d - date '2026-10-26') / 14.0)::int as s) x
$$;

-- Question du jour : tirée une fois, dans le niveau de la semaine, parmi les moins récemment posées
create or replace function public.quiz_pick(d date) returns int
language plpgsql security definer set search_path = public as $$
declare lvl int; qid int;
begin
  select question_id into qid from quiz_days where day = d;
  if qid is not null then return qid; end if;
  select week into lvl from quiz_round(d);
  select q.id into qid
  from quiz_questions q left join (select question_id, max(day) as last from quiz_days group by question_id) u on u.question_id = q.id
  where q.active
  order by (q.level = lvl) desc, u.last nulls first, random()
  limit 1;
  if qid is null then return null; end if;
  insert into quiz_days (day, question_id) values (d, qid) on conflict (day) do nothing;
  select question_id into qid from quiz_days where day = d;
  return qid;
end;
$$;

-- ---------- Ce que voit le chef -----------------------------------------------
-- État du jour, sans démarrer le chrono (accueil, onglet Défi)
create or replace function public.quiz_status() returns json
language plpgsql stable security definer set search_path = public as $$
declare me uuid := my_member_id(); d date := quiz_today(); r record; a quiz_answers; n int;
begin
  if me is null then raise exception 'Accès réservé aux chefs.'; end if;
  select * into r from quiz_round(d);
  select * into a from quiz_answers where member_id = me and day = d;
  select count(*) into n from quiz_answers where day = d and answered_at is not null;
  return json_build_object('day', d, 'round_start', r.round_start, 'round_end', r.round_end, 'week', r.week,
    'opened', a.member_id is not null, 'answered', a.answered_at is not null,
    'correct', a.correct, 'points', a.points, 'ms', a.ms, 'answered_today', n,
    'has_questions', exists (select 1 from quiz_questions where active));
end;
$$;

-- Ouvre la question du jour : démarre le chrono (une seule fois) et renvoie la question, sans la réponse
create or replace function public.quiz_open() returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := my_member_id(); d date := quiz_today(); qid int; q quiz_questions; a quiz_answers; r record;
begin
  if me is null then raise exception 'Accès réservé aux chefs.'; end if;
  qid := quiz_pick(d);
  if qid is null then raise exception 'Aucune question disponible.'; end if;
  insert into quiz_answers (member_id, day, question_id) values (me, d, qid) on conflict (member_id, day) do nothing;
  select * into a from quiz_answers where member_id = me and day = d;
  select * into q from quiz_questions where id = a.question_id;
  select * into r from quiz_round(d);
  return json_build_object('day', d, 'week', r.week, 'level', q.level, 'theme', q.theme, 'question', q.question, 'choices', q.choices,
    'elapsed_ms', floor(extract(epoch from now() - a.opened_at) * 1000)::int,
    'answered', a.answered_at is not null,
    -- Déjà répondu : on peut renvoyer le résultat
    'result', case when a.answered_at is null then null else json_build_object('choice', a.choice, 'correct', a.correct, 'answer', q.answer,
      'points', a.points, 'ms', a.ms, 'explanation', q.explanation) end);
end;
$$;

-- Répond à la question du jour (p_choice de 0 à 3 ; -1 si le temps est écoulé). Une seule réponse possible.
create or replace function public.quiz_answer(p_choice int) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := my_member_id(); d date := quiz_today(); a quiz_answers; q quiz_questions; t int; ok boolean; pts int;
begin
  if me is null then raise exception 'Accès réservé aux chefs.'; end if;
  select * into a from quiz_answers where member_id = me and day = d for update;
  if a.member_id is null then raise exception 'Ouvrez d''abord la question du jour.'; end if;
  select * into q from quiz_questions where id = a.question_id;
  if a.answered_at is null then
    t := floor(extract(epoch from now() - a.opened_at) * 1000)::int;
    -- 1,5 s de tolérance pour le temps de transmission ; au-delà de 30 s, la réponse ne compte plus
    ok := p_choice between 0 and 3 and p_choice = q.answer and t <= 31500;
    pts := case when ok then greatest(0, 100 - 5 * floor(least(t, 29999) / 2000.0)::int) else 0 end;
    update quiz_answers set answered_at = now(), choice = case when p_choice between 0 and 3 then p_choice end,
      correct = ok, points = pts, ms = least(t, 30000)
    where member_id = me and day = d
    returning * into a;
  end if;
  return json_build_object('choice', a.choice, 'correct', a.correct, 'answer', q.answer, 'points', a.points, 'ms', a.ms, 'explanation', q.explanation);
end;
$$;

-- Classement d'une manche (0 = en cours, -1 = précédente) : points, bonnes réponses, temps total
create or replace function public.quiz_board(p_offset int default 0)
returns table (member_id uuid, points bigint, correct bigint, answered bigint, total_ms bigint, round_start date, round_end date)
language sql stable security definer set search_path = public as $$
  with r as (select * from quiz_round(quiz_today() + 14 * p_offset))
  select a.member_id, sum(a.points), count(*) filter (where a.correct), count(*) filter (where a.answered_at is not null),
         coalesce(sum(a.ms) filter (where a.correct), 0), r.round_start, r.round_end
  from quiz_answers a, r
  where is_member() and a.day between r.round_start and r.round_end and a.answered_at is not null
  group by a.member_id, r.round_start, r.round_end
  order by 2 desc, 3 desc, 5 asc
$$;

revoke all on function public.quiz_pick(date) from public, anon, authenticated;
revoke all on function public.quiz_status() from public, anon;
revoke all on function public.quiz_open() from public, anon;
revoke all on function public.quiz_answer(int) from public, anon;
revoke all on function public.quiz_board(int) from public, anon;
grant execute on function public.quiz_status() to authenticated;
grant execute on function public.quiz_open() to authenticated;
grant execute on function public.quiz_answer(int) to authenticated;
grant execute on function public.quiz_board(int) to authenticated;
