-- =====================================================================
-- Mise à jour 17 : nouvelle Discussion
--   - messages privés entre deux chefs (canal « dm:<chef 1>:<chef 2> »), visibles par eux seuls,
--     même pas par les administrateurs ;
--   - liste des conversations avec le dernier message de chacune ;
--   - « en ligne » / « vu il y a… » ;
--   - messages vocaux, position et événement partagés dans la discussion.
-- À coller une seule fois dans Supabase : SQL Editor > New query > Run.
-- Le script peut être relancé sans danger.
-- =====================================================================

-- ---------- Accès aux canaux --------------------------------------------
-- Conversation privée : seulement les deux chefs. Sinon, même règle qu'avant (mises à jour 09 et 12).
create or replace function public.can_see_channel(ch text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.members m
    where m.user_id = auth.uid()
      and case when ch like 'dm:%'
        then m.id::text in (split_part(ch, ':', 2), split_part(ch, ':', 3))
        else ch in ('annonces', 'general') or m.is_admin or m.pole_id = ch or ch = any(m.pole_ids) or ch = any(m.chat_channels)
      end
  )
$$;
revoke all on function public.can_see_channel(text) from public, anon;
grant execute on function public.can_see_channel(text) to authenticated;

-- Nom d'une conversation privée : dm:<identifiant>:<identifiant>, les deux chefs dans l'ordre alphabétique
do $$
begin
  alter table public.messages add constraint messages_dm_check
    check (channel not like 'dm:%' or (channel ~ '^dm:[0-9a-f-]{36}:[0-9a-f-]{36}$'
      and split_part(channel, ':', 2) < split_part(channel, ':', 3)));
exception when duplicate_object then null;
end $$;

-- Dernière lecture : les noms des conversations privées sont plus longs que ceux des canaux
create or replace function public.mark_read(p_channel text) returns void
language sql security definer set search_path = public as $$
  insert into public.chat_reads (member_id, channel, read_at)
  select public.my_member_id(), p_channel, now()
  where public.is_member() and char_length(p_channel) between 1 and 100 and public.can_see_channel(p_channel)
  on conflict (member_id, channel) do update set read_at = excluded.read_at
$$;
revoke all on function public.mark_read(text) from public, anon;
grant execute on function public.mark_read(text) to authenticated;

-- ---------- Liste des conversations ------------------------------------
-- Le dernier message de chaque conversation que la personne peut voir
create or replace function public.chat_overview() returns setof public.messages
language sql stable security definer set search_path = public as $$
  select distinct on (m.channel) m.*
  from public.messages m
  where public.is_member() and public.can_see_channel(m.channel)
  order by m.channel, m.created_at desc
$$;
revoke all on function public.chat_overview() from public, anon;
grant execute on function public.chat_overview() to authenticated;

-- ---------- En ligne / vu il y a… ---------------------------------------
alter table public.members add column if not exists last_seen_at timestamptz;
create or replace function public.touch_presence() returns void
language sql security definer set search_path = public as $$
  update public.members set last_seen_at = now() where user_id = auth.uid()
$$;
revoke all on function public.touch_presence() from public, anon;
grant execute on function public.touch_presence() to authenticated;

-- ---------- Vocal, position et événement dans un message ------------------
alter table public.messages add column if not exists attach_dur int;          -- durée d'un vocal (secondes)
alter table public.messages add column if not exists voice_peaks smallint[];  -- forme du vocal (barres de 0 à 100)
alter table public.messages add column if not exists loc_lat double precision;
alter table public.messages add column if not exists loc_lng double precision;
alter table public.messages add column if not exists loc_label text;
alter table public.messages add column if not exists event_ref uuid references public.events(id) on delete set null;

do $$
begin
  alter table public.messages add constraint messages_extra_check check (
    (attach_dur is null or attach_dur between 0 and 600)
    and (voice_peaks is null or cardinality(voice_peaks) <= 64)
    and ((loc_lat is null) = (loc_lng is null))
    and (loc_lat is null or (loc_lat between -90 and 90 and loc_lng between -180 and 180))
    and (loc_label is null or char_length(loc_label) <= 200));
exception when duplicate_object then null;
end $$;
