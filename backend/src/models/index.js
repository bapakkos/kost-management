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
const PaymentReceiptItem = require('./PaymentReceiptItem');
const BankMutation = require('./BankMutation');
const ReconciliationLink = require('./ReconciliationLink');
const DepositReturn = require('./DepositReturn');
const SenderRegistry = require('./SenderRegistry');

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

RentalContract.hasMany(NonMonthlyIncome, { foreignKey: 'rental_contract_id' });
NonMonthlyIncome.belongsTo(RentalContract, { foreignKey: 'rental_contract_id' });

// --- Payment Receipts (Nota) ---
Tenant.hasMany(PaymentReceipt, { foreignKey: 'tenant_id' });
PaymentReceipt.belongsTo(Tenant, { foreignKey: 'tenant_id' });

Room.hasMany(PaymentReceipt, { foreignKey: 'room_id' });
PaymentReceipt.belongsTo(Room, { foreignKey: 'room_id' });

User.hasMany(PaymentReceipt, { foreignKey: 'created_by' });
PaymentReceipt.belongsTo(User, { foreignKey: 'created_by' });

// --- Payment Receipt Items ---
PaymentReceipt.hasMany(PaymentReceiptItem, { foreignKey: 'payment_receipt_id' });
PaymentReceiptItem.belongsTo(PaymentReceipt, { foreignKey: 'payment_receipt_id' });

MonthlyBilling.hasMany(PaymentReceiptItem, { foreignKey: 'monthly_billing_id' });
PaymentReceiptItem.belongsTo(MonthlyBilling, { foreignKey: 'monthly_billing_id' });

NonMonthlyIncome.hasMany(PaymentReceiptItem, { foreignKey: 'non_monthly_income_id' });
PaymentReceiptItem.belongsTo(NonMonthlyIncome, { foreignKey: 'non_monthly_income_id' });

// --- Bank Mutations ---
Tenant.hasMany(BankMutation, { foreignKey: 'tenant_id' });
BankMutation.belongsTo(Tenant, { foreignKey: 'tenant_id' });

// --- Reconciliation Links (N:M) ---
BankMutation.hasMany(ReconciliationLink, { foreignKey: 'bank_mutation_id' });
ReconciliationLink.belongsTo(BankMutation, { foreignKey: 'bank_mutation_id' });

// --- Deposit Returns ---
RentalContract.hasMany(DepositReturn, { foreignKey: 'rental_contract_id' });
DepositReturn.belongsTo(RentalContract, { foreignKey: 'rental_contract_id' });

User.hasMany(DepositReturn, { foreignKey: 'created_by' });
DepositReturn.belongsTo(User, { foreignKey: 'created_by' });

// --- Sender Registry ---
Tenant.hasMany(SenderRegistry, { foreignKey: 'tenant_id' });
SenderRegistry.belongsTo(Tenant, { foreignKey: 'tenant_id' });

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
  PaymentReceiptItem,
  BankMutation,
  ReconciliationLink,
  DepositReturn,
  SenderRegistry,
};