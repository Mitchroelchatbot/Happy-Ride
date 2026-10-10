-- "Vandaag" op Curaçao (UTC−4, geen zomertijd). Vaste offset: werkt zonder tijdzonedatabase.
create or replace function public.curacao_today()
returns date
language sql
stable
as $$
  select ((now() at time zone 'UTC') - interval '4 hours')::date
$$;

-- Hulpfunctie: niet publiek aanroepbaar (get_availability is security definer en mag hem wel gebruiken).
revoke execute on function public.curacao_today() from public, anon, authenticated;

-- Bezette periodes per zichtbare auto, van vandaag tot 12 maanden vooruit.
-- Alleen auto + datums: geen persoonsgegevens. Verlopen opties tellen niet mee.
create or replace function public.get_availability()
returns table (car_id uuid, start_date date, end_date date)
language sql
stable
security definer
set search_path = ''
as $$
  select p.car_id, lower(p.period), upper(p.period)
  from public.periods p
  join public.cars c on c.id = p.car_id and c.visible
  left join public.requests r on r.id = p.request_id
  where upper(p.period) > public.curacao_today()
    and lower(p.period) < (public.curacao_today() + interval '12 months')::date
    and not (p.kind = 'option' and r.expires_at <= now())
  order by p.car_id, lower(p.period)
$$;

revoke all on function public.get_availability() from public, anon, authenticated;
grant execute on function public.get_availability() to anon, authenticated;
