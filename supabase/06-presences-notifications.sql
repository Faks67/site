-- =====================================================================
-- Mise à jour 6 : présences aux rendez-vous, notifications par canal
-- et compteur de messages non lus
-- À coller une seule fois dans Supabase : SQL Editor > New query > Run.
-- Le script peut être relancé sans danger.
-- =====================================================================

-- ---------- Présences ----------------------------------------------------
-- Chaque chef est présent par défaut : on n'enregistre que les absences,
-- une ligne par date de l'événement (les événements répétés ont une ligne par date).

create table if not exists public.event_absences (
  event_id uuid not null references public.events(id) on delete cascade,
  occ_date date not null,
  member_id uuid not null references public.members(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, occ_date, member_id)
);
create index if not exists event_absences_date on public.event_absences (occ_date);
alter table public.event_absences enable row level security;

drop policy if exists "lecture membres" on public.event_absences;
create policy "lecture membres" on public.event_absences for select to authenticated
  using (public.is_member());
-- Chacun indique sa propre absence ; la personne qui gère le calendrier peut le faire pour tous
drop policy if exists "ajout absence" on public.event_absences;
create policy "ajout absence" on public.event_absences for insert to authenticated
  with check ((public.is_member() and member_id = public.my_member_id()) or public.has_perm('calendrier'));
drop policy if exists "retrait absence" on public.event_absences;
create policy "retrait absence" on public.event_absences for delete to authenticated
  using (member_id = public.my_member_id() or public.has_perm('calendrier'));

-- ---------- Notifications : canaux choisis par chaque chef ---------------
-- Sans ligne pour un chef : seulement les annonces (comme avant).

create table if not exists public.notif_prefs (
  member_id uuid primary key references public.members(id) on delete cascade,
  channels text[] not null default '{annonces}',
  updated_at timestamptz not null default now()
);
alter table public.notif_prefs enable row level security;

drop policy if exists "mes preferences" on public.notif_prefs;
create policy "mes preferences" on public.notif_prefs for all to authenticated
  using (member_id = public.my_member_id())
  with check (member_id = public.my_member_id());

-- ---------- Messages non lus ---------------------------------------------
-- Dernière lecture de chaque canal, par chef.

create table if not exists public.chat_reads (
  member_id uuid not null references public.members(id) on delete cascade,
  channel text not null,
  read_at timestamptz not null default now(),
  primary key (member_id, channel)
);
alter table public.chat_reads enable row level security;

drop policy if exists "mes lectures" on public.chat_reads;
create policy "mes lectures" on public.chat_reads for select to authenticated
  using (member_id = public.my_member_id());

-- Point de départ : tout ce qui a été écrit avant cette mise à jour est considéré comme lu
insert into public.chat_reads (member_id, channel, read_at)
select m.id, c.channel, now()
from public.members m
cross join unnest(array['annonces', 'general', 'peda', 'formation', 'event', 'support']) as c(channel)
on conflict (member_id, channel) do nothing;

-- Nombre de messages des autres chefs écrits depuis ma dernière lecture, canal par canal
create or replace function public.unread_counts()
returns table (channel text, n bigint)
language sql stable security definer set search_path = public as $$
  select m.channel, count(*)::bigint
  from public.messages m
  left join public.chat_reads r on r.member_id = public.my_member_id() and r.channel = m.channel
  where public.is_member()
    and m.member_id is distinct from public.my_member_id()
    and m.created_at > coalesce(r.read_at, now() - interval '3 days')
  group by m.channel
$$;

-- Marque un canal comme lu (l'heure vient du serveur, pas du téléphone)
create or replace function public.mark_read(p_channel text) returns void
language sql security definer set search_path = public as $$
  insert into public.chat_reads (member_id, channel, read_at)
  select public.my_member_id(), p_channel, now()
  where public.is_member() and char_length(p_channel) between 1 and 40
  on conflict (member_id, channel) do update set read_at = excluded.read_at
$$;

revoke all on function public.unread_counts() from public, anon;
revoke all on function public.mark_read(text) from public, anon;
grant execute on function public.unread_counts() to authenticated;
grant execute on function public.mark_read(text) to authenticated;
