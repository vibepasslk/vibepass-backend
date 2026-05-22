'use strict';

const ApiError = require('../utils/ApiError');

function isEmpty(value) {
  return value === undefined || value === null || value === '';
}

function validateBody(schema) {
  return function bodyValidator(req, _res, next) {
    const details = [];

    Object.entries(schema).forEach(([field, rules]) => {
      const value = req.body?.[field];

      if (rules.required && isEmpty(value)) {
        details.push({ field, message: `${field} is required` });
        return;
      }

      if (isEmpty(value)) return;

      if (rules.type === 'string' && typeof value !== 'string') {
        details.push({ field, message: `${field} must be a string` });
        return;
      }

      if (rules.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
        details.push({ field, message: `${field} must be a valid email address` });
      }

      if (rules.min && String(value).length < rules.min) {
        details.push({ field, message: `${field} must be at least ${rules.min} characters` });
      }

      if (rules.max && String(value).length > rules.max) {
        details.push({ field, message: `${field} must be ${rules.max} characters or fewer` });
      }

      if (rules.enum && !rules.enum.includes(value)) {
        details.push({ field, message: `${field} must be one of: ${rules.enum.join(', ')}` });
      }
    });

    if (details.length) {
      return next(new ApiError(422, 'Request validation failed', details));
    }

    next();
  };
}

const authSchemas = {
  register: {
    name: { type: 'string', max: 160 },
    first_name: { type: 'string', max: 80 },
    last_name: { type: 'string', max: 80 },
    email: { required: true, type: 'string', email: true, max: 190 },
    password: { required: true, type: 'string', min: 8, max: 120 },
    phone: { type: 'string', max: 40 },
    role: { type: 'string', enum: ['customer', 'organizer'] },
    organization_name: { type: 'string', max: 190 }
  },
  login: {
    email: { required: true, type: 'string', email: true, max: 190 },
    password: { required: true, type: 'string', min: 1, max: 120 }
  },
  forgotPassword: {
    email: { required: true, type: 'string', email: true, max: 190 }
  },
  verify2fa: {
    code: { required: true, type: 'string', min: 4, max: 12 }
  }
};

module.exports = {
  validateBody,
  authSchemas
};
