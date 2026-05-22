'use strict';

const WithdrawalModel = require('../models/WithdrawalModel');
const OrganizerModel = require('../models/OrganizerModel');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/respond');
const { getPagination } = require('../utils/pagination');

const requestWithdrawal = asyncHandler(async (req, res) => {
  const amount = Number(req.body.amount);
  if (!amount || amount <= 0) throw new ApiError(400, 'Withdrawal amount must be greater than zero');
  const withdrawal = await WithdrawalModel.create({
    organizer_id: req.user.id,
    amount,
    bank_account_id: req.body.bank_account_id,
    organizer_note: req.body.organizer_note
  });
  created(res, { withdrawal }, 'Withdrawal requested');
});

const mine = asyncHandler(async (req, res) => {
  ok(res, { withdrawals: await WithdrawalModel.listForOrganizer(req.user.id) });
});

const adminList = asyncHandler(async (req, res) => {
  const pagination = getPagination(req.query);
  const withdrawals = await WithdrawalModel.listForAdmin({ status: req.query.status, ...pagination });
  ok(res, { withdrawals, pagination });
});

const adminReview = asyncHandler(async (req, res) => {
  const allowed = ['approved', 'rejected', 'paid'];
  if (!allowed.includes(req.body.status)) throw new ApiError(400, 'Invalid withdrawal status');
  const withdrawal = await WithdrawalModel.review(req.params.id, {
    status: req.body.status,
    admin_note: req.body.admin_note,
    transfer_receipt_path: req.file ? `/uploads/${req.file.filename}` : req.body.transfer_receipt_path,
    reviewed_by: req.user.id
  });
  ok(res, { withdrawal }, 'Withdrawal reviewed');
});

const saveBankAccount = asyncHandler(async (req, res) => {
  const accounts = await OrganizerModel.upsertBankAccount(req.user.id, req.body);
  ok(res, { accounts }, 'Bank account saved');
});

const bankAccounts = asyncHandler(async (req, res) => {
  ok(res, { accounts: await OrganizerModel.listBankAccounts(req.user.id) });
});

module.exports = {
  requestWithdrawal,
  mine,
  adminList,
  adminReview,
  saveBankAccount,
  bankAccounts
};
