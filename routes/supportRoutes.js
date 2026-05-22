'use strict';

const express = require('express');
const supportController = require('../controllers/supportController');

const router = express.Router();

router.post('/', supportController.create);

module.exports = router;
