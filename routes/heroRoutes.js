const express = require('express');
const { getActiveHeros, createHero, updateHero, deleteHero } = require('../controllers/heroController');
const router = express.Router();

router.get('/', getActiveHeros);
router.post('/', createHero);
router.put('/:id', updateHero);
router.delete('/:id', deleteHero);

module.exports = router;

