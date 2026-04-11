const express = require('express');
const router = express.Router();
const { getCategories, createCategory, deleteCategory } = require('../Controllers/CategoryController');
const { protect } = require('../Middleware/authMiddleware');
const { adminMiddleware } = require('../Middleware/AdminMiddleware');  // ← Remove .default

router.get('/', getCategories);
router.post('/', protect, adminMiddleware, createCategory);
router.delete('/:id', protect, adminMiddleware, deleteCategory);

module.exports = router;