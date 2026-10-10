-- Happy Ride: basisschema
-- Overlap van periodes per auto wordt afgedwongen door een exclusion constraint.

create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;

-- Vloot --------------------------------------------------------------------
create table public.cars (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  transmission text not null check (transmission in ('manual', 'automatic')),
  seats smallint not null check (seats between 1 and 9),
  luggage smallint not null default 0 check (luggage between 0 and 10),
  airco boolean not null default true,
  price_per_day_cents integer not null check (price_per_day_cents > 0),
  photo_path text,
  is_placeholder_photo boolean not null default false,
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Extra's -------------------------------------------------------------------
create table public.extras (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key in ('extra_driver', 'child_seat')),
  price_per_day_cents integer not null check (price_per_day_cents >= 0),
  active boolean not null default true
);

-- Aanvragen -----------------------------------------------------------------
create sequence public.request_reference_seq start 1001;

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  reference integer not null unique default nextval('public.request_reference_seq'),
  car_id uuid not null references public.cars (id) on delete restrict,
  pickup_date date not null,
  return_date date not null,
  pickup_time time not null,
  return_time time not null,
  pickup_location text not null check (pickup_location in ('airport', 'accommodation', 'office')),
  accommodation_address text,
  flight_number text,
  name text not null check (length(trim(name)) > 0),
  email text not null check (length(trim(email)) > 0),
  phone text not null check (length(trim(phone)) > 0),
  message text,
  extra_driver boolean not null default false,
  child_seats smallint not null default 0 check (child_seats between 0 and 3),
  total_price_cents integer not null check (total_price_cents > 0),
  locale text not null check (locale in ('nl', 'en', 'es')),
  status text not null default 'new'
    check (status in ('new', 'confirmed', 'rejected', 'expired', 'cancelled')),
  expires_at timestamptz not null,
  reminder_sent_at timestamptz,
  mail_failed boolean not null default false,
  ip_hash text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  constraint requests_dates_check check (return_date > pickup_date),
  constraint requests_address_check
    check (pickup_location <> 'accommodation' or length(trim(coalesce(accommodation_address, ''))) > 0)
);

alter sequence public.request_reference_seq owned by public.requests.reference;
revoke all on sequence public.request_reference_seq from anon, authenticated;

create index requests_status_expires_idx on public.requests (status, expires_at);

-- Bezette periodes ----------------------------------------------------------
-- period is half-open [ophaaldag, inleverdag): de inleverdag is vrij voor de volgende klant.
create table public.periods (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references public.cars (id) on delete cascade,
  period daterange not null,
  kind text not null check (kind in ('option', 'confirmed', 'blocked')),
  request_id uuid unique references public.requests (id) on delete restrict,
  note text,
  created_at timestamptz not null default now(),
  constraint periods_period_check
    check (not isempty(period) and lower(period) is not null and upper(period) is not null),
  constraint periods_request_check check ((kind = 'blocked') = (request_id is null)),
  constraint periods_no_overlap exclude using gist (car_id with =, period with &&)
);

-- Toegang -------------------------------------------------------------------
alter table public.cars enable row level security;
alter table public.extras enable row level security;
alter table public.requests enable row level security;
alter table public.periods enable row level security;

revoke all on public.cars, public.extras, public.requests, public.periods from anon, authenticated;
grant select on public.cars, public.extras to anon, authenticated;

create policy "cars: publiek leest zichtbare auto's" on public.cars
  for select to anon, authenticated using (visible);

create policy "extras: publiek leest actieve extra's" on public.extras
  for select to anon, authenticated using (active);
