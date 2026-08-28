const router = require('express').Router();
const ctrl = require('../controllers/reportsController');
const { auth } = require('../middleware/auth');

router.get('/monthly-revenue', auth, ctrl.getMonthlyRevenue);
router.get('/yearly-revenue', auth, ctrl.getYearlyRevenue);
router.get('/deposits', auth, ctrl.getDepositLiability);
router.get('/invoice/:type/:id/pdf', auth, ctrl.getInvoicePDF);

module.exports = router;