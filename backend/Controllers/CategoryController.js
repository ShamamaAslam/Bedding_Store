const Category = require('../Models/Categories');

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');

const getUploadedImagePath = (req) => {
  if (req?.file?.filename) return `/uploads/${req.file.filename}`;
  return '';
};

const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true });
    res.json({ success: true, count: categories.length, categories });
  } catch (error) {
    console.error('CategoryController.getCategories error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

const createCategory = async (req, res) => {
  try {
    const uploadedImage = getUploadedImagePath(req);
    const imageFromBody = normalizeText(req.body?.image);

    const category = await Category.create({
      name: normalizeText(req.body?.name),
      description: normalizeText(req.body?.description),
      image: uploadedImage || imageFromBody
    });
    res.status(201).json({ success: true, category });
  } catch (error) {
    console.error('CategoryController.createCategory error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

const updateCategory = async (req, res) => {
  try {
    const updates = {};
    if (typeof req.body.name === 'string') updates.name = normalizeText(req.body.name);
    if (typeof req.body.description === 'string') updates.description = normalizeText(req.body.description);
    if (typeof req.body.image === 'string') updates.image = normalizeText(req.body.image);

    const uploadedImage = getUploadedImagePath(req);
    if (uploadedImage) updates.image = uploadedImage;

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, category });
  } catch (error) {
    console.error('CategoryController.updateCategory error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    console.error('CategoryController.deleteCategory error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };