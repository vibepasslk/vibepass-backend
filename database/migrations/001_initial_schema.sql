CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS plans (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  slug VARCHAR(80) NOT NULL UNIQUE,
  monthly_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  commission_rate NUMERIC(5,2),
  event_limit INTEGER,
  invitation_limit INTEGER,
  features JSONB,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(40),
  role VARCHAR(30) NOT NULL DEFAULT 'customer'
    CHECK (role IN ('super_admin','organizer','customer','staff')),
  status VARCHAR(30) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','pending','suspended','banned')),
  avatar_url VARCHAR(255),
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS organizer_profiles (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  organizer_type VARCHAR(100) NOT NULL DEFAULT 'Event organizer',
  organization_name VARCHAR(190),
  status VARCHAR(40) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','suspended','corrections_required')),
  nic_document_path VARCHAR(255),
  bank_verified BOOLEAN NOT NULL DEFAULT FALSE,
  plan_id BIGINT REFERENCES plans(id) ON DELETE SET NULL,
  commission_rate NUMERIC(5,2),
  admin_notes TEXT,
  reviewed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS organizer_bank_accounts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bank_name VARCHAR(120) NOT NULL,
  branch_name VARCHAR(120),
  account_name VARCHAR(160) NOT NULL,
  account_number VARCHAR(80) NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
  id BIGSERIAL PRIMARY KEY,
  organizer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug VARCHAR(160) NOT NULL UNIQUE,
  title VARCHAR(190) NOT NULL,
  description TEXT,
  category VARCHAR(80),
  venue VARCHAR(190),
  map_location VARCHAR(255),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  seating_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  visibility VARCHAR(20) NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public','private')),
  rules TEXT,
  event_terms TEXT,
  status VARCHAR(40) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','under_review','corrections_required','approved','published','completed','rejected','cancelled')),
  review_notes TEXT,
  cover_image VARCHAR(255),
  platform_terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS event_images (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  image_path VARCHAR(255) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ticket_types (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  category VARCHAR(120) NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  early_bird_price NUMERIC(12,2),
  early_bird_until TIMESTAMPTZ,
  quantity_total INTEGER NOT NULL DEFAULT 0,
  quantity_sold INTEGER NOT NULL DEFAULT 0,
  seats_per_ticket INTEGER NOT NULL DEFAULT 1,
  ticket_image VARCHAR(255),
  qr_mode VARCHAR(20) NOT NULL DEFAULT 'qr'
    CHECK (qr_mode IN ('qr','numbering')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS event_seats (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  ticket_type_id BIGINT REFERENCES ticket_types(id) ON DELETE SET NULL,
  row_label VARCHAR(20) NOT NULL,
  seat_number VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'available'
    CHECK (status IN ('available','reserved','sold','blocked')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uniq_event_seat UNIQUE (event_id, row_label, seat_number)
);

CREATE TABLE IF NOT EXISTS buyer_form_fields (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  field_key VARCHAR(80) NOT NULL,
  label VARCHAR(160) NOT NULL,
  field_type VARCHAR(30) NOT NULL DEFAULT 'text'
    CHECK (field_type IN ('text','email','phone','date','select','checkbox','textarea','number')),
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  options JSONB,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uniq_form_field UNIQUE (event_id, field_key)
);

CREATE TABLE IF NOT EXISTS promo_codes (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT REFERENCES events(id) ON DELETE CASCADE,
  created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code VARCHAR(80) NOT NULL UNIQUE,
  type VARCHAR(30) NOT NULL
    CHECK (type IN ('percentage','fixed','early_bird','vip_only')),
  value NUMERIC(12,2) NOT NULL,
  usage_limit INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  payment_status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending','paid','failed','refunded','cancelled')),
  total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  platform_fee NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  gateway_fee NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  organizer_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  payment_reference VARCHAR(190),
  buyer_details JSONB,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  ticket_type_id BIGINT NOT NULL REFERENCES ticket_types(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL,
  form_answers JSONB,
  seats JSONB,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS qr_tickets (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id BIGINT REFERENCES order_items(id) ON DELETE SET NULL,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  qr_code VARCHAR(120) NOT NULL UNIQUE,
  scan_status VARCHAR(30) NOT NULL DEFAULT 'unscanned'
    CHECK (scan_status IN ('unscanned','used','void','refunded')),
  scanned_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  scanned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS qr_scan_logs (
  id BIGSERIAL PRIMARY KEY,
  qr_ticket_id BIGINT REFERENCES qr_tickets(id) ON DELETE SET NULL,
  scanner_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  qr_code VARCHAR(120) NOT NULL,
  result VARCHAR(20) NOT NULL CHECK (result IN ('approved','denied')),
  reason VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invitations (
  id BIGSERIAL PRIMARY KEY,
  creator_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id BIGINT REFERENCES events(id) ON DELETE SET NULL,
  template_id VARCHAR(80),
  title VARCHAR(190) NOT NULL,
  guest_name VARCHAR(160),
  event_date TIMESTAMPTZ,
  venue VARCHAR(190),
  message TEXT,
  share_link VARCHAR(160) NOT NULL UNIQUE,
  rsvp_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  status VARCHAR(30) NOT NULL DEFAULT 'published'
    CHECK (status IN ('draft','published','archived')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invitation_rsvps (
  id BIGSERIAL PRIMARY KEY,
  invitation_id BIGINT NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
  guest_name VARCHAR(160) NOT NULL,
  guest_email VARCHAR(190),
  guest_phone VARCHAR(40),
  status VARCHAR(30) NOT NULL DEFAULT 'attending'
    CHECK (status IN ('attending','not_attending','maybe')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id BIGSERIAL PRIMARY KEY,
  organizer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','paid')),
  bank_account_id BIGINT REFERENCES organizer_bank_accounts(id) ON DELETE SET NULL,
  organizer_note TEXT,
  admin_note TEXT,
  transfer_receipt_path VARCHAR(255),
  reviewed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS refunds (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  requested_by BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason VARCHAR(40) NOT NULL
    CHECK (reason IN ('cancelled_event','duplicate_payment','platform_issue','fraud_detection','organizer_request')),
  status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','processed')),
  amount NUMERIC(12,2) NOT NULL,
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS promotions (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organizer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(40) NOT NULL
    CHECK (type IN ('homepage_banner','trending','push_notification','social_boost','invite_link')),
  status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','completed','rejected')),
  price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel VARCHAR(30) NOT NULL DEFAULT 'in_app'
    CHECK (channel IN ('in_app','email','sms','whatsapp','push')),
  title VARCHAR(190) NOT NULL,
  body TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','sent','failed')),
  metadata JSONB,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  email VARCHAR(190),
  subject VARCHAR(190) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','in_progress','closed')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS api_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  name VARCHAR(120) NOT NULL,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  id BIGSERIAL PRIMARY KEY,
  setting_key VARCHAR(120) NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  value_type VARCHAR(20) NOT NULL DEFAULT 'string'
    CHECK (value_type IN ('string','number','boolean','json')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(80),
  entity_id BIGINT,
  metadata JSONB,
  ip_address VARCHAR(80),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_role_status ON users (role, status);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users (deleted_at);
CREATE INDEX IF NOT EXISTS idx_organizer_profiles_status ON organizer_profiles (status);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user ON organizer_bank_accounts (user_id);
CREATE INDEX IF NOT EXISTS idx_events_status_visibility ON events (status, visibility);
CREATE INDEX IF NOT EXISTS idx_events_organizer_status ON events (organizer_id, status);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events (start_date);
CREATE INDEX IF NOT EXISTS idx_event_images_event ON event_images (event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_types_event ON ticket_types (event_id);
CREATE INDEX IF NOT EXISTS idx_event_seats_status ON event_seats (event_id, status);
CREATE INDEX IF NOT EXISTS idx_promo_codes_event ON promo_codes (event_id);
CREATE INDEX IF NOT EXISTS idx_promo_codes_creator ON promo_codes (created_by);
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders (user_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_event_status ON orders (event_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_reference ON orders (payment_reference);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_qr_tickets_event_status ON qr_tickets (event_id, scan_status);
CREATE INDEX IF NOT EXISTS idx_qr_tickets_user ON qr_tickets (user_id);
CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_code ON qr_scan_logs (qr_code);
CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_created ON qr_scan_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_invitations_creator ON invitations (creator_id);
CREATE INDEX IF NOT EXISTS idx_invitations_share_link ON invitations (share_link);
CREATE INDEX IF NOT EXISTS idx_invitation_rsvps_invitation ON invitation_rsvps (invitation_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals (status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_organizer ON withdrawals (organizer_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds (status);
CREATE INDEX IF NOT EXISTS idx_promotions_status ON promotions (status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications (user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets (status);
CREATE INDEX IF NOT EXISTS idx_api_tokens_user ON api_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_events_search ON events
  USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(venue, '')));

DROP TRIGGER IF EXISTS touch_plans_updated_at ON plans;
CREATE TRIGGER touch_plans_updated_at BEFORE UPDATE ON plans
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS touch_users_updated_at ON users;
CREATE TRIGGER touch_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS touch_organizer_profiles_updated_at ON organizer_profiles;
CREATE TRIGGER touch_organizer_profiles_updated_at BEFORE UPDATE ON organizer_profiles
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS touch_organizer_bank_accounts_updated_at ON organizer_bank_accounts;
CREATE TRIGGER touch_organizer_bank_accounts_updated_at BEFORE UPDATE ON organizer_bank_accounts
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS touch_events_updated_at ON events;
CREATE TRIGGER touch_events_updated_at BEFORE UPDATE ON events
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS touch_ticket_types_updated_at ON ticket_types;
CREATE TRIGGER touch_ticket_types_updated_at BEFORE UPDATE ON ticket_types
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS touch_event_seats_updated_at ON event_seats;
CREATE TRIGGER touch_event_seats_updated_at BEFORE UPDATE ON event_seats
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS touch_orders_updated_at ON orders;
CREATE TRIGGER touch_orders_updated_at BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS touch_invitations_updated_at ON invitations;
CREATE TRIGGER touch_invitations_updated_at BEFORE UPDATE ON invitations
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS touch_withdrawals_updated_at ON withdrawals;
CREATE TRIGGER touch_withdrawals_updated_at BEFORE UPDATE ON withdrawals
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS touch_refunds_updated_at ON refunds;
CREATE TRIGGER touch_refunds_updated_at BEFORE UPDATE ON refunds
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS touch_promotions_updated_at ON promotions;
CREATE TRIGGER touch_promotions_updated_at BEFORE UPDATE ON promotions
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS touch_support_tickets_updated_at ON support_tickets;
CREATE TRIGGER touch_support_tickets_updated_at BEFORE UPDATE ON support_tickets
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS touch_settings_updated_at ON settings;
CREATE TRIGGER touch_settings_updated_at BEFORE UPDATE ON settings
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
