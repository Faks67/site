-- =====================================================================
-- Travailleurs de l'Imam : base de données du site des chefs
-- À coller une seule fois dans Supabase : SQL Editor > New query > Run.
-- Le script peut être relancé sans danger.
-- =====================================================================

-- ---------- Tables ----------------------------------------------------

create table if not exists public.groups (
  id text primary key,
  name text not null,
  color text not null default '#2f9e3a',
  age_range text,
  sort int not null default 0
);

create table if not exists public.poles (
  id text primary key,
  name text not null,
  short_name text not null,
  color text not null default '#2f9e3a',
  sort int not null default 0
);

-- Chefs et cheftaines (adultes uniquement, jamais d'enfants)
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  title text not null default 'Cheftaine' check (title in ('Chef', 'Cheftaine', 'Tata')),
  group_id text references public.groups(id) on delete set null,
  pole_id text references public.poles(id) on delete set null,
  role text not null default 'chef' check (role in ('principale', 'doyenne', 'chef', 'stagiaire')),
  is_admin boolean not null default false,
  user_id uuid unique references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Adresses autorisées à créer un compte (visibles par les administrateurs seulement)
create table if not exists public.invitations (
  email text primary key check (email = lower(email)),
  member_id uuid not null unique references public.members(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null check (category in ('officiel', 'cr', 'activite', 'peda', 'photo')),
  pole_id text references public.poles(id) on delete set null,
  file_path text not null unique,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id bigint generated always as identity primary key,
  channel text not null,
  member_id uuid references public.members(id) on delete set null,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists messages_channel_created on public.messages (channel, created_at);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  title text not null,
  details text,
  created_at timestamptz not null default now()
);

-- ---------- Fonctions d'aide pour les règles d'accès -------------------

create or replace function public.my_member_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.members where user_id = auth.uid()
$$;

create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where user_id = auth.uid())
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where user_id = auth.uid() and is_admin)
$$;

-- Petite fonction publique appelée régulièrement pour éviter la mise en veille du projet
create or replace function public.ping() returns int language sql stable as $$ select 1 $$;
grant execute on function public.ping() to anon, authenticated;

-- ---------- Création de compte : seulement pour les adresses invitées ---

create or replace function public.link_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  m uuid;
begin
  select member_id into m from public.invitations where email = lower(new.email);
  if m is null then
    raise exception 'Adresse non autorisée : demandez à un administrateur de vous ajouter.';
  end if;
  update public.members set user_id = new.id where id = m;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.link_new_user();

-- Si un administrateur ajoute l'invitation d'une personne qui a déjà un compte
create or replace function public.link_existing_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  u uuid;
begin
  select id into u from auth.users where lower(email) = new.email;
  if u is not null then
    update public.members set user_id = u where id = new.member_id and user_id is null;
  end if;
  return new;
end;
$$;

drop trigger if exists on_invitation_created on public.invitations;
create trigger on_invitation_created
  after insert on public.invitations
  for each row execute function public.link_existing_user();

-- ---------- Règles d'accès (Row Level Security) ------------------------

alter table public.groups enable row level security;
alter table public.poles enable row level security;
alter table public.members enable row level security;
alter table public.invitations enable row level security;
alter table public.documents enable row level security;
alter table public.messages enable row level security;
alter table public.events enable row level security;

do $$
declare t text;
begin
  foreach t in array array['groups', 'poles', 'members', 'documents', 'messages', 'events'] loop
    execute format('drop policy if exists "lecture membres" on public.%I', t);
    execute format('create policy "lecture membres" on public.%I for select to authenticated using (public.is_member())', t);
  end loop;
  foreach t in array array['groups', 'poles', 'members', 'events', 'invitations'] loop
    execute format('drop policy if exists "gestion admin" on public.%I', t);
    execute format('create policy "gestion admin" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

drop policy if exists "ajout document" on public.documents;
create policy "ajout document" on public.documents for insert to authenticated
  with check (public.is_member() and uploaded_by = public.my_member_id());
drop policy if exists "suppression document" on public.documents;
create policy "suppression document" on public.documents for delete to authenticated
  using (uploaded_by = public.my_member_id() or public.is_admin());

drop policy if exists "envoi message" on public.messages;
create policy "envoi message" on public.messages for insert to authenticated
  with check (public.is_member() and member_id = public.my_member_id());
drop policy if exists "suppression message" on public.messages;
create policy "suppression message" on public.messages for delete to authenticated
  using (member_id = public.my_member_id() or public.is_admin());

-- Quand un administrateur efface l'e-mail d'une personne, son compte n'a plus accès
create or replace function public.unlink_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.members set user_id = null where id = old.member_id;
  return old;
end;
$$;

drop trigger if exists on_invitation_deleted on public.invitations;
create trigger on_invitation_deleted
  after delete on public.invitations
  for each row execute function public.unlink_user();

-- Un administrateur ne peut pas se retirer lui-même les droits par erreur s'il est le dernier
create or replace function public.keep_one_admin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'DELETE' and old.is_admin) or (tg_op = 'UPDATE' and old.is_admin and not new.is_admin) then
    if (select count(*) from public.members where is_admin and id <> old.id) = 0 then
      raise exception 'Il doit rester au moins un administrateur.';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;
