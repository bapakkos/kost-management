const router = require('express').Router();
const ctrl = require('../controllers/senderRegistryController');
const { auth } = require('../middleware/auth');

router.post('/', auth, ctrl.create);
router.get('/', auth, ctrl.getAll);
router.post('/suggest', auth, ctrl.suggest);
router.post('/auto-link', auth, ctrl.autoLink);
router.post('/import-mapping', auth, ctrl.importMapping);
router.put('/:id', auth, ctrl.update);
router.post('/bulk-map', auth, ctrl.bulkMap);

module.exports = router;