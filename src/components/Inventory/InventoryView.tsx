import React, { useState } from 'react';
import { Product, AppSettings, User } from '../../types/pos';
import { StorageService } from '../../utils/storage';
import { RestockModal } from '../Register/Modals/RestockModal';
import {
  Package,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Edit2,
  Trash2,
  Lock,
  ShieldCheck,
  X,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

interface InventoryViewProps {
  currentUser: User;
  settings: AppSettings;
  onOpenMenu: () => void;
  prefillBarcode?: string | null;
  onClearPrefillBarcode?: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  currentUser,
  settings,
  onOpenMenu,
  prefillBarcode,
  onClearPrefillBarcode,
}) => {
  // PIN lock protection state
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() =>
    StorageService.isInventoryUnlocked()
  );
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Products state
  const [products, setProducts] = useState<Product[]>(() => StorageService.getProducts());
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modals state
  const [showProductModal, setShowProductModal] = useState<boolean>(Boolean(prefillBarcode));
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Product form state
  const [formData, setFormData] = useState({
    name: '',
    barcode: prefillBarcode || '',
    sku: '',
    category: 'Beverage',
    price: '',
    costPrice: '',
    stock: '10',
    lowStockThreshold: '5',
    description: '',
  });

  const categories = Array.from(new Set(products.map((p) => p.category))).filter(Boolean);

  const handleUnlockWithPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === settings.inventoryPin) {
      StorageService.setInventoryUnlocked(true);
      setIsUnlocked(true);
      setPinError(null);
    } else {
      setPinError('Incorrect PIN code. Access denied.');
      StorageService.logActivity(
        currentUser,
        'INVENTORY',
        'Failed inventory PIN attempt',
        'User entered incorrect inventory access PIN',
        { severity: 'warning' }
      );
    }
  };

  const handleOpenCreateModal = (barcodeDefault?: string) => {
    setEditingProduct(null);
    setFormData({
      name: '',
      barcode: barcodeDefault || `890${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      sku: `SKU-${Math.floor(100 + Math.random() * 900)}`,
      category: categories[0] || 'General',
      price: '9.99',
      costPrice: '4.50',
      stock: '10',
      lowStockThreshold: '3',
      description: '',
    });
    setShowProductModal(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      barcode: product.barcode,
      sku: product.sku,
      category: product.category,
      price: product.price.toString(),
      costPrice: product.costPrice ? product.costPrice.toString() : '',
      stock: product.stock.toString(),
      lowStockThreshold: product.lowStockThreshold.toString(),
      description: product.description,
    });
    setShowProductModal(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(formData.price) || 0;
    const costNum = parseFloat(formData.costPrice) || 0;
    const stockNum = parseInt(formData.stock, 10) || 0;
    const threshNum = parseInt(formData.lowStockThreshold, 10) || 0;

    if (editingProduct) {
      // Edit existing product
      const updated: Product = {
        ...editingProduct,
        name: formData.name.trim(),
        barcode: formData.barcode.trim(),
        sku: formData.sku.trim(),
        category: formData.category.trim(),
        price: priceNum,
        costPrice: costNum,
        stock: stockNum,
        lowStockThreshold: threshNum,
        description: formData.description.trim(),
        updatedAt: Date.now(),
      };

      const newList = products.map((p) => (p.id === editingProduct.id ? updated : p));
      StorageService.saveProducts(newList);
      setProducts(newList);

      StorageService.logActivity(
        currentUser,
        'INVENTORY',
        'Product updated',
        `Updated product "${updated.name}" (${updated.barcode})`,
        { referenceId: updated.id, severity: 'info' }
      );
    } else {
      // Create new product
      const newProd: Product = {
        id: `prod-${Date.now()}`,
        name: formData.name.trim(),
        barcode: formData.barcode.trim(),
        sku: formData.sku.trim(),
        category: formData.category.trim(),
        price: priceNum,
        costPrice: costNum,
        stock: stockNum,
        lowStockThreshold: threshNum,
        description: formData.description.trim(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const newList = [newProd, ...products];
      StorageService.saveProducts(newList);
      setProducts(newList);

      StorageService.logActivity(
        currentUser,
        'INVENTORY',
        'Product created',
        `Created product "${newProd.name}" (${newProd.barcode}) with ${stockNum} units`,
        { referenceId: newProd.id, severity: 'info' }
      );
    }

    if (onClearPrefillBarcode) onClearPrefillBarcode();
    setShowProductModal(false);
  };

  const handleDeleteProduct = () => {
    if (!productToDelete) return;

    const newList = products.filter((p) => p.id !== productToDelete.id);
    StorageService.saveProducts(newList);
    setProducts(newList);

    StorageService.logActivity(
      currentUser,
      'INVENTORY',
      'Product deleted',
      `Deleted product "${productToDelete.name}" (${productToDelete.barcode})`,
      { referenceId: productToDelete.id, severity: 'danger' }
    );

    setProductToDelete(null);
  };

  // Filter & Sort
  const filteredProducts = products
    .filter((p) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.barcode.includes(q) ||
        p.sku.toLowerCase().includes(q);

      const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;

      let matchesStock = true;
      if (stockFilter === 'in_stock') matchesStock = p.stock > p.lowStockThreshold;
      else if (stockFilter === 'low_stock') matchesStock = p.stock > 0 && p.stock <= p.lowStockThreshold;
      else if (stockFilter === 'out_of_stock') matchesStock = p.stock === 0;

      return matchesSearch && matchesCat && matchesStock;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortBy === 'price') cmp = a.price - b.price;
      else if (sortBy === 'stock') cmp = a.stock - b.stock;

      return sortOrder === 'asc' ? cmp : -cmp;
    });

  // If locked, render PIN screen
  if (!isUnlocked) {
    return (
      <div className="flex flex-col h-screen bg-[#f4f6f8]">
        <header className="h-14 bg-white border-b border-[#e1e3e5] px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#008060]" />
            <h2 className="font-bold text-gray-900 text-sm">Inventory Access</h2>
          </div>
          <button onClick={onOpenMenu} className="p-2 rounded-lg hover:bg-gray-100 border border-gray-200">
            <span className="text-xs font-semibold">Menu</span>
          </button>
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6 max-w-sm w-full text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#008060] flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-gray-900 text-base">Inventory Security Safeguard</h3>
            <p className="text-xs text-gray-500 mt-1 mb-4">
              Enter the store inventory PIN to access stock management (Default: <code>1111</code>)
            </p>

            {pinError && (
              <div className="p-2.5 mb-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                {pinError}
              </div>
            )}

            <form onSubmit={handleUnlockWithPin} className="space-y-3">
              <input
                type="password"
                maxLength={8}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Enter 4-digit PIN (1111)"
                className="w-full text-center font-mono text-lg tracking-widest px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008060]"
                autoFocus
                required
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-[#008060] hover:bg-[#006e52] text-white text-xs font-bold rounded-lg shadow-sm"
              >
                Unlock Inventory
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#f4f6f8]">
      {/* Header */}
      <header className="h-14 bg-white border-b border-[#e1e3e5] px-4 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#008060] text-white flex items-center justify-center font-bold">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-sm">Inventory Management</h2>
            <p className="text-[11px] text-gray-500">{products.length} catalog products</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenCreateModal()}
            className="py-1.5 px-3 bg-[#008060] hover:bg-[#006e52] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
          <button onClick={onOpenMenu} className="p-2 rounded-lg hover:bg-gray-100 border border-gray-200">
            <span className="text-xs font-semibold">Menu</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto p-4 max-w-7xl w-full mx-auto space-y-4">
        {/* Filters Bar */}
        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product name, barcode, SKU..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008060]"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-gray-500 font-medium">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1.5 border border-gray-300 rounded-lg bg-white text-xs font-medium"
            >
              <option value="ALL">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Status Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-gray-500 font-medium">Status:</span>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
              className="px-2.5 py-1.5 border border-gray-300 rounded-lg bg-white text-xs font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock (≤ Threshold)</option>
              <option value="out_of_stock">Out of Stock (0)</option>
            </select>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-semibold">
                <tr>
                  <th
                    className="p-3 cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      if (sortBy === 'name') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      else {
                        setSortBy('name');
                        setSortOrder('asc');
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span>Product</span>
                      <ArrowUpDown className="w-3 h-3 text-gray-400" />
                    </div>
                  </th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Barcode / SKU</th>
                  <th
                    className="p-3 cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      if (sortBy === 'price') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      else {
                        setSortBy('price');
                        setSortOrder('asc');
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span>Price</span>
                      <ArrowUpDown className="w-3 h-3 text-gray-400" />
                    </div>
                  </th>
                  <th
                    className="p-3 cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      if (sortBy === 'stock') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      else {
                        setSortBy('stock');
                        setSortOrder('asc');
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span>Stock Status (Click to Restock)</span>
                      <ArrowUpDown className="w-3 h-3 text-gray-400" />
                    </div>
                  </th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400">
                      No products match your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const isZero = p.stock === 0;
                    const isLow = !isZero && p.stock <= p.lowStockThreshold;

                    return (
                      <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="p-3 font-semibold text-gray-900">
                          {p.name}
                          {p.description && (
                            <p className="text-[11px] text-gray-400 font-normal line-clamp-1">
                              {p.description}
                            </p>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-600 font-medium">
                            {p.category}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-gray-500">
                          <div>{p.barcode}</div>
                          <span className="text-gray-400">{p.sku}</span>
                        </td>
                        <td className="p-3 font-bold text-gray-900">
                          {settings.currencySymbol}
                          {p.price.toFixed(2)}
                        </td>
                        {/* Stock Cell: Clickable to trigger Restock Popup */}
                        <td
                          className="p-3 cursor-pointer"
                          onClick={() => setRestockProduct(p)}
                          title="Click stock quantity to adjust or restock"
                        >
                          <div className="inline-flex items-center gap-1.5">
                            <span
                              className={`px-2 py-1 rounded-md font-bold text-xs ${
                                isZero
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                  : isLow
                                  ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                  : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              }`}
                            >
                              {p.stock} units
                            </span>
                            <span className="text-[11px] text-gray-400 hover:underline">
                              (Adjust)
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setRestockProduct(p)}
                              className="p-1.5 text-gray-600 hover:text-[#008060] rounded hover:bg-gray-100"
                              title="Restock or Remove Stock"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(p)}
                              className="p-1.5 text-gray-600 hover:text-blue-600 rounded hover:bg-gray-100"
                              title="Edit Product"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setProductToDelete(p)}
                              className="p-1.5 text-gray-600 hover:text-red-600 rounded hover:bg-gray-100"
                              title="Delete Product"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <h3 className="font-bold text-gray-900 text-sm">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                onClick={() => {
                  if (onClearPrefillBarcode) onClearPrefillBarcode();
                  setShowProductModal(false);
                }}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 overflow-y-auto space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Colombian Supremo Coffee 500g"
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008060]"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Barcode *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008060]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    SKU Code
                  </label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008060]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Category *
                  </label>
                  <input
                    type="text"
                    required
                    list="cat-suggestions"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008060]"
                  />
                  <datalist id="cat-suggestions">
                    {categories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Selling Price ({settings.currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008060]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Cost Price ({settings.currencySymbol})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008060]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Initial Stock *
                  </label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008060]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Low Stock Alert
                  </label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={formData.lowStockThreshold}
                    onChange={(e) =>
                      setFormData({ ...formData, lowStockThreshold: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008060]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008060]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 text-xs text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-[#008060] hover:bg-[#006e52] rounded-lg shadow-sm"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-5 max-w-sm w-full text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-gray-900 text-sm">Delete Product?</h4>
            <p className="text-xs text-gray-600">
              Are you sure you want to delete &quot;{productToDelete.name}&quot;? Existing past sales and receipt histories will be safely preserved.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setProductToDelete(null)}
                className="px-3 py-1.5 text-xs text-gray-700 bg-gray-100 rounded-md font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProduct}
                className="px-4 py-1.5 text-xs text-white bg-red-600 hover:bg-red-700 rounded-md font-semibold"
              >
                Delete Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {restockProduct && (
        <RestockModal
          product={restockProduct}
          onClose={() => setRestockProduct(null)}
          onStockUpdated={(updated) => {
            const list = products.map((p) => (p.id === updated.id ? updated : p));
            setProducts(list);
          }}
          currentUser={currentUser}
          settingsInventoryPin={settings.inventoryPin}
        />
      )}
    </div>
  );
};
