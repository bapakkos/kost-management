const router = require('express').Router();
const ctrl = require('../controllers/reconciliationController');
const { auth, adminOnly } = require('../middleware/auth');

router.post('/', auth, ctrl.reconcile);
router.post('/undo', auth, adminOnly, ctrl.undo);

module.exports = router;