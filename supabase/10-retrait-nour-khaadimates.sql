-- =====================================================================
-- Mise à jour 10 : retrait du groupe Nour-Khaadimates
-- À coller une seule fois dans Supabase : SQL Editor > New query > Run.
-- Le script peut être relancé sans danger.
-- =====================================================================

-- Le groupe disparaît des événements qui le visaient
update public.events set group_ids = array_remove(group_ids, 'nour') where 'nour' = any(group_ids);

-- Ses cheftaines restent dans l'application, sans groupe : à rattacher depuis Administration
delete from public.groups where id = 'nour';
