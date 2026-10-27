-- =====================================================================
-- Mise à jour 24 : réunions en ligne dans le calendrier
--   - un événement peut être « en ligne » au lieu d'avoir un lieu :
--     appel vidéo dans une conversation de l'appli, ou lien de visio (Zoom, Google Meet, Teams…) ;
--   - le jour J, un bouton « Rejoindre » apparaît sur l'événement et sur l'accueil.
-- À coller une seule fois dans Supabase : SQL Editor > New query > Run.
-- Le script peut être relancé sans danger.
-- =====================================================================

alter table public.events add column if not exists online boolean not null default false;
alter table public.events add column if not exists online_kind text;
alter table public.events add column if not exists online_channel text;
alter table public.events add column if not exists online_url text;

do $$
begin
  alter table public.events add constraint events_online_check check (
    (not online and online_kind is null)
    or (online and online_kind = 'app' and online_channel is not null)
    or (online and online_kind = 'link' and online_url ~* '^https://[^ ]+$')
  );
exception when duplicate_object then null;
end $$;
