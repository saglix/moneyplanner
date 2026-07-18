create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  email text not null,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income', 'outcome')),
  amount numeric not null check (amount > 0),
  field text not null check (field in ('business', 'personal')),
  recurrence text not null check (recurrence in ('one-time', 'recurring')),
  date date not null,
  end_date date,
  notes text not null default '',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.transactions enable row level security;

drop policy if exists "profiles are readable by signed in users" on public.profiles;
create policy "profiles are readable by signed in users"
on public.profiles for select
to authenticated
using (true);

drop policy if exists "users update their own profile" on public.profiles;
create policy "users update their own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "admins insert profiles" on public.profiles;
create policy "admins insert profiles"
on public.profiles for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
);

drop policy if exists "users insert their own profile" on public.profiles;
create policy "users insert their own profile"
on public.profiles for insert
to authenticated
with check (auth.uid() = id and role = 'user');

drop policy if exists "admins delete profiles" on public.profiles;
create policy "admins delete profiles"
on public.profiles for delete
to authenticated
using (
  id <> auth.uid()
  and exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
);

drop policy if exists "admins update profiles" on public.profiles;
create policy "admins update profiles"
on public.profiles for update
to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
);

create or replace function public.admin_delete_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_user_id = auth.uid() then
    raise exception 'Admins cannot delete their own user';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Only admins can delete users';
  end if;

  delete from auth.users where id = target_user_id;
end;
$$;

drop policy if exists "users read their own transactions" on public.transactions;
create policy "users read their own transactions"
on public.transactions for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "users insert their own transactions" on public.transactions;
create policy "users insert their own transactions"
on public.transactions for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "users update their own transactions" on public.transactions;
create policy "users update their own transactions"
on public.transactions for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "users delete their own transactions" on public.transactions;
create policy "users delete their own transactions"
on public.transactions for delete
to authenticated
using (owner_id = auth.uid());
