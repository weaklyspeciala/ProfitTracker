import { useState, useMemo } from 'react';
import { useAppStore, type Product, type StockPurchase } from '../store';
import { formatCurrency, formatDateDDMMYYYY, toYYYYMMDD, getTodayDDMMYYYY, isValidDDMMYYYY } from '../lib/utils';
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  AlertTriangle,
  Boxes,
  TrendingUp,
  History,
  ShoppingCart,
  CheckCircle2,
  AlertCircle,
  Tag,
  ArrowDownRight,
} from 'lucide-react';

const CATEGORIES = [
  'Notebooks & Registers',
  'Pens & Writing',
  'Paper & Printing',
  'Art Supplies',
  'Office Stationery',
  'Computer & Mobile Accessories',
  'Other',
];

export function ProductsStock() {
  const { products, stockPurchases, addProduct, updateProduct, deleteProduct, restockProduct } = useAppStore();

  const [activeTab, setActiveTab] = useState<'products' | 'purchases'>('products');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'out'>('all');

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [selectedProductForRestock, setSelectedProductForRestock] = useState<Product | null>(null);

  // Notifications
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add / Edit Product Form State
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState(CATEGORIES[0]);
  const [prodPurchaseCost, setProdPurchaseCost] = useState('');
  const [prodSellingPrice, setProdSellingPrice] = useState('');
  const [prodStock, setProdStock] = useState('0');
  const [prodLowStockAlert, setProdLowStockAlert] = useState('5');
  const [prodNotes, setProdNotes] = useState('');

  // Restock Form State
  const [restockProductId, setRestockProductId] = useState('');
  const [restockDate, setRestockDate] = useState(getTodayDDMMYYYY());
  const [restockQty, setRestockQty] = useState('10');
  const [restockUnitCost, setRestockUnitCost] = useState('');
  const [restockNotes, setRestockNotes] = useState('');
  const [updateDefaultCost, setUpdateDefaultCost] = useState(false);

  // Total Metrics
  const totalProductsCount = products.length;
  const lowStockCount = useMemo(() => {
    return products.filter((p) => p.currentStock > 0 && p.currentStock <= p.lowStockAlert).length;
  }, [products]);

  const outOfStockCount = useMemo(() => {
    return products.filter((p) => p.currentStock <= 0).length;
  }, [products]);

  const totalInventoryValue = useMemo(() => {
    return products.reduce((sum, p) => sum + Math.max(0, p.currentStock) * p.purchaseCost, 0);
  }, [products]);

  // Open Add Product Modal
  const handleOpenAddProduct = () => {
    setEditingProductId(null);
    setProdName('');
    setProdCategory(CATEGORIES[0]);
    setProdPurchaseCost('');
    setProdSellingPrice('');
    setProdStock('10');
    setProdLowStockAlert('5');
    setProdNotes('');
    setStatusMessage(null);
    setIsProductModalOpen(true);
  };

  // Open Edit Product Modal
  const handleOpenEditProduct = (prod: Product) => {
    setEditingProductId(prod.id);
    setProdName(prod.name);
    setProdCategory(prod.category);
    setProdPurchaseCost(prod.purchaseCost.toString());
    setProdSellingPrice(prod.sellingPrice ? prod.sellingPrice.toString() : '');
    setProdStock(prod.currentStock.toString());
    setProdLowStockAlert(prod.lowStockAlert.toString());
    setProdNotes(prod.notes || '');
    setStatusMessage(null);
    setIsProductModalOpen(true);
  };

  // Open Restock Modal
  const handleOpenRestock = (prod?: Product) => {
    const targetProd = prod || products[0];
    if (!targetProd) {
      setStatusMessage({ type: 'error', text: 'Please add a product first before recording a stock purchase.' });
      return;
    }
    setSelectedProductForRestock(targetProd);
    setRestockProductId(targetProd.id);
    setRestockDate(getTodayDDMMYYYY());
    setRestockQty('10');
    setRestockUnitCost(targetProd.purchaseCost.toString());
    setRestockNotes('');
    setUpdateDefaultCost(false);
    setStatusMessage(null);
    setIsRestockModalOpen(true);
  };

  const handleRestockProductSelect = (id: string) => {
    setRestockProductId(id);
    const found = products.find((p) => p.id === id);
    if (found) {
      setSelectedProductForRestock(found);
      setRestockUnitCost(found.purchaseCost.toString());
    }
  };

  // Submit Product Form
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const purchaseCostNum = parseFloat(prodPurchaseCost);
    const sellingPriceNum = prodSellingPrice ? parseFloat(prodSellingPrice) : undefined;
    const stockNum = parseFloat(prodStock);
    const alertNum = parseFloat(prodLowStockAlert) || 5;

    if (!prodName.trim()) {
      setStatusMessage({ type: 'error', text: 'Product name cannot be empty.' });
      return;
    }

    if (isNaN(purchaseCostNum) || purchaseCostNum < 0) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid purchase cost.' });
      return;
    }

    if (sellingPriceNum !== undefined && (isNaN(sellingPriceNum) || sellingPriceNum < 0)) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid selling price.' });
      return;
    }

    if (isNaN(stockNum) || stockNum < 0) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid stock quantity (0 or greater).' });
      return;
    }

    if (editingProductId) {
      const res = updateProduct(editingProductId, {
        name: prodName.trim(),
        category: prodCategory,
        purchaseCost: purchaseCostNum,
        sellingPrice: sellingPriceNum,
        currentStock: stockNum,
        lowStockAlert: alertNum,
        notes: prodNotes.trim(),
      });
      if (!res.success) {
        setStatusMessage({ type: 'error', text: res.error || 'Failed to update product.' });
        return;
      }
      setStatusMessage({ type: 'success', text: `Product "${prodName.trim()}" updated successfully.` });
    } else {
      const res = addProduct({
        name: prodName.trim(),
        category: prodCategory,
        purchaseCost: purchaseCostNum,
        sellingPrice: sellingPriceNum,
        currentStock: stockNum,
        lowStockAlert: alertNum,
        notes: prodNotes.trim(),
      });
      if (!res.success) {
        setStatusMessage({ type: 'error', text: res.error || 'Failed to create product.' });
        return;
      }
      setStatusMessage({ type: 'success', text: `Product "${prodName.trim()}" added to catalog.` });
    }

    setIsProductModalOpen(false);
  };

  // Submit Restock Form
  const handleSaveRestock = (e: React.FormEvent) => {
    e.preventDefault();
    const targetProd = products.find((p) => p.id === restockProductId);
    if (!targetProd) {
      setStatusMessage({ type: 'error', text: 'Please select a valid product to restock.' });
      return;
    }

    if (!isValidDDMMYYYY(restockDate)) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid restock date in DD/MM/YYYY format.' });
      return;
    }

    const qtyNum = parseFloat(restockQty);
    const unitCostNum = parseFloat(restockUnitCost);

    if (isNaN(qtyNum) || qtyNum <= 0) {
      setStatusMessage({ type: 'error', text: 'Purchase quantity must be greater than zero.' });
      return;
    }

    if (isNaN(unitCostNum) || unitCostNum < 0) {
      setStatusMessage({ type: 'error', text: 'Unit cost must be zero or greater.' });
      return;
    }

    const totalCost = qtyNum * unitCostNum;
    const res = restockProduct(
      {
        productId: targetProd.id,
        productName: targetProd.name,
        date: toYYYYMMDD(restockDate),
        quantity: qtyNum,
        unitCost: unitCostNum,
        totalCost,
        notes: restockNotes.trim(),
      },
      updateDefaultCost
    );

    if (!res.success) {
      setStatusMessage({ type: 'error', text: res.error || 'Failed to record restock.' });
      return;
    }

    setStatusMessage({
      type: 'success',
      text: `Restocked ${qtyNum} units of "${targetProd.name}". New stock: ${targetProd.currentStock + qtyNum}.`,
    });
    setIsRestockModalOpen(false);
  };

  // Delete product with safety check
  const handleDeleteProduct = (prod: Product) => {
    if (window.confirm(`Are you sure you want to delete "${prod.name}" (${prod.productId})?`)) {
      const res = deleteProduct(prod.id);
      if (!res.success) {
        setStatusMessage({ type: 'error', text: res.error || 'Cannot delete product.' });
      } else {
        setStatusMessage({ type: 'success', text: `Product "${prod.name}" deleted.` });
      }
    }
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase().trim()) ||
        p.productId.toLowerCase().includes(search.toLowerCase().trim()) ||
        (p.notes && p.notes.toLowerCase().includes(search.toLowerCase().trim()));

      if (!matchesSearch) return false;

      if (categoryFilter !== 'All' && p.category !== categoryFilter) return false;

      if (stockStatusFilter === 'low') {
        return p.currentStock > 0 && p.currentStock <= p.lowStockAlert;
      }
      if (stockStatusFilter === 'out') {
        return p.currentStock <= 0;
      }

      return true;
    });
  }, [products, search, categoryFilter, stockStatusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Products & Stock</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage stationery, paper, pens, and cyber cafe stock items with real-time inventory tracking
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleOpenRestock()}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-1.5"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Restock / Purchase</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddProduct}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Status Notifications */}
      {statusMessage && (
        <div
          className={`flex items-start gap-2.5 p-3.5 rounded-xl border text-sm animate-in fade-in duration-150 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="font-semibold text-xs uppercase tracking-wider">
              {statusMessage.type === 'success' ? 'Success' : 'Notice'}
            </p>
            <p className="text-xs mt-0.5">{statusMessage.text}</p>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Inventory Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Products */}
        <div className="bg-white p-5 rounded-2xl border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Products</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{totalProductsCount}</p>
            <p className="text-xs text-slate-400 mt-0.5">Catalog items</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Boxes className="w-6 h-6" />
          </div>
        </div>

        {/* Current Stock Value */}
        <div className="bg-white p-5 rounded-2xl border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Stock Value</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{formatCurrency(totalInventoryValue)}</p>
            <p className="text-xs text-slate-400 mt-0.5">Based on purchase costs</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Low Stock Items */}
        <div
          onClick={() => {
            setStockStatusFilter(stockStatusFilter === 'low' ? 'all' : 'low');
            setActiveTab('products');
          }}
          className={`bg-white p-5 rounded-2xl border shadow-sm flex items-center justify-between cursor-pointer transition-all ${
            stockStatusFilter === 'low' ? 'ring-2 ring-amber-500 border-amber-300' : 'hover:border-amber-300'
          }`}
        >
          <div>
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Low Stock Alerts</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{lowStockCount}</p>
            <p className="text-xs text-slate-400 mt-0.5">At or below alert quantity</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Out of Stock */}
        <div
          onClick={() => {
            setStockStatusFilter(stockStatusFilter === 'out' ? 'all' : 'out');
            setActiveTab('products');
          }}
          className={`bg-white p-5 rounded-2xl border shadow-sm flex items-center justify-between cursor-pointer transition-all ${
            stockStatusFilter === 'out' ? 'ring-2 ring-red-500 border-red-300' : 'hover:border-red-300'
          }`}
        >
          <div>
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wider">Out of Stock</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{outOfStockCount}</p>
            <p className="text-xs text-slate-400 mt-0.5">Needs immediate restock</p>
          </div>
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <ArrowDownRight className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs: Products List vs Stock Purchase History */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="border-b px-5 pt-3 bg-slate-50 flex items-center justify-between">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'products'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Products Catalog ({products.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('purchases')}
              className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'purchases'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Restock History ({stockPurchases.length})</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Products Catalog */}
        {activeTab === 'products' && (
          <div>
            {/* Search & Filter Toolbar */}
            <div className="p-4 border-b bg-slate-50/50 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by product name, ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="All">All Categories</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <select
                  value={stockStatusFilter}
                  onChange={(e) => setStockStatusFilter(e.target.value as any)}
                  className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="all">All Stock Levels</option>
                  <option value="low">Low Stock Only</option>
                  <option value="out">Out of Stock Only</option>
                </select>

                {(search || categoryFilter !== 'All' || stockStatusFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setCategoryFilter('All');
                      setStockStatusFilter('all');
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1.5 rounded hover:bg-slate-200 font-medium"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* Products Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 font-medium border-b">
                  <tr>
                    <th className="px-5 py-3.5">ID</th>
                    <th className="px-5 py-3.5">Product Name & Category</th>
                    <th className="px-5 py-3.5 text-right">Cost (₹)</th>
                    <th className="px-5 py-3.5 text-right">Selling Price (₹)</th>
                    <th className="px-5 py-3.5 text-center">Current Stock</th>
                    <th className="px-5 py-3.5 text-right">Stock Value</th>
                    <th className="px-5 py-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((prod) => {
                    const isOut = prod.currentStock <= 0;
                    const isLow = !isOut && prod.currentStock <= prod.lowStockAlert;
                    const margin =
                      prod.sellingPrice && prod.sellingPrice > prod.purchaseCost
                        ? prod.sellingPrice - prod.purchaseCost
                        : null;

                    return (
                      <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* ID */}
                        <td className="px-5 py-4 font-semibold text-slate-700">{prod.productId}</td>

                        {/* Name & Category */}
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900">{prod.name}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-slate-100 rounded text-slate-600">
                              <Tag className="w-3 h-3 text-slate-400" />
                              {prod.category}
                            </span>
                            {prod.notes && <span className="text-slate-400 truncate max-w-xs">{prod.notes}</span>}
                          </div>
                        </td>

                        {/* Purchase Cost */}
                        <td className="px-5 py-4 text-right text-slate-700 font-medium">
                          {formatCurrency(prod.purchaseCost)}
                        </td>

                        {/* Selling Price */}
                        <td className="px-5 py-4 text-right">
                          {prod.sellingPrice ? (
                            <div>
                              <span className="font-semibold text-slate-900">
                                {formatCurrency(prod.sellingPrice)}
                              </span>
                              {margin !== null && (
                                <div className="text-[11px] text-emerald-600 font-medium">
                                  +{formatCurrency(margin)} margin
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">Not set</span>
                          )}
                        </td>

                        {/* Current Stock */}
                        <td className="px-5 py-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                              isOut
                                ? 'bg-red-100 text-red-700'
                                : isLow
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {prod.currentStock} in stock
                            {isOut && ' (Out)'}
                            {isLow && ' (Low)'}
                          </span>
                        </td>

                        {/* Stock Value */}
                        <td className="px-5 py-4 text-right font-semibold text-slate-800">
                          {formatCurrency(Math.max(0, prod.currentStock) * prod.purchaseCost)}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenRestock(prod)}
                              className="px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                              title="Restock this product"
                            >
                              Restock
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditProduct(prod)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit product"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(prod)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete product"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                        <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <p className="font-medium text-slate-700">No products found</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {search || categoryFilter !== 'All' || stockStatusFilter !== 'all'
                            ? 'Try changing your search or filter options'
                            : 'Click "Add Product" to add notebooks, paper, pens, and stationery items'}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Stock Purchase History */}
        {activeTab === 'purchases' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b">
                <tr>
                  <th className="px-5 py-3.5">Purchase Ref</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Product Name</th>
                  <th className="px-5 py-3.5 text-right">Qty Purchased</th>
                  <th className="px-5 py-3.5 text-right">Unit Cost (₹)</th>
                  <th className="px-5 py-3.5 text-right">Total Cost (₹)</th>
                  <th className="px-5 py-3.5">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stockPurchases.map((pur) => (
                  <tr key={pur.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-semibold text-slate-700">{pur.serialNumber}</td>
                    <td className="px-5 py-4 text-slate-600">{formatDateDDMMYYYY(pur.date)}</td>
                    <td className="px-5 py-4 font-medium text-slate-800">{pur.productName}</td>
                    <td className="px-5 py-4 text-right font-semibold text-emerald-700">
                      +{pur.quantity} units
                    </td>
                    <td className="px-5 py-4 text-right text-slate-700">{formatCurrency(pur.unitCost)}</td>
                    <td className="px-5 py-4 text-right font-bold text-slate-900">
                      {formatCurrency(pur.totalCost)}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">{pur.notes || '-'}</td>
                  </tr>
                ))}

                {stockPurchases.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="font-medium text-slate-700">No restock purchases recorded yet</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Click "Restock / Purchase" above to record incoming stock for any product.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal 1: Add / Edit Product */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b bg-slate-50 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  {editingProductId ? 'Edit Product' : 'Add New Product'}
                </h2>
                <p className="text-xs text-slate-500">
                  {editingProductId ? 'Update product details and default pricing' : 'Create a new stationery or cyber cafe product item'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="e.g. Classmate Spiral Notebook 200p, Ball Pen Blue..."
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Purchase Cost per Unit (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={prodPurchaseCost}
                    onChange={(e) => setProdPurchaseCost(e.target.value)}
                    placeholder="0.00"
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Selling Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={prodSellingPrice}
                    onChange={(e) => setProdSellingPrice(e.target.value)}
                    placeholder="Optional"
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Default sale price</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Current Stock <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    value={prodStock}
                    onChange={(e) => setProdStock(e.target.value)}
                    placeholder="0"
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Units in inventory</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Low Stock Alert
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="1"
                    value={prodLowStockAlert}
                    onChange={(e) => setProdLowStockAlert(e.target.value)}
                    placeholder="5"
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Alert threshold</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  value={prodNotes}
                  onChange={(e) => setProdNotes(e.target.value)}
                  placeholder="e.g. Supplier name, shelf location, size..."
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
                >
                  {editingProductId ? 'Update Product' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Restock / Stock Purchase */}
      {isRestockModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b bg-slate-50 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Record Stock Purchase / Restock</h2>
                <p className="text-xs text-slate-500">
                  Adds newly purchased stock to inventory and records the purchase cost
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRestockModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRestock} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Product <span className="text-red-500">*</span>
                </label>
                <select
                  value={restockProductId}
                  onChange={(e) => handleRestockProductSelect(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.productId} - {p.name} (Current Stock: {p.currentStock})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Restock Date (DD/MM/YYYY) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={restockDate}
                    onChange={(e) => setRestockDate(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Purchase Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="1"
                    value={restockQty}
                    onChange={(e) => setRestockQty(e.target.value)}
                    placeholder="10"
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Unit Purchase Cost (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={restockUnitCost}
                  onChange={(e) => setRestockUnitCost(e.target.value)}
                  placeholder="0.00"
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Real-time Calculation Summary */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
                <div>
                  <span className="text-slate-600">Total Purchase Cost:</span>
                  <p className="text-base font-bold text-emerald-700 mt-0.5">
                    {formatCurrency((parseFloat(restockQty) || 0) * (parseFloat(restockUnitCost) || 0))}
                  </p>
                </div>
                {selectedProductForRestock && (
                  <div className="text-right">
                    <span className="text-slate-600">Stock after Restock:</span>
                    <p className="text-base font-bold text-slate-800 mt-0.5">
                      {selectedProductForRestock.currentStock + (parseFloat(restockQty) || 0)} units
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="updateCostCheck"
                  checked={updateDefaultCost}
                  onChange={(e) => setUpdateDefaultCost(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <label htmlFor="updateCostCheck" className="text-xs text-slate-700 select-none">
                  Update product catalog's default purchase cost with this rate
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes / Supplier (Optional)
                </label>
                <input
                  type="text"
                  value={restockNotes}
                  onChange={(e) => setRestockNotes(e.target.value)}
                  placeholder="e.g. Wholesale invoice #124, Apex Distributor..."
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsRestockModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
                >
                  Confirm Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
