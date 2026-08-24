const router = require('express').Router();
const ctrl = require('../controllers/bankMutationController');
const { auth, adminOnly } = require('../middleware/auth');

router.get('/unreconciled', auth, ctrl.getUnreconciled);
router.get('/reconciled', auth, ctrl.getReconciled);
router.get('/auto-match', auth, ctrl.autoMatch);
router.post('/import-csv', auth, ctrl.importCsv);
router.put('/:id/category', auth, ctrl.updateCategory);
router.get('/', auth, ctrl.getAll);
router.get('/:id', auth, ctrl.getById);
router.post('/', auth, ctrl.create);
router.put('/:id', auth, ctrl.update);
router.delete('/:id', auth, adminOnly, ctrl.remove);

module.exports = router;