-- =====================================================================
-- Mise à jour 5 : réclamations (remboursement des achats des chefs)
-- À coller une seule fois dans Supabase : SQL Editor > New query > Run.
-- Le script peut être relancé sans danger.
-- =====================================================================

-- Deux nouvelles autorisations, à cocher dans Administration > Autorisations :
-- reclamation   : faire ses propres réclamations et suivre leur statut
-- remboursement : voir toutes les réclamations et valider les remboursements
-- Les administrateurs ont automatiquement les deux.

create table if not exists public.reclamations (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members(id) on delete set null,
  amount numeric(10, 2) not null check (amount > 0 and amount < 100000),
  purchase_date date not null,
  description text not null check (char_length(description) between 1 and 1000),
  group_id text references public.groups(id) on delete set null,
  receipt_path text,
  status text not null default 'en_attente' check (status in ('en_attente', 'rembourse', 'refuse')),
  admin_note text check (char_length(admin_note) <= 500),
  processed_by uuid references public.members(id) on delete set null,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists reclamations_created on public.reclamations (created_at desc);
alter table public.reclamations enable row level security;

-- Chacun voit ses réclamations ; la personne chargée des remboursements les voit toutes
drop policy if exists "lecture reclamations" on public.reclamations;
create policy "lecture reclamations" on public.reclamations for select to authenticated
  using (member_id = public.my_member_id() or public.has_perm('remboursement'));

drop policy if exists "ajout reclamation" on public.reclamations;
create policy "ajout reclamation" on public.reclamations for insert to authenticated
  with check (public.has_perm('reclamation') and member_id = public.my_member_id()
    and status = 'en_attente' and processed_by is null and processed_at is null and admin_note is null);

drop policy if exists "traitement reclamation" on public.reclamations;
create policy "traitement reclamation" on public.reclamations for update to authenticated
  using (public.has_perm('remboursement')) with check (public.has_perm('remboursement'));

-- Une réclamation peut être annulée par son auteur tant qu'elle n'est pas traitée
drop policy if exists "annulation reclamation" on public.reclamations;
create policy "annulation reclamation" on public.reclamations for delete to authenticated
  using ((member_id = public.my_member_id() and status = 'en_attente') or public.is_admin());

-- Le traitement ne change que le statut et la note ; qui et quand sont remplis automatiquement
create or replace function public.guard_reclamations() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.member_id is distinct from old.member_id or new.amount <> old.amount
     or new.purchase_date <> old.purchase_date or new.description <> old.description
     or new.group_id is distinct from old.group_id or new.receipt_path is distinct from old.receipt_path
     or new.created_at <> old.created_at then
    raise exception 'Seuls le statut et la note d''une réclamation peuvent être modifiés.';
  end if;
  if new.status = 'en_attente' then
    new.processed_by := null; new.processed_at := null;
  elsif new.status is distinct from old.status then
    new.processed_by := public.my_member_id(); new.processed_at := now();
  else
    new.processed_by := old.processed_by; new.processed_at := old.processed_at;
  end if;
  return new;
end;
$$;
drop trigger if exists guard_reclamations on public.reclamations;
create trigger guard_reclamations before update on public.reclamations
  for each row execute function public.guard_reclamations();

-- ---------- Justificatifs (tickets de caisse, factures) -----------------
-- Espace privé séparé de la bibliothèque : chaque fichier est rangé dans le dossier
-- de son auteur et n'est visible que par lui et la personne chargée des remboursements.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('justificatifs', 'justificatifs', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'])
on conflict (id) do nothing;

drop policy if exists "justificatifs lecture" on storage.objects;
create policy "justificatifs lecture" on storage.objects for select to authenticated
  using (bucket_id = 'justificatifs' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_perm('remboursement')));
drop policy if exists "justificatifs ajout" on storage.objects;
create policy "justificatifs ajout" on storage.objects for insert to authenticated
  with check (bucket_id = 'justificatifs' and (storage.foldername(name))[1] = auth.uid()::text and public.has_perm('reclamation'));
drop policy if exists "justificatifs suppression" on storage.objects;
create policy "justificatifs suppression" on storage.objects for delete to authenticated
  using (bucket_id = 'justificatifs' and (owner = auth.uid() or public.is_admin()));
