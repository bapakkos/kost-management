const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const sequelize = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/room-types', require('./routes/roomTypes'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/tenants', require('./routes/tenants'));
app.use('/api/price-schemes', require('./routes/priceSchemes'));
app.use('/api', require('./routes/bankAccounts'));
app.use('/api/main-page', require('./routes/mainPage'));
app.use('/api/contracts', require('./routes/contracts'));
app.use('/api/monthly-billings', require('./routes/monthlyBillings'));
app.use('/api/non-monthly-incomes', require('./routes/nonMonthlyIncomes'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/bank-mutations', require('./routes/bankMutations'));
app.use('/api/reconcile', require('./routes/reconciliation'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/sender-registry', require('./routes/senderRegistry'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

sequelize.query('PRAGMA foreign_keys = ON').then(() => sequelize.sync({ force: false })).then(() => {
  console.log('Database synced');
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Database sync failed:', err);
});

module.exports = app;