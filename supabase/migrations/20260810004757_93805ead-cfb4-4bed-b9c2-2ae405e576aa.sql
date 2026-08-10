-- 1. Drop all existing wide-open public policies (replaced by authenticated-only policies below)
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- 2. Generic updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

-- 3. Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  country_code text NOT NULL DEFAULT '+91',
  country text NOT NULL DEFAULT 'India',
  currency text NOT NULL DEFAULT 'INR',
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Roles & permissions
CREATE TABLE public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roles TO authenticated;
GRANT ALL ON public.roles TO service_role;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  UNIQUE (user_id, role_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  section text NOT NULL,
  can_view boolean NOT NULL DEFAULT false,
  can_create boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  UNIQUE (role_id, section)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;

-- 5. Security-definer helpers
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = _user_id AND r.name = _role_name
  )
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _section text, _action text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(_user_id, 'Admin') THEN
    RETURN true;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role_id = ur.role_id
    WHERE ur.user_id = _user_id
      AND rp.section = _section
      AND CASE _action
            WHEN 'view' THEN rp.can_view
            WHEN 'create' THEN rp.can_create
            WHEN 'edit' THEN rp.can_edit
            WHEN 'delete' THEN rp.can_delete
            ELSE false
          END
  );
END $$;

-- 6. RLS on roles tables
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view roles" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage roles" ON public.roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'Admin')) WITH CHECK (public.has_role(auth.uid(), 'Admin'));

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view user roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage user roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'Admin')) WITH CHECK (public.has_role(auth.uid(), 'Admin'));

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view permissions" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage permissions" ON public.role_permissions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'Admin')) WITH CHECK (public.has_role(auth.uid(), 'Admin'));

-- 7. Seed roles & permissions
INSERT INTO public.roles (name, description, is_system) VALUES
  ('Admin', 'Full access to every section, users and settings.', true),
  ('Member', 'Day-to-day operator: can add and edit clients, features, tickets and account managers.', true),
  ('Viewer', 'Read-only access across the dashboard.', true);

INSERT INTO public.role_permissions (role_id, section, can_view, can_create, can_edit, can_delete)
SELECT r.id, s.section, true, true, true, true
FROM public.roles r
CROSS JOIN (VALUES ('dashboard'), ('clients'), ('features'), ('tickets'), ('account_managers'), ('settings')) AS s(section)
WHERE r.name = 'Admin';

INSERT INTO public.role_permissions (role_id, section, can_view, can_create, can_edit, can_delete)
SELECT r.id, s.section, s.can_view, s.can_create, s.can_edit, false
FROM public.roles r
CROSS JOIN (
  VALUES
    ('dashboard', true, false, false),
    ('clients', true, true, true),
    ('features', true, true, true),
    ('tickets', true, true, true),
    ('account_managers', true, true, true),
    ('settings', true, false, false)
) AS s(section, can_view, can_create, can_edit)
WHERE r.name = 'Member';

INSERT INTO public.role_permissions (role_id, section, can_view, can_create, can_edit, can_delete)
SELECT r.id, s.section, true, false, false, false
FROM public.roles r
CROSS JOIN (VALUES ('dashboard'), ('clients'), ('features'), ('tickets'), ('account_managers'), ('settings')) AS s(section)
WHERE r.name = 'Viewer';

-- 8. Signup trigger: create profile + assign role (first user = Admin, rest = Member)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role_name text;
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, country_code, country, currency)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, 'user'), '@', 1)),
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'country_code', '+91'),
    COALESCE(NEW.raw_user_meta_data->>'country', 'India'),
    COALESCE(NEW.raw_user_meta_data->>'currency', 'INR')
  );

  IF (SELECT count(*) FROM public.profiles) = 1 THEN
    _role_name := 'Admin';
  ELSE
    _role_name := 'Member';
  END IF;

  INSERT INTO public.user_roles (user_id, role_id)
  SELECT NEW.id, r.id FROM public.roles r WHERE r.name = _role_name;

  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Account managers
CREATE TABLE public.account_managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  avatar_url text,
  satisfaction numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_managers TO authenticated;
