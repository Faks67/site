-- =====================================================================
-- Mise à jour 15 : pièces jointes dans la discussion (photos, vidéos, PDF…)
-- Les fichiers sont rangés sur Backblaze B2 par la fonction « files »
-- et effacés automatiquement au bout de 30 jours (le message reste, avec « fichier expiré »).
-- À coller une seule fois dans Supabase : SQL Editor > New query > Run.
-- Le script peut être relancé sans danger.
-- =====================================================================

alter table public.messages add column if not exists attach_path text;
alter table public.messages add column if not exists attach_name text;
alter table public.messages add column if not exists attach_type text;
alter table public.messages add column if not exists attach_size bigint;
alter table public.messages add column if not exists attach_w int;
alter table public.messages add column if not exists attach_h int;
alter table public.messages add column if not exists attach_expired boolean not null default false;
create index if not exists messages_attach_path on public.messages (attach_path) where attach_path is not null;

-- Seuls des fichiers déposés par la fonction « files » (chemin b2/<identifiant>/<nom>)
do $$
begin
  alter table public.messages add constraint messages_attach_check
    check (attach_path is null or (attach_path ~ '^b2/[A-Za-z0-9_-]+/[A-Za-z0-9_.-]+$' and char_length(attach_name) between 1 and 200));
exception when duplicate_object then null;
end $$;

-- Tâche programmée : chaque nuit, la fonction « files » efface les pièces jointes de plus de 30 jours
-- (même clé secrète que les heures de prière, mise à jour 08)
insert into public.app_secrets (key, value)
values ('cron_key', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (key) do nothing;

create extension if not exists pg_net;
create extension if not exists pg_cron;

do $$
begin
  perform cron.unschedule('pieces-jointes-menage');
exception when others then null;
end $$;

select cron.schedule(
  'pieces-jointes-menage',
  '17 3 * * *',
  $cron$
  select net.http_post(
    url := 'https://kmwomorxkudupzkaxqgg.supabase.co/functions/v1/files',
    headers := jsonb_build_object('Content-Type', 'application/json',
                                  'x-cron-key', (select value from public.app_secrets where key = 'cron_key')),
    body := '{"action":"purge"}'::jsonb
  );
  $cron$
);