drop trigger if exists keep_one_admin on public.members;
create trigger keep_one_admin before update or delete on public.members
  for each row execute function public.keep_one_admin();

-- ---------- Stockage des fichiers ---------------------------------------

insert into storage.buckets (id, name, public, file_size_limit)
values ('documents', 'documents', false, 26214400)
on conflict (id) do nothing;

drop policy if exists "docs lecture" on storage.objects;
create policy "docs lecture" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and public.is_member());
drop policy if exists "docs ajout" on storage.objects;
create policy "docs ajout" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and public.is_member());
drop policy if exists "docs suppression" on storage.objects;
create policy "docs suppression" on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and (owner = auth.uid() or public.is_admin()));

-- ---------- Discussion en temps réel ------------------------------------

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end $$;

-- ---------- Données de départ -------------------------------------------

insert into public.poles (id, name, short_name, color, sort) values
  ('peda', 'Pôle Pédagogique', 'Pédagogique', '#2f5fd0', 1),
  ('formation', 'Pôle Formation & Relève', 'Formation & Relève', '#7b3fc4', 2),
  ('event', 'Pôle Événementiel & Vie d''Unité', 'Événementiel', '#d9423a', 3),
  ('support', 'Fonctions support', 'Support', '#c99400', 4)
on conflict (id) do nothing;

insert into public.groups (id, name, color, sort) values
  ('khaadimates', 'Khaadimates', '#4aa63c', 1),
  ('sajjidines', 'Sajjidines', '#7b3fc4', 3),
  ('shamssedines', 'Shamssedines', '#d9a400', 4),
  ('noujoums', 'Noujoums', '#1b9fc2', 5),
  ('assads', 'Assads', '#d9423a', 6)
on conflict (id) do nothing;

-- Chefs et cheftaines (liste 2024/2025, à mettre à jour depuis la page Administration)
insert into public.members (first_name, title, group_id, role)
select v.first_name, v.title, v.group_id, v.role
from (values
  ('Nawelle', 'Tata', 'khaadimates', 'principale'),
  ('Khadidja', 'Cheftaine', 'khaadimates', 'doyenne'),
  ('Zahira', 'Cheftaine', null, 'doyenne'),
  ('Sara', 'Cheftaine', null, 'chef'),
  ('Assia', 'Cheftaine', null, 'chef'),
  ('Mylène', 'Cheftaine', 'sajjidines', 'chef'),
  ('Mina', 'Cheftaine', 'sajjidines', 'chef'),
  ('Soukeyna', 'Cheftaine', 'sajjidines', 'chef'),
  ('Louise', 'Cheftaine', 'shamssedines', 'chef'),
  ('Zayneb', 'Cheftaine', 'shamssedines', 'chef'),
  ('Sughra', 'Cheftaine', 'noujoums', 'chef'),
  ('Amina', 'Cheftaine', 'noujoums', 'chef'),
  ('Myriam', 'Cheftaine', 'noujoums', 'chef'),
  ('Fakhar', 'Chef', 'assads', 'chef'),
  ('Ali-Reza', 'Chef', 'assads', 'chef'),
  ('Ismaël', 'Chef', 'assads', 'chef')
) as v(first_name, title, group_id, role)
where not exists (select 1 from public.members);

insert into public.events (date, title, details)
select v.date::date, v.title, v.details
from (values
  ('2026-11-07', 'Samedi scout de la rentrée', 'Premier samedi après les vacances de la Toussaint'),
  ('2026-11-21', 'Samedi scout', 'Date indicative, à confirmer'),
  ('2026-12-05', 'Samedi scout', 'Date indicative, à confirmer')
) as v(date, title, details)
where not exists (select 1 from public.events);
