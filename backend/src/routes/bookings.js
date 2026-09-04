const router = require('express').Router();
const ctrl = require('../controllers/bookingController');
const { auth } = require('../middleware/auth');

router.get('/', auth, ctrl.getAll);
router.get('/:id', auth, ctrl.getById);
router.post('/', auth, ctrl.create);
router.post('/:id/convert', auth, ctrl.convert);
router.post('/:id/refund', auth, ctrl.refund);
router.delete('/:id', auth, ctrl.remove);

module.exports = router;
