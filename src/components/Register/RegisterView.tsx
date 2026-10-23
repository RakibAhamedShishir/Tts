import React, { useState, useMemo, useEffect } from 'react';
import {
  Product,
  CartItem,
  Customer,
  Discount,
  Transaction,
  Refund,
  AppSettings,
  User,
} from '../../types/pos';
import { StorageService } from '../../utils/storage';
import {
  calculateCartTotals,
  calculateMostSellingProducts,
} from '../../utils/pos-logic';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import { CustomerSelectModal } from './Modals/CustomerSelectModal';
import { DiscountModal } from './Modals/DiscountModal';
import { OutOfStockModal } from './Modals/OutOfStockModal';
import { RestockModal } from './Modals/RestockModal';
import { CheckoutModal } from './Modals/CheckoutModal';
import { SaleSuccessModal } from './Modals/SaleSuccessModal';
import { RegisterRefundModal } from './Modals/RegisterRefundModal';
import { ThermalReceiptModal } from '../Receipt/ThermalReceiptModal';
import {
  Search,
  Barcode,
  Menu,
  Plus,
  Minus,
  Trash2,
  Tag,
  UserCheck,
  User as UserIcon,
  RotateCcw,
  AlertCircle,
  Wifi,
  Sparkles,
  ShoppingBag,
  Package,
} from 'lucide-react';

interface RegisterViewProps {
  currentUser: User;
  settings: AppSettings;
  onOpenMenu: () => void;
  onOpenAddProductModalWithBarcode?: (barcode: string) => void;
}

