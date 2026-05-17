const express = require('express');
const router = express.Router();
const { getCategories, createCategory, updateCategory, deleteCategory } = require('../Controllers/CategoryController');
const upload = require('../Middleware/uploadMiddleware');
const { protect } = require('../Middleware/authMiddleware');
const { adminMiddleware } = require('../Middleware/AdminMiddleware');  // ← Remove .default

router.get('/', getCategories);
router.post('/', protect, adminMiddleware, upload.single('imageFile'), createCategory);
router.put('/:id', protect, adminMiddleware, upload.single('imageFile'), updateCategory);
router.delete('/:id', protect, adminMiddleware, deleteCategory);

module.exports = router;