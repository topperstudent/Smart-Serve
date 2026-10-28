import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  UploadCloud,
  CheckCircle2,
  Utensils,
  Search,
  X,
  AlertCircle,
  RefreshCw,
  Image as ImageIcon,
  Sparkles,
  ShieldCheck,
  Check,
  Tag,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { MenuItem, Restaurant } from '../../types';
import { restaurantService } from '../../services/restaurantService';
import { storageService } from '../../services/storageService';

interface MenuPageProps {
  restaurant: Restaurant;
}

export const MenuPage: React.FC<MenuPageProps> = ({ restaurant }) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Main Course');
  const [formCustomCategory, setFormCustomCategory] = useState('');
  const [formPrice, setFormPrice] = useState<string>('200');
  const [formDescription, setFormDescription] = useState('');
  const [formIsVeg, setFormIsVeg] = useState(true);
  const [formIsAvailable, setFormIsAvailable] = useState(true);
  const [formImageUrl, setFormImageUrl] = useState<string>('');

  // Image Upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load menu items
  const loadItems = async () => {
    setLoading(true);
    try {
      const items = await restaurantService.getMenuItems(restaurant.id);
      setMenuItems(items);
    } catch (e) {
      console.error('Failed to load menu items:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [restaurant.id]);

  // Categories list
  const baseCategories = ['All', 'Starters', 'Main Course', 'Breads', 'Desserts', 'Beverages'];
  const allCategories = Array.from(new Set([...baseCategories, ...menuItems.map((i) => i.category)]));

  const filteredItems = menuItems.filter((item) => {
    const matchCat = selectedCategory === 'All' || item.category === selectedCategory;
    const matchSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormName('');
    setFormCategory('Main Course');
    setFormCustomCategory('');
    setFormPrice('220');
    setFormDescription('');
    setFormIsVeg(true);
    setFormIsAvailable(true);
    setFormImageUrl('');
    setImageFile(null);
    setImagePreview(null);
    setUploadNotice(null);
    setFormError(null);
    setUploadProgress(0);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormName(item.name);
    if (baseCategories.includes(item.category)) {
      setFormCategory(item.category);
      setFormCustomCategory('');
    } else {
      setFormCategory('Custom');
      setFormCustomCategory(item.category);
    }
    setFormPrice(String(item.price));
    setFormDescription(item.description || '');
    setFormIsVeg(item.isVeg);
    setFormIsAvailable(item.isAvailable);
    setFormImageUrl(item.imageUrl || '');
    setImagePreview(item.imageUrl || null);
    setImageFile(null);
    setUploadNotice(null);
    setFormError(null);
    setUploadProgress(0);
    setIsModalOpen(true);
  };

  // Handle device file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFormError(null);
    setUploadNotice(null);

    // Validate size and mime type
    const validation = storageService.validateImageFile(file);
    if (!validation.valid) {
      setFormError(validation.error || 'Invalid file');
      return;
    }

    setImageFile(file);

    // Create instant local preview
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Immediately trigger upload
    setIsUploadingImage(true);
    setUploadProgress(15);

    try {
      const result = await storageService.uploadFoodImage(
        restaurant.id,
        file,
        (progressPercent: number) => setUploadProgress(progressPercent)
      );
      if (result.success && result.url) {
        setFormImageUrl(result.url);
        setUploadNotice(
          result.storageType === 'cloud-storage'
            ? 'Image uploaded securely to Firebase Storage!'
            : 'Image optimized and stored in catalog!'
        );
      } else {
        setFormError(result.error || 'Failed to process image');
      }
    } catch (err: unknown) {
      console.error('Upload error:', err);
      setFormError('Failed to upload image. Please try again or use another image.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Toggle item availability in-place
  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      const updated = !item.isAvailable;
      await restaurantService.saveMenuItem(restaurant.id, {
        ...item,
        isAvailable: updated,
      });
      setMenuItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isAvailable: updated } : i))
      );
    } catch (e) {
      console.error('Failed to toggle availability:', e);
    }
  };

  // Delete item
  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to remove this item from the active menu?')) return;
    try {
      await restaurantService.deleteMenuItem(restaurant.id, itemId);
      setMenuItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (e) {
      console.error('Failed to delete item:', e);
    }
  };

  // Save Add/Edit item form
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim()) {
      setFormError('Item name is required.');
      return;
    }

    const priceNum = parseFloat(formPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setFormError('Please enter a valid price in ₹ (greater than 0).');
      return;
    }

    const resolvedCategory = formCategory === 'Custom' ? formCustomCategory.trim() : formCategory;
    if (!resolvedCategory) {
      setFormError('Category is required.');
      return;
    }

    setIsSaving(true);
    try {
      const itemData: Omit<MenuItem, 'id'> = {
        name: formName.trim(),
        price: priceNum,
        category: resolvedCategory,
        description: formDescription.trim(),
        isVeg: formIsVeg,
        isAvailable: formIsAvailable,
        imageUrl: formImageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80',
        restaurantId: restaurant.id,
      };

      const itemToSave: MenuItem = {
        id: editingItem ? editingItem.id : `item-${Date.now()}`,
        ...itemData,
      };
      await restaurantService.saveMenuItem(restaurant.id, itemToSave);

      await loadItems();
      setIsModalOpen(false);
    } catch (err: unknown) {
      console.error('Save menu item error:', err);
      setFormError('Failed to save menu item. Please check network connection.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070A0F] text-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                MENU CATALOG
              </span>
              <span className="text-slate-500">·</span>
              <span className="text-xs text-slate-400 font-medium">
                {menuItems.length} active dishes in catalog
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              Menu & Food Catalog
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Add photos from device, toggle live 86 / sold-out status, and manage categories.
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add New Dish</span>
          </button>
        </div>

        {/* Search & Category Filter Chips */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes by name or ingredients..."
              className="w-full bg-slate-900 border border-white/[0.1] rounded-2xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
            {allCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'bg-slate-900 border border-white/[0.08] text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Items Grid */}
        {loading ? (
          <div className="text-center py-20">
            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-400 font-medium">Loading restaurant menu...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-white/[0.08] p-8 max-w-md mx-auto">
            <Utensils className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white">No dishes found</h3>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery
                ? `No dishes matching "${searchQuery}".`
                : 'No items in this category yet. Click Add New Dish to expand your menu.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className={`flex flex-col justify-between rounded-2xl bg-[#0F172A] border transition-all duration-200 overflow-hidden shadow-xl glass-card-hover ${
                  item.isAvailable ? 'border-white/[0.08]' : 'border-slate-800 opacity-60 bg-slate-950/80'
                }`}
              >
                {/* Dish Photo with Category & Dietary Badges */}
                <div className="relative aspect-[16/10] bg-slate-950 overflow-hidden group">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                      !item.isAvailable ? 'grayscale' : ''
                    }`}
                    onError={(e) => {
                      // Fallback image if broken
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent pointer-events-none" />

                  {/* Badges in photo corners */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    {/* Indian Veg/Non-Veg icon */}
                    <div
                      className={`w-5 h-5 bg-slate-950/90 backdrop-blur-md border rounded flex items-center justify-center p-0.5 shadow-md ${
                        item.isVeg ? 'border-emerald-500' : 'border-red-500'
                      }`}
                      title={item.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                    >
                      <div className={`w-2 h-2 rounded-full ${item.isVeg ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    </div>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900/90 backdrop-blur-md text-slate-300 border border-white/[0.1]">
                      {item.category}
                    </span>
                  </div>

                  {/* Sold out stamp if unavailable */}
                  {!item.isAvailable && (
                    <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center">
                      <span className="px-3 py-1 rounded-xl bg-red-600/90 text-white text-xs font-black uppercase tracking-wider shadow-lg">
                        Sold Out (86'd)
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-white text-sm leading-snug line-clamp-1">{item.name}</h3>
                      <span className="font-mono font-black text-amber-400 text-sm whitespace-nowrap">
                        ₹{item.price}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {item.description || 'Freshly prepared signature dish from our kitchen.'}
                    </p>
                  </div>

                  {/* Card Controls */}
                  <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-between">
                    {/* Live in-stock toggle */}
                    <button
                      onClick={() => handleToggleAvailability(item)}
                      className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${
                        item.isAvailable ? 'text-emerald-400 hover:text-emerald-300' : 'text-slate-500 hover:text-slate-400'
                      }`}
                    >
                      {item.isAvailable ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>In Stock</span>
                        </>
                      ) : (
                        <>
                          <X className="w-4 h-4 text-red-400" />
                          <span>Sold Out</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 text-slate-400 hover:text-amber-400 rounded-lg hover:bg-slate-800 transition-colors"
                        title="Edit dish details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors"
                        title="Delete dish"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Dish Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0F172A] border border-white/[0.12] rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-amber-400" />
                  {editingItem ? 'Edit Dish Details' : 'Add New Dish to Menu'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Update photo, price in ₹, dietary status, and category
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-950/50 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {uploadNotice && (
              <div className="p-3 bg-emerald-950/50 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                <span>{uploadNotice}</span>
              </div>
            )}

            <form onSubmit={handleSaveItem} className="space-y-4">
              {/* Photo Upload Zone */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Food Photo (From your Device):
                </label>
                <div className="flex items-start gap-4 p-3 bg-slate-950 rounded-2xl border border-white/[0.08]">
                  {/* Image Preview Box */}
                  <div className="w-24 h-24 rounded-xl bg-slate-900 border border-white/[0.1] overflow-hidden flex-shrink-0 flex items-center justify-center relative">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-slate-600" />
                    )}
                    {isUploadingImage && (
                      <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center">
                        <RefreshCw className="w-5 h-5 text-amber-400 animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Upload Controls */}
                  <div className="flex-1 space-y-2">
                    <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl cursor-pointer border border-white/[0.1] transition-colors">
                      <UploadCloud className="w-4 h-4 text-amber-400" />
                      <span>Choose Photo from Device</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Supports JPG, PNG, WebP up to 5MB. Optimizes automatically for high-res mobile displays.
                    </p>
                    {isUploadingImage && (
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-amber-500 h-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Dish Name */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Dish Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Paneer Butter Masala"
                  className="w-full bg-slate-900 border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
                />
              </div>

              {/* Price & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Price (₹ INR) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full bg-slate-900 border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500/60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/60"
                  >
                    <option value="Starters">Starters</option>
                    <option value="Main Course">Main Course</option>
                    <option value="Breads">Breads</option>
                    <option value="Desserts">Desserts</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Custom">+ Custom Category</option>
                  </select>
                </div>
              </div>

              {formCategory === 'Custom' && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Custom Category Name</label>
                  <input
                    type="text"
                    required
                    value={formCustomCategory}
                    onChange={(e) => setFormCustomCategory(e.target.value)}
                    placeholder="e.g. Sizzlers or Biryani Specials"
                    className="w-full bg-slate-900 border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/60"
                  />
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Description / Notes</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Ingredients, preparation style, spice level..."
                  className="w-full bg-slate-900 border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 resize-none h-18"
                />
              </div>

              {/* Dietary (Veg / Non-Veg) & Stock Availability Switches */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* Veg switch */}
                <div
                  onClick={() => setFormIsVeg(!formIsVeg)}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-white/[0.08] cursor-pointer hover:border-white/[0.16] transition-all"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 border flex items-center justify-center p-0.5 rounded-sm ${
                        formIsVeg ? 'border-emerald-500' : 'border-red-500'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${formIsVeg ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    </div>
                    <span className="text-xs font-bold text-white">
                      {formIsVeg ? 'Vegetarian' : 'Non-Veg'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold">Toggle</span>
                </div>

                {/* In Stock switch */}
                <div
                  onClick={() => setFormIsAvailable(!formIsAvailable)}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-white/[0.08] cursor-pointer hover:border-white/[0.16] transition-all"
                >
                  <span className="text-xs font-bold text-white">
                    {formIsAvailable ? 'In Stock' : 'Sold Out'}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      formIsAvailable ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {formIsAvailable ? 'Active' : '86\'d'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isUploadingImage}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-slate-950 text-xs font-black rounded-xl flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all"
                >
                  {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  <span>{editingItem ? 'Update Dish' : 'Save Dish to Menu'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
