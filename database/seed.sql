USE vibepass;

INSERT INTO plans (name, slug, monthly_price, commission_rate, event_limit, invitation_limit, features)
VALUES
  ('Free', 'free', 0.00, 8.00, 3, 3, JSON_ARRAY('Limited events', 'Basic invitations', 'Standard support', 'Basic analytics')),
  ('Plus', 'plus', 2500.00, 6.50, 10, 50, JSON_ARRAY('More events', 'Premium templates', 'Promotions', 'Better analytics')),
  ('Premium', 'premium', 7500.00, 5.00, NULL, 200, JSON_ARRAY('Advanced analytics', 'Priority support', 'Custom branding')),
  ('Business', 'business', 20000.00, 3.50, NULL, 500, JSON_ARRAY('Team access', 'API access', 'White-label options', 'Dedicated support'))
ON DUPLICATE KEY UPDATE
  monthly_price = VALUES(monthly_price),
  commission_rate = VALUES(commission_rate),
  event_limit = VALUES(event_limit),
  invitation_limit = VALUES(invitation_limit),
  features = VALUES(features);

INSERT INTO settings (setting_key, setting_value, value_type)
VALUES
  ('platform_fee_percent', '8', 'number'),
  ('gateway_fee_percent', '3', 'number'),
  ('currency', 'LKR', 'string'),
  ('tax_enabled', 'false', 'boolean'),
  ('max_customer_qr_scanners', '10', 'number'),
  ('free_invitation_links', '3', 'number'),
  ('organizer_review_required', 'true', 'boolean'),
  ('event_review_required', 'true', 'boolean')
ON DUPLICATE KEY UPDATE
  setting_value = VALUES(setting_value),
  value_type = VALUES(value_type);
