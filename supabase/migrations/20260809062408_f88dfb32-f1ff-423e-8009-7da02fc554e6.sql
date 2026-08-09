create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_name text,
  phone text,
  city text,
  plan text not null default 'Growth',
  status text not null default 'active' check (status in ('active','at_risk','churned')),
  customers_count integer not null default 0,
  monthly_revenue numeric(12,2) not null default 0,
  health_score integer not null default 50,
  onboarded_at date not null default current_date,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.clients to anon;
grant all on public.clients to service_role;
alter table public.clients enable row level security;
create policy "open access" on public.clients for all using (true) with check (true);

create table public.features (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null default 'General',
  status text not null default 'stable' check (status in ('hit','stable','declining')),
  description text,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.features to authenticated;
grant select, insert, update, delete on public.features to anon;
grant all on public.features to service_role;
alter table public.features enable row level security;
create policy "open access" on public.features for all using (true) with check (true);

create table public.client_features (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  feature_id uuid not null references public.features(id) on delete cascade,
  enabled boolean not null default true,
  adoption_percent numeric(5,2) not null default 0,
  enabled_at date not null default current_date,
  unique (client_id, feature_id)
);

grant select, insert, update, delete on public.client_features to authenticated;
grant select, insert, update, delete on public.client_features to anon;
grant all on public.client_features to service_role;
alter table public.client_features enable row level security;
create policy "open access" on public.client_features for all using (true) with check (true);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  plan text not null default 'Growth',
  status text not null default 'active' check (status in ('active','paused','stopped','completed','ended')),
  monthly_amount numeric(12,2) not null default 0,
  started_at date not null default current_date,
  ended_at date,
  end_reason text,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.subscriptions to authenticated;
grant select, insert, update, delete on public.subscriptions to anon;
grant all on public.subscriptions to service_role;
alter table public.subscriptions enable row level security;
create policy "open access" on public.subscriptions for all using (true) with check (true);

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  feature_id uuid references public.features(id) on delete set null,
  operator text not null default 'Office',
  event_type text not null default 'general' check (event_type in ('general','churn','payment','feature','risk','issue')),
  description text not null,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.activity_log to authenticated;
grant select, insert, update, delete on public.activity_log to anon;
grant all on public.activity_log to service_role;
alter table public.activity_log enable row level security;
create policy "open access" on public.activity_log for all using (true) with check (true);

-- Seed features
insert into public.features (id, name, category, status, description) values
  ('11111111-1111-1111-1111-111111111101', 'CRM & Ticketing System', 'Support', 'hit', 'Built-in CRM with support ticketing for client teams.'),
  ('11111111-1111-1111-1111-111111111102', 'WhatsApp AI Assistant', 'Communication', 'declining', 'AI assistant that handles customer queries on WhatsApp.'),
  ('11111111-1111-1111-1111-111111111103', 'Nodes', 'Automation', 'stable', 'Visual automation builder for operational workflows.'),
  ('11111111-1111-1111-1111-111111111104', 'Push Notifications with Images', 'Marketing', 'hit', 'Rich push notifications with image banners to end customers.'),
  ('11111111-1111-1111-1111-111111111105', 'Customer App', 'Engagement', 'stable', 'White-labelled customer-facing mobile app.'),
  ('11111111-1111-1111-1111-111111111106', 'Route Optimization', 'Operations', 'stable', 'Delivery route planning and optimization.');

-- Seed clients
insert into public.clients (id, name, owner_name, phone, city, plan, status, customers_count, monthly_revenue, health_score, onboarded_at) values
  ('22222222-2222-2222-2222-222222222201', 'Gokul Fresh Dairy', 'Rajesh Gokul', '+91 98200 11223', 'Mumbai', 'Scale', 'active', 1240, 68000, 86, '2025-08-01'),
  ('22222222-2222-2222-2222-222222222202', 'MooLane Milk Co.', 'Farid Ansari', '+91 98220 33445', 'Pune', 'Growth', 'active', 860, 45200, 74, '2026-01-15'),
  ('22222222-2222-2222-2222-222222222203', 'Sunrise Dairy Works', 'Bhavesh Patel', '+91 98980 55667', 'Ahmedabad', 'Starter', 'at_risk', 140, 8200, 32, '2026-03-01'),
  ('22222222-2222-2222-2222-222222222204', 'Ganga Valley Farms', 'Meena Yadav', '+91 99350 77889', 'Varanasi', 'Scale', 'active', 2100, 112500, 91, '2025-06-01'),
  ('22222222-2222-2222-2222-222222222205', 'DailyDoodle', 'Kabir Anand', '+91 98110 99001', 'Delhi', 'Growth', 'active', 540, 29800, 66, '2026-02-10'),
  ('22222222-2222-2222-2222-222222222206', 'Heritage Milk Supply', 'Suresh Menon', '+91 98470 22334', 'Kochi', 'Growth', 'churned', 0, 0, 12, '2024-11-20'),
  ('22222222-2222-2222-2222-222222222207', 'GreenPastures Dairy', 'Anita Desai', '+91 98600 44556', 'Nashik', 'Starter', 'at_risk', 95, 5400, 28, '2026-04-01'),
  ('22222222-2222-2222-2222-222222222208', 'CityMilk Deliveries', 'Arjun Rao', '+91 98450 66778', 'Bengaluru', 'Scale', 'active', 1750, 96400, 84, '2025-09-12'),
  ('22222222-2222-2222-2222-222222222209', 'FarmDoor Organics', 'Neha Kulkarni', '+91 97550 88990', 'Indore', 'Growth', 'churned', 0, 0, 9, '2025-12-05'),
  ('22222222-2222-2222-2222-222222222210', 'PureDrop Dairy', 'Vikram Sethi', '+91 99290 10112', 'Jaipur', 'Growth', 'active', 430, 24100, 61, '2026-05-20');

-- Seed subscriptions
insert into public.subscriptions (client_id, plan, status, monthly_amount, started_at, ended_at, end_reason) values
  ('22222222-2222-2222-2222-222222222201', 'Growth', 'completed', 42000, '2024-08-01', '2025-07-31', 'Plan migration to Scale'),
  ('22222222-2222-2222-2222-222222222201', 'Scale', 'active', 68000, '2025-08-01', null, null),
  ('22222222-2222-2222-2222-222222222202', 'Growth', 'active', 45200, '2026-01-15', null, null),
  ('22222222-2222-2222-2222-222222222203', 'Starter', 'stopped', 8200, '2026-03-01', '2026-05-14', 'Paused — operational issues'),
  ('22222222-2222-2222-2222-222222222203', 'Starter', 'active', 8200, '2026-05-15', null, null),
  ('22222222-2222-2222-2222-222222222204', 'Scale', 'active', 112500, '2025-06-01', null, null),
  ('22222222-2222-2222-2222-222222222205', 'Growth', 'active', 29800, '2026-02-10', null, null),
  ('22222222-2222-2222-2222-222222222206', 'Growth', 'completed', 18300, '2024-11-20', '2026-05-14', 'Subscription Completed because the end date have passed.'),
  ('22222222-2222-2222-2222-222222222207', 'Starter', 'active', 5400, '2026-04-01', null, null),
  ('22222222-2222-2222-2222-222222222208', 'Growth', 'stopped', 54000, '2025-09-12', '2025-12-01', 'Plan change'),
  ('22222222-2222-2222-2222-222222222208', 'Scale', 'active', 96400, '2025-12-02', null, null),
  ('22222222-2222-2222-2222-222222222209', 'Growth', 'stopped', 21500, '2025-12-05', '2026-07-22', 'cancelled'),
  ('22222222-2222-2222-2222-222222222210', 'Growth', 'active', 24100, '2026-05-20', null, null);

-- Seed feature adoption
insert into public.client_features (client_id, feature_id, enabled, adoption_percent, enabled_at) values
  ('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101', true, 82, '2025-09-01'),
  ('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111101', true, 76, '2026-02-01'),
  ('22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111101', true, 88, '2025-07-15'),
  ('22222222-2222-2222-2222-222222222205', '11111111-1111-1111-1111-111111111101', true, 64, '2026-05-04'),
  ('22222222-2222-2222-2222-222222222208', '11111111-1111-1111-1111-111111111101', true, 85, '2026-08-05'),
  ('22222222-2222-2222-2222-222222222210', '11111111-1111-1111-1111-111111111101', true, 58, '2026-06-11'),
  ('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111102', true, 34, '2025-10-01'),
  ('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111102', true, 28, '2026-02-20'),
  ('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111102', true, 15, '2026-03-15'),
  ('22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111102', true, 41, '2025-08-01'),
  ('22222222-2222-2222-2222-222222222205', '11111111-1111-1111-1111-111111111102', true, 22, '2026-03-01'),
  ('22222222-2222-2222-2222-222222222208', '11111111-1111-1111-1111-111111111102', true, 38, '2025-11-10'),
  ('22222222-2222-2222-2222-222222222210', '11111111-1111-1111-1111-111111111102', true, 19, '2026-06-01'),
  ('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111103', true, 18, '2026-04-01'),
  ('22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111103', true, 24, '2026-03-12'),
  ('22222222-2222-2222-2222-222222222208', '11111111-1111-1111-1111-111111111103', true, 31, '2026-05-19'),
  ('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111104', true, 79, '2025-09-20'),
  ('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111104', true, 71, '2026-02-10'),
  ('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111104', true, 44, '2026-04-02'),
  ('22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111104', true, 83, '2025-07-01'),
  ('22222222-2222-2222-2222-222222222205', '11111111-1111-1111-1111-111111111104', true, 57, '2026-03-22'),
  ('22222222-2222-2222-2222-222222222207', '11111111-1111-1111-1111-111111111104', true, 36, '2026-05-11'),
  ('22222222-2222-2222-2222-222222222208', '11111111-1111-1111-1111-111111111104', true, 81, '2025-10-15'),
  ('22222222-2222-2222-2222-222222222210', '11111111-1111-1111-1111-111111111104', true, 52, '2026-06-20'),
  ('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111105', true, 66, '2025-08-15'),
  ('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111105', true, 48, '2026-03-01'),
  ('22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111105', true, 72, '2025-06-20'),
  ('22222222-2222-2222-2222-222222222208', '11111111-1111-1111-1111-111111111105', true, 69, '2025-09-30'),
  ('22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111106', true, 45, '2026-01-10'),
  ('22222222-2222-2222-2222-222222222208', '11111111-1111-1111-1111-111111111106', true, 52, '2026-02-14');

-- Seed activity log
insert into public.activity_log (client_id, feature_id, operator, event_type, description, created_at) values
  ('22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111104', 'Office', 'feature', 'Push Notifications with Images campaign sent to 2,100 customers — 41% open rate.', '2026-08-08 14:32:00+05:30'),
  ('22222222-2222-2222-2222-222222222203', null, 'Aarti Shah', 'risk', 'Client flagged at-risk: customer rate dropped below 150 active customers.', '2026-08-07 08:54:00+05:30'),
  (null, '11111111-1111-1111-1111-111111111102', 'System', 'issue', 'Feature health moved to DECLINING — WhatsApp AI Assistant usage down 18% week-on-week.', '2026-08-06 11:20:00+05:30'),
  ('22222222-2222-2222-2222-222222222208', '11111111-1111-1111-1111-111111111101', 'Office', 'feature', 'CRM & Ticketing System enabled — 34 tickets resolved in the first week.', '2026-08-05 16:40:00+05:30'),
  ('22222222-2222-2222-2222-222222222207', null, 'Pappu Singh', 'risk', 'Renewal follow-up scheduled — client at risk of churn.', '2026-08-03 09:15:00+05:30'),
  ('22222222-2222-2222-2222-222222222209', null, 'Office', 'churn', 'Subscription stop scheduled from "22 Jul 2026" | Reason : cancelled', '2026-07-22 17:32:00+05:30'),
  ('22222222-2222-2222-2222-222222222210', null, 'Office', 'payment', 'Subscription has been marked as PAID by deducting "24100"', '2026-07-19 10:40:00+05:30'),
  (null, '11111111-1111-1111-1111-111111111102', 'System', 'issue', 'Operational issue reported: WhatsApp AI Assistant response delays above 30 seconds.', '2026-07-18 12:05:00+05:30'),
  ('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111102', 'Aarti Shah', 'feature', 'WhatsApp AI Assistant adoption review — customer usage down to 28%.', '2026-07-10 15:22:00+05:30'),
  ('22222222-2222-2222-2222-222222222206', null, 'Office', 'payment', 'Subscription has been marked as PAID by deducting "18300"', '2026-06-19 11:37:00+05:30'),
  (null, '11111111-1111-1111-1111-111111111103', 'System', 'feature', 'New iteration released: Nodes v2 — visual automation builder.', '2026-06-02 09:00:00+05:30'),
  ('22222222-2222-2222-2222-222222222203', null, 'Office', 'general', 'Subscription Resumed', '2026-05-15 10:57:00+05:30'),
  ('22222222-2222-2222-2222-222222222206', null, 'System', 'churn', 'Subscription Completed because the end date have passed.', '2026-05-14 05:02:00+05:30'),
  ('22222222-2222-2222-2222-222222222205', '11111111-1111-1111-1111-111111111101', 'Aarti Shah', 'feature', 'CRM & Ticketing System enabled for client account.', '2026-05-04 13:17:00+05:30'),
  ('22222222-2222-2222-2222-222222222207', null, 'Office', 'risk', 'Low customer rate detected — 95 active customers. Added to at-risk watchlist.', '2026-04-22 11:35:00+05:30');