-- =====================================================================
-- VA Hub — initial database schema
-- Run this once in Supabase: SQL Editor → New query → paste → Run.
--
-- Structure:
--   workspaces → workspace_members (owner / member / client)
--             → clients → client_links
--                       → projects (nested via parent_id)
--                       → tasks → checklist_items
--                       → lead_statuses
--                       → leads
--
-- Security: Row Level Security (RLS) is ON for every table. The database
-- itself only returns rows from workspaces you belong to, and (for future
-- team members / client logins) only the clients you've been given access to.
-- =====================================================================

create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------
-- Shared helper: keep updated_at current
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Profiles (one per login)
-- ---------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Workspaces and membership
-- ---------------------------------------------------------------------
create table public.workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  timezone    text not null default 'Asia/Manila',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  -- owner: full access. member: assigned clients (read/write).
  -- client: assigned clients (read-only, future client portal).
  role         text not null check (role in ('owner','member','client')),
  created_at   timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index on public.workspace_members (user_id);

-- ---------------------------------------------------------------------
-- Clients
-- ---------------------------------------------------------------------
create table public.clients (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references public.workspaces(id) on delete cascade,
  name           text not null,
  business_name  text,
  contact_name   text,
  email          text,
  phone          text,
  website        text,
  start_date     date,
  status         text not null default 'active'
                 check (status in ('onboarding','active','paused','ended')),
  notes          text,
  is_internal    boolean not null default false,   -- "My Business"
  archived_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index on public.clients (workspace_id);

-- Which non-owner members can see which clients (used later for team / client logins)
create table public.member_client_access (
  workspace_id uuid not null,
  user_id      uuid not null,
  client_id    uuid not null references public.clients(id) on delete cascade,
  primary key (user_id, client_id),
  foreign key (workspace_id, user_id)
    references public.workspace_members(workspace_id, user_id) on delete cascade
);

create table public.client_links (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  label       text not null,
  url         text not null,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);
create index on public.client_links (client_id);

-- ---------------------------------------------------------------------
-- Projects (subprojects = projects with a parent_id; can nest)
-- ---------------------------------------------------------------------
create table public.projects (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.clients(id) on delete cascade,
  parent_id    uuid references public.projects(id) on delete cascade,
  name         text not null,
  description  text,
  status       text not null default 'not_started'
               check (status in ('not_started','in_progress','on_hold','completed')),
  priority     text not null default 'medium'
               check (priority in ('low','medium','high','urgent')),
  start_date   date,
  due_date     date,
  sort_order   int not null default 0,
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (parent_id is null or parent_id <> id)
);
create index on public.projects (client_id);
create index on public.projects (parent_id);

-- ---------------------------------------------------------------------
-- Tasks
-- recurrence example: {"freq":"weekly","interval":1,"weekdays":[1,3,5]}
--   freq: daily | weekly | monthly | every_x_days
-- ---------------------------------------------------------------------
create table public.tasks (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clients(id) on delete cascade,
  project_id    uuid references public.projects(id) on delete set null,
  title         text not null,
  description   text,
  status        text not null default 'todo'
                check (status in ('todo','in_progress','waiting','done')),
  priority      text not null default 'medium'
                check (priority in ('low','medium','high','urgent')),
  due_date      date,
  completed_at  timestamptz,
  recurrence    jsonb,
  assignee_id   uuid references auth.users(id) on delete set null,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on public.tasks (client_id);
create index on public.tasks (project_id);
create index on public.tasks (due_date) where status <> 'done';
create index tasks_title_trgm on public.tasks using gin (title gin_trgm_ops);

create table public.checklist_items (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks(id) on delete cascade,
  text        text not null,
  is_done     boolean not null default false,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
create index on public.checklist_items (task_id);

-- ---------------------------------------------------------------------
-- Leads (each client has its own statuses and leads)
-- ---------------------------------------------------------------------
create table public.lead_statuses (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  name        text not null,
  color       text not null default 'gray',
  kind        text not null default 'open' check (kind in ('open','won','lost')),
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);
create index on public.lead_statuses (client_id);

create table public.leads (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  status_id       uuid references public.lead_statuses(id) on delete set null,
  name            text not null,
  company         text,
  email           text,
  phone           text,
  website         text,
  social_url      text,
  source          text,
  date_contacted  date,
  follow_up_date  date,
  next_action     text,
  notes           text,
  sort_order      int not null default 0,
  archived_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on public.leads (client_id);
create index on public.leads (status_id);
create index on public.leads (follow_up_date) where archived_at is null;
create index leads_name_trgm on public.leads using gin (name gin_trgm_ops);
create index on public.leads (client_id, lower(email));

-- ---------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------
create trigger trg_profiles_updated   before update on public.profiles   for each row execute function public.set_updated_at();
create trigger trg_workspaces_updated before update on public.workspaces for each row execute function public.set_updated_at();
create trigger trg_clients_updated    before update on public.clients    for each row execute function public.set_updated_at();
create trigger trg_projects_updated   before update on public.projects   for each row execute function public.set_updated_at();
create trigger trg_tasks_updated      before update on public.tasks      for each row execute function public.set_updated_at();
create trigger trg_leads_updated      before update on public.leads      for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Data-integrity guards: children must stay within the same client
-- ---------------------------------------------------------------------
create or replace function public.check_project_parent()
returns trigger language plpgsql as $$
begin
  if new.parent_id is not null and not exists (
    select 1 from public.projects p where p.id = new.parent_id and p.client_id = new.client_id
  ) then
    raise exception 'Subproject must belong to the same client as its parent';
  end if;
  return new;
end $$;
create trigger trg_project_parent before insert or update on public.projects
  for each row execute function public.check_project_parent();

create or replace function public.check_task_project()
returns trigger language plpgsql as $$
begin
  if new.project_id is not null and not exists (
    select 1 from public.projects p where p.id = new.project_id and p.client_id = new.client_id
  ) then
    raise exception 'Task project must belong to the same client';
  end if;
  return new;
end $$;
create trigger trg_task_project before insert or update on public.tasks
  for each row execute function public.check_task_project();

create or replace function public.check_lead_status()
returns trigger language plpgsql as $$
begin
  if new.status_id is not null and not exists (
    select 1 from public.lead_statuses s where s.id = new.status_id and s.client_id = new.client_id
  ) then
    raise exception 'Lead status must belong to the same client';
  end if;
  return new;
end $$;
create trigger trg_lead_status before insert or update on public.leads
  for each row execute function public.check_lead_status();

-- ---------------------------------------------------------------------
-- Access-check helpers (security definer so RLS policies can use them
-- without recursion). They only ever answer about the logged-in user.
-- ---------------------------------------------------------------------
create or replace function public.is_workspace_member(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from workspace_members where workspace_id = ws and user_id = auth.uid());
$$;

create or replace function public.is_workspace_owner(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from workspace_members
                 where workspace_id = ws and user_id = auth.uid() and role = 'owner');
$$;

create or replace function public.can_read_client(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from clients c
    join workspace_members m on m.workspace_id = c.workspace_id and m.user_id = auth.uid()
    where c.id = cid
      and (m.role = 'owner'
           or exists (select 1 from member_client_access a where a.client_id = c.id and a.user_id = auth.uid()))
  );
$$;

create or replace function public.can_write_client(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from clients c
    join workspace_members m on m.workspace_id = c.workspace_id and m.user_id = auth.uid()
    where c.id = cid
      and (m.role = 'owner'
           or (m.role = 'member'
               and exists (select 1 from member_client_access a where a.client_id = c.id and a.user_id = auth.uid())))
  );
$$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles             enable row level security;
alter table public.workspaces           enable row level security;
alter table public.workspace_members    enable row level security;
alter table public.member_client_access enable row level security;
alter table public.clients              enable row level security;
alter table public.client_links         enable row level security;
alter table public.projects             enable row level security;
alter table public.tasks                enable row level security;
alter table public.checklist_items      enable row level security;
alter table public.lead_statuses        enable row level security;
alter table public.leads                enable row level security;

-- Profiles: you can see and edit your own
create policy "own profile read"   on public.profiles for select using (id = auth.uid());
create policy "own profile update" on public.profiles for update using (id = auth.uid());

-- Workspaces
create policy "members read workspace" on public.workspaces for select using (public.is_workspace_member(id));
create policy "owner updates workspace" on public.workspaces for update using (public.is_workspace_owner(id));

-- Membership (only owners manage it)
create policy "members read membership" on public.workspace_members for select
  using (user_id = auth.uid() or public.is_workspace_owner(workspace_id));
create policy "owner manages membership" on public.workspace_members for all
  using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));

create policy "read own access" on public.member_client_access for select
  using (user_id = auth.uid() or public.is_workspace_owner(workspace_id));
create policy "owner manages access" on public.member_client_access for all
  using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));

