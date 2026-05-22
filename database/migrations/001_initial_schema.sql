CREATE DATABASE IF NOT EXISTS vibepass
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE vibepass;

CREATE TABLE IF NOT EXISTS plans (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(80) NOT NULL UNIQUE,
  slug VARCHAR(80) NOT NULL UNIQUE,
  monthly_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  commission_rate DECIMAL(5,2) NULL,
  event_limit INT NULL,
  invitation_limit INT NULL,
  features JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(40) NULL,
  role ENUM('super_admin','organizer','customer','staff') NOT NULL DEFAULT 'customer',
  status ENUM('active','pending','suspended','banned') NOT NULL DEFAULT 'active',
  avatar_url VARCHAR(255) NULL,
  verified TINYINT(1) NOT NULL DEFAULT 0,
  two_factor_enabled TINYINT(1) NOT NULL DEFAULT 0,
  last_login_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  INDEX idx_users_role_status (role, status),
  INDEX idx_users_deleted_at (deleted_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS organizer_profiles (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL UNIQUE,
  organizer_type VARCHAR(100) NOT NULL DEFAULT 'Event organizer',
  organization_name VARCHAR(190) NULL,
  status ENUM('pending','approved','rejected','suspended','corrections_required') NOT NULL DEFAULT 'pending',
  nic_document_path VARCHAR(255) NULL,
  bank_verified TINYINT(1) NOT NULL DEFAULT 0,
  plan_id BIGINT UNSIGNED NULL,
  commission_rate DECIMAL(5,2) NULL,
  admin_notes TEXT NULL,
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_organizer_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_organizer_profiles_plan FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE SET NULL,
  CONSTRAINT fk_organizer_profiles_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_organizer_profiles_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS organizer_bank_accounts (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  bank_name VARCHAR(120) NOT NULL,
  branch_name VARCHAR(120) NULL,
  account_name VARCHAR(160) NOT NULL,
  account_number VARCHAR(80) NOT NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  verified TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_bank_accounts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_bank_accounts_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS events (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  organizer_id BIGINT UNSIGNED NOT NULL,
  slug VARCHAR(160) NOT NULL UNIQUE,
  title VARCHAR(190) NOT NULL,
  description TEXT NULL,
  category VARCHAR(80) NULL,
  venue VARCHAR(190) NULL,
  map_location VARCHAR(255) NULL,
  start_date DATETIME NULL,
  end_date DATETIME NULL,
  seating_enabled TINYINT(1) NOT NULL DEFAULT 0,
  visibility ENUM('public','private') NOT NULL DEFAULT 'public',
  rules TEXT NULL,
  event_terms TEXT NULL,
  status ENUM('draft','under_review','corrections_required','approved','published','completed','rejected','cancelled') NOT NULL DEFAULT 'draft',
  review_notes TEXT NULL,
  cover_image VARCHAR(255) NULL,
  platform_terms_accepted TINYINT(1) NOT NULL DEFAULT 0,
  published_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  CONSTRAINT fk_events_organizer FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_events_status_visibility (status, visibility),
  INDEX idx_events_organizer_status (organizer_id, status),
  INDEX idx_events_start_date (start_date),
  FULLTEXT INDEX ft_events_search (title, description, venue)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS event_images (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  event_id BIGINT UNSIGNED NOT NULL,
  image_path VARCHAR(255) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_event_images_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ticket_types (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  event_id BIGINT UNSIGNED NOT NULL,
  category VARCHAR(120) NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  early_bird_price DECIMAL(12,2) NULL,
  early_bird_until DATETIME NULL,
  quantity_total INT NOT NULL DEFAULT 0,
  quantity_sold INT NOT NULL DEFAULT 0,
  seats_per_ticket INT NOT NULL DEFAULT 1,
  ticket_image VARCHAR(255) NULL,
  qr_mode ENUM('qr','numbering') NOT NULL DEFAULT 'qr',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ticket_types_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  INDEX idx_ticket_types_event (event_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS event_seats (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  event_id BIGINT UNSIGNED NOT NULL,
  ticket_type_id BIGINT UNSIGNED NULL,
  row_label VARCHAR(20) NOT NULL,
  seat_number VARCHAR(20) NOT NULL,
  status ENUM('available','reserved','sold','blocked') NOT NULL DEFAULT 'available',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_event_seats_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  CONSTRAINT fk_event_seats_ticket_type FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id) ON DELETE SET NULL,
  UNIQUE KEY uniq_event_seat (event_id, row_label, seat_number),
  INDEX idx_event_seats_status (event_id, status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS buyer_form_fields (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  event_id BIGINT UNSIGNED NOT NULL,
  field_key VARCHAR(80) NOT NULL,
  label VARCHAR(160) NOT NULL,
  field_type ENUM('text','email','phone','date','select','checkbox','textarea','number') NOT NULL DEFAULT 'text',
  is_required TINYINT(1) NOT NULL DEFAULT 0,
  options JSON NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_buyer_form_fields_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_form_field (event_id, field_key)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS promo_codes (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  event_id BIGINT UNSIGNED NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  code VARCHAR(80) NOT NULL UNIQUE,
  type ENUM('percentage','fixed','early_bird','vip_only') NOT NULL,
  value DECIMAL(12,2) NOT NULL,
  usage_limit INT NULL,
  used_count INT NOT NULL DEFAULT 0,
  starts_at DATETIME NULL,
  ends_at DATETIME NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_promo_codes_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  CONSTRAINT fk_promo_codes_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS orders (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  event_id BIGINT UNSIGNED NOT NULL,
  payment_status ENUM('pending','paid','failed','refunded','cancelled') NOT NULL DEFAULT 'pending',
  total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  platform_fee DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  gateway_fee DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  organizer_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  payment_reference VARCHAR(190) NULL,
  buyer_details JSON NULL,
  paid_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_orders_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  INDEX idx_orders_user_status (user_id, payment_status),
  INDEX idx_orders_event_status (event_id, payment_status),
  INDEX idx_orders_payment_reference (payment_reference)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  ticket_type_id BIGINT UNSIGNED NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  form_answers JSON NULL,
  seats JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_items_ticket_type FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id) ON DELETE RESTRICT,
  INDEX idx_order_items_order (order_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS qr_tickets (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  order_item_id BIGINT UNSIGNED NULL,
  event_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  qr_code VARCHAR(120) NOT NULL UNIQUE,
  scan_status ENUM('unscanned','used','void','refunded') NOT NULL DEFAULT 'unscanned',
  scanned_by BIGINT UNSIGNED NULL,
  scanned_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_qr_tickets_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_qr_tickets_order_item FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE SET NULL,
  CONSTRAINT fk_qr_tickets_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  CONSTRAINT fk_qr_tickets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_qr_tickets_scanner FOREIGN KEY (scanned_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_qr_tickets_event_status (event_id, scan_status),
  INDEX idx_qr_tickets_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS qr_scan_logs (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  qr_ticket_id BIGINT UNSIGNED NULL,
  scanner_user_id BIGINT UNSIGNED NULL,
  qr_code VARCHAR(120) NOT NULL,
  result ENUM('approved','denied') NOT NULL,
  reason VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_qr_scan_logs_ticket FOREIGN KEY (qr_ticket_id) REFERENCES qr_tickets(id) ON DELETE SET NULL,
  CONSTRAINT fk_qr_scan_logs_scanner FOREIGN KEY (scanner_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_qr_scan_logs_code (qr_code),
  INDEX idx_qr_scan_logs_created (created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS invitations (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  creator_id BIGINT UNSIGNED NOT NULL,
  event_id BIGINT UNSIGNED NULL,
  template_id VARCHAR(80) NULL,
  title VARCHAR(190) NOT NULL,
  guest_name VARCHAR(160) NULL,
  event_date DATETIME NULL,
  venue VARCHAR(190) NULL,
  message TEXT NULL,
  share_link VARCHAR(160) NOT NULL UNIQUE,
  rsvp_enabled TINYINT(1) NOT NULL DEFAULT 1,
  status ENUM('draft','published','archived') NOT NULL DEFAULT 'published',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_invitations_creator FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_invitations_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL,
  INDEX idx_invitations_creator (creator_id),
  INDEX idx_invitations_share_link (share_link)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS invitation_rsvps (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  invitation_id BIGINT UNSIGNED NOT NULL,
  guest_name VARCHAR(160) NOT NULL,
  guest_email VARCHAR(190) NULL,
  guest_phone VARCHAR(40) NULL,
  status ENUM('attending','not_attending','maybe') NOT NULL DEFAULT 'attending',
  note TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_invitation_rsvps_invitation FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE CASCADE,
  INDEX idx_invitation_rsvps_invitation (invitation_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS withdrawals (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  organizer_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  status ENUM('pending','approved','rejected','paid') NOT NULL DEFAULT 'pending',
  bank_account_id BIGINT UNSIGNED NULL,
  organizer_note TEXT NULL,
  admin_note TEXT NULL,
  transfer_receipt_path VARCHAR(255) NULL,
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_withdrawals_organizer FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_withdrawals_bank FOREIGN KEY (bank_account_id) REFERENCES organizer_bank_accounts(id) ON DELETE SET NULL,
  CONSTRAINT fk_withdrawals_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_withdrawals_status (status),
  INDEX idx_withdrawals_organizer (organizer_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS refunds (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  requested_by BIGINT UNSIGNED NOT NULL,
  reason ENUM('cancelled_event','duplicate_payment','platform_issue','fraud_detection','organizer_request') NOT NULL,
  status ENUM('pending','approved','rejected','processed') NOT NULL DEFAULT 'pending',
  amount DECIMAL(12,2) NOT NULL,
  admin_note TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_refunds_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_refunds_requester FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_refunds_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS promotions (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  event_id BIGINT UNSIGNED NOT NULL,
  organizer_id BIGINT UNSIGNED NOT NULL,
  type ENUM('homepage_banner','trending','push_notification','social_boost','invite_link') NOT NULL,
  status ENUM('pending','active','completed','rejected') NOT NULL DEFAULT 'pending',
  price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  starts_at DATETIME NULL,
  ends_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_promotions_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  CONSTRAINT fk_promotions_organizer FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_promotions_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  channel ENUM('in_app','email','sms','whatsapp','push') NOT NULL DEFAULT 'in_app',
  title VARCHAR(190) NOT NULL,
  body TEXT NULL,
  status ENUM('queued','sent','failed') NOT NULL DEFAULT 'queued',
  metadata JSON NULL,
  read_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notifications_user_read (user_id, read_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS support_tickets (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  email VARCHAR(190) NULL,
  subject VARCHAR(190) NOT NULL,
  message TEXT NOT NULL,
  status ENUM('open','in_progress','closed') NOT NULL DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_support_tickets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_support_tickets_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS api_tokens (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  name VARCHAR(120) NOT NULL,
  last_used_at DATETIME NULL,
  expires_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_api_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_api_tokens_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS settings (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  setting_key VARCHAR(120) NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  value_type ENUM('string','number','boolean','json') NOT NULL DEFAULT 'string',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  actor_id BIGINT UNSIGNED NULL,
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(80) NULL,
  entity_id BIGINT UNSIGNED NULL,
  metadata JSON NULL,
  ip_address VARCHAR(80) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_logs_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_logs_actor (actor_id),
  INDEX idx_audit_logs_entity (entity_type, entity_id),
  INDEX idx_audit_logs_created (created_at)
) ENGINE=InnoDB;
