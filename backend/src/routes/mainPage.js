const router = require('express').Router();
const ctrl = require('../controllers/mainPageController');
const { auth } = require('../middleware/auth');

router.get('/bookings', auth, ctrl.getBookings);
router.get('/:month/:year', auth, ctrl.getMonthView);
router.post('/:month/:year/generate-billings', auth, ctrl.generateBillings);

module.exports = router;