-- Clients: owners create/delete; assigned members can read/edit
create policy "read clients"   on public.clients for select using (public.can_read_client(id));
create policy "create clients" on public.clients for insert with check (public.is_workspace_owner(workspace_id));
create policy "update clients" on public.clients for update using (public.can_write_client(id)) with check (public.can_write_client(id));
create policy "delete clients" on public.clients for delete using (public.is_workspace_owner(workspace_id));

-- Everything under a client follows that client's access
create policy "read"  on public.client_links for select using (public.can_read_client(client_id));
create policy "write" on public.client_links for all    using (public.can_write_client(client_id)) with check (public.can_write_client(client_id));

create policy "read"  on public.projects for select using (public.can_read_client(client_id));
create policy "write" on public.projects for all    using (public.can_write_client(client_id)) with check (public.can_write_client(client_id));

create policy "read"  on public.tasks for select using (public.can_read_client(client_id));
create policy "write" on public.tasks for all    using (public.can_write_client(client_id)) with check (public.can_write_client(client_id));

create policy "read" on public.checklist_items for select
  using (exists (select 1 from public.tasks t where t.id = task_id and public.can_read_client(t.client_id)));
create policy "write" on public.checklist_items for all
  using (exists (select 1 from public.tasks t where t.id = task_id and public.can_write_client(t.client_id)))
  with check (exists (select 1 from public.tasks t where t.id = task_id and public.can_write_client(t.client_id)));

