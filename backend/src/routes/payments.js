const router = require('express').Router();
const ctrl = require('../controllers/paymentController');
const { auth } = require('../middleware/auth');

router.get('/summary', auth, ctrl.getSummary);
router.get('/month/:month/:year', auth, ctrl.getByMonth);
router.get('/tenant/:tenantId', auth, ctrl.getByTenant);
router.get('/room/:roomId', auth, ctrl.getByRoom);
router.get('/', auth, ctrl.getAll);
router.get('/:id', auth, ctrl.getById);
router.post('/', auth, ctrl.create);

module.exports = router;