export const RegisterView: React.FC<RegisterViewProps> = ({
  currentUser,
  settings,
  onOpenMenu,
  onOpenAddProductModalWithBarcode,
}) => {
  // Inventory state
  const [products, setProducts] = useState<Product[]>(() => StorageService.getProducts());
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    StorageService.getTransactions()
  );

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [discount, setDiscount] = useState<Discount | null>(null);

  // Filtering & Search
  const [selectedCategory, setSelectedCategory] = useState<string>('Most Selling Products');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [manualBarcodeInput, setManualBarcodeInput] = useState<string>('');

  // Modals state
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [outOfStockProduct, setOutOfStockProduct] = useState<Product | null>(null);
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [completedTx, setCompletedTx] = useState<Transaction | null>(null);
  const [receiptToView, setReceiptToView] = useState<{
    tx: Transaction;
    refund?: Refund;
  } | null>(null);
  const [showClearCartConfirm, setShowClearCartConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Refresh products from storage
  const reloadData = () => {
    setProducts(StorageService.getProducts());
    setTransactions(StorageService.getTransactions());
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Compute categories: First is strictly "Most Selling Products"
  const categories = useMemo(() => {
    const rawCategories = Array.from(new Set(products.map((p) => p.category))).filter(Boolean);
    return ['Most Selling Products', ...rawCategories];
  }, [products]);

  // Compute products for selected tab & search
  const displayedProducts = useMemo(() => {
    let list: Product[] = [];

    if (selectedCategory === 'Most Selling Products') {
      list = calculateMostSellingProducts(products, transactions, 20);
    } else {
      list = products.filter((p) => p.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.barcode.includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    return list;
  }, [products, transactions, selectedCategory, searchQuery]);

  // Cart calculations
  const cartTotals = useMemo(() => {
    return calculateCartTotals(cart, discount, settings.taxRate);
  }, [cart, discount, settings.taxRate]);

  // Handle adding product to cart
  const handleAddToCart = (product: Product) => {
    // 1. Check if out of stock
    if (product.stock <= 0) {
      setOutOfStockProduct(product);
      return;
    }

    // 2. Check existing quantity in cart
    const existingIndex = cart.findIndex((item) => item.product.id === product.id);
    const currentQtyInCart = existingIndex >= 0 ? cart[existingIndex].quantity : 0;

    if (currentQtyInCart + 1 > product.stock) {
      showToast(`Cannot add more. Only ${product.stock} units available in inventory.`);
      return;
    }

    if (existingIndex >= 0) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  // Adjust quantity: Qty 0 removes automatically (no delete buttons on rows)
  const handleUpdateQuantity = (productId: string, delta: number) => {
    const existingIndex = cart.findIndex((item) => item.product.id === productId);
    if (existingIndex < 0) return;

    const item = cart[existingIndex];
    const newQty = item.quantity + delta;

    if (delta > 0 && newQty > item.product.stock) {
      showToast(`Maximum available stock (${item.product.stock}) reached.`);
      return;
    }

    if (newQty <= 0) {
      // Automatically remove item
      setCart(cart.filter((c) => c.product.id !== productId));
    } else {
      const updated = [...cart];
      updated[existingIndex].quantity = newQty;
      setCart(updated);
    }
  };

  // Clear Cart
  const handleClearCart = () => {
    if (cart.length > 0) {
      StorageService.logActivity(
        currentUser,
        'CART',
        'Cart cleared',
        `Cleared cart containing ${cartTotals.totalItemsCount} items`,
        { severity: 'info' }
      );
    }
    setCart([]);
    setDiscount(null);
    setSelectedCustomer(null);
    setShowClearCartConfirm(false);
  };

  // Barcode handler
  const handleBarcodeScanned = (scannedCode: string) => {
    const cleanCode = scannedCode.trim();
    if (!cleanCode) return;

    const matchedProduct = products.find(
      (p) => p.barcode === cleanCode || p.sku.toLowerCase() === cleanCode.toLowerCase()
    );

    if (matchedProduct) {
      handleAddToCart(matchedProduct);
      showToast(`Scanned: ${matchedProduct.name}`);
    } else {
      // Unrecognized barcode -> prompt to create new product with prefilled barcode
      if (onOpenAddProductModalWithBarcode) {
        onOpenAddProductModalWithBarcode(cleanCode);
      } else {
        showToast(`Unrecognized barcode: ${cleanCode}. Add to inventory first.`);
      }
    }
  };

  // Global scanner hook
  useBarcodeScanner({
    onScan: handleBarcodeScanned,
    enabled: !showCheckoutModal && !showRefundModal && !showCustomerModal && !showDiscountModal,
  });

  return (
    <div className="flex flex-col h-screen bg-[#f4f6f8] text-[#202223] select-none overflow-hidden">
      {/* Top Navbar */}
      <header className="h-14 bg-white border-b border-[#e1e3e5] px-4 flex items-center justify-between shrink-0 shadow-xs">
        {/* Left: Store branding & Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#008060] text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight text-gray-900 leading-tight">
                {settings.storeName}
              </h1>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>POS Ready</span>
                <span className="text-gray-300">•</span>
                <span>Cashier: <strong className="text-gray-700">{currentUser.username}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Quick Barcode Scan Simulator Input */}
        <div className="hidden sm:flex items-center gap-2 max-w-xs w-full mx-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleBarcodeScanned(manualBarcodeInput);
              setManualBarcodeInput('');
            }}
            className="relative w-full flex items-center"
          >
            <Barcode className="w-4 h-4 text-gray-400 absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              data-barcode-monitor="true"
              value={manualBarcodeInput}
              onChange={(e) => setManualBarcodeInput(e.target.value)}
              placeholder="Scan or type barcode + Enter..."
              className="w-full pl-8 pr-2 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#008060] focus:border-transparent font-mono"
            />
          </form>
        </div>

        {/* Right: Hamburger Menu Button (Three-line hamburger in top-right area) */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenMenu}
            className="p-2 rounded-lg text-gray-700 hover:bg-gray-100 border border-gray-200 shadow-xs flex items-center gap-2 transition-colors"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5 text-gray-800" />
            <span className="text-xs font-semibold hidden md:inline">Menu</span>
          </button>
        </div>
      </header>

      {/* Main Register Body */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left / Center Area: Product Catalog */}
        <main className="flex-1 flex flex-col overflow-hidden p-3 sm:p-4 border-r border-[#e1e3e5]">
          {/* Search bar & Category Tabs */}
          <div className="space-y-3 mb-3 shrink-0">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products by name, barcode, SKU or category..."
                className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-[#c9cccf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008060]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs p-1"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Category Tabs: First category tab MUST be named "Most Selling Products" */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat;
                const isMostSelling = cat === 'Most Selling Products';
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setSearchQuery('');
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#008060] text-white shadow-xs'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-[#e1e3e5]'
                    }`}
                  >
                    {isMostSelling && <Sparkles className="w-3 h-3" />}
                    <span>{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto pr-1">
            {displayedProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                <Package className="w-12 h-12 mb-2 text-gray-300" />
                <p className="text-sm font-semibold text-gray-600">No products found</p>
                <p className="text-xs text-gray-400 mt-1">Try another search term or category tab</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
                {displayedProducts.map((product) => {
                  const isOutOfStock = product.stock <= 0;
                  const isLowStock = !isOutOfStock && product.stock <= product.lowStockThreshold;

                  return (
                    <div
                      key={product.id}
                      onClick={() => handleAddToCart(product)}
                      className={`relative bg-white rounded-xl border p-3 flex flex-col justify-between transition-all cursor-pointer ${
                        isOutOfStock
                          ? 'border-gray-200 bg-gray-50/70 opacity-80 hover:border-red-300'
                          : 'border-[#e1e3e5] hover:border-[#008060] hover:shadow-sm active:scale-[0.99]'
                      }`}
                    >
                      {/* Top Badges */}
                      <div className="flex items-start justify-between gap-1 mb-2">
                        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider truncate">
                          {product.category}
                        </span>

                        {isOutOfStock ? (
                          <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded shrink-0">
                            Out of Stock
                          </span>
                        ) : isLowStock ? (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded shrink-0">
                            Low: {product.stock} left
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0">
                            {product.stock} in stock
                          </span>
                        )}
                      </div>

                      {/* Product Name & Details */}
                      <div>
                        <h4 className="font-semibold text-xs sm:text-sm text-gray-900 line-clamp-2 leading-tight">
                          {product.name}
                        </h4>
                        <p className="text-[11px] font-mono text-gray-400 mt-0.5 truncate">
                          {product.barcode}
                        </p>
                      </div>

                      {/* Price & Action */}
                      <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
                        <span className="font-bold text-sm sm:text-base text-gray-900">
                          {settings.currencySymbol}
                          {product.price.toFixed(2)}
                        </span>

                        <span
                          className={`text-xs px-2.5 py-1 rounded-md font-semibold ${
                            isOutOfStock
                              ? 'text-red-700 bg-red-50 hover:bg-red-100'
                              : 'text-white bg-[#008060] hover:bg-[#006e52]'
                          }`}
                        >
                          {isOutOfStock ? 'Restock' : '+ Add'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>

        {/* Right Area: Cart Column */}
        <aside className="w-full lg:w-96 xl:w-[420px] bg-white flex flex-col shrink-0 border-t lg:border-t-0 shadow-sm">
          {/* Customer and Refund actions: DIRECTLY ABOVE current cart.
              Customer button: approx 75% width. Refund button: approx 25% width. */}
          <div className="p-3 border-b border-[#e1e3e5] bg-gray-50 flex gap-2 shrink-0">
            {/* Customer button (approx 75%) */}
            <button
              onClick={() => setShowCustomerModal(true)}
              className={`w-3/4 py-2.5 px-3 rounded-lg border text-xs font-semibold flex items-center gap-2 truncate transition-colors ${
                selectedCustomer
                  ? 'border-[#008060] bg-emerald-50 text-emerald-900 shadow-xs'
                  : 'border-gray-300 bg-white hover:bg-gray-100 text-gray-700'
              }`}
              title="Select or add customer"
            >
              {selectedCustomer ? (
                <>
                  <UserCheck className="w-4 h-4 text-[#008060] shrink-0" />
                  <span className="truncate">{selectedCustomer.name}</span>
                </>
              ) : (
                <>
                  <UserIcon className="w-4 h-4 text-gray-500 shrink-0" />
                  <span className="truncate">+ Add Customer</span>
                </>
              )}
            </button>

            {/* Refund button (approx 25%) */}
            <button
              onClick={() => setShowRefundModal(true)}
              className="w-1/4 py-2.5 px-2 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
              title="Process refund over current register"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
              <span>Refund</span>
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 divide-y divide-gray-100">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                <ShoppingBag className="w-12 h-12 text-gray-300 mb-2 stroke-[1.5]" />
                <p className="font-semibold text-sm text-gray-600">Cart is empty</p>
                <p className="text-xs text-gray-400 mt-1">
                  Select products from catalog or scan a barcode to begin checkout
                </p>
              </div>
            ) : (
              cart.map((item) => {
                const lineTotal = item.product.price * item.quantity;
                return (
                  <div key={item.product.id} className="pt-2 first:pt-0 flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0 pr-1">
                      <h4 className="text-xs font-semibold text-gray-900 truncate">{item.product.name}</h4>
                      <p className="text-[11px] text-gray-500">
                        {settings.currencySymbol}
                        {item.product.price.toFixed(2)} each
                      </p>
                    </div>

                    {/* Quantity controls: plus and minus. Qty 0 automatically removes. NO separate delete button! */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleUpdateQuantity(item.product.id, -1)}
                        className="w-7 h-7 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 font-bold active:scale-95 transition-all"
                        aria-label={`Decrease quantity of ${item.product.name}`}
                      >
                        <Minus className="w-3 h-3" />
                      </button>

                      <span className="w-6 text-center text-xs font-bold text-gray-900">
                        {item.quantity}
                      </span>

                      <button
                        onClick={() => handleUpdateQuantity(item.product.id, 1)}
                        disabled={item.quantity >= item.product.stock}
                        className="w-7 h-7 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 font-bold active:scale-95 transition-all disabled:opacity-40"
                        aria-label={`Increase quantity of ${item.product.name}`}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Line total */}
                    <div className="w-16 text-right font-bold text-xs text-gray-900">
                      {settings.currencySymbol}
                      {lineTotal.toFixed(2)}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Cart Footer & Totals */}
          <div className="p-4 border-t border-[#e1e3e5] bg-gray-50/50 space-y-2.5 shrink-0">
            {/* Add Discount & Clear Cart Actions */}
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => setShowDiscountModal(true)}
                disabled={cart.length === 0}
                className="py-1.5 px-3 text-xs font-semibold text-[#005bd3] hover:text-[#0047a5] bg-blue-50 hover:bg-blue-100/70 border border-blue-200 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-40"
              >
                <Tag className="w-3.5 h-3.5" />
                <span>{discount ? `Discount: ${discount.label}` : 'Add Discount'}</span>
              </button>

              {cart.length > 0 && (
                <button
                  onClick={() => setShowClearCartConfirm(true)}
                  className="text-xs font-medium text-gray-500 hover:text-red-600 transition-colors"
                >
                  Clear Cart
                </button>
              )}
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-1 text-xs text-gray-600 pt-1">
              <div className="flex justify-between">
                <span>Subtotal ({cartTotals.totalItemsCount} items)</span>
                <span className="font-medium text-gray-800">
                  {settings.currencySymbol}
                  {cartTotals.subtotal.toFixed(2)}
                </span>
              </div>

              {cartTotals.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Discount</span>
                  <span>
                    -{settings.currencySymbol}
                    {cartTotals.discountAmount.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Tax ({settings.taxRate}%)</span>
                <span className="font-medium text-gray-800">
                  {settings.currencySymbol}
                  {cartTotals.taxAmount.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between text-base font-bold text-gray-900 pt-1.5 border-t border-gray-200">
                <span>Total Due</span>
                <span className="text-lg">
                  {settings.currencySymbol}
                  {cartTotals.total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Charge / Checkout Button */}
            <button
              onClick={() => setShowCheckoutModal(true)}
              disabled={cart.length === 0}
              className="w-full py-3.5 px-4 bg-[#008060] hover:bg-[#006e52] text-white text-base font-bold rounded-xl shadow-md flex items-center justify-between transition-all disabled:opacity-40"
            >
              <span>Charge</span>
              <span>
                {settings.currencySymbol}
                {cartTotals.total.toFixed(2)}
              </span>
            </button>
          </div>
        </aside>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-[#202223] text-white text-xs px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <AlertCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Confirmation Modal for Clear Cart */}
      {showClearCartConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-5 max-w-xs w-full text-center space-y-3">
            <h4 className="font-bold text-gray-900 text-sm">Clear Active Cart?</h4>
            <p className="text-xs text-gray-600">
              Are you sure you want to remove all {cartTotals.totalItemsCount} items from the cart?
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setShowClearCartConfirm(false)}
                className="px-3 py-1.5 text-xs text-gray-700 bg-gray-100 rounded-md font-medium"
              >
                Keep Cart
              </button>
              <button
                onClick={handleClearCart}
                className="px-3 py-1.5 text-xs text-white bg-red-600 hover:bg-red-700 rounded-md font-semibold"
              >
                Yes, Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCustomerModal && (
        <CustomerSelectModal
          currentCustomer={selectedCustomer}
          onSelectCustomer={(c) => setSelectedCustomer(c)}
          onClose={() => setShowCustomerModal(false)}
          cashierUser={currentUser}
        />
      )}

      {showDiscountModal && (
        <DiscountModal
          currentDiscount={discount}
          subtotal={cartTotals.subtotal}
          currencySymbol={settings.currencySymbol}
          onApplyDiscount={(d) => setDiscount(d)}
          onClose={() => setShowDiscountModal(false)}
          cashierUser={currentUser}
        />
      )}

      {outOfStockProduct && (
        <OutOfStockModal
          product={outOfStockProduct}
          onClose={() => setOutOfStockProduct(null)}
          onOpenRestock={(prod) => {
            setOutOfStockProduct(null);
            setRestockProduct(prod);
          }}
        />
      )}

      {restockProduct && (
        <RestockModal
          product={restockProduct}
          onClose={() => setRestockProduct(null)}
          onStockUpdated={(updated) => {
            reloadData();
            showToast(`Restocked ${updated.name}: Now ${updated.stock} in stock.`);
          }}
          currentUser={currentUser}
          settingsInventoryPin={settings.inventoryPin}
        />
      )}

      {showCheckoutModal && (
        <CheckoutModal
          cart={cart}
          subtotal={cartTotals.subtotal}
          discount={discount}
          discountAmount={cartTotals.discountAmount}
          taxRate={settings.taxRate}
          taxAmount={cartTotals.taxAmount}
          total={cartTotals.total}
          customer={selectedCustomer}
          cashierUser={currentUser}
          currencySymbol={settings.currencySymbol}
          onClose={() => setShowCheckoutModal(false)}
          onCheckoutSuccess={(tx) => {
            setShowCheckoutModal(false);
            setCompletedTx(tx);
            reloadData();
          }}
        />
      )}

      {completedTx && (
        <SaleSuccessModal
          transaction={completedTx}
          settings={settings}
          onNewSale={() => {
            setCompletedTx(null);
            handleClearCart();
          }}
          onViewReceipt={() => {
            setReceiptToView({ tx: completedTx });
          }}
        />
      )}

      {showRefundModal && (
        <RegisterRefundModal
          onClose={() => setShowRefundModal(false)}
          onRefundCompleted={(refund, originalTx) => {
            reloadData();
            setReceiptToView({ tx: originalTx, refund });
            showToast(`Refund ${refund.id} processed successfully.`);
          }}
          cashierUser={currentUser}
          settings={settings}
        />
      )}

      {receiptToView && (
        <ThermalReceiptModal
          transaction={receiptToView.tx}
          refund={receiptToView.refund}
          settings={settings}
          onClose={() => setReceiptToView(null)}
        />
      )}
    </div>
  );
};
