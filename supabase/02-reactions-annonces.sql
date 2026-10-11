-- =====================================================================
-- Mise à jour 2 : réactions aux messages et notifications des annonces
-- À coller une seule fois dans Supabase : SQL Editor > New query > Run.
-- Le script peut être relancé sans danger.
-- =====================================================================

-- ---------- Réactions (emojis) sur les messages ------------------------

create table if not exists public.message_reactions (
  message_id bigint not null references public.messages(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (message_id, member_id, emoji)
);
alter table public.message_reactions enable row level security;
-- Permet d'envoyer l'emoji retiré dans les mises à jour en temps réel
alter table public.message_reactions replica identity full;

drop policy if exists "lecture membres" on public.message_reactions;
create policy "lecture membres" on public.message_reactions for select to authenticated
  using (public.is_member());
drop policy if exists "ajout reaction" on public.message_reactions;
create policy "ajout reaction" on public.message_reactions for insert to authenticated
  with check (member_id = public.my_member_id());
drop policy if exists "retrait reaction" on public.message_reactions;
create policy "retrait reaction" on public.message_reactions for delete to authenticated
  using (member_id = public.my_member_id());

do $$
begin
  alter publication supabase_realtime add table public.message_reactions;
exception when duplicate_object then null;
end $$;

-- ---------- Abonnements aux notifications sur téléphone ----------------

create table if not exists public.push_subscriptions (
  endpoint text primary key,
  member_id uuid not null references public.members(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;

drop policy if exists "mes abonnements" on public.push_subscriptions;
create policy "mes abonnements" on public.push_subscriptions for all to authenticated
  using (member_id = public.my_member_id())
  with check (member_id = public.my_member_id());

-- Clés techniques des notifications : créées automatiquement par la fonction « notify »,
-- lisibles par elle seule (aucune règle d'accès = invisible depuis le site).
create table if not exists public.app_secrets (
  key text primary key,
  value text not null
);
alter table public.app_secrets enable row level security;