GRANT ALL ON public.account_managers TO service_role;
ALTER TABLE public.account_managers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON public.account_managers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER set_account_managers_updated_at BEFORE UPDATE ON public.account_managers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 10. Expand clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS account_manager_id uuid REFERENCES public.account_managers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_since date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_status_check;
ALTER TABLE public.features DROP CONSTRAINT IF EXISTS features_status_check;
UPDATE public.clients SET status = 'active' WHERE status = 'at_risk';

-- 11. Expand features (lifecycle status)
ALTER TABLE public.features
  ADD COLUMN IF NOT EXISTS release_version text,
  ADD COLUMN IF NOT EXISTS release_date date;
UPDATE public.features SET status = 'live' WHERE status IN ('hit', 'stable', 'declining');

-- 12. Feature media (images / gifs / videos)
CREATE TABLE public.feature_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id uuid NOT NULL REFERENCES public.features(id) ON DELETE CASCADE,
  media_type text NOT NULL DEFAULT 'image',
  url text NOT NULL,
  caption text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feature_media TO authenticated;
GRANT ALL ON public.feature_media TO service_role;
ALTER TABLE public.feature_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON public.feature_media FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 13. Feature feedback
CREATE TABLE public.feature_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id uuid NOT NULL REFERENCES public.features(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  feedback text NOT NULL,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'new',
  next_action text,
  created_by uuid,
  created_by_name text NOT NULL DEFAULT 'Team',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feature_feedback TO authenticated;
GRANT ALL ON public.feature_feedback TO service_role;
ALTER TABLE public.feature_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON public.feature_feedback FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER set_feature_feedback_updated_at BEFORE UPDATE ON public.feature_feedback FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 14. Feature notes (product inputs / iteration notes / next release)
CREATE TABLE public.feature_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id uuid NOT NULL REFERENCES public.features(id) ON DELETE CASCADE,
  note_type text NOT NULL DEFAULT 'iteration',
  content text NOT NULL,
  created_by uuid,
  created_by_name text NOT NULL DEFAULT 'Team',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feature_notes TO authenticated;
GRANT ALL ON public.feature_notes TO service_role;
ALTER TABLE public.feature_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON public.feature_notes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 15. Tickets
CREATE TABLE public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  feature_id uuid REFERENCES public.features(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  ticket_type text NOT NULL DEFAULT 'support',
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  requested_by text,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_name text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tickets TO authenticated;
GRANT ALL ON public.tickets TO service_role;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON public.tickets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER set_tickets_updated_at BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.ticket_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id uuid,
  user_name text NOT NULL DEFAULT 'Team',
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ticket_comments TO authenticated;
GRANT ALL ON public.ticket_comments TO service_role;
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON public.ticket_comments FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.ticket_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  file_name text,
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ticket_attachments TO authenticated;
GRANT ALL ON public.ticket_attachments TO service_role;
ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON public.ticket_attachments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 16. Subscriptions: product + customer count
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS product text NOT NULL DEFAULT 'Milk',
  ADD COLUMN IF NOT EXISTS customers_count integer NOT NULL DEFAULT 0;

-- 17. Per-module audit logs
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid,
  entity_label text,
  user_id uuid,
  user_name text NOT NULL DEFAULT 'System',
  action text NOT NULL,
  before_value jsonb,
  after_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view logs" ON public.audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- 18. Lock down pre-existing tables to signed-in users only
REVOKE ALL ON public.clients FROM anon;
REVOKE ALL ON public.features FROM anon;
REVOKE ALL ON public.client_features FROM anon;
REVOKE ALL ON public.subscriptions FROM anon;
REVOKE ALL ON public.activity_log FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.features TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_features TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_log TO authenticated;
GRANT ALL ON public.clients TO service_role;
GRANT ALL ON public.features TO service_role;
GRANT ALL ON public.client_features TO service_role;
GRANT ALL ON public.subscriptions TO service_role;
GRANT ALL ON public.activity_log TO service_role;
CREATE POLICY "Authenticated full access" ON public.clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON public.features FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON public.client_features FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON public.subscriptions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON public.activity_log FOR ALL TO authenticated USING (true) WITH CHECK (true);