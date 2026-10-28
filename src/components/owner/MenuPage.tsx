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

  // Categories
  const categories = ['All', 'Starters', 'Main Course', 'Breads', 'Desserts', 'Beverages'];

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
    setFormPrice('200');
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
    if (categories.includes(item.category)) {
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

  // Image Selection & Upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = storageService.validateImageFile(file);
    if (!validation.valid) {
      setFormError(validation.error || 'Invalid image file.');
      return;
    }

    setImageFile(file);
    // Create instant local object URL for preview
    const localUrl = URL.createObjectURL(file);
    setImagePreview(localUrl);
    setFormError(null);

    // Upload immediately
    setIsUploadingImage(true);
    setUploadProgress(10);
    try {
      const result = await storageService.uploadFoodImage(restaurant.id, file, (p) => {
        setUploadProgress(p);
      });

      if (result.success && result.url) {
        setFormImageUrl(result.url);
        setImagePreview(result.url);
        setUploadNotice(
          result.storageType === 'cloud-storage'
            ? 'Uploaded to Firebase Cloud Storage'
            : 'Stored as high-fidelity optimized asset'
        );
      } else {
        setFormError(result.error || 'Failed to upload image.');
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormImageUrl('');
    setUploadNotice(null);
  };

  // Save Item
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const priceNum = parseFloat(formPrice);
    if (!formName.trim()) {
      setFormError('Dish name is required.');
      return;
    }
    if (isNaN(priceNum) || priceNum < 0) {
      setFormError('Please enter a valid price in INR (greater than or equal to 0).');
      return;
    }

    const finalCategory = formCategory === 'Custom' ? formCustomCategory.trim() || 'Specialties' : formCategory;
    const itemId = editingItem ? editingItem.id : `item-${Date.now()}`;

    setIsSaving(true);
    try {
      const payload: MenuItem = {
        id: itemId,
        restaurantId: restaurant.id,
        name: formName.trim(),
        description: formDescription.trim(),
        price: priceNum,
        category: finalCategory,
        isVeg: formIsVeg,
        isAvailable: formIsAvailable,
        imageUrl: formImageUrl || undefined,
        createdAt: editingItem?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await restaurantService.saveMenuItem(restaurant.id, payload);
      setIsModalOpen(false);
      await loadItems();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save menu item.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Item
  const handleDeleteItem = async (itemId: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}" from the menu? Historical orders containing this item will be safely preserved.`)) {
      try {
        await restaurantService.deleteMenuItem(restaurant.id, itemId);
        await loadItems();
      } catch (err) {
        alert('Failed to delete item.');
      }
    }
  };

  // Toggle Availability
  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      await restaurantService.saveMenuItem(restaurant.id, {
        ...item,
        isAvailable: !item.isAvailable,
      });
      await loadItems();
    } catch (err) {
      console.error('Failed to toggle availability:', err);
    }
  };

  // Seed demo items for blank accounts
  const handleSeedDemoItems = async () => {
    if (confirm('Load sample authentic Indian dishes into this restaurant menu?')) {
      await restaurantService.seedFirestoreDemoData(restaurant.ownerId, restaurant.id);
      await loadItems();
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
              Menu Management
            </span>
            <span className="text-xs text-slate-400">All prices in Indian Rupees (₹)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Utensils className="w-8 h-8 text-amber-400" />
            Menu & Food Items
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Create and edit dishes, upload food images from your device, and toggle real-time table availability.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {menuItems.length === 0 && (
            <button
              onClick={handleSeedDemoItems}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 border border-slate-700 hover:border-amber-500 text-amber-400 transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load Sample Dishes</span>
            </button>
          )}

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all shadow-md shadow-amber-500/10"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Dish</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search dishes or ingredients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Category tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-slate-500 gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-amber-500" />
          <span className="text-xs">Loading menu dishes...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-slate-800/80 p-8">
          <Utensils className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">No menu items found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {menuItems.length === 0
              ? 'Your restaurant menu is currently empty. Add your first dish or click Load Sample Dishes to get started.'
              : 'No dishes match the selected category or search filter.'}
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-4 px-4 py-2 bg-amber-500 text-slate-950 text-xs font-black rounded-xl hover:bg-amber-400"
          >
            + Add Your First Dish
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`bg-slate-900 border rounded-2xl p-4 flex flex-col justify-between transition-all shadow-lg ${
                item.isAvailable
                  ? 'border-slate-800 hover:border-slate-700'
                  : 'border-slate-800/40 opacity-60 bg-slate-900/50'
              }`}
            >
              <div>
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        item.isVeg ? 'bg-emerald-400' : 'bg-red-400'
                      }`}
                      title={item.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                    />
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      {item.category}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.isAvailable
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}
                  >
                    {item.isAvailable ? 'In Stock' : 'Unavailable'}
                  </span>
                </div>

                <div className="flex gap-3 mt-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white text-base leading-snug">{item.name}</h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                    <p className="text-base font-black text-amber-400 mt-2 font-mono">
                      ₹{item.price.toFixed(2)}
                    </p>
                  </div>

                  {item.imageUrl && (
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-800 flex-shrink-0 border border-slate-700">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Actions footer */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <button
                  onClick={() => handleToggleAvailability(item)}
                  className={`text-[11px] font-semibold underline ${
                    item.isAvailable
                      ? 'text-slate-400 hover:text-amber-400'
                      : 'text-emerald-400 hover:text-emerald-300'
                  }`}
                >
                  {item.isAvailable ? 'Mark Sold Out' : 'Mark In Stock'}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800"
                    title="Edit Item"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item.id, item.name)}
                    className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800"
                    title="Delete Item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-black text-lg text-white mb-1">
              {editingItem ? 'Edit Dish Details' : 'Add Food Item to Menu'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              All prices are saved in INR (₹) and immediately become visible to dining customers scanning table QR codes.
            </p>

            {formError && (
              <div className="mb-4 p-3 bg-red-950/80 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveItem} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Paneer Butter Masala"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Starters">Starters</option>
                    <option value="Main Course">Main Course</option>
                    <option value="Breads">Breads</option>
                    <option value="Desserts">Desserts</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Custom">+ Custom Category</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Price (₹ INR) *</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    placeholder="250"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              {formCategory === 'Custom' && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Custom Category Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Tandoori Specials"
                    value={formCustomCategory}
                    onChange={(e) => setFormCustomCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Ingredients, spice level, preparation style..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Food Image Upload Component */}
              <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                <label className="block text-xs font-bold text-slate-300">
                  Food Dish Image
                </label>

                {imagePreview ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-16 h-16 rounded-xl object-cover border border-slate-700 bg-slate-800"
                    />
                    <div className="flex-1 text-xs">
                      {uploadNotice && (
                        <p className="text-emerald-400 text-[11px] font-semibold flex items-center gap-1 mb-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {uploadNotice}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <label className="cursor-pointer text-amber-400 hover:text-amber-300 font-bold underline">
                          <span>Replace File</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="text-red-400 hover:text-red-300 font-semibold"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 hover:border-amber-500 rounded-xl p-4 cursor-pointer transition-colors group bg-slate-900/50">
                      <UploadCloud className="w-6 h-6 text-slate-400 group-hover:text-amber-400 mb-1" />
                      <span className="text-xs font-bold text-slate-300 group-hover:text-white">
                        Upload food photo from device
                      </span>
                      <span className="text-[10px] text-slate-500 mt-0.5">
                        JPEG, PNG, or WebP up to 5MB
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}

                {isUploadingImage && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Uploading image...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-500 h-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Toggles */}
              <div className="flex items-center justify-between pt-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-300">
                  <input
                    type="checkbox"
                    checked={formIsVeg}
                    onChange={(e) => setFormIsVeg(e.target.checked)}
                    className="rounded text-emerald-500 focus:ring-emerald-500"
                  />
                  <span>🌱 Vegetarian Item</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-300">
                  <input
                    type="checkbox"
                    checked={formIsAvailable}
                    onChange={(e) => setFormIsAvailable(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-amber-500"
                  />
                  <span>Currently Available (In Stock)</span>
                </label>
              </div>

              {/* Footer */}
              <div className="flex gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isUploadingImage}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md"
                >
                  {isSaving ? 'Saving Dish...' : 'Save Menu Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
