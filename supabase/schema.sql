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


create table if not exists public.weekly_plans (
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  plan jsonb not null,
  generated_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

alter table public.weekly_plans enable row level security;

create policy "Users can read own weekly plans"
on public.weekly_plans
for select
using (auth.uid() = user_id);

create policy "Users can insert own weekly plans"
on public.weekly_plans
for insert
with check (auth.uid() = user_id);

create policy "Users can update own weekly plans"
on public.weekly_plans
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);


create table if not exists public.daily_checkins (
  user_id uuid not null references auth.users(id) on delete cascade,
  checkin_date date not null,
  energy integer not null check (energy between 0 and 10),
  leg_soreness integer not null check (leg_soreness between 0 and 10),
  shin_pain integer not null check (shin_pain between 0 and 10),
  motivation integer not null check (motivation between 0 and 10),
  available_minutes integer not null default 60,
  note text not null default '',
  created_at timestamptz not null default now(),
  primary key (user_id, checkin_date)
);

alter table public.daily_checkins enable row level security;

create policy "Users can read own daily checkins"
on public.daily_checkins
for select
using (auth.uid() = user_id);

create policy "Users can insert own daily checkins"
on public.daily_checkins
for insert
with check (auth.uid() = user_id);

create policy "Users can update own daily checkins"
on public.daily_checkins
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
