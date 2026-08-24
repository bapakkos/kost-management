const router = require('express').Router();
const ctrl = require('../controllers/paymentController');
const { auth } = require('../middleware/auth');

router.get('/month/:month/:year', auth, ctrl.getByMonth);
router.get('/receipt/:id/pdf', auth, ctrl.getReceiptPDF);
router.get('/', auth, ctrl.getAll);
router.get('/:id', auth, ctrl.getById);

module.exports = router;