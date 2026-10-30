-- =====================================================================
-- Mise à jour 26 : appels plus stables
--   - UN SEUL appel en cours par conversation (garanti par la base) : appuyer sur 📞 / 🎥
--     pendant un appel fait rejoindre l'appel en cours, jamais en créer un deuxième ;
--   - chaque participant donne signe de vie toutes les 15 s : un appel ne se termine que
--     quand plus personne n'y est (et un appel arrêté par erreur reprend tout seul) ;
--   - à lancer après la mise à jour 23.
-- À coller une seule fois dans Supabase : SQL Editor > New query > Run.
-- Le script peut être relancé sans danger.
-- =====================================================================

-- Participants d'un appel, avec leur dernier signe de vie (lu seulement par les fonctions ci-dessous)
create table if not exists public.call_members (
  call_id uuid not null references public.calls(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_ping timestamptz not null default now(),
  left_at timestamptz,
  primary key (call_id, member_id)
);
alter table public.call_members enable row level security;

-- Doublons éventuels d'avant cette mise à jour : seul le plus récent appel ouvert reste ouvert
update public.calls c set ended_at = greatest(c.last_ping, c.started_at), active = '{}'
where c.ended_at is null and exists (select 1 from public.calls d where d.channel = c.channel and d.ended_at is null and d.started_at > c.started_at);
create unique index if not exists calls_one_open on public.calls (channel) where ended_at is null;

-- Recalcule qui est dans l'appel ; plus personne depuis 60 s : l'appel se termine
create or replace function public.call_refresh(p_call uuid) returns public.calls
language plpgsql security definer set search_path = public as $$
declare c calls; live uuid[]; lastp timestamptz;
begin
  select coalesce(array_agg(member_id order by joined_at), '{}'), max(last_ping) into live, lastp
  from call_members where call_id = p_call and left_at is null and last_ping > now() - interval '60 seconds';
  update calls set active = live, last_ping = greatest(last_ping, coalesce(lastp, last_ping)),
    ended_at = case when ended_at is null and cardinality(live) = 0 then now() else ended_at end
  where id = p_call returning * into c;
  return c;
end;
$$;

-- Ancienne règle (mise à jour 23) remplacée : on se fie aux signes de vie de chaque participant
create or replace function public.call_close_stale(p_channel text) returns void
language plpgsql security definer set search_path = public as $$
declare id uuid;
begin
  for id in select c.id from calls c where c.channel = p_channel and c.ended_at is null loop
    perform call_refresh(id);
  end loop;
end;
$$;

-- Entrer dans un appel (ou y revenir)
create or replace function public.call_enter(p_call uuid, p_me uuid) returns public.calls
language plpgsql security definer set search_path = public as $$
declare c calls;
begin
  insert into call_members (call_id, member_id) values (p_call, p_me)
  on conflict (call_id, member_id) do update set last_ping = now(), left_at = null;
  update calls set joined = array(select distinct unnest(joined || p_me)),
    answered_at = coalesce(answered_at, case when started_by <> p_me then now() end)
  where id = p_call;
  c := call_refresh(p_call);
  return c;
end;
$$;

-- Lance un appel, ou rejoint celui déjà en cours dans la conversation (jamais deux à la fois)
create or replace function public.call_start(p_channel text, p_kind text) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := my_member_id(); c calls; mid bigint;
begin
  if me is null or not can_see_channel(p_channel) then raise exception 'Accès refusé.'; end if;
  if p_kind not in ('audio', 'video') then raise exception 'Type d''appel inconnu.'; end if;
  perform call_close_stale(p_channel);
  select * into c from calls where channel = p_channel and ended_at is null;
  if c.id is null then
    begin
      insert into calls (channel, kind, started_by, active, joined) values (p_channel, p_kind, me, array[me], array[me]) returning * into c;
    exception when unique_violation then
      select * into c from calls where channel = p_channel and ended_at is null; -- lancé au même instant par quelqu'un d'autre
    end;
    if c.started_by = me and c.started_at > now() - interval '5 seconds' and not exists (select 1 from messages where call_id = c.id) then
      c := call_enter(c.id, me);
      insert into messages (channel, member_id, body, call_id)
      values (p_channel, me, case when p_kind = 'video' then '📹 Appel vidéo' else '📞 Appel audio' end, c.id)
      returning id into mid;
      return json_build_object('call', row_to_json(c), 'message_id', mid, 'joined', false);
    end if;
  end if;
  c := call_enter(c.id, me);
  return json_build_object('call', row_to_json(c), 'message_id', null, 'joined', true);
end;
$$;

-- Rejoindre un appel précis. S'il vient de se terminer par erreur, il reprend ;
-- si un autre appel est en cours dans la conversation, on rejoint celui-là.
create or replace function public.call_join(p_call uuid) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := my_member_id(); c calls; o calls;
begin
  select * into c from calls where id = p_call;
  if me is null or c.id is null or not can_see_channel(c.channel) then raise exception 'Accès refusé.'; end if;
  perform call_close_stale(c.channel);
  select * into c from calls where id = p_call;
  if c.ended_at is not null then
    select * into o from calls where channel = c.channel and ended_at is null;
    if o.id is not null then c := o;
    elsif c.ended_at > now() - interval '3 minutes' then
      begin update calls set ended_at = null where id = c.id; exception when unique_violation then null; end;
      select * into c from calls where id = p_call;
      if c.ended_at is not null then raise exception 'Cet appel est terminé.'; end if;
    else raise exception 'Cet appel est terminé.';
    end if;
  end if;
  c := call_enter(c.id, me);
  return row_to_json(c);
end;
$$;

-- Quitter (p_end : raccrocher pour tout le monde, en conversation privée)
create or replace function public.call_leave(p_call uuid, p_end boolean default false) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := my_member_id(); c calls;
begin
  select * into c from calls where id = p_call;
  if me is null or c.id is null or not can_see_channel(c.channel) then return; end if;
  update call_members set left_at = now() where call_id = p_call and member_id = me;
  if p_end then update calls set ended_at = coalesce(ended_at, now()), active = '{}' where id = p_call;
  else perform call_refresh(p_call); end if;
end;
$$;

-- Signe de vie (toutes les 15 s) : remet aussi dans l'appel quelqu'un qui en avait été retiré par erreur.
-- (Supprimée puis recréée : elle renvoie maintenant l'état de l'appel.)
drop function if exists public.call_ping(uuid);
create or replace function public.call_ping(p_call uuid) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := my_member_id(); c calls;
begin
  select * into c from calls where id = p_call;
  if me is null or c.id is null or not can_see_channel(c.channel) then return null; end if;
  if c.ended_at is not null then
    if c.ended_at < now() - interval '3 minutes' or exists (select 1 from calls where channel = c.channel and ended_at is null) then
      return json_build_object('ended', true);
    end if;
    begin update calls set ended_at = null where id = p_call; exception when unique_violation then return json_build_object('ended', true); end;
  end if;
  c := call_enter(p_call, me);
  return json_build_object('ended', false, 'active', c.active);
end;
$$;

revoke all on function public.call_refresh(uuid) from public, anon, authenticated;
revoke all on function public.call_enter(uuid, uuid) from public, anon, authenticated;
revoke all on function public.call_close_stale(text) from public, anon, authenticated;
revoke all on function public.call_start(text, text) from public, anon;
revoke all on function public.call_join(uuid) from public, anon;
revoke all on function public.call_ping(uuid) from public, anon;
revoke all on function public.call_leave(uuid, boolean) from public, anon;
grant execute on function public.call_start(text, text) to authenticated;
grant execute on function public.call_join(uuid) to authenticated;
grant execute on function public.call_ping(uuid) to authenticated;
grant execute on function public.call_leave(uuid, boolean) to authenticated;
