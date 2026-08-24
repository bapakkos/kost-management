const { RentalContract, DepositReturn, NonMonthlyIncome, ReconciliationLink, BankMutation, Tenant, Room } = require('../models');

exports.depositReturn = async (req, res) => {
  try {
    const contract = await RentalContract.findByPk(req.params.id, { include: [Tenant, Room] });
    if (!contract) return res.status(404).json({ error: 'Contract not found' });

    const { amount, return_date, mutation_ids, notes } = req.body;
    if (!amount || !return_date) return res.status(400).json({ error: 'amount and return_date are required' });

    const depositReturn = await DepositReturn.create({
      rental_contract_id: contract.id,
      amount,
      return_date,
      notes: notes || null,
      created_by: req.user.id,
    });

    if (mutation_ids && mutation_ids.length > 0) {
      for (const mid of mutation_ids) {
        await ReconciliationLink.create({
          bank_mutation_id: mid,
          target_type: 'deposit_return',
          target_id: depositReturn.id,
        });
        const mutation = await BankMutation.findByPk(mid);
        if (mutation) {
          mutation.is_reconciled = true;
          await mutation.save();
        }
      }
    }

    await contract.update({ deposit_status: 'returned' });

    res.status(201).json({ depositReturn, contract });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.depositForfeit = async (req, res) => {
  try {
    const contract = await RentalContract.findByPk(req.params.id, { include: [Tenant, Room] });
    if (!contract) return res.status(404).json({ error: 'Contract not found' });

    const forfeitIncome = await NonMonthlyIncome.create({
      tenant_id: contract.tenant_id,
      room_id: contract.room_id,
      rental_contract_id: contract.id,
      category: 'deposit_hangus',
      description: `Deposit hangus kontrak #${contract.id}`,
      unit_price: contract.deposit_amount || 0,
      quantity: 1,
      total_amount: contract.deposit_amount || 0,
      transaction_date: new Date().toISOString().slice(0, 10),
      is_paid: true,
      paid_date: new Date().toISOString().slice(0, 10),
      is_revenue: true,
    });

    await contract.update({ deposit_status: 'forfeited' });

    res.status(201).json({ forfeitIncome, contract });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};