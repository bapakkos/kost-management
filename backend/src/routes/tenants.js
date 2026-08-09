const router = require('express').Router();
const ctrl = require('../controllers/tenantController');
const { auth, adminOnly } = require('../middleware/auth');

router.get('/', auth, ctrl.getAll);
router.get('/:id', auth, ctrl.getById);
router.post('/', auth, ctrl.create);
router.put('/:id', auth, ctrl.update);
router.delete('/:id', auth, adminOnly, ctrl.remove);
router.get('/:id/contracts', auth, ctrl.getContracts);
router.get('/:id/billings', auth, ctrl.getBillings);
router.get('/:id/payments', auth, ctrl.getPayments);

module.exports = router;