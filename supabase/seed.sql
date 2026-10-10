-- Voorbeeldvloot (placeholders). Wordt later via de beheerpagina vervangen.
insert into public.cars
  (name, transmission, seats, luggage, airco, price_per_day_cents, is_placeholder_photo, sort_order)
values
  ('Kia Picanto',  'automatic', 4, 1, true, 3500, true, 10),
  ('Hyundai i20',  'automatic', 5, 2, true, 4200, true, 20),
  ('Suzuki Jimny', 'automatic', 4, 1, true, 6000, true, 30),
  ('Kia Sportage', 'automatic', 5, 3, true, 7000, true, 40);

insert into public.extras (key, price_per_day_cents)
values
  ('extra_driver', 500),
  ('child_seat', 500);
