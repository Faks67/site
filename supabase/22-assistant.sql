-- =====================================================================
-- Mise à jour 22 : l'assistant (Gemini, formule gratuite de Google)
--   - un compteur de questions par chef et par jour (heure de Paris) ;
--   - 15 questions par chef et par jour, 400 pour tout le monde :
--     de quoi rester largement dans la formule gratuite de Google.
--     Pour changer ces nombres, modifier ai_limits() ci-dessous et relancer le script.
-- Les conversations ne sont pas enregistrées dans la base : elles restent sur le téléphone du chef.
-- À coller une seule fois dans Supabase : SQL Editor > New query > Run.
-- Le script peut être relancé sans danger.
-- =====================================================================

create table if not exists public.ai_usage (
  member_id uuid not null references public.members(id) on delete cascade,
  day date not null,
  n int not null default 0,
  primary key (member_id, day)
);
-- Aucune règle d'accès : seulement par les fonctions ci-dessous
alter table public.ai_usage enable row level security;

-- Limites : par chef et par jour, puis pour tout le monde
create or replace function public.ai_limits(out per_chef int, out per_day int)
language sql immutable as $$ select 15, 400 $$;

-- Compte une question (appelée par la fonction « assistant » seulement)
create or replace function public.ai_take(p_member uuid) returns json
language plpgsql security definer set search_path = public as $$
declare d date := (now() at time zone 'Europe/Paris')::date; l record; g int; used int;
begin
  select * into l from ai_limits();
  select coalesce(sum(n), 0) into g from ai_usage where day = d;
  if g >= l.per_day then return json_build_object('error', 'quota_global', 'limit', l.per_chef); end if;
  insert into ai_usage (member_id, day, n) values (p_member, d, 1)
  on conflict (member_id, day) do update set n = ai_usage.n + 1 where ai_usage.n < l.per_chef
  returning n into used;
  if used is null then return json_build_object('error', 'quota', 'limit', l.per_chef); end if;
  return json_build_object('remaining', l.per_chef - used, 'limit', l.per_chef);
end;
$$;

-- Rend la question si Google n'a pas répondu
create or replace function public.ai_refund(p_member uuid) returns void
language sql security definer set search_path = public as $$
  update ai_usage set n = greatest(0, n - 1) where member_id = p_member and day = (now() at time zone 'Europe/Paris')::date
$$;

-- Ce qu'il reste aujourd'hui au chef connecté
create or replace function public.ai_quota() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('limit', l.per_chef,
    'remaining', l.per_chef - coalesce((select n from ai_usage where member_id = my_member_id() and day = (now() at time zone 'Europe/Paris')::date), 0))
  from ai_limits() l
  where my_member_id() is not null
$$;

revoke all on function public.ai_take(uuid) from public, anon, authenticated;
revoke all on function public.ai_refund(uuid) from public, anon, authenticated;
revoke all on function public.ai_quota() from public, anon;
grant execute on function public.ai_take(uuid) to service_role;
grant execute on function public.ai_refund(uuid) to service_role;
grant execute on function public.ai_quota() to authenticated;
