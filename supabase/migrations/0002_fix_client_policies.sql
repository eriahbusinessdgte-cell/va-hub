-- =====================================================================
-- Fix: creating a client failed with "Couldn't save the client".
--
-- The client read/update policies looked the row up again by id inside a
-- helper function. While a new client is being inserted, that lookup can't
-- see the new row yet, so returning the new client's id was refused.
-- These policies now check the row's own workspace_id directly.
--
-- Run once in Supabase: SQL Editor → New query → paste → Run.
-- =====================================================================

create or replace function public.has_client_access(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from member_client_access where client_id = cid and user_id = auth.uid());
$$;

create or replace function public.workspace_role(ws uuid)
returns text language sql stable security definer set search_path = public as $$
  select role from workspace_members where workspace_id = ws and user_id = auth.uid();
$$;

drop policy if exists "read clients"   on public.clients;
drop policy if exists "update clients" on public.clients;

create policy "read clients" on public.clients for select
  using (
    public.workspace_role(workspace_id) = 'owner'
    or (public.workspace_role(workspace_id) in ('member','client') and public.has_client_access(id))
  );

create policy "update clients" on public.clients for update
  using (
    public.workspace_role(workspace_id) = 'owner'
    or (public.workspace_role(workspace_id) = 'member' and public.has_client_access(id))
  )
  with check (
    public.workspace_role(workspace_id) = 'owner'
    or (public.workspace_role(workspace_id) = 'member' and public.has_client_access(id))
  );
