-- =====================================================================
-- Mise à jour 16 : réunions de pôle visibles seulement par les personnes concernées
-- Un événement avec des pôles cochés n'est visible que par :
--   - les membres de ces pôles ;
--   - les administrateurs ;
--   - les chefs qui ont l'autorisation « Réunions de pôle » (cochée dans Administration) ;
--   - la personne qui l'a créé.
-- L'autorisation « Calendrier » ne donne plus que le droit d'ajouter, modifier et supprimer.
-- À coller une seule fois dans Supabase : SQL Editor > New query > Run.
-- Le script peut être relancé sans danger.
-- =====================================================================

create or replace function public.can_see_event(e_pole_ids text[], e_created_by uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.members m
    where m.user_id = auth.uid()
      and (coalesce(cardinality(e_pole_ids), 0) = 0
           or m.is_admin
           or m.pole_ids && e_pole_ids
           or m.pole_id = any(e_pole_ids)
           or 'reunions_poles' = any(m.permissions)
           or m.id = e_created_by)
  )
$$;
revoke all on function public.can_see_event(text[], uuid) from public, anon;
grant execute on function public.can_see_event(text[], uuid) to authenticated;

-- Lecture : tous les chefs, sauf les réunions de pôle (règle ci-dessus)
drop policy if exists "lecture membres" on public.events;
create policy "lecture membres" on public.events for select to authenticated
  using (public.can_see_event(pole_ids, created_by));

-- Autorisation « Calendrier » : ajouter, modifier, supprimer (plus de lecture de tout le calendrier)
drop policy if exists "gestion calendrier" on public.events;
drop policy if exists "ajout calendrier" on public.events;
drop policy if exists "modification calendrier" on public.events;
drop policy if exists "suppression calendrier" on public.events;
create policy "ajout calendrier" on public.events for insert to authenticated
  with check (public.has_perm('calendrier'));
create policy "modification calendrier" on public.events for update to authenticated
  using (public.has_perm('calendrier')) with check (public.has_perm('calendrier'));
create policy "suppression calendrier" on public.events for delete to authenticated
  using (public.has_perm('calendrier'));
