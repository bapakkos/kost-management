const router = require('express').Router();
const ctrl = require('../controllers/nonMonthlyIncomeController');
const { auth, adminOnly } = require('../middleware/auth');

router.get('/summary', auth, ctrl.getSummary);
router.get('/', auth, ctrl.getAll);
router.get('/:id', auth, ctrl.getById);
router.post('/', auth, ctrl.create);
router.put('/:id', auth, ctrl.update);
router.delete('/:id', auth, adminOnly, ctrl.remove);

module.exports = router;