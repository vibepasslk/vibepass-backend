INSERT INTO plans (name, slug, monthly_price, commission_rate, event_limit, invitation_limit, features)
VALUES
  ('Free', 'free', 0.00, 8.00, 3, 3, '["Limited events", "Basic invitations", "Standard support", "Basic analytics"]'::jsonb),
  ('Plus', 'plus', 2500.00, 6.50, 10, 50, '["More events", "Premium templates", "Promotions", "Better analytics"]'::jsonb),
  ('Premium', 'premium', 7500.00, 5.00, NULL, 200, '["Advanced analytics", "Priority support", "Custom branding"]'::jsonb),
  ('Business', 'business', 20000.00, 3.50, NULL, 500, '["Team access", "API access", "White-label options", "Dedicated support"]'::jsonb)
ON CONFLICT (slug) DO UPDATE
SET monthly_price = EXCLUDED.monthly_price,
    commission_rate = EXCLUDED.commission_rate,
    event_limit = EXCLUDED.event_limit,
    invitation_limit = EXCLUDED.invitation_limit,
    features = EXCLUDED.features;

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
ON CONFLICT (setting_key) DO UPDATE
SET setting_value = EXCLUDED.setting_value,
    value_type = EXCLUDED.value_type;
