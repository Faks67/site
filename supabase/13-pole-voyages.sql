-- =====================================================================
-- Mise à jour 13 : création du pôle Voyages
-- (voyages humanitaires, séjours en gîte, ziyarat…)
-- À coller une seule fois dans Supabase : SQL Editor > New query > Run.
-- Le script peut être relancé sans danger.
-- =====================================================================

insert into public.poles (id, name, short_name, color, sort) values
  ('voyage', 'Pôle Voyages', 'Voyages', '#1b9fc2', 4)
on conflict (id) do nothing;

-- Les fonctions support restent en dernier
update public.poles set sort = 5 where id = 'support';

-- Discussion du pôle : tout ce qui existait avant est considéré comme lu
insert into public.chat_reads (member_id, channel, read_at)
select m.id, 'voyage', now() from public.members m
on conflict (member_id, channel) do nothing;
