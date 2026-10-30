-- =====================================================================
-- Mise à jour 25 : Défi, nombre de bonnes réponses confidentiel
--   Dans le classement, chaque chef voit seulement SES bonnes réponses et son temps ;
--   pour les autres, seuls les points sont envoyés au téléphone.
--   (L'ordre du classement reste le même : points, puis bonnes réponses, puis temps.)
-- À coller une seule fois dans Supabase : SQL Editor > New query > Run.
-- Le script peut être relancé sans danger.
-- =====================================================================

create or replace function public.quiz_board(p_offset int default 0)
returns table (member_id uuid, points bigint, correct bigint, answered bigint, total_ms bigint, round_start date, round_end date)
language sql stable security definer set search_path = public as $$
  with r as (select * from quiz_round(quiz_today() + 14 * p_offset)),
  b as (
    select a.member_id, sum(a.points) as points, count(*) filter (where a.correct) as correct,
           count(*) filter (where a.answered_at is not null) as answered,
           coalesce(sum(a.ms) filter (where a.correct), 0) as total_ms, r.round_start, r.round_end
    from quiz_answers a, r
    where is_member() and a.day between r.round_start and r.round_end and a.answered_at is not null
    group by a.member_id, r.round_start, r.round_end
  )
  select b.member_id, b.points,
         case when b.member_id = my_member_id() then b.correct end,
         case when b.member_id = my_member_id() then b.answered end,
         case when b.member_id = my_member_id() then b.total_ms end,
         b.round_start, b.round_end
  from b
  order by b.points desc, b.correct desc, b.total_ms asc
$$;

revoke all on function public.quiz_board(int) from public, anon;
grant execute on function public.quiz_board(int) to authenticated;
