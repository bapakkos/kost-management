const router = require('express').Router();
const ctrl = require('../controllers/bankAccountController');
const { auth, adminOnly } = require('../middleware/auth');

router.get('/tenants/:tenantId/bank-accounts', auth, ctrl.getAll);
router.post('/tenants/:tenantId/bank-accounts', auth, ctrl.create);
router.put('/bank-accounts/:id', auth, ctrl.update);
router.delete('/bank-accounts/:id', auth, adminOnly, ctrl.remove);

module.exports = router;