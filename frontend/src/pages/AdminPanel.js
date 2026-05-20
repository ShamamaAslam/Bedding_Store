import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getProductImage, makeAbsoluteUrl } from '../utils/productImage';
import { clearStoreSale, getStoreSalePercent, setStoreSalePercent } from '../utils/pricing';
import {
  getProducts, createProduct, updateProduct, deleteProduct,
  getCategories, createCategory, updateCategory, deleteCategory,
  getAllOrders, updateOrderStatus,
  getAllUsers, updateUserRole,
  updatePassword,
  assistantSeo,
  getAnalytics
} from '../services/api';

// ── Helpers ───────────────────────────────────────────────────────────────────
const getCatIcon = (name = '') => {
  const icons = { Bedsheets: '🛏️', Blankets: '🧣', Curtains: '🪟', 'Pillow Covers': '🛋️', 'Sofa Covers': '🪑', Fabrics: '🧵' };
  return icons[name] || '🛍️';
};

const ORDER_STATUSES = ['Processing', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];
const FABRIC_TYPE_PRESETS = ['Cotton', 'Silk', 'Linen', 'Polyester', 'Wool', 'Blend', 'Other'];
const SHADE_PRESETS = ['light', 'dark'];

const statusColor = { Processing: '#f0ad4e', Confirmed: '#5bc0de', Shipped: '#9b59b6', Delivered: '#2ecc71', Cancelled: '#e74c3c' };

const normalizeColorName = (value = '') => value.trim().replace(/\s+/g, ' ');

const toExistingImageEntries = (images = [], fallbackAlt = 'Product image') => {
  if (!Array.isArray(images)) return [];

  return images
    .map((image) => {
      if (!image || typeof image !== 'object') return null;
      const url = typeof image.url === 'string' ? image.url.trim() : '';
      if (!url) return null;

      return {
        url,
        alt: (typeof image.alt === 'string' && image.alt.trim()) ? image.alt.trim() : fallbackAlt,
        color: (typeof image.color === 'string') ? image.color.trim() : ''
      };
    })
    .filter(Boolean);
};

const createSelectedImageItem = (file, color = '') => ({
  id: `${Date.now()}-${Math.round(Math.random() * 1e9)}`,
  file,
  color,
  previewUrl: URL.createObjectURL(file)
});

const reorderItems = (items, fromIndex, toIndex) => {
  if (!Array.isArray(items)) return [];
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length) {
    return items;
  }

  const cloned = [...items];
  const [moved] = cloned.splice(fromIndex, 1);
  cloned.splice(toIndex, 0, moved);
  return cloned;
};

const getApiErrorText = (err) => (
  err?.response?.data?.error
  || err?.response?.data?.message
  || err?.message
  || 'Request failed'
);

const normalizePercent = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(90, Math.max(0, Math.round(parsed)));
};

const discountedPrice = (price, percent) => {
  const base = Number(price || 0);
  const pct = normalizePercent(percent);
  return Math.max(0, Math.round(base - (base * pct) / 100));
};

// ── Empty product form ────────────────────────────────────────────────────────
const createEmptyProduct = () => ({
  name: '', description: '', price: '', discountPrice: '',
  stock: '', fabricType: 'Cotton', category: '',
  costPrice: '', shippingCost: '', marketingCost: '',
  supplierName: '', supplierAvgDeliveryDays: '', supplierQualityScore: '',
  shadeCategories: [],
  sizes: '',
  // SEO
  slug: '', metaTitle: '', metaDescription: '', metaKeywords: ''
});

const normalizeSizeName = (value = '') => value.trim().replace(/\s+/g, ' ');

const parseSizeNames = (value = '') => (
  String(value)
    .split(',')
    .map(normalizeSizeName)
    .filter(Boolean)
);

const buildSizePriceDraft = (product) => {
  const sizeNames = Array.isArray(product?.sizes) && product.sizes.length > 0
    ? product.sizes.map(normalizeSizeName).filter(Boolean)
    : parseSizeNames(product?.sizes || '');
  const priceMap = new Map(
    (Array.isArray(product?.sizePrices) ? product.sizePrices : [])
      .map((entry) => [normalizeSizeName(entry?.size), entry?.price])
      .filter(([size]) => Boolean(size))
  );

  return sizeNames.map((size) => ({
    size,
    price: priceMap.has(size) && priceMap.get(size) !== undefined && priceMap.get(size) !== null
      ? String(priceMap.get(size))
      : ''
  }));
};

const buildProductDraft = (product, { duplicate = false } = {}) => {
  const baseName = product?.name || '';
  const nextName = duplicate && baseName ? `${baseName} (Copy)` : baseName;

  return {
    name: nextName,
    description: product?.description || '',
    price: product?.price || '',
    discountPrice: product?.discountPrice || '',
    stock: product?.stock || '',
    fabricType: product?.fabricType || 'Cotton',
    costPrice: product?.costPrice || '',
    shippingCost: product?.shippingCost || '',
    marketingCost: product?.marketingCost || '',
    supplierName: product?.supplier?.name || '',
    supplierAvgDeliveryDays: product?.supplier?.avgDeliveryDays || '',
    supplierQualityScore: product?.supplier?.qualityScore || '',
    category: product?.category?._id || '',
    shadeCategories: Array.isArray(product?.shadeCategories) ? product.shadeCategories : [],
    sizes: product?.sizes?.join(', ') || '',
    slug: duplicate ? '' : (product?.slug || ''),
    metaTitle: duplicate ? '' : (product?.metaTitle || ''),
    metaDescription: duplicate ? '' : (product?.metaDescription || ''),
    metaKeywords: duplicate ? '' : (product?.metaKeywords?.join(', ') || '')
  };
};

