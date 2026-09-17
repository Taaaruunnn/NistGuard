const express = require('express');
const router = express.Router();
const {
  getFunctions,
  getCategories,
  getSubcategories,
  getCore,
  getMeta,
} = require('../controllers/nistController');

router.get('/functions', getFunctions);
router.get('/categories', getCategories);
router.get('/subcategories', getSubcategories);
router.get('/core', getCore);
router.get('/meta', getMeta);

module.exports = router;
