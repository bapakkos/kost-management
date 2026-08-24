const router = require('express').Router();
const ctrl = require('../controllers/rentalContractController');
const depositCtrl = require('../controllers/depositController');
const { auth, adminOnly } = require('../middleware/auth');

router.get('/active', auth, ctrl.getActive);
router.get('/bookings', auth, ctrl.getBookings);
router.get('/room/:roomId', auth, ctrl.getByRoom);
router.get('/tenant/:tenantId', auth, ctrl.getByTenant);
router.post('/:id/deposit-return', auth, depositCtrl.depositReturn);
router.post('/:id/deposit-forfeit', auth, depositCtrl.depositForfeit);
router.get('/', auth, ctrl.getAll);
router.get('/:id', auth, ctrl.getById);
router.post('/', auth, ctrl.create);
router.put('/:id', auth, ctrl.update);
router.delete('/:id', auth, adminOnly, ctrl.remove);

module.exports = router;