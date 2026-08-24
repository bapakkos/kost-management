const router = require('express').Router();
const ctrl = require('../controllers/reconciliationController');
const { auth } = require('../middleware/auth');

router.post('/', auth, ctrl.reconcile);

module.exports = router;