'use strict';

const crypto = require('crypto');

function createQrCode(prefix = 'VP') {
  const token = crypto.randomBytes(18).toString('base64url').toUpperCase();
  return `${prefix}-${token}`;
}

module.exports = { createQrCode };
