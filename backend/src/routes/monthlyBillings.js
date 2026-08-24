const router = require('express').Router();
const ctrl = require('../controllers/monthlyBillingController');
const { auth } = require('../middleware/auth');

router.get('/outstanding', auth, ctrl.getOutstanding);
router.get('/summary', auth, ctrl.getSummary);
router.post('/generate', auth, ctrl.generate);
router.post('/generate-bulk', auth, ctrl.generateBulk);
router.get('/contracts/:contractId/billings', auth, ctrl.getByContract);
router.post('/contracts/:contractId/billings', auth, ctrl.create);
router.get('/', auth, ctrl.getAll);
router.get('/:id', auth, ctrl.getById);
router.put('/:id', auth, ctrl.update);
router.post('/:id/mark-paid', auth, ctrl.markPaid);

module.exports = router;