'use strict';

const { env } = require('../config/env');
const SettingsModel = require('../models/SettingsModel');

async function getFeeConfig() {
  const settings = await SettingsModel.asObject().catch(() => ({}));
  return {
    platformFeePercent: Number(settings.platform_fee_percent || 8),
    gatewayFeePercent: Number(settings.gateway_fee_percent || 3)
  };
}

function calculateTicketSplit(total, feeConfig) {
  const platformFee = roundMoney(total * (feeConfig.platformFeePercent / 100));
  const gatewayFee = roundMoney(total * (feeConfig.gatewayFeePercent / 100));
  const organizerAmount = roundMoney(total - platformFee - gatewayFee);
  return { platformFee, gatewayFee, organizerAmount };
}

async function initializePayment(order) {
  const isConfigured = Boolean(env.paypal.clientId && env.paypal.clientSecret);

  return {
    provider: 'paypal',
    configured: isConfigured,
    status: isConfigured ? 'ready_for_provider_call' : 'credentials_required',
    approval_url: isConfigured ? null : `${env.appUrl}/pages/checkout.html?order=${order.id}&mode=manual`,
    message: isConfigured
      ? 'PayPal credentials found. Wire provider SDK call here for live checkout.'
      : 'PayPal credentials are not configured. Add them to .env before live payment collection.'
  };
}

async function verifyPayment(payload) {
  return {
    provider: payload.provider || 'paypal',
    payment_reference: payload.payment_reference || payload.order_id || `manual-${Date.now()}`,
    verified: payload.status ? payload.status === 'paid' : true
  };
}

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

module.exports = {
  getFeeConfig,
  calculateTicketSplit,
  initializePayment,
  verifyPayment
};
