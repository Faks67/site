-- =====================================================================
-- Mise à jour 12 : un chef peut appartenir à plusieurs pôles,
-- et un événement peut viser un ou plusieurs pôles (réunions de pôle)
-- À coller une seule fois dans Supabase : SQL Editor > New query > Run.
-- Le script peut être relancé sans danger.
-- =====================================================================

-- ---------- Plusieurs pôles par chef ---------------------------------------
-- pole_ids contient tous les pôles ; pole_id (ancien champ) garde le premier.
alter table public.members add column if not exists pole_ids text[] not null default '{}';
update public.members set pole_ids = array[pole_id] where pole_id is not null and pole_ids = '{}';

-- Discussions des pôles : un chef voit le canal de chacun de ses pôles
create or replace function public.can_see_channel(ch text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.members m
    where m.user_id = auth.uid()
      and (ch in ('annonces', 'general') or m.is_admin or m.pole_id = ch or ch = any(m.pole_ids) or ch = any(m.chat_channels))
  )
$$;
revoke all on function public.can_see_channel(text) from public, anon;
grant execute on function public.can_see_channel(text) to authenticated;

-- ---------- Pôles concernés par un événement -------------------------------
-- Aucun pôle : tous les chefs. Sinon, seuls les membres de ces pôles sont attendus.
alter table public.events add column if not exists pole_ids text[] not null default '{}';
