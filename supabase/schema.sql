create table if not exists public.coach_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tuesday_football boolean not null default true,
  thursday_football boolean not null default true,
  sunday_match boolean not null default true,
  gym_days_target integer not null default 5 check (gym_days_target between 1 and 7),
  leg_day_target integer not null default 1 check (leg_day_target between 0 and 3),
  extra_note text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.coach_preferences enable row level security;

create policy "Users can read own coach preferences"
on public.coach_preferences
for select
using (auth.uid() = user_id);

create policy "Users can insert own coach preferences"
on public.coach_preferences
for insert
with check (auth.uid() = user_id);

create policy "Users can update own coach preferences"
on public.coach_preferences
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
