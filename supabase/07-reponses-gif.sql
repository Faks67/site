-- =====================================================================
-- Mise à jour 7 : répondre à un message et envoyer des GIF
-- À coller une seule fois dans Supabase : SQL Editor > New query > Run.
-- Le script peut être relancé sans danger.
-- =====================================================================

-- Message auquel on répond (si l'original est supprimé, la réponse reste)
alter table public.messages add column if not exists reply_to bigint references public.messages(id) on delete set null;

-- GIF choisi dans GIPHY : seule l'adresse de l'image est enregistrée, avec sa taille
alter table public.messages add column if not exists gif_url text;
alter table public.messages add column if not exists gif_w int;
alter table public.messages add column if not exists gif_h int;

-- Seules les images hébergées par GIPHY sont acceptées
do $$
begin
  alter table public.messages add constraint messages_gif_check
    check (gif_url is null or gif_url ~ '^https://(media[0-9]*|i)\.giphy\.com/[A-Za-z0-9/._-]+$');
exception when duplicate_object then null;
end $$;
