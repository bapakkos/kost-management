const User = require('./User');
const RoomType = require('./RoomType');
const PricingScheme = require('./PricingScheme');
const PricingSchemeRate = require('./PricingSchemeRate');
const Room = require('./Room');
const Tenant = require('./Tenant');
const TenantBankAccount = require('./TenantBankAccount');
const RentalContract = require('./RentalContract');
const MonthlyBilling = require('./MonthlyBilling');
const NonMonthlyIncome = require('./NonMonthlyIncome');
const PaymentReceipt = require('./PaymentReceipt');
const PaymentReceiptBilling = require('./PaymentReceiptBilling');
const PaymentReceiptIncome = require('./PaymentReceiptIncome');
const BankMutation = require('./BankMutation');

// --- Room Type ↔ Pricing Scheme Rates ---
RoomType.hasMany(PricingSchemeRate, { foreignKey: 'room_type_id' });
PricingSchemeRate.belongsTo(RoomType, { foreignKey: 'room_type_id' });

PricingScheme.hasMany(PricingSchemeRate, { foreignKey: 'pricing_scheme_id' });
PricingSchemeRate.belongsTo(PricingScheme, { foreignKey: 'pricing_scheme_id' });

// --- Room ↔ Room Type ---
RoomType.hasMany(Room, { foreignKey: 'room_type_id' });
Room.belongsTo(RoomType, { foreignKey: 'room_type_id' });

// --- Room ↔ Rental Contracts ---
Room.hasMany(RentalContract, { foreignKey: 'room_id' });
RentalContract.belongsTo(Room, { foreignKey: 'room_id' });

// --- Tenant ↔ Rental Contracts ---
Tenant.hasMany(RentalContract, { foreignKey: 'tenant_id' });
RentalContract.belongsTo(Tenant, { foreignKey: 'tenant_id' });

// --- Pricing Scheme ↔ Rental Contracts ---
PricingScheme.hasMany(RentalContract, { foreignKey: 'pricing_scheme_id' });
RentalContract.belongsTo(PricingScheme, { foreignKey: 'pricing_scheme_id' });

// --- Tenant ↔ Bank Accounts ---
Tenant.hasMany(TenantBankAccount, { foreignKey: 'tenant_id' });
TenantBankAccount.belongsTo(Tenant, { foreignKey: 'tenant_id' });

// --- Rental Contract ↔ Monthly Billings ---
RentalContract.hasMany(MonthlyBilling, { foreignKey: 'rental_contract_id' });
MonthlyBilling.belongsTo(RentalContract, { foreignKey: 'rental_contract_id' });

// --- Tenant ↔ Non-Monthly Incomes ---
Tenant.hasMany(NonMonthlyIncome, { foreignKey: 'tenant_id' });
NonMonthlyIncome.belongsTo(Tenant, { foreignKey: 'tenant_id' });

Room.hasMany(NonMonthlyIncome, { foreignKey: 'room_id' });
NonMonthlyIncome.belongsTo(Room, { foreignKey: 'room_id' });

// --- Payment Receipts ---
Tenant.hasMany(PaymentReceipt, { foreignKey: 'tenant_id' });
PaymentReceipt.belongsTo(Tenant, { foreignKey: 'tenant_id' });

Room.hasMany(PaymentReceipt, { foreignKey: 'room_id' });
PaymentReceipt.belongsTo(Room, { foreignKey: 'room_id' });

RentalContract.hasMany(PaymentReceipt, { foreignKey: 'rental_contract_id' });
PaymentReceipt.belongsTo(RentalContract, { foreignKey: 'rental_contract_id' });

TenantBankAccount.hasMany(PaymentReceipt, { foreignKey: 'bank_account_id' });
PaymentReceipt.belongsTo(TenantBankAccount, { foreignKey: 'bank_account_id' });

User.hasMany(PaymentReceipt, { foreignKey: 'created_by' });
PaymentReceipt.belongsTo(User, { foreignKey: 'created_by' });

// --- Payment Receipt ↔ Billings (Junction) ---
PaymentReceipt.hasMany(PaymentReceiptBilling, { foreignKey: 'payment_receipt_id' });
PaymentReceiptBilling.belongsTo(PaymentReceipt, { foreignKey: 'payment_receipt_id' });

MonthlyBilling.hasMany(PaymentReceiptBilling, { foreignKey: 'monthly_billing_id' });
PaymentReceiptBilling.belongsTo(MonthlyBilling, { foreignKey: 'monthly_billing_id' });

// --- Payment Receipt ↔ Incomes (Junction) ---
PaymentReceipt.hasMany(PaymentReceiptIncome, { foreignKey: 'payment_receipt_id' });
PaymentReceiptIncome.belongsTo(PaymentReceipt, { foreignKey: 'payment_receipt_id' });

NonMonthlyIncome.hasMany(PaymentReceiptIncome, { foreignKey: 'non_monthly_income_id' });
PaymentReceiptIncome.belongsTo(NonMonthlyIncome, { foreignKey: 'non_monthly_income_id' });

// --- Bank Mutations ---
Tenant.hasMany(BankMutation, { foreignKey: 'tenant_id' });
BankMutation.belongsTo(Tenant, { foreignKey: 'tenant_id' });

PaymentReceipt.hasMany(BankMutation, { foreignKey: 'payment_receipt_id' });
BankMutation.belongsTo(PaymentReceipt, { foreignKey: 'payment_receipt_id' });

module.exports = {
  User,
  RoomType,
  PricingScheme,
  PricingSchemeRate,
  Room,
  Tenant,
  TenantBankAccount,
  RentalContract,
  MonthlyBilling,
  NonMonthlyIncome,
  PaymentReceipt,
  PaymentReceiptBilling,
  PaymentReceiptIncome,
  BankMutation,
};