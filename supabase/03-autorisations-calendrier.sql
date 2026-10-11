-- =====================================================================
-- Mise à jour 3 : autorisations par type d'action et calendrier complet
-- À coller une seule fois dans Supabase : SQL Editor > New query > Run.
-- Le script peut être relancé sans danger.
-- =====================================================================

-- ---------- Autorisations ----------------------------------------------
-- calendrier   : ajouter, modifier et supprimer les événements
-- bibliotheque : supprimer n'importe quel document
-- discussion   : supprimer n'importe quel message
-- membres      : gérer les chefs, leurs e-mails d'accès et les groupes
-- Les administrateurs ont toutes les autorisations et sont les seuls à pouvoir les donner.

alter table public.members add column if not exists permissions text[] not null default '{}';

create or replace function public.has_perm(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where user_id = auth.uid() and (is_admin or p = any(permissions)))
$$;

-- Un membre qui n'est pas administrateur ne peut pas donner les droits d'administrateur,
-- changer les autorisations, relier un compte ou modifier la fiche d'un administrateur.
-- Les fonctions internes (création de compte, invitations) ne sont pas concernées.
create or replace function public.guard_members() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user not in ('authenticated', 'anon') or public.is_admin() then
    return coalesce(new, old);
  end if;
  if tg_op = 'INSERT' then
    if new.is_admin or new.permissions <> '{}' or new.user_id is not null then
      raise exception 'Seul un administrateur peut donner des droits.';
    end if;
  elsif tg_op = 'UPDATE' then
    if old.is_admin or new.is_admin <> old.is_admin or new.permissions <> old.permissions
       or new.user_id is distinct from old.user_id then
      raise exception 'Seul un administrateur peut modifier les droits ou la fiche d''un administrateur.';
    end if;
  elsif tg_op = 'DELETE' and old.is_admin then
    raise exception 'Seul un administrateur peut retirer un administrateur.';
  end if;
  return coalesce(new, old);
end;
$$;
drop trigger if exists guard_members on public.members;
create trigger guard_members before insert or update or delete on public.members
  for each row execute function public.guard_members();

-- Gestion des chefs et des groupes
drop policy if exists "gestion admin" on public.members;
create policy "gestion admin" on public.members for all to authenticated
  using (public.has_perm('membres')) with check (public.has_perm('membres'));
drop policy if exists "gestion admin" on public.groups;
create policy "gestion admin" on public.groups for all to authenticated
  using (public.has_perm('membres')) with check (public.has_perm('membres'));

-- E-mails d'accès : jamais ceux des administrateurs pour les non-administrateurs
drop policy if exists "gestion admin" on public.invitations;
drop policy if exists "lecture invitations" on public.invitations;
create policy "lecture invitations" on public.invitations for select to authenticated
  using (public.has_perm('membres'));
drop policy if exists "gestion invitations" on public.invitations;
create policy "gestion invitations" on public.invitations for all to authenticated
  using (public.is_admin() or (public.has_perm('membres') and not exists (select 1 from public.members m where m.id = member_id and m.is_admin)))
  with check (public.is_admin() or (public.has_perm('membres') and not exists (select 1 from public.members m where m.id = member_id and m.is_admin)));

-- Modération de la bibliothèque et de la discussion
drop policy if exists "suppression document" on public.documents;
create policy "suppression document" on public.documents for delete to authenticated
  using (uploaded_by = public.my_member_id() or public.has_perm('bibliotheque'));
drop policy if exists "docs suppression" on storage.objects;
create policy "docs suppression" on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and (owner = auth.uid() or public.has_perm('bibliotheque')));
drop policy if exists "suppression message" on public.messages;
create policy "suppression message" on public.messages for delete to authenticated
  using (member_id = public.my_member_id() or public.has_perm('discussion'));

-- ---------- Calendrier ---------------------------------------------------
-- « date » reste la date de début.
alter table public.events add column if not exists end_date date;
alter table public.events add column if not exists all_day boolean not null default true;
alter table public.events add column if not exists start_time time;
alter table public.events add column if not exists end_time time;
alter table public.events add column if not exists location text;
alter table public.events add column if not exists category text not null default 'samedi';
alter table public.events add column if not exists repeat text not null default 'none';
alter table public.events add column if not exists repeat_until date;
alter table public.events add column if not exists created_by uuid references public.members(id) on delete set null;

do $$
begin
  alter table public.events add constraint events_repeat_check check (repeat in ('none', 'weekly', 'biweekly', 'monthly'));
exception when duplicate_object then null;
end $$;
do $$
begin
  alter table public.events add constraint events_dates_check check (end_date is null or end_date >= date);
exception when duplicate_object then null;
end $$;

drop policy if exists "gestion admin" on public.events;
drop policy if exists "gestion calendrier" on public.events;
create policy "gestion calendrier" on public.events for all to authenticated
  using (public.has_perm('calendrier')) with check (public.has_perm('calendrier'));
