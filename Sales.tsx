import { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore, type Sale } from '../store';
import {
  formatCurrency,
  formatDateDDMMYYYY,
  toYYYYMMDD,
  getTodayDDMMYYYY,
  isValidDDMMYYYY,
} from '../lib/utils';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Calendar,
  TrendingUp,
  AlertCircle,
  Package,
  Zap,
  HelpCircle,
  Tag,
  Check,
  CreditCard,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

export const PAYMENT_TYPES = [
  'Cash',
  'Credit Card',
  'Debit Card',
  'UPI',
  'NEFT',
  'IMPS',
  'RTGS',
  'Bank Transfer',
  'Cheque',
  'Other',
] as const;

export type PaymentTypeOption = typeof PAYMENT_TYPES[number];

const COMMON_SERVICES = [
  'Printing / Xerox',
  'Document Scanning',
  'Online Form / Application Fee',
  'Money Transfer Assistance Fee',
  'Passport Photo Print',
  'Lamination',
  'Color Printout',
];

export function Sales() {
  const { sales, products, savedServices, addSale, updateSale, deleteSale } = useAppStore();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'product' | 'service'>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

  // Form State
  const [saleType, setSaleType] = useState<'product' | 'service'>('product');
  const [date, setDate] = useState(getTodayDDMMYYYY());
  const [paymentType, setPaymentType] = useState<string>('Cash');
  const [formError, setFormError] = useState('');

  // Product Sale Fields
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [quantity, setQuantity] = useState('1');
  const [unitCost, setUnitCost] = useState('');
  const [unitPrice, setUnitPrice] = useState('');

  // Service Sale Fields & Searchable Particular
  const [particular, setParticular] = useState('');
  const [isParticularDropdownOpen, setIsParticularDropdownOpen] = useState(false);
  const particularContainerRef = useRef<HTMLDivElement>(null);
  const saleAmountInputRef = useRef<HTMLInputElement>(null);

  const [saleAmount, setSaleAmount] = useState('');
  const [directCost, setDirectCost] = useState('');

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (particularContainerRef.current && !particularContainerRef.current.contains(event.target as Node)) {
        setIsParticularDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const matchingSavedServices = useMemo(() => {
    const list = savedServices || [];
    const term = particular.trim().toLowerCase();
    if (!term) return list;
    return list.filter((s) => s.name.toLowerCase().includes(term));
  }, [savedServices, particular]);

  const hasExactServiceMatch = useMemo(() => {
    const term = particular.trim().toLowerCase();
    if (!term) return false;
    return (savedServices || []).some((s) => s.name.trim().toLowerCase() === term);
  }, [savedServices, particular]);

  const handleSelectService = (serviceName: string) => {
    setParticular(serviceName);
    setIsParticularDropdownOpen(false);
    setTimeout(() => {
      saleAmountInputRef.current?.focus();
    }, 50);
  };

  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId) || null;
  }, [products, selectedProductId]);

  const resetForm = () => {
    setDate(getTodayDDMMYYYY());
    setSaleType('product');
    setPaymentType('Cash');
    setSelectedProductId('');
    setProductSearch('');
    setIsProductDropdownOpen(false);
    setIsParticularDropdownOpen(false);
    setQuantity('1');
    setUnitCost('');
    setUnitPrice('');
    setParticular('');
    setSaleAmount('');
    setDirectCost('');
    setFormError('');
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleSelectProduct = (prodId: string) => {
    setSelectedProductId(prodId);
    setIsProductDropdownOpen(false);
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      setProductSearch(prod.name);
      setUnitCost(prod.purchaseCost.toString());
      setUnitPrice(prod.sellingPrice ? prod.sellingPrice.toString() : prod.purchaseCost.toString());
      if (!particular || particular.startsWith('Sale:')) {
        setParticular(`${prod.name} (x${quantity || 1})`);
      }
    }
  };

  const handleQuantityChange = (newQtyStr: string) => {
    setQuantity(newQtyStr);
    if (selectedProduct) {
      setParticular(`${selectedProduct.name} (x${newQtyStr || 1})`);
    }
  };

  // Open Edit Form
  const handleEdit = (sale: Sale) => {
    setEditingId(sale.id);
    setDate(formatDateDDMMYYYY(sale.date));
    setPaymentType(sale.paymentType || 'Cash');
    setFormError('');

    if (sale.saleType === 'product') {
      setSaleType('product');
      setSelectedProductId(sale.productId || '');
      setProductSearch(sale.productName || sale.particular);
      setQuantity((sale.quantity || 1).toString());
      setUnitCost((sale.unitCost || 0).toString());
      setUnitPrice((sale.unitPrice || (sale.saleAmount / (sale.quantity || 1))).toString());
      setParticular(sale.particular);
      setSaleAmount(sale.saleAmount.toString());
      setDirectCost('');
    } else {
      setSaleType('service');
      setSelectedProductId('');
      setProductSearch('');
      setQuantity('');
      setUnitCost('');
      setUnitPrice('');
      setParticular(sale.particular);
      setSaleAmount(sale.saleAmount.toString());
      setDirectCost(sale.costAmount !== undefined && sale.costAmount > 0 ? sale.costAmount.toString() : '');
    }

    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Live Calculations for Product Sale
  const numQty = parseFloat(quantity) || 0;
  const numUnitCost = parseFloat(unitCost) || 0;
  const numUnitPrice = parseFloat(unitPrice) || 0;
  const productTotalCost = numQty * numUnitCost;
  const productTotalSale = numQty * numUnitPrice;
  const productProfit = productTotalSale - productTotalCost;

  // Live Calculations for Service Sale
  const numServiceSale = parseFloat(saleAmount) || 0;
  const numDirectCost = directCost ? parseFloat(directCost) || 0 : 0;
  const serviceGrossProfit = numServiceSale - numDirectCost;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const trimmedDate = date.trim();
    if (!trimmedDate || !isValidDDMMYYYY(trimmedDate)) {
      setFormError('Please enter a valid date in DD/MM/YYYY format.');
      return;
    }

    const standardDate = toYYYYMMDD(trimmedDate);
    const selectedPaymentType = paymentType || 'Cash';

    if (saleType === 'product') {
      if (!selectedProductId || !selectedProduct) {
        setFormError('Please select a product from the list.');
        return;
      }

      if (numQty <= 0) {
        setFormError('Quantity sold must be at least 1.');
        return;
      }

      if (numUnitPrice < 0) {
        setFormError('Selling price cannot be negative.');
        return;
      }

      // Check stock
      if (selectedProduct.currentStock < numQty && !editingId) {
        const proceed = window.confirm(
          `Warning: Current stock for "${selectedProduct.name}" is ${selectedProduct.currentStock}, but you are selling ${numQty}. Proceed with sale?`
        );
        if (!proceed) return;
      }

      const finalParticular = particular.trim() || `${selectedProduct.name} (x${numQty})`;

      const payload = {
        date: standardDate,
        saleType: 'product' as const,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        quantity: numQty,
        unitCost: numUnitCost,
        unitPrice: numUnitPrice,
        particular: finalParticular,
        costAmount: productTotalCost,
        saleAmount: productTotalSale,
        paymentType: selectedPaymentType,
        isCostRecorded: true,
      };

      if (editingId) {
        updateSale(editingId, payload);
      } else {
        addSale(payload);
      }
    } else {
      // Service Sale
      const trimmedParticular = particular.trim();
      if (!trimmedParticular) {
        setFormError('Please describe the service provided.');
        return;
      }

      if (isNaN(numServiceSale) || numServiceSale <= 0) {
        setFormError('Please enter a valid sale amount greater than 0.');
        return;
      }

      if (directCost && (isNaN(numDirectCost) || numDirectCost < 0)) {
        setFormError('Direct cost must be 0 or greater.');
        return;
      }

      const payload = {
        date: standardDate,
        saleType: 'service' as const,
        particular: trimmedParticular,
        costAmount: numDirectCost,
        saleAmount: numServiceSale,
        paymentType: selectedPaymentType,
        isCostRecorded: true,
      };

      if (editingId) {
        updateSale(editingId, payload);
      } else {
        addSale(payload);
      }
    }

    resetForm();
  };

  const handleDelete = (sale: Sale) => {
    const isProd = sale.saleType === 'product';
    const msg = isProd
      ? `Are you sure you want to delete this sale? This will return ${sale.quantity || 1} unit(s) of "${sale.productName || sale.particular}" back to inventory stock.`
      : 'Are you sure you want to delete this sale record?';

    if (window.confirm(msg)) {
      deleteSale(sale.id);
      if (editingId === sale.id) resetForm();
    }
  };

  // Filtered sales
  const filteredSales = useMemo(() => {
    return sales
      .filter((sale) => {
        const matchesSearch =
          sale.particular.toLowerCase().includes(search.toLowerCase().trim()) ||
          sale.serialNumber.toLowerCase().includes(search.toLowerCase().trim()) ||
          (sale.productName && sale.productName.toLowerCase().includes(search.toLowerCase().trim())) ||
          (sale.paymentType && sale.paymentType.toLowerCase().includes(search.toLowerCase().trim()));

        if (!matchesSearch) return false;

        if (typeFilter !== 'all') {
          const type = sale.saleType || 'service';
          if (type !== typeFilter) return false;
        }

        if (paymentFilter !== 'all') {
          if (paymentFilter === 'unspecified') {
            if (sale.paymentType) return false;
          } else {
            if (sale.paymentType !== paymentFilter) return false;
          }
        }

        if (dateFilter) {
          const saleFormattedDate = formatDateDDMMYYYY(sale.date);
          const saleIsoDate = sale.date.split('T')[0];
          return saleFormattedDate.includes(dateFilter.trim()) || saleIsoDate.includes(dateFilter.trim());
        }

        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [sales, search, dateFilter, typeFilter, paymentFilter]);

  // Aggregate Metrics
  const totalSalesRevenue = useMemo(() => {
    return filteredSales.reduce((sum, s) => sum + (s.saleAmount || 0), 0);
  }, [filteredSales]);

  const totalCostOfSales = useMemo(() => {
    return filteredSales.reduce((sum, s) => {
      if (s.isCostRecorded || (s.costAmount !== undefined && s.costAmount > 0)) {
        return sum + (s.costAmount || 0);
      }
      return sum;
    }, 0);
  }, [filteredSales]);

  const grossProfitTotal = useMemo(() => {
    return filteredSales.reduce((sum, s) => {
      const cost = s.costAmount || 0;
      const margin = s.saleAmount - cost;
      if (margin > 0) return sum + margin;
      return sum;
    }, 0);
  }, [filteredSales]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sales</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Record stationery product sales with automatic stock deduction, or cyber cafe service fees
          </p>
        </div>

        <button
          onClick={() => {
            if (isFormOpen && !editingId) {
              setIsFormOpen(false);
            } else {
              resetForm();
              setIsFormOpen(true);
            }
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm text-sm"
        >
          {isFormOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {isFormOpen ? 'Close Form' : 'New Sale'}
        </button>
      </div>

      {/* Sales Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Sales Revenue</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalSalesRevenue)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{filteredSales.length} transaction(s)</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Recorded Cost</p>
          <p className="text-2xl font-bold text-slate-700 mt-1">{formatCurrency(totalCostOfSales)}</p>
          <p className="text-xs text-slate-400 mt-0.5">Inventory & direct service costs</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border shadow-sm">
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Gross Profit</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(grossProfitTotal)}</p>
          <p className="text-xs text-emerald-700 mt-0.5">Revenue − Recorded costs</p>
        </div>
      </div>

      {/* Sales Form with Sale Type Selector */}
      {isFormOpen && (
        <div className="bg-white p-6 rounded-2xl border shadow-sm animate-in fade-in duration-150">
          <div className="flex justify-between items-center mb-5">
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {editingId ? 'Edit Sale Record' : 'Record New Sale'}
              </h2>
              <p className="text-xs text-slate-500">
                Choose Product Sale to deduct shop inventory, or Service Sale for cyber cafe tasks
              </p>
            </div>
            <button
              onClick={resetForm}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {formError && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Sale Type Selector */}
            <div className="flex rounded-xl bg-slate-100 p-1 max-w-md">
              <button
                type="button"
                onClick={() => setSaleType('product')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
                  saleType === 'product'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>Product Sale (Stationery / Items)</span>
              </button>

              <button
                type="button"
                onClick={() => setSaleType('service')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
                  saleType === 'service'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Zap className="w-4 h-4" />
                <span>Service / Cyber Cafe Sale</span>
              </button>
            </div>

            {/* Date & Payment Type Fields (Common to both) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Sale Date (DD/MM/YYYY) <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setDate(getTodayDDMMYYYY())}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Today
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                  <Calendar className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Type <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium text-slate-800"
                >
                  {PAYMENT_TYPES.map((pt) => (
                    <option key={pt} value={pt}>
                      {pt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* SECTION A: Product Sale Form */}
            {saleType === 'product' && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Searchable Product Dropdown */}
                  <div className="relative md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Select Product from Inventory <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search product by name or ID..."
                        value={productSearch}
                        onChange={(e) => {
                          setProductSearch(e.target.value);
                          setIsProductDropdownOpen(true);
                        }}
                        onFocus={() => setIsProductDropdownOpen(true)}
                        className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                      <Package className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Dropdown Options */}
                    {isProductDropdownOpen && (
                      <div className="absolute z-20 mt-1 w-full bg-white border rounded-xl shadow-xl max-h-56 overflow-y-auto">
                        {products
                          .filter(
                            (p) =>
                              p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                              p.productId.toLowerCase().includes(productSearch.toLowerCase())
                          )
                          .map((prod) => (
                            <button
                              key={prod.id}
                              type="button"
                              onClick={() => handleSelectProduct(prod.id)}
                              className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50 border-b border-slate-100 flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-semibold text-slate-800">{prod.name}</span>
                                <div className="text-[11px] text-slate-500">
                                  {prod.productId} • Cost: {formatCurrency(prod.purchaseCost)} • Price:{' '}
                                  {prod.sellingPrice ? formatCurrency(prod.sellingPrice) : 'Not set'}
                                </div>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                                  prod.currentStock <= 0
                                    ? 'bg-red-100 text-red-700'
                                    : prod.currentStock <= prod.lowStockAlert
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {prod.currentStock} in stock
                              </span>
                            </button>
                          ))}
                        {products.length === 0 && (
                          <div className="p-4 text-center text-xs text-slate-500">
                            No products found. Add products in Products & Stock.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quantity Sold */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Quantity Sold <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="1"
                      value={quantity}
                      onChange={(e) => handleQuantityChange(e.target.value)}
                      placeholder="1"
                      className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                    />
                    {selectedProduct && (
                      <p className="text-[11px] text-slate-500 mt-1">
                        Stock available: <strong>{selectedProduct.currentStock} units</strong>
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {/* Selling Price per Unit */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Selling Price per Unit (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Rate charged to customer</p>
                  </div>

                  {/* Unit Purchase Cost (Editable for this transaction) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Unit Purchase Cost (₹)
                      </label>
                      <span className="text-[10px] text-slate-400" title="Adjustable for this sale">
                        Adjustable
                      </span>
                    </div>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={unitCost}
                      onChange={(e) => setUnitCost(e.target.value)}
                      placeholder="0.00"
                      className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Does not change default product catalog cost
                    </p>
                  </div>

                  {/* Particular description */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Particular / Memo
                    </label>
                    <input
                      type="text"
                      value={particular}
                      onChange={(e) => setParticular(e.target.value)}
                      placeholder="Item description..."
                      className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Real-time Financial Breakdown for Product Sale */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-3 gap-3 text-center">
                  <div>
                    <span className="text-xs text-slate-500 block">Total Cost</span>
                    <span className="text-sm font-semibold text-slate-800">
                      {formatCurrency(productTotalCost)}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {numQty} × {formatCurrency(numUnitCost)}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-slate-500 block">Total Sale</span>
                    <span className="text-base font-bold text-blue-700">
                      {formatCurrency(productTotalSale)}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {numQty} × {formatCurrency(numUnitPrice)}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-slate-500 block">Profit / Loss</span>
                    <span
                      className={`text-base font-bold ${
                        productProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {productProfit >= 0 ? '+' : ''}
                      {formatCurrency(productProfit)}
                    </span>
                    <span className="text-[10px] text-slate-400 block">Sale − Cost</span>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION B: Service Sale Form */}
            {saleType === 'service' && (
              <div className="space-y-4 pt-2">
                <div ref={particularContainerRef} className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Service Particular <span className="text-red-500">*</span>
                    </label>
                    <Link
                      to="/settings"
                      className="text-[11px] text-purple-600 hover:text-purple-800 font-medium transition-colors"
                    >
                      Manage saved names →
                    </Link>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={particular}
                      onChange={(e) => {
                        setParticular(e.target.value);
                        setIsParticularDropdownOpen(true);
                      }}
                      onFocus={() => setIsParticularDropdownOpen(true)}
                      placeholder="Search saved service or type custom name (e.g. B/W Print, Scanning)..."
                      className="w-full border rounded-lg pl-3 pr-9 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setIsParticularDropdownOpen((prev) => !prev)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-150 ${
                          isParticularDropdownOpen ? 'rotate-180 text-purple-600' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {/* Searchable Dropdown Menu */}
                  {isParticularDropdownOpen && (
                    <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100 animate-in fade-in duration-100">
                      <div className="p-2 bg-slate-50 text-[11px] font-semibold text-slate-500 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3 text-purple-500" />
                          Saved Service / Product Names
                        </span>
                        <span className="text-[10px] text-slate-400">Click to select & enter amount</span>
                      </div>

                      {matchingSavedServices.length > 0 ? (
                        matchingSavedServices.map((srv) => {
                          const isSelected = particular.trim().toLowerCase() === srv.name.toLowerCase();
                          return (
                            <button
                              key={srv.id}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelectService(srv.name);
                              }}
                              className={`w-full text-left px-3.5 py-2.5 hover:bg-purple-50 flex items-center justify-between text-xs transition-colors ${
                                isSelected ? 'bg-purple-50 text-purple-900 font-semibold' : 'text-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                                <span>{srv.name}</span>
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-purple-600 shrink-0" />}
                            </button>
                          );
                        })
                      ) : (
                        <div className="p-3 text-center text-xs text-slate-500">
                          No saved services matching "{particular}"
                        </div>
                      )}

                      {/* Custom entry fallback option */}
                      {particular.trim() && !hasExactServiceMatch && (
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectService(particular.trim());
                          }}
                          className="w-full text-left px-3.5 py-2.5 bg-purple-50/50 hover:bg-purple-100 text-purple-700 text-xs font-medium flex items-center gap-2 transition-colors border-t border-slate-100"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          <span>
                            Use custom: <strong>"{particular.trim()}"</strong>
                          </span>
                        </button>
                      )}

                      <div className="p-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                        <span>{(savedServices || []).length} saved names</span>
                        <Link
                          to="/settings"
                          className="text-purple-600 hover:text-purple-800 font-medium underline"
                        >
                          + Add new in Settings
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Quick Select Suggestion Pills */}
                  {(savedServices || []).length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[11px] font-medium text-slate-400 mr-1 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-purple-500" />
                        Quick Select:
                      </span>
                      {(savedServices || []).slice(0, 8).map((srv) => {
                        const isSelected = particular.trim().toLowerCase() === srv.name.toLowerCase();
                        return (
                          <button
                            key={srv.id}
                            type="button"
                            onClick={() => handleSelectService(srv.name)}
                            className={`px-2.5 py-1 text-xs rounded-lg transition-colors font-medium border ${
                              isSelected
                                ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                                : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200/60'
                            }`}
                          >
                            {srv.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Sale Amount */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Sale Amount (Fee Charged) (₹) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                        ₹
                      </span>
                      <input
                        ref={saleAmountInputRef}
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={saleAmount}
                        onChange={(e) => setSaleAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full border rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 font-semibold"
                      />
                    </div>
                  </div>

                  {/* Optional Direct Cost */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Direct Cost (₹) <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={directCost}
                        onChange={(e) => setDirectCost(e.target.value)}
                        placeholder="0.00 (leave empty if no direct cost)"
                        className="w-full border rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Direct expense (e.g. photo paper, card sheet). If ₹0, entire fee is Gross Profit.
                    </p>
                  </div>
                </div>

                {/* Real-time Calculation for Service Sale */}
                <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between text-xs text-purple-900">
                  <div>
                    <span className="text-slate-600 block">Service Fee Received:</span>
                    <span className="text-base font-bold text-purple-800">
                      {formatCurrency(numServiceSale)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600 block">Direct Cost:</span>
                    <span className="text-sm font-semibold text-slate-700">
                      {formatCurrency(numDirectCost)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-700 font-semibold block">
                      Gross Profit (before expenses):
                    </span>
                    <span className="text-base font-bold text-emerald-600">
                      +{formatCurrency(serviceGrossProfit)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
              >
                Save Sale
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sales Transactions Table */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        {/* Filter Toolbar */}
        <div className="p-4 border-b bg-slate-50 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by particular, product, S/N, payment..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Sale Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">All Sale Types</option>
              <option value="product">Products Only</option>
              <option value="service">Services Only</option>
            </select>

            {/* Payment Type Filter */}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">All Payment Types</option>
              {PAYMENT_TYPES.map((pt) => (
                <option key={pt} value={pt}>
                  {pt}
                </option>
              ))}
              <option value="unspecified">Not Specified</option>
            </select>

            {/* Date Filter */}
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filter date (DD/MM/YYYY)..."
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="pl-9 pr-7 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
              {dateFilter && (
                <button
                  onClick={() => setDateFilter('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {(search || dateFilter || typeFilter !== 'all' || paymentFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearch('');
                  setDateFilter('');
                  setTypeFilter('all');
                  setPaymentFilter('all');
                }}
                className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1.5 rounded hover:bg-slate-200 font-medium"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b">
              <tr>
                <th className="px-5 py-3.5">S/N</th>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5">Payment</th>
                <th className="px-5 py-3.5">Particular / Item</th>
                <th className="px-5 py-3.5 text-right">Cost (₹)</th>
                <th className="px-5 py-3.5 text-right">Sale Amount (₹)</th>
                <th className="px-5 py-3.5 text-right">Profit / Margin</th>
                <th className="px-5 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.map((sale) => {
                const isProduct = sale.saleType === 'product';
                const hasCost =
                  sale.isCostRecorded ||
                  (sale.costAmount !== undefined && sale.costAmount > 0) ||
                  sale.saleType === 'product';

                const cost = sale.costAmount || 0;
                const margin = sale.saleAmount - cost;

                return (
                  <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* S/N */}
                    <td className="px-5 py-4 font-semibold text-slate-700">{sale.serialNumber}</td>

                    {/* Date */}
                    <td className="px-5 py-4 text-slate-600">{formatDateDDMMYYYY(sale.date)}</td>

                    {/* Type Badge */}
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isProduct
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}
                      >
                        {isProduct ? <Package className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                        {isProduct ? 'Product' : 'Service'}
                      </span>
                    </td>

                    {/* Payment Type */}
                    <td className="px-5 py-4">
                      {sale.paymentType ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/80">
                          {sale.paymentType}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Not Specified</span>
                      )}
                    </td>

                    {/* Particular */}
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-800">{sale.particular}</div>
                      {isProduct && sale.quantity && (
                        <div className="text-[11px] text-slate-400">
                          Qty: {sale.quantity} units @ {formatCurrency(sale.unitPrice || 0)}/unit
                        </div>
                      )}
                    </td>

                    {/* Cost */}
                    <td className="px-5 py-4 text-right">
                      {hasCost ? (
                        <span className="text-slate-700 font-medium">{formatCurrency(cost)}</span>
                      ) : (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-medium">
                          Cost Not Recorded
                        </span>
                      )}
                    </td>

                    {/* Sale Amount */}
                    <td className="px-5 py-4 text-right font-bold text-slate-900">
                      {formatCurrency(sale.saleAmount)}
                    </td>

                    {/* Profit / Margin */}
                    <td className="px-5 py-4 text-right">
                      {hasCost ? (
                        <div>
                          <span
                            className={`font-bold ${
                              margin >= 0 ? 'text-emerald-600' : 'text-red-600'
                            }`}
                          >
                            {margin >= 0 ? '+' : ''}
                            {formatCurrency(margin)}
                          </span>
                          {!isProduct && cost === 0 && (
                            <div className="text-[10px] text-emerald-700 font-medium">Gross Profit</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleEdit(sale)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Sale"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(sale)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Sale"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                    <p className="font-semibold text-slate-700">No sales transactions found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Click "New Sale" to record a stationery product or cyber cafe service fee.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>

            {/* Table Footer Total */}
            {filteredSales.length > 0 && (
              <tfoot className="bg-slate-50 border-t font-semibold text-slate-800">
                <tr>
                  <td colSpan={5} className="px-5 py-3.5 text-slate-600">
                    Total ({filteredSales.length} {filteredSales.length === 1 ? 'sale' : 'sales'})
                  </td>
                  <td className="px-5 py-3.5 text-right text-slate-700">
                    {formatCurrency(totalCostOfSales)}
                  </td>
                  <td className="px-5 py-3.5 text-right text-blue-700 text-base">
                    {formatCurrency(totalSalesRevenue)}
                  </td>
                  <td className="px-5 py-3.5 text-right text-emerald-600 text-base">
                    +{formatCurrency(grossProfitTotal)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
