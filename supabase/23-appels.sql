-- =====================================================================
-- Mise à jour 23 : appels audio et vidéo dans la Discussion
--   - un appel par conversation (privée ou canal), lancé depuis l'en-tête ;
--   - les images et le son passent directement d'un appareil à l'autre (WebRTC, chiffré) :
--     la base ne garde que qui a appelé, quand, et combien de temps ;
--   - un message « Appel vidéo / Appel audio » est ajouté dans la conversation (historique,
--     notification et bouton « Rejoindre »).
-- À coller une seule fois dans Supabase : SQL Editor > New query > Run.
-- Le script peut être relancé sans danger.
-- =====================================================================

create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  channel text not null,
  kind text not null check (kind in ('audio', 'video')),
  started_by uuid not null references public.members(id) on delete cascade,
  started_at timestamptz not null default now(),
  answered_at timestamptz,
  ended_at timestamptz,
  last_ping timestamptz not null default now(),
  active uuid[] not null default '{}',   -- dans l'appel en ce moment
  joined uuid[] not null default '{}'    -- tous ceux qui ont participé
);
create index if not exists calls_channel on public.calls (channel, started_at desc);
alter table public.calls enable row level security;
drop policy if exists calls_read on public.calls;
create policy calls_read on public.calls for select to authenticated using (public.can_see_channel(channel));

alter table public.messages add column if not exists call_id uuid references public.calls(id) on delete set null;

-- Un appel dont personne n'a donné de nouvelles depuis 1 minute est terminé (téléphone éteint, réseau coupé…)
create or replace function public.call_close_stale(p_channel text) returns void
language sql security definer set search_path = public as $$
  update calls set ended_at = last_ping, active = '{}'
  where channel = p_channel and ended_at is null and last_ping < now() - interval '60 seconds'
$$;

-- Lance un appel (ou rejoint celui déjà en cours dans la conversation)
create or replace function public.call_start(p_channel text, p_kind text) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := my_member_id(); c calls; mid bigint;
begin
  if me is null or not can_see_channel(p_channel) then raise exception 'Accès refusé.'; end if;
  if p_kind not in ('audio', 'video') then raise exception 'Type d''appel inconnu.'; end if;
  perform call_close_stale(p_channel);
  select * into c from calls where channel = p_channel and ended_at is null order by started_at desc limit 1;
  if c.id is not null then
    update calls set active = array(select distinct unnest(active || me)), joined = array(select distinct unnest(joined || me)),
      last_ping = now(), answered_at = coalesce(answered_at, case when started_by <> me then now() end)
    where id = c.id returning * into c;
    return json_build_object('call', row_to_json(c), 'message_id', null, 'joined', true);
  end if;
  insert into calls (channel, kind, started_by, active, joined) values (p_channel, p_kind, me, array[me], array[me]) returning * into c;
  insert into messages (channel, member_id, body, call_id)
  values (p_channel, me, case when p_kind = 'video' then '📹 Appel vidéo' else '📞 Appel audio' end, c.id)
  returning id into mid;
  return json_build_object('call', row_to_json(c), 'message_id', mid, 'joined', false);
end;
$$;

-- Rejoint un appel en cours
create or replace function public.call_join(p_call uuid) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := my_member_id(); c calls;
begin
  select * into c from calls where id = p_call;
  if me is null or c.id is null or not can_see_channel(c.channel) then raise exception 'Accès refusé.'; end if;
  perform call_close_stale(c.channel);
  update calls set active = array(select distinct unnest(active || me)), joined = array(select distinct unnest(joined || me)),
    last_ping = now(), answered_at = coalesce(answered_at, case when started_by <> me then now() end)
  where id = p_call and ended_at is null returning * into c;
  if c.id is null then raise exception 'Cet appel est terminé.'; end if;
  return row_to_json(c);
end;
$$;

-- « Toujours là » (toutes les 20 secondes pendant l'appel)
create or replace function public.call_ping(p_call uuid) returns void
language sql security definer set search_path = public as $$
  update calls set last_ping = now() where id = p_call and ended_at is null and my_member_id() = any(active)
$$;

-- Quitte l'appel ; le dernier qui part le termine (p_end : raccrocher pour tout le monde, en conversation privée)
create or replace function public.call_leave(p_call uuid, p_end boolean default false) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := my_member_id(); c calls;
begin
  select * into c from calls where id = p_call;
  if me is null or c.id is null or not can_see_channel(c.channel) then return; end if;
  update calls set active = array_remove(active, me),
    ended_at = case when p_end or cardinality(array_remove(active, me)) = 0 then now() else ended_at end
  where id = p_call and ended_at is null;
end;
$$;

revoke all on function public.call_close_stale(text) from public, anon, authenticated;
revoke all on function public.call_start(text, text) from public, anon;
revoke all on function public.call_join(uuid) from public, anon;
revoke all on function public.call_ping(uuid) from public, anon;
revoke all on function public.call_leave(uuid, boolean) from public, anon;
grant execute on function public.call_start(text, text) to authenticated;
grant execute on function public.call_join(uuid) to authenticated;
grant execute on function public.call_ping(uuid) to authenticated;
grant execute on function public.call_leave(uuid, boolean) to authenticated;

-- Fin d'appel visible en direct (durée dans l'historique, bandeau « Rejoindre » qui disparaît)
do $$
begin
  alter publication supabase_realtime add table public.calls;
exception when duplicate_object then null; when undefined_object then null;
end $$;
