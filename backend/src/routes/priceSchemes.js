const router = require('express').Router();
const ctrl = require('../controllers/priceSchemeController');
const { auth, adminOnly } = require('../middleware/auth');

router.get('/', auth, ctrl.getAll);
router.get('/:id', auth, ctrl.getById);
router.post('/', auth, adminOnly, ctrl.create);
router.put('/:id', auth, adminOnly, ctrl.update);
router.delete('/:id', auth, adminOnly, ctrl.remove);
router.get('/:id/rates', auth, ctrl.getRates);
router.post('/:id/rates', auth, adminOnly, ctrl.addRate);

module.exports = router;