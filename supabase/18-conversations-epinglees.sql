-- =====================================================================
-- Mise à jour 18 : conversations épinglées en haut de la Discussion
-- Rangées avec les préférences de notification de chaque chef (chacun ne voit et ne modifie que les siennes).
-- À coller une seule fois dans Supabase : SQL Editor > New query > Run.
-- Le script peut être relancé sans danger.
-- =====================================================================

alter table public.notif_prefs add column if not exists pinned text[] not null default '{}';

do $$
begin
  alter table public.notif_prefs add constraint notif_prefs_pinned_check check (cardinality(pinned) <= 10);
exception when duplicate_object then null;
end $$;
