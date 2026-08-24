const router = require('express').Router();
const ctrl = require('../controllers/senderRegistryController');
const { auth } = require('../middleware/auth');

router.get('/', auth, ctrl.getAll);
router.put('/:id', auth, ctrl.update);
router.post('/bulk-map', auth, ctrl.bulkMap);

module.exports = router;