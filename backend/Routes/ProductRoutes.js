const express = require('express');
const multer = require('multer');
const router = express.Router();
const { getProducts, getProduct, createProduct, updateProduct, deleteProduct, createProductReview } = require('../Controllers/ProductController');
const { protect } = require('../Middleware/authMiddleware');
const { adminMiddleware } = require('../Middleware/AdminMiddleware');  // ← No .default
const upload = require('../Middleware/uploadMiddleware');

const uploadProductImages = (req, res, next) => {
	upload.fields([
		{ name: 'images', maxCount: 20 },
		{ name: 'image', maxCount: 1 }
	])(req, res, (err) => {
		if (!err) return next();

		if (err instanceof multer.MulterError) {
			return res.status(400).json({ success: false, error: err.message });
		}

		return res.status(400).json({ success: false, error: err.message || 'Upload failed' });
	});
};

router.get('/', getProducts);
router.get('/:id', getProduct);
router.post(
	'/',
	protect,
	adminMiddleware,
	uploadProductImages,
	createProduct
);
router.put(
	'/:id',
	protect,
	adminMiddleware,
	uploadProductImages,
	updateProduct
);
router.delete('/:id', protect, adminMiddleware, deleteProduct);
router.post('/:id/reviews', protect, createProductReview);

module.exports = router;