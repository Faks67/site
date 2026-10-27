-- =====================================================================
-- Mise à jour 19 : pas de notification quand on est déjà dans l'appli
-- Tant que l'appli est ouverte et affichée, elle se signale « active » toutes les minutes ;
-- la fonction notify n'envoie rien aux chefs actifs (ils voient le message dans l'appli).
-- À coller une seule fois dans Supabase : SQL Editor > New query > Run.
-- Le script peut être relancé sans danger.
-- =====================================================================

alter table public.members add column if not exists active_until timestamptz;

-- Remplace la version sans paramètre de la mise à jour 17
drop function if exists public.touch_presence();
create or replace function public.touch_presence(p_active boolean default true) returns void
language sql security definer set search_path = public as $$
  update public.members
  set last_seen_at = now(),
      active_until = case when p_active then now() + interval '90 seconds' else null end
  where user_id = auth.uid()
$$;
revoke all on function public.touch_presence(boolean) from public, anon;
grant execute on function public.touch_presence(boolean) to authenticated;