create policy "read"  on public.lead_statuses for select using (public.can_read_client(client_id));
create policy "write" on public.lead_statuses for all    using (public.can_write_client(client_id)) with check (public.can_write_client(client_id));

create policy "read"  on public.leads for select using (public.can_read_client(client_id));
create policy "write" on public.leads for all    using (public.can_write_client(client_id)) with check (public.can_write_client(client_id));

-- ---------------------------------------------------------------------
-- Automatic setup
-- ---------------------------------------------------------------------

-- Every new client gets the default, editable lead pipeline
create or replace function public.create_default_lead_statuses()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into lead_statuses (client_id, name, color, kind, sort_order) values
    (new.id, 'New',         'gray',   'open', 0),
    (new.id, 'Contacted',   'blue',   'open', 1),
    (new.id, 'Replied',     'purple', 'open', 2),
    (new.id, 'Call Booked', 'amber',  'open', 3),
    (new.id, 'Won',         'green',  'won',  4),
    (new.id, 'Lost',        'red',    'lost', 5);
  return new;
end $$;
create trigger trg_client_default_statuses after insert on public.clients
  for each row execute function public.create_default_lead_statuses();

-- The first time a person's login is created: profile + workspace + "My Business"
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  ws_id uuid;
begin
  insert into profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));

  -- Invited teammates/clients (future) will be added to an existing workspace
  -- instead; anyone else gets their own workspace.
  if coalesce(new.raw_user_meta_data->>'invited', 'false') <> 'true' then
    insert into workspaces (name) values ('My VA Business') returning id into ws_id;
    insert into workspace_members (workspace_id, user_id, role) values (ws_id, new.id, 'owner');
    insert into clients (workspace_id, name, business_name, status, is_internal, notes)
    values (ws_id, 'My Business', 'My VA Business', 'active', true,
            'Your own business: prospects, admin and marketing tasks live here.');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
