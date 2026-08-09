const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const sequelize = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Sync database and start server
sequelize.sync({ force: false }).then(() => {
  console.log('Database synced');
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Database sync failed:', err);
});

module.exports = app;