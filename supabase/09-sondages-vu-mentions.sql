-- =====================================================================
-- Mise à jour 9 : discussions des pôles réservées, sondages, « vu par »
-- et mentions (@chef) dans la discussion
-- À coller une seule fois dans Supabase : SQL Editor > New query > Run.
-- Le script peut être relancé sans danger.
-- =====================================================================

-- ---------- Accès aux canaux des pôles -----------------------------------
-- Annonces et Général : tous les chefs. Canal d'un pôle (peda, formation, event, support) :
-- les chefs de ce pôle, les administrateurs, et ceux à qui un administrateur l'a ouvert.

alter table public.members add column if not exists chat_channels text[] not null default '{}';

create or replace function public.can_see_channel(ch text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.members m
    where m.user_id = auth.uid()
      and (ch in ('annonces', 'general') or m.is_admin or m.pole_id = ch or ch = any(m.chat_channels))
  )
$$;
revoke all on function public.can_see_channel(text) from public, anon;
grant execute on function public.can_see_channel(text) to authenticated;

-- Seul un administrateur peut ouvrir l'accès aux discussions des autres pôles
-- (même règle que la mise à jour 3, avec le champ chat_channels en plus)
create or replace function public.guard_members() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user not in ('authenticated', 'anon') or public.is_admin() then
    return coalesce(new, old);
  end if;
  if tg_op = 'INSERT' then
    if new.is_admin or new.permissions <> '{}' or new.chat_channels <> '{}' or new.user_id is not null then
      raise exception 'Seul un administrateur peut donner des droits.';
    end if;
  elsif tg_op = 'UPDATE' then
    if old.is_admin or new.is_admin <> old.is_admin or new.permissions <> old.permissions
       or new.chat_channels <> old.chat_channels or new.user_id is distinct from old.user_id then
      raise exception 'Seul un administrateur peut modifier les droits ou la fiche d''un administrateur.';
    end if;
  elsif tg_op = 'DELETE' and old.is_admin then
    raise exception 'Seul un administrateur peut retirer un administrateur.';
  end if;
  return coalesce(new, old);
end;
$$;

-- Messages : lecture et envoi seulement dans les canaux autorisés
drop policy if exists "lecture membres" on public.messages;
create policy "lecture membres" on public.messages for select to authenticated
  using (public.can_see_channel(channel));
drop policy if exists "envoi message" on public.messages;
create policy "envoi message" on public.messages for insert to authenticated
  with check (public.is_member() and member_id = public.my_member_id() and public.can_see_channel(channel));

-- Réactions : seulement sur les messages des canaux autorisés
drop policy if exists "lecture membres" on public.message_reactions;
create policy "lecture membres" on public.message_reactions for select to authenticated
  using (exists (select 1 from public.messages x where x.id = message_id and public.can_see_channel(x.channel)));
drop policy if exists "ajout reaction" on public.message_reactions;
create policy "ajout reaction" on public.message_reactions for insert to authenticated
  with check (member_id = public.my_member_id()
    and exists (select 1 from public.messages x where x.id = message_id and public.can_see_channel(x.channel)));

-- Messages non lus : seulement les canaux autorisés
create or replace function public.unread_counts()
returns table (channel text, n bigint)
language sql stable security definer set search_path = public as $$
  select m.channel, count(*)::bigint
  from public.messages m
  left join public.chat_reads r on r.member_id = public.my_member_id() and r.channel = m.channel
  where public.is_member()
    and public.can_see_channel(m.channel)
    and m.member_id is distinct from public.my_member_id()
    and m.created_at > coalesce(r.read_at, now() - interval '3 days')
  group by m.channel
$$;

-- ---------- « Vu par » -----------------------------------------------------
-- La dernière lecture de chaque canal (mise à jour 6) devient visible par les chefs
-- qui ont accès à ce canal : un message est vu par ceux qui ont lu le canal après son envoi.

drop policy if exists "mes lectures" on public.chat_reads;
drop policy if exists "lectures du canal" on public.chat_reads;
create policy "lectures du canal" on public.chat_reads for select to authenticated
  using (member_id = public.my_member_id() or public.can_see_channel(channel));

do $$
begin
  alter publication supabase_realtime add table public.chat_reads;
exception when duplicate_object then null;
end $$;

-- ---------- Mentions (@chef) ------------------------------------------------

alter table public.messages add column if not exists mentions uuid[] not null default '{}';
do $$
begin
  alter table public.messages add constraint messages_mentions_check check (cardinality(mentions) <= 60);
exception when duplicate_object then null;
end $$;

-- ---------- Sondages ---------------------------------------------------------
-- Le texte du message est la question ; les choix sont rangés avec le message.

alter table public.messages add column if not exists poll_options text[];
alter table public.messages add column if not exists poll_multi boolean not null default false;
do $$
begin
  alter table public.messages add constraint messages_poll_check
    check (poll_options is null or (cardinality(poll_options) between 2 and 12
      and char_length(array_to_string(poll_options, '')) <= 1200
      and array_position(poll_options, '') is null));
exception when duplicate_object then null;
end $$;

create table if not exists public.poll_votes (
  message_id bigint not null references public.messages(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  option_idx int not null check (option_idx between 0 and 11),
  created_at timestamptz not null default now(),
  primary key (message_id, member_id, option_idx)
);
alter table public.poll_votes enable row level security;
-- Permet d'envoyer le vote retiré dans les mises à jour en temps réel
alter table public.poll_votes replica identity full;

drop policy if exists "lecture votes" on public.poll_votes;
create policy "lecture votes" on public.poll_votes for select to authenticated
  using (exists (select 1 from public.messages x where x.id = message_id and public.can_see_channel(x.channel)));
-- Pas de règle d'ajout ni de retrait : on vote seulement avec la fonction ci-dessous

-- Voter ou retirer son vote (un seul choix si le sondage n'autorise pas plusieurs réponses)
create or replace function public.vote_poll(p_message bigint, p_option int) returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := public.my_member_id();
  msg public.messages;
begin
  select * into msg from public.messages where id = p_message;
  if me is null or msg.id is null or msg.poll_options is null or not public.can_see_channel(msg.channel) then
    raise exception 'Sondage introuvable.';
  end if;
  if p_option is null or p_option < 0 or p_option >= cardinality(msg.poll_options) then
    raise exception 'Choix inconnu.';
  end if;
  if exists (select 1 from public.poll_votes where message_id = p_message and member_id = me and option_idx = p_option) then
    delete from public.poll_votes where message_id = p_message and member_id = me and option_idx = p_option;
    return;
  end if;
  if not msg.poll_multi then
    delete from public.poll_votes where message_id = p_message and member_id = me;
  end if;
  insert into public.poll_votes (message_id, member_id, option_idx) values (p_message, me, p_option);
end;
$$;
revoke all on function public.vote_poll(bigint, int) from public, anon;
grant execute on function public.vote_poll(bigint, int) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.poll_votes;
exception when duplicate_object then null;
end $$;