// ═════════════════════════════════════════════════════════════════════════════
const AdminPanel = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState(createEmptyProduct());
  const [sizePrices, setSizePrices] = useState([]);
  const [colorVariants, setColorVariants] = useState([]);
  const [newColorName, setNewColorName] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [fileInputVersion, setFileInputVersion] = useState(0);
  const [customFabricType, setCustomFabricType] = useState('');
  const [dragState, setDragState] = useState({ list: '', index: -1 });
  const [storeSalePercent, setStoreSalePercentState] = useState(() => getStoreSalePercent());
  const [discountDialog, setDiscountDialog] = useState({ open: false, mode: 'apply' });
  const [discountScope, setDiscountScope] = useState('all');
  const [selectedDiscountProductIds, setSelectedDiscountProductIds] = useState([]);
  const [discountBusy, setDiscountBusy] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [productShadeFilter, setProductShadeFilter] = useState('all');
  const [productStockFilter, setProductStockFilter] = useState('all');
  const [seoSuggestions, setSeoSuggestions] = useState(null);
  const [seoLoading, setSeoLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const [newCategory, setNewCategory] = useState({ name: '', description: '', image: '' });
  const [newCategoryImageFile, setNewCategoryImageFile] = useState(null);
  const [quickCategoryName, setQuickCategoryName] = useState('');
  const [msg, setMsg] = useState({ text: '', type: 'success' });

  // ── Change Password State ────────────────────────────────
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      flash('❌ New passwords do not match', 'error');
      return;
    }
    setPasswordLoading(true);
    try {
      await updatePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      flash('✅ Password updated successfully!');
      setShowPasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswords(false);
    } catch (err) {
      flash('❌ ' + getApiErrorText(err), 'error');
    } finally {
      setPasswordLoading(false);
    }
  };

  const resolveCategoryPreviewSrc = (raw) => {
    const value = typeof raw === 'string' ? raw.trim() : '';
    if (!value) return '';
    if (value.startsWith('/uploads/') || value.startsWith('uploads/') || value.startsWith('http://') || value.startsWith('https://')) {
      return makeAbsoluteUrl(value);
    }
    return value;
  };

  const buildCategoryPayload = ({ name, description, image, imageFile }) => {
    const hasFile = imageFile instanceof File;
    if (!hasFile) {
      return {
        name: (name || '').trim(),
        description: (description || '').trim(),
        image: (image || '').trim()
      };
    }

    const payload = new FormData();
    payload.append('name', (name || '').trim());
    payload.append('description', (description || '').trim());
    payload.append('image', (image || '').trim());
    payload.append('imageFile', imageFile);
    return payload;
  };

  // ── Data loading ────────────────────────────────────────
  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg({ text: '', type: 'success' }), 3500); };

  const loadProducts = async () => { const r = await getProducts(); setProducts(r.data.products); };
  const loadCategories = async () => { const r = await getCategories(); setCategories(r.data.categories); };
  const loadOrders = async () => { const r = await getAllOrders(); setOrders(r.data.orders); };
  const loadUsers = async () => { const r = await getAllUsers(); setUsers(r.data.users); };

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  useEffect(() => {
    if (tab === 'orders') loadOrders();
    if (tab === 'users') loadUsers();
    if (tab === 'analytics') loadAnalytics();
  }, [tab]);

  const loadAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const res = await getAnalytics();
      if (res?.data?.success) setAnalyticsData(res.data);
    } catch (err) {
      console.error('Analytics load error:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    const syncSale = () => setStoreSalePercentState(getStoreSalePercent());
    window.addEventListener('storage', syncSale);
    return () => window.removeEventListener('storage', syncSale);
  }, []);

  useEffect(() => {
    return () => {
      selectedImages.forEach(item => {
        if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, [selectedImages]);

  useEffect(() => {
    const validIds = new Set(products.map(item => item._id));
    setSelectedDiscountProductIds(prev => prev.filter(id => validIds.has(id)));
  }, [products]);

  useEffect(() => {
    const sizeNames = parseSizeNames(productForm.sizes);
    setSizePrices((prev) => {
      const previousMap = new Map(prev.map((item) => [normalizeSizeName(item.size), item.price]));

      return sizeNames.map((size) => ({
        size,
        price: previousMap.has(size) ? previousMap.get(size) : ''
      }));
    });
  }, [productForm.sizes]);

  // ── Product handlers ────────────────────────────────────
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = new FormData();
      data.append('name', productForm.name);
      data.append('description', productForm.description);
      data.append('category', productForm.category);
      data.append('price', productForm.price);
      data.append('stock', productForm.stock);
      data.append('fabricType', productForm.fabricType);
      data.append('costPrice', productForm.costPrice || 0);
      data.append('shippingCost', productForm.shippingCost || 0);
      data.append('marketingCost', productForm.marketingCost || 0);
      data.append('supplierName', productForm.supplierName || '');
      data.append('supplierAvgDeliveryDays', productForm.supplierAvgDeliveryDays || 0);
      data.append('supplierQualityScore', productForm.supplierQualityScore || 0);
      data.append('shadeCategories', JSON.stringify(Array.isArray(productForm.shadeCategories) ? productForm.shadeCategories : []));

      if (productForm.slug.trim()) data.append('slug', productForm.slug.trim());
      if (productForm.metaTitle.trim()) data.append('metaTitle', productForm.metaTitle.trim());
      if (productForm.metaDescription.trim()) data.append('metaDescription', productForm.metaDescription.trim());

      const normalizedDiscountPrice = String(productForm.discountPrice ?? '').trim();
      if (editingProduct || normalizedDiscountPrice !== '') {
        data.append('discountPrice', normalizedDiscountPrice);
      }

      data.append('colors', JSON.stringify(colorVariants.map(variant => variant.name)));
      data.append('sizes', JSON.stringify(productForm.sizes.split(',').map(s => s.trim()).filter(Boolean)));
      if (editingProduct || sizePrices.length > 0) {
        data.append('sizePrices', JSON.stringify(sizePrices.filter(item => item.size && item.price !== '')));
      }
      data.append('metaKeywords', JSON.stringify(productForm.metaKeywords.split(',').map(s => s.trim()).filter(Boolean)));

      if (editingProduct || existingImages.length > 0) {
        data.append('existingImages', JSON.stringify(existingImages));
      }

      const filesToUpload = selectedImages.map(item => item.file);
      const imageColors = selectedImages.map(item => item.color || '');

      if (filesToUpload.length > 0) {
        filesToUpload.forEach((file) => data.append('images', file));
        if (imageColors.some(Boolean)) {
          data.append('imageColors', JSON.stringify(imageColors));
        }
      }

      let savedProduct = null;

      if (editingProduct) {
        const response = await updateProduct(editingProduct._id, data);
        savedProduct = response?.data?.product || null;
        flash('✅ Product updated!');
      } else {
        const response = await createProduct(data);
        savedProduct = response?.data?.product || null;
        flash('✅ Product created!');
      }

      try {
        await loadProducts();
      } catch (_) {
        if (savedProduct) {
          setProducts(prev => {
            if (editingProduct) {
              return prev.map(item => item._id === savedProduct._id ? savedProduct : item);
            }
            return [savedProduct, ...prev];
          });
        }
      }

      setShowProductForm(false);
      setEditingProduct(null);
      setProductForm(createEmptyProduct());
      setSizePrices([]);
      setColorVariants([]);
      setNewColorName('');
      setSelectedImages([]);
      setExistingImages([]);
      setCustomFabricType('');
      setFileInputVersion(v => v + 1);
    } catch (err) {
      console.error('Product save failed:', err?.response?.data || err);
      flash('❌ ' + getApiErrorText(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (p) => {
    setEditingProduct(p);
    setSelectedImages([]);
    setFileInputVersion(v => v + 1);
    setCustomFabricType('');
    setExistingImages(toExistingImageEntries(p.images, p.name || 'Product image'));
    setColorVariants((Array.isArray(p.colors) ? p.colors : [])
      .map(normalizeColorName)
      .filter(Boolean)
      .map((name) => ({ id: `${Date.now()}-${Math.round(Math.random() * 1e9)}`, name })));
    setNewColorName('');
    setSizePrices(buildSizePriceDraft(p));
    setProductForm(buildProductDraft(p));
    setShowProductForm(true);
    setTab('products');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDuplicate = (p) => {
    setEditingProduct(null);
    setSelectedImages([]);
    setFileInputVersion(v => v + 1);
    setCustomFabricType('');
    setExistingImages(toExistingImageEntries(p.images, p.name || 'Product image'));
    setColorVariants((Array.isArray(p.colors) ? p.colors : [])
      .map(normalizeColorName)
      .filter(Boolean)
      .map((name) => ({ id: `${Date.now()}-${Math.round(Math.random() * 1e9)}`, name })));
    setNewColorName('');
    setSizePrices(buildSizePriceDraft(p));
    setProductForm(buildProductDraft(p, { duplicate: true }));
    setShowProductForm(true);
    setTab('products');
    flash(`✅ Duplicated ${p.name}. Review details and publish as a new product.`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    await deleteProduct(id);
    flash('🗑️ Product deleted');
    loadProducts();
  };

  const addColorVariant = () => {
    const name = normalizeColorName(newColorName);
    if (!name) return;

    const exists = colorVariants.some(item => item.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      flash('Color already exists in this product', 'error');
      return;
    }

    setColorVariants(prev => [...prev, { id: `${Date.now()}-${Math.round(Math.random() * 1e9)}`, name }]);
    setNewColorName('');
  };

  const renameColorVariant = (variantId, nextNameRaw) => {
    const nextName = normalizeColorName(nextNameRaw);
    const currentVariant = colorVariants.find(item => item.id === variantId);
    if (!currentVariant) return;

    if (!nextName) {
      setColorVariants(prev => prev.map(item => item.id === variantId ? { ...item, name: '' } : item));
      return;
    }

    const duplicate = colorVariants.some(item => item.id !== variantId && item.name.toLowerCase() === nextName.toLowerCase());
    if (duplicate) return;

    const oldName = currentVariant.name;
    setColorVariants(prev => prev.map(item => item.id === variantId ? { ...item, name: nextName } : item));
    setSelectedImages(prev => prev.map(item => ((item.color || '').toLowerCase() === oldName.toLowerCase() ? { ...item, color: nextName } : item)));
    setExistingImages(prev => prev.map(item => ((item.color || '').toLowerCase() === oldName.toLowerCase() ? { ...item, color: nextName } : item)));
  };

  const removeColorVariant = (variantId) => {
    const target = colorVariants.find(item => item.id === variantId);
    if (!target) return;

    const targetNameLower = target.name.toLowerCase();
    setColorVariants(prev => prev.filter(item => item.id !== variantId));
    setSelectedImages(prev => prev.map(item => ((item.color || '').toLowerCase() === targetNameLower ? { ...item, color: '' } : item)));
    setExistingImages(prev => prev.map(item => ((item.color || '').toLowerCase() === targetNameLower ? { ...item, color: '' } : item)));
  };

  const addSelectedFiles = (files, color = '') => {
    const nextFiles = Array.from(files || []);
    if (nextFiles.length === 0) return;

    setSelectedImages(prev => [
      ...prev,
      ...nextFiles.map(file => createSelectedImageItem(file, color))
    ]);
  };

  const removeSelectedImage = (id) => {
    setSelectedImages(prev => {
      const target = prev.find(item => item.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter(item => item.id !== id);
    });
  };

  const removeExistingImage = (index) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragStart = (list, index) => {
    setDragState({ list, index });
  };

  const handleDragOver = (list, hoverIndex, event) => {
    event.preventDefault();

    if (dragState.list !== list) return;
    if (dragState.index === hoverIndex) return;

    if (list === 'existing') {
      setExistingImages(prev => reorderItems(prev, dragState.index, hoverIndex));
    }

    if (list === 'selected') {
      setSelectedImages(prev => reorderItems(prev, dragState.index, hoverIndex));
    }

    setDragState({ list, index: hoverIndex });
  };

  const handleDragEnd = () => {
    setDragState({ list: '', index: -1 });
  };

  // ── Category handlers ───────────────────────────────────
  const handleAddCategory = async (e) => {
    e.preventDefault();
    try {
      const payload = buildCategoryPayload({ ...newCategory, imageFile: newCategoryImageFile });
      await createCategory(payload);
      flash('✅ Category added!');
      setNewCategory({ name: '', description: '', image: '' });
      setNewCategoryImageFile(null);
      loadCategories();
    } catch (err) {
      flash('❌ ' + (err.response?.data?.error || err.message), 'error');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Delete this category?')) return;
    await deleteCategory(id);
    flash('🗑️ Category deleted');
    loadCategories();
  };

  const handleUpdateCategoryImage = async (category) => {
    const currentImage = typeof category?.image === 'string' ? category.image : '';
    const nextImage = window.prompt('Enter category image URL (leave empty to remove):', currentImage || '');
    if (nextImage === null) return;

    try {
      await updateCategory(category._id, { image: nextImage.trim() });
      flash('🖼️ Category image updated');
      await loadCategories();
    } catch (err) {
      flash('❌ ' + (err.response?.data?.error || err.response?.data?.message || err.message), 'error');
    }
  };

  const handleUpdateCategoryImageFile = async (category, file) => {
    if (!file) return;

    try {
      const payload = new FormData();
      payload.append('imageFile', file);
      await updateCategory(category._id, payload);
      flash('🖼️ Category image uploaded');
      await loadCategories();
    } catch (err) {
      flash('❌ ' + (err.response?.data?.error || err.response?.data?.message || err.message), 'error');
    }
  };

  const handleQuickAddCategory = async () => {
    const name = quickCategoryName.trim();
    if (!name) {
      flash('❌ Please enter a category name', 'error');
      return;
    }

    try {
      const response = await createCategory({ name });
      const createdCategory = response?.data?.category;

      if (createdCategory?._id) {
        setProductForm(prev => ({ ...prev, category: createdCategory._id }));
      }

      setQuickCategoryName('');
      flash('✅ Category added and selected');
      await loadCategories();
    } catch (err) {
      flash('❌ ' + (err.response?.data?.error || err.response?.data?.message || err.message), 'error');
    }
  };

  const handleQuickAddFabricType = () => {
    const name = normalizeColorName(customFabricType);
    if (!name) {
      flash('❌ Please enter a fabric type', 'error');
      return;
    }

    setProductForm(prev => ({ ...prev, fabricType: name }));
    setCustomFabricType('');
    flash('✅ Fabric type selected');
  };

  // ── Order handlers ──────────────────────────────────────
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, { orderStatus: newStatus });
      flash('✅ Order status updated');
      loadOrders();
    } catch (err) {
      flash('❌ Failed to update status', 'error');
    }
  };

  // ── User handlers ───────────────────────────────────────
  const handleRoleChange = async (userId, newRole) => {
    if (!window.confirm(`Change this user to ${newRole}?`)) return;
    try {
      await updateUserRole(userId, { role: newRole });
      flash('✅ User role updated');
      loadUsers();
    } catch (err) {
      flash('❌ Failed to update role', 'error');
    }
  };

  const handleToggleActive = async (userId, isActive) => {
    try {
      await updateUserRole(userId, { isActive: !isActive });
      flash(`✅ User ${!isActive ? 'activated' : 'deactivated'}`);
      loadUsers();
    } catch (err) {
      flash('❌ Failed to update user', 'error');
    }
  };

  // ── Render ──────────────────────────────────────────────
  const pf = (k) => (e) => setProductForm({ ...productForm, [k]: e.target.value });
  const colorList = colorVariants.map(variant => normalizeColorName(variant.name)).filter(Boolean);
  const fabricTypeOptions = Array.from(new Set([
    ...FABRIC_TYPE_PRESETS,
    ...products.map(item => normalizeColorName(item?.fabricType || '')).filter(Boolean),
    normalizeColorName(productForm.fabricType || '')
  ].filter(Boolean)));
  const getSelectedColorImageCount = (color) => selectedImages.filter(image => (image.color || '').toLowerCase() === color.toLowerCase()).length;

  const handleStoreSaleChange = (e) => {
    const nextValue = e.target.value;
    setStoreSalePercentState(nextValue);
  };

  const openDiscountDialog = (mode) => {
    setDiscountDialog({ open: true, mode });
    setDiscountScope('all');
  };

  const closeDiscountDialog = () => {
    if (discountBusy) return;
    setDiscountDialog({ open: false, mode: 'apply' });
  };

  const toggleDiscountProductSelection = (id) => {
    setSelectedDiscountProductIds(prev => (
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    ));
  };

  const selectAllDiscountProducts = () => {
    setSelectedDiscountProductIds(products.map(item => item._id));
  };

  const clearDiscountSelection = () => {
    setSelectedDiscountProductIds([]);
  };

  const runDiscountAction = async () => {
    const isApply = discountDialog.mode === 'apply';
    const isAll = discountScope === 'all';
    const selectedProducts = products.filter(item => selectedDiscountProductIds.includes(item._id));
    const targets = isAll ? products : selectedProducts;

    if (targets.length === 0) {
      flash('❌ Please select at least one product', 'error');
      return;
    }

    const percent = normalizePercent(storeSalePercent);
    if (isApply && percent <= 0) {
      flash('❌ Enter a discount percent greater than 0', 'error');
      return;
    }

    setDiscountBusy(true);
    try {
      if (isApply && isAll) {
        const normalized = setStoreSalePercent(percent);
        setStoreSalePercentState(normalized);
      }

      if (!isApply && isAll) {
        clearStoreSale();
        setStoreSalePercentState(0);
      }

      for (const product of targets) {
        if (isApply) {
          await updateProduct(product._id, { discountPrice: discountedPrice(product.price, percent) });
        } else {
          await updateProduct(product._id, { discountPrice: '' });
        }
      }

      await loadProducts();

      if (isApply) {
        flash(`✅ ${isAll ? 'All products' : `${targets.length} selected products`} discounted by ${percent}%`);
      } else {
        flash(`✅ Discount cleared from ${isAll ? 'all products' : `${targets.length} selected products`}`);
      }

      setDiscountDialog({ open: false, mode: 'apply' });
    } catch (err) {
      flash('❌ ' + getApiErrorText(err), 'error');
    } finally {
      setDiscountBusy(false);
    }
  };

  const clearProductDiscountPrices = async ({ applyToAll }) => {
    const targets = applyToAll
      ? products
      : products.filter(item => selectedDiscountProductIds.includes(item._id));

    if (targets.length === 0) {
      flash('❌ Please select at least one product', 'error');
      return;
    }

    const confirmText = applyToAll
      ? `Clear discount price for all ${targets.length} products?`
      : `Clear discount price for ${targets.length} selected products?`;

    if (!window.confirm(confirmText)) return;

    setDiscountBusy(true);
    try {
      for (const product of targets) {
        await updateProduct(product._id, { discountPrice: '' });
      }

      await loadProducts();
      flash(`✅ Discount price removed from ${applyToAll ? 'all products' : `${targets.length} selected products`}`);
    } catch (err) {
      flash('❌ ' + getApiErrorText(err), 'error');
    } finally {
      setDiscountBusy(false);
    }
  };

  const allProductsSelected = products.length > 0 && selectedDiscountProductIds.length === products.length;

  const filteredProducts = useMemo(() => {
    const search = productSearchTerm.trim().toLowerCase();

    return products.filter((product) => {
      if (search) {
        const name = (product?.name || '').toLowerCase();
        const slug = (product?.slug || '').toLowerCase();
        const description = (product?.description || '').toLowerCase();
        if (!name.includes(search) && !slug.includes(search) && !description.includes(search)) {
          return false;
        }
      }

      if (productCategoryFilter !== 'all') {
        if ((product?.category?._id || '') !== productCategoryFilter) return false;
      }

      if (productShadeFilter !== 'all') {
        const shades = Array.isArray(product?.shadeCategories) ? product.shadeCategories : [];
        if (!shades.includes(productShadeFilter)) return false;
      }

      if (productStockFilter === 'in_stock' && Number(product?.stock || 0) <= 0) return false;
      if (productStockFilter === 'out_of_stock' && Number(product?.stock || 0) > 0) return false;

      return true;
    });
  }, [products, productSearchTerm, productCategoryFilter, productShadeFilter, productStockFilter]);

  return (
    <div style={s.page}>
      {/* Sidebar */}
      <div style={s.sidebar}>
        <h2 style={s.sideTitle}>⚙️ Admin</h2>
        <p style={s.sideUser}>👤 {user?.name}</p>
        <button 
          onClick={() => setShowPasswordModal(true)} 
          style={{...s.sideBtn, fontSize: '13px', padding: '6px 12px', marginBottom: '20px', backgroundColor: 'rgba(255,255,255,0.1)'}}
        >
          🔑 Change Password
        </button>
        {[
          { id: 'products', label: '🛍️ Products' },
          { id: 'categories', label: '📦 Categories' },
          { id: 'orders', label: '📋 Orders' },
          { id: 'users', label: '👥 Users' },
          { id: 'analytics', label: '📊 Analytics' },
        ].map(t => (
          <button
            key={t.id}
            style={{ ...s.sideBtn, ...(tab === t.id ? s.sideBtnActive : {}) }}
            onClick={() => { setTab(t.id); setShowProductForm(false); }}
          >{t.label}</button>
        ))}
        <button style={{ ...s.sideBtn, marginTop: 'auto', color: '#aaa' }} onClick={() => navigate('/')}>
          ← Back to Store
        </button>
      </div>

      {/* Main Content */}
      <div style={s.main}>
        {msg.text && (
          <div style={{ ...s.flash, backgroundColor: msg.type === 'error' ? '#f8d7da' : '#d4edda', color: msg.type === 'error' ? '#721c24' : '#155724' }}>
            {msg.text}
          </div>
        )}

        <div style={s.salePanel}>
          <div>
            <div style={s.saleTitle}>Whole Store Sale</div>
            <div style={s.saleText}>
              Apply one live discount across the storefront. Product-level sale prices still take priority.
            </div>
          </div>
          <div style={s.saleControls}>
            <input
              style={s.saleInput}
              type="number"
              min="0"
              max="90"
              step="1"
              value={storeSalePercent}
              onChange={handleStoreSaleChange}
              placeholder="0"
            />
            <span style={s.saleSuffix}>%</span>
            <button type="button" style={s.saleBtn} onClick={() => openDiscountDialog('apply')}>Apply</button>
            <button type="button" style={s.saleClearBtn} onClick={() => openDiscountDialog('clear')}>Clear</button>
          </div>
        </div>

        {discountDialog.open && (
          <div style={s.discountDialog}>
            <div style={s.discountDialogTitle}>{discountDialog.mode === 'apply' ? 'Apply Discount' : 'Clear Discount'}</div>
            <div style={s.discountDialogText}>Choose where this action should be applied.</div>

            <div style={s.discountScopeRow}>
              <label style={s.scopeLabel}>
                <input
                  type="radio"
                  name="discountScope"
                  value="all"
                  checked={discountScope === 'all'}
                  onChange={(e) => setDiscountScope(e.target.value)}
                />
                Every item
              </label>
              <label style={s.scopeLabel}>
                <input
                  type="radio"
                  name="discountScope"
                  value="selected"
                  checked={discountScope === 'selected'}
                  onChange={(e) => setDiscountScope(e.target.value)}
                />
                Selected items
              </label>
            </div>

            {discountScope === 'selected' && (
              <>
                <div style={s.discountDialogActions}>
                  <button type="button" style={s.smallActionBtn} onClick={selectAllDiscountProducts}>
                    {allProductsSelected ? 'All Selected' : 'Select All'}
                  </button>
                  <button type="button" style={s.saleClearBtn} onClick={clearDiscountSelection}>Clear Selection</button>
                  <span style={s.selectionCount}>{selectedDiscountProductIds.length} selected</span>
                </div>
                <div style={s.discountSelectionList}>
                  {products.map(product => (
                    <label key={product._id} style={s.discountSelectionItem}>
                      <input
                        type="checkbox"
                        checked={selectedDiscountProductIds.includes(product._id)}
                        onChange={() => toggleDiscountProductSelection(product._id)}
                      />
                      <span>{product.name}</span>
                    </label>
                  ))}
                </div>
              </>
            )}

            <div style={s.discountDialogActions}>
              <button type="button" style={s.saleBtn} disabled={discountBusy} onClick={runDiscountAction}>
                {discountBusy ? 'Processing...' : discountDialog.mode === 'apply' ? 'Apply Now' : 'Clear Now'}
              </button>
              <button type="button" style={s.saleClearBtn} disabled={discountBusy} onClick={closeDiscountDialog}>Cancel</button>
            </div>
          </div>
        )}

        {/* ── PRODUCTS TAB ── */}
        {tab === 'products' && (
          <>
            <div style={s.header}>
              <h2 style={s.heading}>Products ({filteredProducts.length}/{products.length})</h2>
              <div style={s.headerActions}>
                <button
                  type="button"
                  style={s.selectToggleBtn}
                  disabled={products.length === 0}
                  onClick={allProductsSelected ? clearDiscountSelection : selectAllDiscountProducts}
                >
                  {allProductsSelected ? 'Unselect All' : 'Select All'}
                </button>
                <button
                  type="button"
                  style={s.bulkClearSelectedBtn}
                  disabled={discountBusy}
                  onClick={() => clearProductDiscountPrices({ applyToAll: false })}
                >
                  {discountBusy ? 'Processing...' : 'Clear Discount (Selected)'}
                </button>
                <button
                  type="button"
                  style={s.bulkClearAllBtn}
                  disabled={discountBusy}
                  onClick={() => clearProductDiscountPrices({ applyToAll: true })}
                >
                  {discountBusy ? 'Processing...' : 'Clear Discount (All)'}
                </button>
                <button style={s.addBtn} onClick={() => { setShowProductForm(!showProductForm); setEditingProduct(null); setProductForm(createEmptyProduct()); setSizePrices([]); setColorVariants([]); setNewColorName(''); setSelectedImages([]); setExistingImages([]); setCustomFabricType(''); setFileInputVersion(v => v + 1); }}>
                  {showProductForm ? '✕ Cancel' : '+ Add Product'}
                </button>
              </div>
            </div>

            <div style={s.filterBar}>
              <input
                style={s.input}
                value={productSearchTerm}
                onChange={(e) => setProductSearchTerm(e.target.value)}
                placeholder="Search by name, slug, description"
              />
              <select style={s.input} value={productCategoryFilter} onChange={(e) => setProductCategoryFilter(e.target.value)}>
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>{category.name}</option>
                ))}
              </select>
              <select style={s.input} value={productShadeFilter} onChange={(e) => setProductShadeFilter(e.target.value)}>
                <option value="all">All Shades</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
              <select style={s.input} value={productStockFilter} onChange={(e) => setProductStockFilter(e.target.value)}>
                <option value="all">All Stock</option>
                <option value="in_stock">In Stock</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
              <button
                type="button"
                style={s.smallActionBtn}
                onClick={() => {
                  setProductSearchTerm('');
                  setProductCategoryFilter('all');
                  setProductShadeFilter('all');
                  setProductStockFilter('all');
                }}
              >
                Reset Filters
              </button>
            </div>

            {showProductForm && (
              <form onSubmit={handleProductSubmit} style={s.form}>
                <h3 style={s.formTitle}>{editingProduct ? '✏️ Edit Product' : '➕ New Product'}</h3>
                <div style={s.topSubmitRow}>
                  <button type="submit" style={s.topSubmitBtn} disabled={loading}>
                    {loading ? '⏳ Saving...' : editingProduct ? '💾 Save Changes' : '➕ Create Product'}
                  </button>
                </div>

                {editingProduct && (
                  <div style={s.editingPreviewRow}>
                    {getProductImage(editingProduct) ? (
                      <img
                        src={getProductImage(editingProduct)}
                        alt={editingProduct?.name || 'Product image'}
                        style={s.editingPreviewImage}
                      />
                    ) : (
                      <div style={s.editingPreviewFallback}>No image</div>
                    )}
                    <div>
                      <div style={s.editingPreviewTitle}>{editingProduct?.name || 'Product'}</div>
                      <div style={s.editingPreviewSub}>Editing selected product</div>
                    </div>
                  </div>
                )}

                {/* Basic Info */}
                <div style={s.formSection}>Basic Information</div>
                <div style={s.formGrid}>
                  <div>
                    <label style={s.label}>Product Name *</label>
                    <input style={s.input} value={productForm.name} onChange={pf('name')} required placeholder="e.g. Royal Cotton Bedsheet" />
                  </div>
                  <div>
                    <label style={s.label}>Category *</label>
                    <select style={s.input} value={productForm.category} onChange={pf('category')} required>
                      <option value="">Select category</option>
                      {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                    <div style={s.colorAddRow}>
                      <input
                        style={s.input}
                        value={quickCategoryName}
                        onChange={(e) => setQuickCategoryName(e.target.value)}
                        placeholder="Add a new category"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleQuickAddCategory();
                          }
                        }}
                      />
                      <button type="button" style={s.smallActionBtn} onClick={handleQuickAddCategory}>Create</button>
                    </div>
                  </div>
                  <div>
                    <label style={s.label}>Price (Rs.) *</label>
                    <input style={s.input} type="number" min="0" step="1" value={productForm.price} onChange={pf('price')} required placeholder="2500" />
                  </div>
                  <div>
                    <label style={s.label}>Discount Price (Rs.)</label>
                    <input style={s.input} type="number" min="0" step="1" value={productForm.discountPrice} onChange={pf('discountPrice')} placeholder="1999 (optional)" />
                  </div>
                  <div>
                    <label style={s.label}>Stock *</label>
                    <input style={s.input} type="number" min="0" step="1" value={productForm.stock} onChange={pf('stock')} required placeholder="50" />
                  </div>
                  <div>
                    <label style={s.label}>Product Cost (Rs.)</label>
                    <input style={s.input} type="number" min="0" step="1" value={productForm.costPrice} onChange={pf('costPrice')} placeholder="1200" />
                  </div>
                  <div>
                    <label style={s.label}>Shipping Cost / Unit (Rs.)</label>
                    <input style={s.input} type="number" min="0" step="1" value={productForm.shippingCost} onChange={pf('shippingCost')} placeholder="120" />
                  </div>
                  <div>
                    <label style={s.label}>Marketing Cost / Unit (Rs.)</label>
                    <input style={s.input} type="number" min="0" step="1" value={productForm.marketingCost} onChange={pf('marketingCost')} placeholder="80" />
                  </div>
                  <div>
                    <label style={s.label}>Supplier Name</label>
                    <input style={s.input} value={productForm.supplierName} onChange={pf('supplierName')} placeholder="e.g. ABC Textiles" />
                  </div>
                  <div>
                    <label style={s.label}>Supplier Avg Delivery (Days)</label>
                    <input style={s.input} type="number" min="0" step="1" value={productForm.supplierAvgDeliveryDays} onChange={pf('supplierAvgDeliveryDays')} placeholder="5" />
                  </div>
                  <div>
                    <label style={s.label}>Supplier Quality Score (0-5)</label>
                    <input style={s.input} type="number" min="0" max="5" step="0.1" value={productForm.supplierQualityScore} onChange={pf('supplierQualityScore')} placeholder="4.4" />
                  </div>
                  <div>
                    <label style={s.label}>Fabric Type</label>
                    <select style={s.input} value={productForm.fabricType} onChange={pf('fabricType')}>
                      {fabricTypeOptions.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <div style={s.colorAddRow}>
                      <input
                        style={s.input}
                        value={customFabricType}
                        onChange={(e) => setCustomFabricType(e.target.value)}
                        placeholder="Add a new fabric type"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleQuickAddFabricType();
                          }
                        }}
                      />
                      <button type="button" style={s.smallActionBtn} onClick={handleQuickAddFabricType}>Add</button>
                    </div>
                  </div>
                  <div>
                    <label style={s.label}>Shade Categories</label>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '6px' }}>
                      {SHADE_PRESETS.map((shade) => {
                        const checked = Array.isArray(productForm.shadeCategories) && productForm.shadeCategories.includes(shade);
                        return (
                          <label key={shade} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#444' }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setProductForm((prev) => {
                                  const current = Array.isArray(prev.shadeCategories) ? prev.shadeCategories : [];
                                  const next = checked
                                    ? current.filter((item) => item !== shade)
                                    : [...current, shade];

                                  return { ...prev, shadeCategories: next };
                                });
                              }}
                            />
                            {shade.charAt(0).toUpperCase() + shade.slice(1)}
                          </label>
                        );
                      })}
                    </div>
                    <div style={{ color: '#777', fontSize: '12px', marginTop: '6px' }}>
                      Tip: select one or both to make admin filtering explicit.
                    </div>
                  </div>
                  <div>
                    <label style={s.label}>Color Variants</label>
                    <div style={s.colorAddRow}>
                      <input
                        style={s.input}
                        value={newColorName}
                        onChange={(e) => setNewColorName(e.target.value)}
                        placeholder="e.g. White"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addColorVariant();
                          }
                        }}
                      />
                      <button type="button" style={s.smallActionBtn} onClick={addColorVariant}>Add</button>
                    </div>
                    {colorVariants.length > 0 && (
                      <div style={s.variantList}>
                        {colorVariants.map((variant) => (
                          <div key={variant.id} style={s.variantRow}>
                            <input
                              style={s.variantInput}
                              value={variant.name}
                              onChange={(e) => renameColorVariant(variant.id, e.target.value)}
                              placeholder="Color name"
                            />
                            <button type="button" style={s.variantRemoveBtn} onClick={() => removeColorVariant(variant.id)}>Remove</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={s.label}>Sizes (comma separated)</label>
                    <input style={s.input} value={productForm.sizes} onChange={pf('sizes')} placeholder="Single, Double, Queen" />
                  </div>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={s.label}>Size Pricing</label>
                  <div style={{ color: '#777', fontSize: '12px', marginBottom: '10px' }}>
                    Set a separate price for each size. If a size has no price, it will fall back to the base product price.
                  </div>
                  {parseSizeNames(productForm.sizes).length === 0 ? (
                    <div style={{ color: '#999', fontSize: '12px' }}>Add sizes first to configure per-size prices.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {parseSizeNames(productForm.sizes).map((size) => {
                        const currentRow = sizePrices.find((item) => normalizeSizeName(item.size) === size) || { price: '' };

                        return (
                          <div key={size} style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: '10px', alignItems: 'center' }}>
                            <div style={{ ...s.input, backgroundColor: '#fafafa', paddingTop: '11px', paddingBottom: '11px' }}>{size}</div>
                            <input
                              style={s.input}
                              type="number"
                              min="0"
                              step="1"
                              value={currentRow.price}
                              onChange={(e) => {
                                const nextPrice = e.target.value;
                                setSizePrices((prev) => {
                                  const nextRows = prev.filter((item) => normalizeSizeName(item.size) !== size);
                                  if (nextPrice !== '') {
                                    nextRows.push({ size, price: nextPrice });
                                  }
                                  return nextRows;
                                });
                              }}
                              placeholder="Price"
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={s.label}>Product Photos</label>
                  <input
                    key={`general-${fileInputVersion}`}
                    style={s.input}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => addSelectedFiles(e.target.files, '')}
                  />
                  {editingProduct && existingImages.length > 0 && (
                    <div style={{ marginTop: '8px', color: '#666', fontSize: '12px' }}>
                      Existing images kept: {existingImages.length}
                    </div>
                  )}
                  {selectedImages.length > 0 && (
                    <div style={{ marginTop: '8px', color: '#2ecc71', fontSize: '12px', fontWeight: 'bold' }}>
                      New images selected: {selectedImages.length}
                    </div>
                  )}

                  <div style={{ marginTop: '12px', padding: '12px', border: '1px dashed #d8d8d8', borderRadius: '8px', backgroundColor: '#fcfcfc' }}>
                    <label style={s.label}>Color Variation Photos</label>
                    {colorList.length === 0 && (
                      <div style={{ color: '#777', fontSize: '12px' }}>
                        Add colors above first, then upload images per color.
                      </div>
                    )}
                    {colorList.map((color) => (
                      <div key={color} style={{ marginTop: '10px' }}>
                        <label style={{ ...s.label, marginBottom: '4px' }}>{color} Images</label>
                        <input
                          key={`${color}-${fileInputVersion}`}
                          style={s.input}
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => addSelectedFiles(e.target.files, color)}
                        />
                        <div style={{ color: '#666', fontSize: '12px', marginTop: '4px' }}>
                          New selected: {getSelectedColorImageCount(color)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {editingProduct && existingImages.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ ...s.label, marginBottom: '8px' }}>Existing Product Gallery</div>
                      <div style={s.imageGrid}>
                        {existingImages.map((image, index) => (
                          <div
                            key={`${image.url}-${index}`}
                            style={s.imageCard}
                            draggable
                            onDragStart={() => handleDragStart('existing', index)}
                            onDragOver={(e) => handleDragOver('existing', index, e)}
                            onDrop={handleDragEnd}
                            onDragEnd={handleDragEnd}
                            title="Drag to reorder"
                          >
                            <img
                              src={image.url.startsWith('http') ? image.url : `http://localhost:5000${image.url}`}
                              alt={image.alt || 'Product'}
                              style={s.imageThumb}
                            />
                            <div style={s.imageMeta}>{image.color || 'General'}</div>
                            <button type="button" style={s.removeImageBtn} onClick={() => removeExistingImage(index)}>Remove</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedImages.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ ...s.label, marginBottom: '8px' }}>New Upload Queue</div>
                      <div style={s.imageGrid}>
                        {selectedImages.map((image, index) => (
                          <div
                            key={image.id}
                            style={s.imageCard}
                            draggable
                            onDragStart={() => handleDragStart('selected', index)}
                            onDragOver={(e) => handleDragOver('selected', index, e)}
                            onDrop={handleDragEnd}
                            onDragEnd={handleDragEnd}
                            title="Drag to reorder"
                          >
                            <img src={image.previewUrl} alt={image.file?.name || 'Upload'} style={s.imageThumb} />
                            <div style={s.imageMeta}>{image.color || 'General'}</div>
                            <button type="button" style={s.removeImageBtn} onClick={() => removeSelectedImage(image.id)}>Remove</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: '12px' }}>
                    <div style={{ color: '#777', fontSize: '12px' }}>
                      Tip: Drag image cards to reorder. The saved gallery follows this exact sequence.
                    </div>
                  </div>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={s.label}>Description *</label>
                  <textarea style={{ ...s.input, height: '80px', resize: 'vertical' }} value={productForm.description} onChange={pf('description')} required placeholder="Product description..." />
                </div>

                {/* SEO Section */}
                <div style={{ ...s.formSection, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  SEO & Meta Details
                  <button
                    type="button"
                    style={{ padding: '6px 14px', fontSize: '13px', backgroundColor: '#0e7a6d', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                    disabled={seoLoading || !productForm.name}
                    onClick={async () => {
                      try {
                        setSeoLoading(true);
                        const res = await assistantSeo({
                          name: productForm.name,
                          description: productForm.description,
                          category: productForm.category ? categories.find(c => c._id === productForm.category)?.name : '',
                          fabricType: productForm.fabricType,
                          colors: productForm.metaKeywords.split(',').map(k => k.trim()).filter(Boolean)
                        });
                        if (res?.data?.success && res.data.suggestions) {
                          setSeoSuggestions(res.data.suggestions);
                          setProductForm(prev => ({
                            ...prev,
                            metaTitle: res.data.suggestions.metaTitle,
                            metaDescription: res.data.suggestions.metaDescription,
                            metaKeywords: (res.data.suggestions.metaKeywords || []).join(', ')
                          }));
                          flash('✓ SEO suggestions generated and applied!', 'success');
                        }
                      } catch (err) {
                        flash('Failed to generate SEO suggestions', 'error');
                        console.error('SEO error:', err);
                      } finally {
                        setSeoLoading(false);
                      }
                    }}
                  >
                    {seoLoading ? '⏳ Generating...' : '✨ Generate SEO'}
                  </button>
                </div>
                <div style={s.formGrid}>
                  <div>
                    <label style={s.label}>URL Slug</label>
                    <input style={s.input} value={productForm.slug} onChange={pf('slug')} placeholder="royal-cotton-bedsheet (auto-generated if empty)" />
                  </div>
                  <div>
                    <label style={s.label}>Meta Title <span style={{ color: '#aaa', fontSize: '11px' }}>(max 70 chars)</span></label>
                    <input style={s.input} value={productForm.metaTitle} onChange={pf('metaTitle')} maxLength={70} placeholder="Buy Royal Cotton Bedsheet | WF Bedding" />
                    <div style={{ fontSize: '11px', color: productForm.metaTitle.length > 60 ? '#e74c3c' : '#aaa', textAlign: 'right' }}>{productForm.metaTitle.length}/70</div>
                  </div>
                  <div>
                    <label style={s.label}>Meta Keywords <span style={{ color: '#aaa', fontSize: '11px' }}>(comma separated)</span></label>
                    <input style={s.input} value={productForm.metaKeywords} onChange={pf('metaKeywords')} placeholder="bedsheet, cotton, double bed, luxury" />
                  </div>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={s.label}>Meta Description <span style={{ color: '#aaa', fontSize: '11px' }}>(max 160 chars)</span></label>
                  <textarea style={{ ...s.input, height: '60px', resize: 'vertical' }} value={productForm.metaDescription} onChange={pf('metaDescription')} maxLength={160} placeholder="Premium quality cotton bedsheet for double beds. Soft, durable and easy to wash." />
                  <div style={{ fontSize: '11px', color: productForm.metaDescription.length > 150 ? '#e74c3c' : '#aaa', textAlign: 'right' }}>{productForm.metaDescription.length}/160</div>
                </div>

                <button type="submit" style={s.submitBtn} disabled={loading}>
                  {loading ? '⏳ Saving...' : editingProduct ? '💾 Save Changes' : '➕ Create Product'}
                </button>
              </form>
            )}

            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr style={s.thead}>
                    {['Select', 'Product', 'Category', 'Shades', 'Price', 'Stock', 'Views', 'SEO', 'Actions'].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p, i) => (
                    <tr key={p._id} style={{ backgroundColor: i % 2 === 0 ? 'white' : '#fafafa' }}>
                      <td style={s.td}>
                        <input
                          type="checkbox"
                          checked={selectedDiscountProductIds.includes(p._id)}
                          onChange={() => toggleDiscountProductSelection(p._id)}
                        />
                      </td>
                      <td style={s.td}>
                        <div style={s.productInfoCell}>
                          {getProductImage(p) ? (
                            <img src={getProductImage(p)} alt={p?.name || 'Product image'} style={s.productTableThumb} />
                          ) : (
                            <div style={s.productTableThumbFallback}>No image</div>
                          )}
                          <div>
                            <div style={s.productInfoName}>{getCatIcon(p.category?.name)} {p.name}</div>
                            <div style={s.productInfoHint}>Click edit to open this product</div>
                          </div>
                        </div>
                      </td>
                      <td style={s.td}>{p.category?.name || '—'}</td>
                      <td style={s.td}>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {(Array.isArray(p.shadeCategories) && p.shadeCategories.length > 0)
                            ? p.shadeCategories.map((shade) => (
                              <span
                                key={`${p._id}-${shade}`}
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: '999px',
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                  backgroundColor: shade === 'light' ? '#eef6ff' : '#2f3542',
                                  color: shade === 'light' ? '#2d6cdf' : '#fff',
                                  border: shade === 'light' ? '1px solid #d6e6ff' : '1px solid #2f3542'
                                }}
                              >
                                {shade}
                              </span>
                            ))
                            : <span style={{ color: '#999', fontSize: '12px' }}>—</span>}
                        </div>
                      </td>
                      <td style={s.td}>
                        {p.discountPrice
                          ? <><s style={{ color: '#aaa' }}>Rs.{p.price}</s> <b style={{ color: '#e94560' }}>Rs.{p.discountPrice}</b></>
                          : `Rs.${p.price}`}
                      </td>
                      <td style={s.td}><span style={{ color: p.stock < 10 ? 'orange' : 'green', fontWeight: 'bold' }}>{p.stock}</span></td>
                      <td style={s.td}>{p.views}</td>
                      <td style={s.td}>
                        <span style={{ fontSize: '11px', color: p.metaTitle ? '#2ecc71' : '#e74c3c' }}>
                          {p.metaTitle ? '✓ Set' : '✗ Missing'}
                        </span>
                      </td>
                      <td style={s.td}>
                        <button style={s.editBtn} onClick={() => handleEdit(p)}>✏️ Edit</button>
                        <button style={{ ...s.editBtn, marginRight: '6px' }} onClick={() => handleDuplicate(p)}>📄 Duplicate</button>
                        <button style={s.delBtn} onClick={() => handleDeleteProduct(p._id)}>🗑️</button>
                      </td>
                    </tr>
                  ))}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td style={s.td} colSpan={9}>No products match current filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── CATEGORIES TAB ── */}
        {tab === 'categories' && (
          <>
            <h2 style={s.heading}>Categories ({categories.length})</h2>
            <form onSubmit={handleAddCategory} style={{ ...s.form, maxWidth: '500px' }}>
              <h3 style={s.formTitle}>➕ Add New Category</h3>
              <label style={s.label}>Name *</label>
              <input style={s.input} value={newCategory.name} onChange={e => setNewCategory({ ...newCategory, name: e.target.value })} required placeholder="e.g. Towels" />
              <label style={s.label}>Description</label>
              <input style={s.input} value={newCategory.description} onChange={e => setNewCategory({ ...newCategory, description: e.target.value })} placeholder="Short description" />
              <label style={s.label}>Image URL (optional)</label>
              <input style={s.input} value={newCategory.image} onChange={e => setNewCategory({ ...newCategory, image: e.target.value })} placeholder="https://... or /images/..." />
              <label style={s.label}>Or Upload Image File</label>
              <input
                type="file"
                accept="image/*"
                style={s.input}
                onChange={(e) => setNewCategoryImageFile(e.target.files?.[0] || null)}
              />
              <button type="submit" style={s.submitBtn}>Add Category</button>
            </form>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {categories.map(cat => (
                <div key={cat._id} style={{ ...s.form, display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 20px' }}>
                  {cat.image ? (
                    <img
                      src={resolveCategoryPreviewSrc(cat.image)}
                      alt={cat.name}
                      style={{ width: '52px', height: '52px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0, backgroundColor: '#f1f1f1' }}
                      onError={(event) => {
                        event.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: '28px' }}>{getCatIcon(cat.name)}</span>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', color: '#1a1a2e' }}>{cat.name}</div>
                    <div style={{ color: '#888', fontSize: '13px' }}>{cat.description}</div>
                    {cat.image && <div style={{ color: '#999', fontSize: '12px', marginTop: '4px', wordBreak: 'break-all' }}>{cat.image}</div>}
                  </div>
                  <label style={{ ...s.editBtn, display: 'inline-flex', alignItems: 'center', marginRight: '6px', cursor: 'pointer' }}>
                    ⬆️ Upload
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        if (file) handleUpdateCategoryImageFile(cat, file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  <button style={s.editBtn} onClick={() => handleUpdateCategoryImage(cat)}>🖼️ Image</button>
                  <button style={s.delBtn} onClick={() => handleDeleteCategory(cat._id)}>🗑️</button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── ORDERS TAB ── */}
        {tab === 'orders' && (
          <>
            <h2 style={s.heading}>All Orders ({orders.length})</h2>
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr style={s.thead}>
                    {['Order ID', 'Customer', 'Items', 'Total', 'Payment', 'Status', 'Date', 'Update Status'].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o, i) => (
                    <tr key={o._id} style={{ backgroundColor: i % 2 === 0 ? 'white' : '#fafafa' }}>
                      <td style={s.td}><code style={{ fontSize: '12px' }}>#{o._id.slice(-8)}</code></td>
                      <td style={s.td}>
                        <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{o.user?.name}</div>
                        <div style={{ color: '#888', fontSize: '12px' }}>{o.user?.email}</div>
                      </td>
                      <td style={s.td}>{o.items?.length} item(s)</td>
                      <td style={s.td}><b style={{ color: '#e94560' }}>Rs. {o.totalAmount}</b></td>
                      <td style={s.td}>{o.paymentMethod}</td>
                      <td style={s.td}>
                        <span style={{ backgroundColor: statusColor[o.orderStatus] || '#888', color: 'white', padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                          {o.orderStatus}
                        </span>
                      </td>
                      <td style={s.td}>{new Date(o.createdAt).toLocaleDateString()}</td>
                      <td style={s.td}>
                        <select
                          style={{ ...s.input, padding: '5px', fontSize: '13px' }}
                          value={o.orderStatus}
                          onChange={e => handleStatusChange(o._id, e.target.value)}
                        >
                          {ORDER_STATUSES.map(st => <option key={st}>{st}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── ANALYTICS TAB ── */}
        {tab === 'analytics' && (
          <>
            <h2 style={s.heading}>📊 Analytics Dashboard</h2>
            {analyticsLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Loading analytics...</div>
            ) : analyticsData ? (
              <>
                {/* Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#666', textTransform: 'uppercase' }}>Total Orders</div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1a1a2e', marginTop: '6px' }}>{analyticsData.summary?.totalOrders || 0}</div>
                  </div>
                  <div style={{ backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#666', textTransform: 'uppercase' }}>Total Revenue</div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0e7a6d', marginTop: '6px' }}>Rs. {(analyticsData.summary?.totalRevenue || 0).toLocaleString()}</div>
                  </div>
                  <div style={{ backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#666', textTransform: 'uppercase' }}>Avg Order Value</div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#c66f2f', marginTop: '6px' }}>Rs. {(analyticsData.summary?.avgOrderValue || 0).toLocaleString()}</div>
                  </div>
                  <div style={{ backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#666', textTransform: 'uppercase' }}>Total Users</div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#e94560', marginTop: '6px' }}>{analyticsData.summary?.totalUsers || 0}</div>
                  </div>
                  <div style={{ backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#666', textTransform: 'uppercase' }}>Total Products</div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0e7a6d', marginTop: '6px' }}>{analyticsData.summary?.totalProducts || 0}</div>
                  </div>
                  <div style={{ backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#666', textTransform: 'uppercase' }}>Total Stock</div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#8f4e14', marginTop: '6px' }}>{analyticsData.summary?.totalStock || 0}</div>
                  </div>
                </div>

                {/* Automated Alerts */}
                {(analyticsData.alerts || []).length > 0 && (
                  <div style={{ backgroundColor: '#fff', borderRadius: '12px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #fde4c2' }}>
                    <div style={{ padding: '16px', borderBottom: '1px solid #eee', backgroundColor: '#fff8ef' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#8f4e14' }}>⚠️ Automated Alerts</h3>
                    </div>
                    <div style={{ padding: '14px 16px', display: 'grid', gap: '10px' }}>
                      {analyticsData.alerts.map((alert, idx) => (
                        <div key={`${alert.type}-${idx}`} style={{ border: '1px solid #f3e6d6', borderRadius: '10px', padding: '12px', backgroundColor: '#fff' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                            <div style={{ fontWeight: 'bold', color: '#1a1a2e' }}>{alert.title}</div>
                            <span style={{ padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 'bold', backgroundColor: alert.severity === 'high' ? '#f8d7da' : '#fff3cd', color: alert.severity === 'high' ? '#721c24' : '#856404' }}>
                              {alert.severity}
                            </span>
                          </div>
                          <div style={{ marginTop: '6px', color: '#555', fontSize: '13px' }}>{alert.message}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Customer Psychology */}
                <div style={{ backgroundColor: '#fff', borderRadius: '12px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <div style={{ padding: '16px', borderBottom: '1px solid #eee' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#1a1a2e' }}>🧠 Customer Psychology</h3>
                  </div>

                  <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                    <div style={{ border: '1px solid #ececec', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{ padding: '10px 12px', backgroundColor: '#fafafa', fontWeight: 'bold', fontSize: '13px' }}>Most Clicked Products</div>
                      <div style={{ maxHeight: '250px', overflow: 'auto' }}>
                        {(analyticsData.customerPsychology?.topClickedProducts || []).slice(0, 8).map((item) => (
                          <div key={item.productId} style={{ padding: '10px 12px', borderTop: '1px solid #f3f3f3', display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                            <span style={{ color: '#333' }}>{item.productName}</span>
                            <b style={{ color: '#0e7a6d' }}>{item.clicks}</b>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ border: '1px solid #ececec', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{ padding: '10px 12px', backgroundColor: '#fafafa', fontWeight: 'bold', fontSize: '13px' }}>Viewed But Not Bought</div>
                      <div style={{ maxHeight: '250px', overflow: 'auto' }}>
                        {(analyticsData.customerPsychology?.viewedNotBoughtProducts || []).slice(0, 8).map((item) => (
                          <div key={item.productId} style={{ padding: '10px 12px', borderTop: '1px solid #f3f3f3', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ color: '#333' }}>{item.productName}</span>
                            <span style={{ fontSize: '12px', color: '#777' }}>Views: {item.views} | Sold: {item.soldQty} | CVR: {item.conversionRate}%</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ border: '1px solid #ececec', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{ padding: '10px 12px', backgroundColor: '#fafafa', fontWeight: 'bold', fontSize: '13px' }}>Added to Cart Then Abandoned</div>
                      <div style={{ maxHeight: '250px', overflow: 'auto' }}>
                        {(analyticsData.customerPsychology?.cartAbandonmentProducts || []).slice(0, 8).map((item) => (
                          <div key={item.productId} style={{ padding: '10px 12px', borderTop: '1px solid #f3f3f3', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ color: '#333' }}>{item.productName}</span>
                            <span style={{ fontSize: '12px', color: '#777' }}>Abandoned Qty: {item.abandonedQty} | Rate: {item.abandonmentRate}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: '0 16px 16px 16px' }}>
                    <div style={s.tableWrap}>
                      <table style={s.table}>
                        <thead>
                          <tr style={s.thead}>
                            {['Checkout Step', 'Users', 'Drop-off', 'Drop-off Rate'].map(h => (<th key={h} style={s.th}>{h}</th>))}
                          </tr>
                        </thead>
                        <tbody>
                          {(analyticsData.customerPsychology?.checkoutDropoff || []).map((row, i) => (
                            <tr key={`${row.step}-${i}`} style={{ backgroundColor: i % 2 === 0 ? 'white' : '#fafafa' }}>
                              <td style={s.td}>{row.step.replaceAll('_', ' ')}</td>
                              <td style={s.td}>{row.count}</td>
                              <td style={s.td}>{row.dropOff}</td>
                              <td style={{ ...s.td, fontWeight: 'bold', color: row.dropOffRate >= 40 ? '#e74c3c' : '#8f4e14' }}>{row.dropOffRate}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Profit Dashboard */}
                <div style={{ backgroundColor: '#fff', borderRadius: '12px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <div style={{ padding: '16px', borderBottom: '1px solid #eee' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#1a1a2e' }}>💹 Profit Dashboard</h3>
                  </div>

                  <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                    <div style={{ border: '1px solid #eee', borderRadius: '10px', padding: '12px' }}>
                      <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>Revenue</div>
                      <div style={{ marginTop: '6px', fontSize: '22px', fontWeight: 'bold', color: '#0e7a6d' }}>Rs. {(analyticsData.profitDashboard?.summary?.totalRevenue || 0).toLocaleString()}</div>
                    </div>
                    <div style={{ border: '1px solid #eee', borderRadius: '10px', padding: '12px' }}>
                      <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>Product Cost</div>
                      <div style={{ marginTop: '6px', fontSize: '22px', fontWeight: 'bold', color: '#8f4e14' }}>Rs. {(analyticsData.profitDashboard?.summary?.totalProductCost || 0).toLocaleString()}</div>
                    </div>
                    <div style={{ border: '1px solid #eee', borderRadius: '10px', padding: '12px' }}>
                      <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>Shipping Cost</div>
                      <div style={{ marginTop: '6px', fontSize: '22px', fontWeight: 'bold', color: '#8f4e14' }}>Rs. {(analyticsData.profitDashboard?.summary?.totalShippingCost || 0).toLocaleString()}</div>
                    </div>
                    <div style={{ border: '1px solid #eee', borderRadius: '10px', padding: '12px' }}>
                      <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>Marketing Cost</div>
                      <div style={{ marginTop: '6px', fontSize: '22px', fontWeight: 'bold', color: '#8f4e14' }}>Rs. {(analyticsData.profitDashboard?.summary?.totalMarketingCost || 0).toLocaleString()}</div>
                    </div>
                    <div style={{ border: '1px solid #eee', borderRadius: '10px', padding: '12px' }}>
                      <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>Net Profit</div>
                      <div style={{ marginTop: '6px', fontSize: '22px', fontWeight: 'bold', color: '#1a1a2e' }}>Rs. {(analyticsData.profitDashboard?.summary?.totalNetProfit || 0).toLocaleString()}</div>
                    </div>
                    <div style={{ border: '1px solid #eee', borderRadius: '10px', padding: '12px' }}>
                      <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>Net Margin</div>
                      <div style={{ marginTop: '6px', fontSize: '22px', fontWeight: 'bold', color: '#1a1a2e' }}>{analyticsData.profitDashboard?.summary?.netProfitMargin || 0}%</div>
                    </div>
                  </div>

                  <div style={{ padding: '0 16px 16px 16px' }}>
                    <div style={s.tableWrap}>
                      <table style={s.table}>
                        <thead>
                          <tr style={s.thead}>
                            {['Product', 'Units Sold', 'Selling Price', 'Revenue', 'Product Cost', 'Shipping', 'Marketing', 'Net Profit', 'Margin %'].map(h => (<th key={h} style={s.th}>{h}</th>))}
                          </tr>
                        </thead>
                        <tbody>
                          {(analyticsData.profitDashboard?.byProduct || []).slice(0, 15).map((row, i) => (
                            <tr key={`${row.productId}-${i}`} style={{ backgroundColor: i % 2 === 0 ? 'white' : '#fafafa' }}>
                              <td style={s.td}>{row.productName}</td>
                              <td style={s.td}>{row.unitsSold}</td>
                              <td style={s.td}>Rs. {Number(row.sellingPrice || 0).toLocaleString()}</td>
                              <td style={s.td}>Rs. {Number(row.revenue || 0).toLocaleString()}</td>
                              <td style={s.td}>Rs. {Number(row.productCost || 0).toLocaleString()}</td>
                              <td style={s.td}>Rs. {Number(row.shippingCost || 0).toLocaleString()}</td>
                              <td style={s.td}>Rs. {Number(row.marketingCost || 0).toLocaleString()}</td>
                              <td style={{ ...s.td, fontWeight: 'bold', color: Number(row.netProfit || 0) >= 0 ? '#0e7a6d' : '#e74c3c' }}>Rs. {Number(row.netProfit || 0).toLocaleString()}</td>
                              <td style={s.td}>{row.marginPercent}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Customer Segmentation */}
                <div style={{ backgroundColor: '#fff', borderRadius: '12px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <div style={{ padding: '16px', borderBottom: '1px solid #eee' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#1a1a2e' }}>👥 Customer Segmentation</h3>
                  </div>

                  <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                    <div style={{ border: '1px solid #eee', borderRadius: '10px', padding: '12px' }}><div style={{ fontSize: '12px', color: '#666' }}>VIP Customers</div><div style={{ marginTop: '6px', fontSize: '22px', fontWeight: 'bold', color: '#1a1a2e' }}>{analyticsData.customerSegmentation?.summary?.vipCount || 0}</div></div>
                    <div style={{ border: '1px solid #eee', borderRadius: '10px', padding: '12px' }}><div style={{ fontSize: '12px', color: '#666' }}>Repeat Customers</div><div style={{ marginTop: '6px', fontSize: '22px', fontWeight: 'bold', color: '#1a1a2e' }}>{analyticsData.customerSegmentation?.summary?.repeatCount || 0}</div></div>
                    <div style={{ border: '1px solid #eee', borderRadius: '10px', padding: '12px' }}><div style={{ fontSize: '12px', color: '#666' }}>High Spenders</div><div style={{ marginTop: '6px', fontSize: '22px', fontWeight: 'bold', color: '#1a1a2e' }}>{analyticsData.customerSegmentation?.summary?.highSpenderCount || 0}</div></div>
                    <div style={{ border: '1px solid #eee', borderRadius: '10px', padding: '12px' }}><div style={{ fontSize: '12px', color: '#666' }}>Inactive Customers</div><div style={{ marginTop: '6px', fontSize: '22px', fontWeight: 'bold', color: '#1a1a2e' }}>{analyticsData.customerSegmentation?.summary?.inactiveCount || 0}</div></div>
                    <div style={{ border: '1px solid #eee', borderRadius: '10px', padding: '12px' }}><div style={{ fontSize: '12px', color: '#666' }}>Cart Abandoners</div><div style={{ marginTop: '6px', fontSize: '22px', fontWeight: 'bold', color: '#1a1a2e' }}>{analyticsData.customerSegmentation?.summary?.cartAbandonerCount || 0}</div></div>
                  </div>

                  <div style={{ padding: '0 16px 16px 16px' }}>
                    <div style={s.tableWrap}>
                      <table style={s.table}>
                        <thead>
                          <tr style={s.thead}>
                            {['High Spender', 'Email', 'Total Spent', 'Orders', 'Last Order'].map(h => (<th key={h} style={s.th}>{h}</th>))}
                          </tr>
                        </thead>
                        <tbody>
                          {(analyticsData.customerSegmentation?.highSpenders || []).slice(0, 12).map((row, i) => (
                            <tr key={`${row.userId}-${i}`} style={{ backgroundColor: i % 2 === 0 ? 'white' : '#fafafa' }}>
                              <td style={s.td}>{row.name}</td>
                              <td style={s.td}>{row.email}</td>
                              <td style={{ ...s.td, fontWeight: 'bold', color: '#0e7a6d' }}>Rs. {Number(row.totalSpent || 0).toLocaleString()}</td>
                              <td style={s.td}>{row.totalOrders}</td>
                              <td style={s.td}>{row.lastOrderAt ? new Date(row.lastOrderAt).toLocaleDateString() : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Search Intelligence */}
                <div style={{ backgroundColor: '#fff', borderRadius: '12px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <div style={{ padding: '16px', borderBottom: '1px solid #eee' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#1a1a2e' }}>🔎 Search Intelligence</h3>
                  </div>

                  <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                    <div style={{ border: '1px solid #ececec', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{ padding: '10px 12px', backgroundColor: '#fafafa', fontWeight: 'bold', fontSize: '13px' }}>Most Searched Keywords</div>
                      <div style={{ maxHeight: '220px', overflow: 'auto' }}>
                        {(analyticsData.searchIntelligence?.topKeywords || []).slice(0, 10).map((row, i) => (
                          <div key={`${row.keyword}-${i}`} style={{ padding: '10px 12px', borderTop: '1px solid #f3f3f3', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{row.keyword}</span><b>{row.count}</b>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ border: '1px solid #ececec', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{ padding: '10px 12px', backgroundColor: '#fafafa', fontWeight: 'bold', fontSize: '13px' }}>Searches With No Results</div>
                      <div style={{ maxHeight: '220px', overflow: 'auto' }}>
                        {(analyticsData.searchIntelligence?.noResultSearches || []).slice(0, 10).map((row, i) => (
                          <div key={`${row.keyword}-${i}`} style={{ padding: '10px 12px', borderTop: '1px solid #f3f3f3', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{row.keyword}</span><b style={{ color: '#e74c3c' }}>{row.count}</b>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ border: '1px solid #ececec', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{ padding: '10px 12px', backgroundColor: '#fafafa', fontWeight: 'bold', fontSize: '13px' }}>Trending Searches (7 days)</div>
                      <div style={{ maxHeight: '220px', overflow: 'auto' }}>
                        {(analyticsData.searchIntelligence?.trendingSearches || []).slice(0, 10).map((row, i) => (
                          <div key={`${row.keyword}-trend-${i}`} style={{ padding: '10px 12px', borderTop: '1px solid #f3f3f3', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{row.keyword}</span><b style={{ color: '#0e7a6d' }}>{row.count}</b>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ border: '1px solid #ececec', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{ padding: '10px 12px', backgroundColor: '#fafafa', fontWeight: 'bold', fontSize: '13px' }}>Misspelled Search Patterns</div>
                      <div style={{ maxHeight: '220px', overflow: 'auto' }}>
                        {(analyticsData.searchIntelligence?.misspelledSearches || []).slice(0, 10).map((row, i) => (
                          <div key={`${row.originalKeyword}-${i}`} style={{ padding: '10px 12px', borderTop: '1px solid #f3f3f3', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span><b>{row.originalKeyword}</b> → {row.correctedKeyword}</span>
                            <span style={{ fontSize: '12px', color: '#777' }}>Count: {row.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Return / Refund Analytics */}
                <div style={{ backgroundColor: '#fff', borderRadius: '12px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <div style={{ padding: '16px', borderBottom: '1px solid #eee' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#1a1a2e' }}>↩️ Return & Refund Analytics</h3>
                  </div>

                  <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px' }}>
                    <div style={{ border: '1px solid #eee', borderRadius: '10px', padding: '12px' }}><div style={{ fontSize: '12px', color: '#666' }}>Returned Orders</div><div style={{ marginTop: '6px', fontSize: '22px', fontWeight: 'bold' }}>{analyticsData.returnRefundAnalytics?.summary?.totalReturnedOrders || 0}</div></div>
                    <div style={{ border: '1px solid #eee', borderRadius: '10px', padding: '12px' }}><div style={{ fontSize: '12px', color: '#666' }}>Refund Loss</div><div style={{ marginTop: '6px', fontSize: '22px', fontWeight: 'bold', color: '#e74c3c' }}>Rs. {(analyticsData.returnRefundAnalytics?.summary?.refundLoss || 0).toLocaleString()}</div></div>
                    <div style={{ border: '1px solid #eee', borderRadius: '10px', padding: '12px' }}><div style={{ fontSize: '12px', color: '#666' }}>Defective Returns</div><div style={{ marginTop: '6px', fontSize: '22px', fontWeight: 'bold' }}>{analyticsData.returnRefundAnalytics?.summary?.defectiveCount || 0}</div></div>
                  </div>

                  <div style={{ padding: '0 16px 16px 16px' }}>
                    <div style={s.tableWrap}>
                      <table style={s.table}>
                        <thead>
                          <tr style={s.thead}>
                            {['Product', 'Returns', 'Refunded Amount', 'Defective Returns'].map(h => (<th key={h} style={s.th}>{h}</th>))}
                          </tr>
                        </thead>
                        <tbody>
                          {(analyticsData.returnRefundAnalytics?.mostReturnedProducts || []).slice(0, 12).map((row, i) => (
                            <tr key={`${row.productId}-${i}`} style={{ backgroundColor: i % 2 === 0 ? 'white' : '#fafafa' }}>
                              <td style={s.td}>{row.productName}</td>
                              <td style={s.td}>{row.returns}</td>
                              <td style={s.td}>Rs. {Number(row.refundedAmount || 0).toLocaleString()}</td>
                              <td style={s.td}>{row.defectiveReturns || 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Supplier / Vendor Intelligence */}
                <div style={{ backgroundColor: '#fff', borderRadius: '12px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <div style={{ padding: '16px', borderBottom: '1px solid #eee' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#1a1a2e' }}>🏭 Supplier Intelligence</h3>
                  </div>
                  <div style={s.tableWrap}>
                    <table style={s.table}>
                      <thead>
                        <tr style={s.thead}>
                          {['Supplier', 'Products', 'Revenue', 'Margin', 'Avg Margin %', 'Avg Delivery Days', 'Quality Score', 'Quality Issues'].map(h => (<th key={h} style={s.th}>{h}</th>))}
                        </tr>
                      </thead>
                      <tbody>
                        {(analyticsData.supplierIntelligence?.suppliers || []).slice(0, 12).map((row, i) => (
                          <tr key={`${row.supplier}-${i}`} style={{ backgroundColor: i % 2 === 0 ? 'white' : '#fafafa' }}>
                            <td style={s.td}>{row.supplier}</td>
                            <td style={s.td}>{row.products}</td>
                            <td style={s.td}>Rs. {Number(row.revenue || 0).toLocaleString()}</td>
                            <td style={s.td}>Rs. {Number(row.margin || 0).toLocaleString()}</td>
                            <td style={s.td}>{row.avgMarginRate}%</td>
                            <td style={s.td}>{row.avgDeliveryDays}</td>
                            <td style={s.td}>{row.avgQualityScore}</td>
                            <td style={{ ...s.td, color: row.qualityIssues > 0 ? '#e74c3c' : '#2ecc71', fontWeight: 'bold' }}>{row.qualityIssues}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Marketing Attribution */}
                <div style={{ backgroundColor: '#fff', borderRadius: '12px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <div style={{ padding: '16px', borderBottom: '1px solid #eee' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#1a1a2e' }}>📣 Marketing Attribution</h3>
                  </div>
                  <div style={s.tableWrap}>
                    <table style={s.table}>
                      <thead>
                        <tr style={s.thead}>
                          {['Source', 'Orders', 'Revenue'].map(h => (<th key={h} style={s.th}>{h}</th>))}
                        </tr>
                      </thead>
                      <tbody>
                        {(analyticsData.marketingAttribution || []).map((row, i) => (
                          <tr key={`${row.source}-${i}`} style={{ backgroundColor: i % 2 === 0 ? 'white' : '#fafafa' }}>
                            <td style={s.td}>{row.source}</td>
                            <td style={s.td}>{row.orders}</td>
                            <td style={{ ...s.td, fontWeight: 'bold', color: '#0e7a6d' }}>Rs. {Number(row.revenue || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Best Sellers */}
                <div style={{ backgroundColor: '#fff', borderRadius: '12px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <div style={{ padding: '16px', borderBottom: '1px solid #eee' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#1a1a2e' }}>Top Selling Products (Last 30 Days)</h3>
                  </div>
                  <div style={s.tableWrap}>
                    <table style={s.table}>
                      <thead>
                        <tr style={s.thead}>
                          {['Product', 'Qty Sold', 'Revenue'].map(h => (<th key={h} style={s.th}>{h}</th>))}
                        </tr>
                      </thead>
                      <tbody>
                        {(analyticsData.bestSellers || []).map((item, i) => (
                          <tr key={i} style={{ backgroundColor: i % 2 === 0 ? 'white' : '#fafafa' }}>
                            <td style={s.td}>{item.productName}</td>
                            <td style={s.td}>{item.totalQuantitySold}</td>
                              <td style={{ ...s.td, fontWeight: 'bold', color: '#0e7a6d' }}>Rs. {item.totalRevenue?.toLocaleString() || '0'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Low Stock Products */}
                {(analyticsData.lowStockProducts || []).length > 0 && (
                  <div style={{ backgroundColor: '#fff', borderRadius: '12px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    <div style={{ padding: '16px', borderBottom: '1px solid #eee', backgroundColor: '#fff3cd' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#856404' }}>⚠️ Low Stock Products</h3>
                    </div>
                    <div style={s.tableWrap}>
                      <table style={s.table}>
                        <thead>
                          <tr style={s.thead}>
                            {['Product', 'Stock', 'Fabric'].map(h => (<th key={h} style={s.th}>{h}</th>))}
                          </tr>
                        </thead>
                        <tbody>
                          {analyticsData.lowStockProducts.map((item, i) => (
                            <tr key={i} style={{ backgroundColor: i % 2 === 0 ? 'white' : '#fafafa' }}>
                              <td style={s.td}>{item.name}</td>
                              <td style={{ ...s.td, fontWeight: 'bold', color: item.stock === 0 ? '#e74c3c' : '#f0ad4e' }}>{item.stock}</td>
                              <td style={s.td}>{item.fabricType}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Payment Methods */}
                <div style={{ backgroundColor: '#fff', borderRadius: '12px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <div style={{ padding: '16px', borderBottom: '1px solid #eee' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#1a1a2e' }}>Payment Methods</h3>
                  </div>
                  <div style={s.tableWrap}>
                    <table style={s.table}>
                      <thead>
                        <tr style={s.thead}>
                          {['Method', 'Orders', 'Revenue'].map(h => (<th key={h} style={s.th}>{h}</th>))}
                        </tr>
                      </thead>
                      <tbody>
                        {(analyticsData.paymentMethods || []).map((item, i) => (
                          <tr key={i} style={{ backgroundColor: i % 2 === 0 ? 'white' : '#fafafa' }}>
                            <td style={s.td}>{item._id || 'Unknown'}</td>
                            <td style={s.td}>{item.count}</td>
                              <td style={{ ...s.td, fontWeight: 'bold', color: '#0e7a6d' }}>Rs. {item.revenue?.toLocaleString() || '0'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Recent Orders */}
                <div style={{ backgroundColor: '#fff', borderRadius: '12px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <div style={{ padding: '16px', borderBottom: '1px solid #eee' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#1a1a2e' }}>Recent Orders (Last 20)</h3>
                  </div>
                  <div style={s.tableWrap}>
                    <table style={s.table}>
                      <thead>
                        <tr style={s.thead}>
                          {['Customer', 'Order Date', 'Amount', 'Status', 'Payment'].map(h => (<th key={h} style={s.th}>{h}</th>))}
                        </tr>
                      </thead>
                      <tbody>
                        {(analyticsData.recentOrders || []).map((order, i) => (
                          <tr key={i} style={{ backgroundColor: i % 2 === 0 ? 'white' : '#fafafa' }}>
                            <td style={s.td}>{order.user?.name || 'Unknown'}</td>
                            <td style={s.td}>{new Date(order.createdAt).toLocaleDateString()}</td>
                            <td style={s.td}>Rs. {order.totalAmount?.toLocaleString() || '0'}</td>
                            <td style={s.td}><span style={{ backgroundColor: order.orderStatus === 'Delivered' ? '#d4edda' : '#fff3cd', color: order.orderStatus === 'Delivered' ? '#155724' : '#856404', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>{order.orderStatus}</span></td>
                            <td style={s.td}>{order.paymentStatus}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>No analytics data available</div>
            )}
          </>
        )}

        {/* ── USERS TAB ── */}
        {tab === 'users' && (
          <>
            <h2 style={s.heading}>All Users ({users.length})</h2>
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr style={s.thead}>
                    {['Name', 'Email', 'Phone', 'Role', 'Joined', 'Status', 'Actions'].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u._id} style={{ backgroundColor: i % 2 === 0 ? 'white' : '#fafafa', opacity: u.isActive === false ? 0.5 : 1 }}>
                      <td style={s.td}><b>{u.name}</b></td>
                      <td style={s.td}>{u.email}</td>
                      <td style={s.td}>{u.phone || '—'}</td>
                      <td style={s.td}>
                        <span style={{ backgroundColor: u.role === 'admin' ? '#ffd700' : '#e0e0e0', color: u.role === 'admin' ? '#333' : '#555', padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={s.td}>{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td style={s.td}>
                        <span style={{ color: u.isActive === false ? '#e74c3c' : '#2ecc71', fontWeight: 'bold', fontSize: '13px' }}>
                          {u.isActive === false ? 'Inactive' : 'Active'}
                        </span>
                      </td>
                      <td style={s.td}>
                        {u._id !== user._id && (
                          <>
                            <button
                              style={{ ...s.editBtn, marginRight: '6px' }}
                              onClick={() => handleRoleChange(u._id, u.role === 'admin' ? 'user' : 'admin')}
                            >
                              {u.role === 'admin' ? '↓ Demote' : '↑ Make Admin'}
                            </button>
                            <button
                              style={u.isActive === false ? s.editBtn : s.delBtn}
                              onClick={() => handleToggleActive(u._id, u.isActive)}
                            >
                              {u.isActive === false ? '✓ Activate' : '✗ Block'}
                            </button>
                          </>
                        )}
                        {u._id === user._id && <span style={{ color: '#aaa', fontSize: '12px' }}>You</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '400px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#1a1a2e' }}>Change Password</h3>
            <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ position: 'relative' }}>
                <label style={s.label}>Current Password</label>
                <input
                  type={showPasswords ? "text" : "password"}
                  style={{ ...s.input, paddingRight: '40px' }}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  style={{ position: 'absolute', right: '10px', top: '32px', background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}
                >
                  {showPasswords ? '🙈' : '👁️'}
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <label style={s.label}>New Password</label>
                <input
                  type={showPasswords ? "text" : "password"}
                  style={{ ...s.input, paddingRight: '40px' }}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                  required
                  minLength="6"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  style={{ position: 'absolute', right: '10px', top: '32px', background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}
                >
                  {showPasswords ? '🙈' : '👁️'}
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <label style={s.label}>Confirm New Password</label>
                <input
                  type={showPasswords ? "text" : "password"}
                  style={{ ...s.input, paddingRight: '40px' }}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                  required
                  minLength="6"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  style={{ position: 'absolute', right: '10px', top: '32px', background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}
                >
                  {showPasswords ? '🙈' : '👁️'}
                </button>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" disabled={passwordLoading} style={{...s.submitBtn, flex: 1, marginTop: 0}}>
                  {passwordLoading ? 'Updating...' : 'Update Password'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowPasswordModal(false)}
                  style={{...s.sideBtn, backgroundColor: '#eee', color: '#333', textAlign: 'center', flex: 1, marginTop: 0}}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  page: { display: 'flex', minHeight: '100vh', backgroundColor: '#f0f2f5' },
  sidebar: { width: '220px', backgroundColor: '#1a1a2e', padding: '30px 16px', display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0, minHeight: '100vh' },
  sideTitle: { color: 'white', fontSize: '18px', marginBottom: '6px' },
  sideUser: { color: '#aaa', fontSize: '13px', marginBottom: '16px' },
  sideBtn: { padding: '12px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '14px', backgroundColor: 'transparent', color: '#ccc', transition: 'background .2s' },
  sideBtnActive: { backgroundColor: '#e94560', color: 'white' },
  main: { flex: 1, padding: '30px', overflow: 'auto' },
  flash: { padding: '12px 20px', borderRadius: '8px', marginBottom: '20px', fontWeight: 'bold' },
  salePanel: { display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'center', background: 'linear-gradient(135deg, #fff8ef, #fff)', border: '1px solid #efd9c1', borderRadius: '14px', padding: '16px 18px', marginBottom: '20px', boxShadow: '0 8px 20px rgba(0,0,0,0.04)' },
  saleTitle: { fontSize: '16px', fontWeight: 800, color: '#8f4e14', marginBottom: '4px' },
  saleText: { fontSize: '13px', color: '#6e6257', maxWidth: '560px' },
  saleControls: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  saleInput: { width: '92px', padding: '10px 12px', border: '1px solid #d9c7b3', borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box', textAlign: 'center' },
  saleSuffix: { fontWeight: 'bold', color: '#8f4e14' },
  saleBtn: { backgroundColor: '#8f4e14', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  saleClearBtn: { backgroundColor: '#fff3cd', color: '#856404', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  discountDialog: { backgroundColor: '#ffffff', border: '1px solid #efd9c1', borderRadius: '12px', padding: '14px 16px', marginBottom: '20px', boxShadow: '0 8px 20px rgba(0,0,0,0.05)' },
  discountDialogTitle: { fontSize: '16px', fontWeight: 800, color: '#1a1a2e' },
  discountDialogText: { fontSize: '13px', color: '#6e6257', marginTop: '4px', marginBottom: '10px' },
  discountScopeRow: { display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '10px' },
  scopeLabel: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#444' },
  discountDialogActions: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '10px' },
  selectionCount: { fontSize: '12px', color: '#666', fontWeight: 'bold' },
  discountSelectionList: { maxHeight: '220px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '8px', padding: '8px', backgroundColor: '#fcfcfc' },
  discountSelectionItem: { display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 4px', fontSize: '13px', color: '#333' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  headerActions: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' },
  heading: { fontSize: '24px', color: '#1a1a2e', margin: 0 },
  addBtn: { backgroundColor: '#e94560', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' },
  selectToggleBtn: { backgroundColor: '#eaf3ff', color: '#235cab', border: '1px solid #c8dcff', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' },
  bulkClearSelectedBtn: { backgroundColor: '#fff3cd', color: '#856404', border: '1px solid #f0db93', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' },
  bulkClearAllBtn: { backgroundColor: '#f8d7da', color: '#721c24', border: '1px solid #eab7be', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' },
  form: { backgroundColor: 'white', padding: '24px', borderRadius: '12px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  formTitle: { fontSize: '18px', color: '#1a1a2e', marginTop: 0, marginBottom: '16px' },
  topSubmitRow: { display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' },
  topSubmitBtn: { backgroundColor: '#1a1a2e', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' },
  editingPreviewRow: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px', padding: '10px', border: '1px solid #efefef', borderRadius: '8px', backgroundColor: '#fcfcfc' },
  editingPreviewImage: { width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #eee', flexShrink: 0 },
  editingPreviewFallback: { width: '56px', height: '56px', borderRadius: '8px', border: '1px solid #eee', color: '#9a9a9a', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', flexShrink: 0 },
  editingPreviewTitle: { fontSize: '14px', fontWeight: 'bold', color: '#1a1a2e' },
  editingPreviewSub: { fontSize: '12px', color: '#666', marginTop: '2px' },
  formSection: { fontSize: '13px', fontWeight: 'bold', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '8px 0 4px', borderBottom: '2px solid #e94560', marginBottom: '16px', marginTop: '8px' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
  label: { display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#555', marginBottom: '5px' },
  input: { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'inherit' },
  colorAddRow: { display: 'flex', gap: '8px', alignItems: 'center' },
  smallActionBtn: { border: 'none', backgroundColor: '#1a1a2e', color: '#fff', padding: '10px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' },
  variantList: { marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' },
  variantRow: { display: 'flex', gap: '8px', alignItems: 'center' },
  variantInput: { flex: 1, padding: '9px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit' },
  variantRemoveBtn: { border: 'none', backgroundColor: '#f8d7da', color: '#721c24', padding: '9px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' },
  imageGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px' },
  imageCard: { border: '1px solid #ececec', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#fff', cursor: 'grab' },
  imageThumb: { width: '100%', height: '90px', objectFit: 'cover', display: 'block' },
  imageMeta: { fontSize: '11px', color: '#666', padding: '6px 8px', borderTop: '1px solid #f1f1f1' },
  removeImageBtn: { width: '100%', border: 'none', backgroundColor: '#f8d7da', color: '#721c24', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', padding: '6px 8px' },
  submitBtn: { marginTop: '16px', backgroundColor: '#1a1a2e', color: 'white', border: 'none', padding: '12px 28px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' },
  tableWrap: { backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  filterBar: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '10px', marginBottom: '16px', backgroundColor: '#fff', borderRadius: '10px', padding: '12px', border: '1px solid #eee' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { backgroundColor: '#1a1a2e' },
  th: { padding: '14px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: 'bold' },
  td: { padding: '12px 16px', fontSize: '14px', borderBottom: '1px solid #f0f0f0', verticalAlign: 'middle' },
  productInfoCell: { display: 'flex', alignItems: 'center', gap: '10px' },
  productTableThumb: { width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #ececec', flexShrink: 0 },
  productTableThumbFallback: { width: '44px', height: '44px', borderRadius: '8px', border: '1px solid #ececec', color: '#a0a0a0', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', flexShrink: 0 },
  productInfoName: { fontWeight: 'bold', color: '#1a1a2e', lineHeight: 1.25 },
  productInfoHint: { fontSize: '11px', color: '#7d7d7d', marginTop: '2px' },
  editBtn: { backgroundColor: '#fff3cd', color: '#856404', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', marginRight: '6px', fontSize: '12px' },
  delBtn: { backgroundColor: '#f8d7da', color: '#721c24', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },
};

export default AdminPanel;