-- =====================================================================
-- Mise à jour 8 : heures de prière (lieu de l'unité et notifications)
-- À coller une seule fois dans Supabase : SQL Editor > New query > Run.
-- Le script peut être relancé sans danger.
-- Les horaires eux-mêmes sont calculés dans le téléphone : rien n'est stocké.
-- =====================================================================

-- ---------- Réglages de l'unité (lieu de référence des prières) ---------

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;

drop policy if exists "lecture membres" on public.app_settings;
create policy "lecture membres" on public.app_settings for select to authenticated
  using (public.is_member());
drop policy if exists "gestion admin" on public.app_settings;
create policy "gestion admin" on public.app_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- Notifications avant Fajr, Dhuhr et Maghrib -------------------
-- Chaque chef les active avec la cloche (case « Heures de prière »).
-- Toutes les 5 minutes, Supabase demande à la fonction « notify » s'il faut prévenir.

-- Prières déjà annoncées (évite d'envoyer deux fois la même alerte)
create table if not exists public.prayer_sent (
  day date not null,
  prayer text not null,
  sent_at timestamptz not null default now(),
  primary key (day, prayer)
);
alter table public.prayer_sent enable row level security;
-- Aucune règle d'accès : seule la fonction « notify » y touche.

-- Clé secrète qui prouve à la fonction que l'appel vient bien de la tâche programmée
insert into public.app_secrets (key, value)
values ('cron_key', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (key) do nothing;

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- (Re)crée la tâche programmée
do $$
begin
  perform cron.unschedule('prieres-notifications');
exception when others then null;
end $$;

select cron.schedule(
  'prieres-notifications',
  '*/5 * * * *',
  $cron$
  select net.http_post(
    url := 'https://kmwomorxkudupzkaxqgg.supabase.co/functions/v1/notify',
    headers := jsonb_build_object('Content-Type', 'application/json',
                                  'x-cron-key', (select value from public.app_secrets where key = 'cron_key')),
    body := '{"action":"prayers"}'::jsonb
  );
  $cron$
);

-- Ménage : on oublie les alertes de plus de 3 jours
delete from public.prayer_sent where day < current_date - 3;
