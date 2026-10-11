-- =====================================================================
-- Mise à jour 4 : adresse et groupes des événements (pour la carte)
-- À coller une seule fois dans Supabase : SQL Editor > New query > Run.
-- Le script peut être relancé sans danger.
-- =====================================================================

-- Adresse choisie dans la Base Adresse Nationale, avec ses coordonnées GPS
alter table public.events add column if not exists address text;
alter table public.events add column if not exists lat double precision;
alter table public.events add column if not exists lng double precision;
-- Groupes concernés (vide = toute l'unité)
alter table public.events add column if not exists group_ids text[] not null default '{}';

do $$
begin
  alter table public.events add constraint events_coords_check
    check ((lat is null and lng is null) or (lat between -90 and 90 and lng between -180 and 180));
exception when duplicate_object then null;
end $$;
