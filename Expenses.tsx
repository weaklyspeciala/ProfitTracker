import { useState, useMemo } from 'react';
import {
  useAppStore,
  type ExpensePurchase,
  type ExpenseType,
  type ExpenseCategory,
  type PaymentStatus,
  type Vendor,
} from '../store';
import {
  formatCurrency,
  formatDateDDMMYYYY,
  getTodayDDMMYYYY,
  toYYYYMMDD,
  isValidDDMMYYYY,
} from '../lib/utils';
import {
  Receipt,
  Plus,
  Pencil,
  Trash2,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Users,
  CreditCard,
  Wallet,
  Landmark,
  Building2,
  X,
  ChevronDown,
  ChevronUp,
  Tag,
  DollarSign,
  Package,
  Wrench,
  HelpCircle,
} from 'lucide-react';

const PRESET_CATEGORIES: ExpenseCategory[] = [
  'Stock / Inventory Purchase',
  'Office Supplies',
  'Rent',
  'Electricity',
  'Internet',
  'Printing Materials',
  'Equipment',
  'Repair & Maintenance',
  'Transportation',
  'Bank Charges',
  'Credit Card Interest',
  'Credit Card Annual Fee',
  'Other Business Expense',
];

const PAYMENT_METHODS = [
  'Cash',
  'UPI',
  'Credit Card',
  'Debit Card',
  'NEFT',
  'IMPS',
  'RTGS',
  'Bank Transfer',
  'Cheque',
  'Other',
];

export function Expenses() {
  const {
    expenses,
    vendors,
    accounts,
    addExpensePurchase,
    updateExpensePurchase,
    deleteExpensePurchase,
    addVendor,
    updateVendor,
    deleteVendor,
    addSupplierPayment,
    getVendorPayable,
    getAccountBalance,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'expenses' | 'vendors' | 'analytics'>('expenses');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  // Status & Error
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Form State
  const [date, setDate] = useState(getTodayDDMMYYYY());
  const [expenseType, setExpenseType] = useState<ExpenseType>('operating_expense');
  const [category, setCategory] = useState<string>('Office Supplies');
  const [customCategory, setCustomCategory] = useState('');
  const [particular, setParticular] = useState('');
  const [vendorId, setVendorId] = useState<string>('');
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [subtotal, setSubtotal] = useState('');
  const [discount, setDiscount] = useState('0');
  const [tax, setTax] = useState('0');
  const [finalAmount, setFinalAmount] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [fundingAccountId, setFundingAccountId] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Vendor Modal State
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [venName, setVenName] = useState('');
  const [venPhone, setVenPhone] = useState('');
  const [venEmail, setVenEmail] = useState('');
  const [venAddress, setVenAddress] = useState('');
  const [venOpeningPayable, setVenOpeningPayable] = useState('0');
  const [venNotes, setVenNotes] = useState('');

  // Settle Supplier Modal State
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [settleVendorId, setSettleVendorId] = useState('');
  const [settleAccountId, setSettleAccountId] = useState('');
  const [settleAmount, setSettleAmount] = useState('');
  const [settleDate, setSettleDate] = useState(getTodayDDMMYYYY());
  const [settleMethod, setSettleMethod] = useState('Bank Transfer');
  const [settleRef, setSettleRef] = useState('');
  const [settleNotes, setSettleNotes] = useState('');

  // Search & Filter
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Auto-fill subtotal from qty & unitCost when entered
  const handleQtyOrCostChange = (newQty: string, newCost: string) => {
    setQuantity(newQty);
    setUnitCost(newCost);
    const q = parseFloat(newQty);
    const c = parseFloat(newCost);
    if (!isNaN(q) && !isNaN(c) && q > 0 && c >= 0) {
      const calcSub = q * c;
      setSubtotal(calcSub.toFixed(2));
      recalculateFinal(calcSub, parseFloat(discount) || 0, parseFloat(tax) || 0);
    }
  };

  const recalculateFinal = (sub: number, disc: number, tx: number) => {
    const net = Math.max(0, sub - disc + tx);
    setFinalAmount(net.toFixed(2));
    if (paymentStatus === 'paid') {
      setAmountPaid(net.toFixed(2));
    } else if (paymentStatus === 'unpaid') {
      setAmountPaid('0');
    }
  };

  const handleSubtotalChange = (val: string) => {
    setSubtotal(val);
    recalculateFinal(parseFloat(val) || 0, parseFloat(discount) || 0, parseFloat(tax) || 0);
  };

  const handleDiscountChange = (val: string) => {
    setDiscount(val);
    recalculateFinal(parseFloat(subtotal) || 0, parseFloat(val) || 0, parseFloat(tax) || 0);
  };

  const handleTaxChange = (val: string) => {
    setTax(val);
    recalculateFinal(parseFloat(subtotal) || 0, parseFloat(discount) || 0, parseFloat(val) || 0);
  };

  const handlePaymentStatusChange = (status: PaymentStatus) => {
    setPaymentStatus(status);
    const numFinal = parseFloat(finalAmount) || 0;
    if (status === 'paid') {
      setAmountPaid(numFinal.toString());
    } else if (status === 'unpaid') {
      setAmountPaid('0');
    }
  };

  // Reset form
  const resetForm = () => {
    setDate(getTodayDDMMYYYY());
    setExpenseType('operating_expense');
    setCategory('Office Supplies');
    setCustomCategory('');
    setParticular('');
    setVendorId('');
    setQuantity('');
    setUnitCost('');
    setSubtotal('');
    setDiscount('0');
    setTax('0');
    setFinalAmount('');
    setPaymentStatus('paid');
    setAmountPaid('');
    setPaymentMethod('Cash');
    setFundingAccountId(accounts.length > 0 ? accounts[0].id : '');
    setReferenceNumber('');
    setNotes('');
    setEditingExpenseId(null);
    setIsFormOpen(false);
  };

  // Open Edit Form
  const handleEdit = (exp: ExpensePurchase) => {
    setEditingExpenseId(exp.id);
    setDate(formatDateDDMMYYYY(exp.date));
    setExpenseType(exp.expenseType);
    if (PRESET_CATEGORIES.includes(exp.category as any)) {
      setCategory(exp.category);
      setCustomCategory('');
    } else {
      setCategory('Other Business Expense');
      setCustomCategory(exp.category);
    }
    setParticular(exp.particular);
    setVendorId(exp.vendorId || '');
    setQuantity(exp.quantity ? exp.quantity.toString() : '');
    setUnitCost(exp.unitCost ? exp.unitCost.toString() : '');
    setSubtotal(exp.subtotal.toString());
    setDiscount(exp.discount.toString());
    setTax(exp.tax.toString());
    setFinalAmount(exp.finalAmount.toString());
    setPaymentStatus(exp.paymentStatus);
    setAmountPaid(exp.amountPaid.toString());
    setPaymentMethod(exp.paymentMethod || 'Cash');
    setFundingAccountId(exp.fundingAccountId || '');
    setReferenceNumber(exp.referenceNumber || '');
    setNotes(exp.notes || '');
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmedParticular = particular.trim();
    if (!trimmedParticular) {
      setErrorMessage('Please describe the expense or purchase particular.');
      return;
    }

    const numFinal = parseFloat(finalAmount);
    if (isNaN(numFinal) || numFinal <= 0) {
      setErrorMessage('Final amount must be greater than zero.');
      return;
    }

    const numPaid = parseFloat(amountPaid) || 0;
    if (numPaid < 0 || numPaid > numFinal) {
      setErrorMessage('Amount paid cannot be negative or greater than final amount.');
      return;
    }

    const standardDate = isValidDDMMYYYY(date) ? toYYYYMMDD(date) : new Date().toISOString().split('T')[0];
    const finalCategory = category === 'Other Business Expense' && customCategory.trim() ? customCategory.trim() : category;

    const vendor = vendors.find((v) => v.id === vendorId);
    const fundingAccount = accounts.find((a) => a.id === fundingAccountId);

    const payload = {
      date: standardDate,
      expenseType,
      category: finalCategory,
      particular: trimmedParticular,
      vendorId: vendor?.id,
      vendorName: vendor?.name,
      quantity: quantity ? parseFloat(quantity) : undefined,
      unitCost: unitCost ? parseFloat(unitCost) : undefined,
      subtotal: parseFloat(subtotal) || numFinal,
      discount: parseFloat(discount) || 0,
      tax: parseFloat(tax) || 0,
      finalAmount: numFinal,
      paymentStatus,
      amountPaid: numPaid,
      remainingPayable: Math.max(0, numFinal - numPaid),
      paymentMethod: numPaid > 0 ? paymentMethod : undefined,
      fundingAccountId: numPaid > 0 ? fundingAccount?.id : undefined,
      fundingAccountName: numPaid > 0 ? fundingAccount?.name : undefined,
      referenceNumber: referenceNumber.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    if (editingExpenseId) {
      const res = updateExpensePurchase(editingExpenseId, payload);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to update transaction.');
        return;
      }
      setStatusMessage('Expense / Purchase record updated successfully.');
    } else {
      const res = addExpensePurchase(payload);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to record transaction.');
        return;
      }
      setStatusMessage('Expense / Purchase recorded successfully.');
    }

    resetForm();
    setTimeout(() => setStatusMessage(''), 3500);
  };

  // Vendor actions
  const handleSaveVendor = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmed = venName.trim();
    if (!trimmed) {
      setErrorMessage('Supplier / Vendor name is required.');
      return;
    }

    const payload = {
      name: trimmed,
      phone: venPhone.trim() || undefined,
      email: venEmail.trim() || undefined,
      address: venAddress.trim() || undefined,
      openingPayable: parseFloat(venOpeningPayable) || 0,
      notes: venNotes.trim() || undefined,
    };

    if (editingVendorId) {
      updateVendor(editingVendorId, payload);
      setStatusMessage('Supplier details updated.');
    } else {
      addVendor(payload);
      setStatusMessage('New supplier added to catalog.');
    }

    setIsVendorModalOpen(false);
    setVenName('');
    setVenPhone('');
    setVenEmail('');
    setVenAddress('');
    setVenOpeningPayable('0');
    setVenNotes('');
    setEditingVendorId(null);
    setTimeout(() => setStatusMessage(''), 3500);
  };

  // Settle supplier payable
  const openSettleModal = (vId?: string) => {
    const chosenVendor = vId ? vendors.find((v) => v.id === vId) : vendors[0];
    if (!chosenVendor) {
      setErrorMessage('No suppliers available to settle.');
      return;
    }

    setSettleVendorId(chosenVendor.id);
    const payable = getVendorPayable(chosenVendor.id);
    setSettleAmount(payable > 0 ? payable.toString() : '');

    const defaultAcc = accounts.find((a) => a.isActive && a.type !== 'credit_card');
    if (defaultAcc) {
      setSettleAccountId(defaultAcc.id);
    }

    setSettleDate(getTodayDDMMYYYY());
    setSettleMethod('Bank Transfer');
    setSettleRef('');
    setSettleNotes('');
    setErrorMessage('');
    setIsSettleModalOpen(true);
  };

  const handleSettleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const vendor = vendors.find((v) => v.id === settleVendorId);
    const account = accounts.find((a) => a.id === settleAccountId);
    const amt = parseFloat(settleAmount);

    if (!vendor || !account) {
      setErrorMessage('Please select both the supplier and the paying account.');
      return;
    }

    if (isNaN(amt) || amt <= 0) {
      setErrorMessage('Please enter a valid payment amount greater than zero.');
      return;
    }

    const standardDate = isValidDDMMYYYY(settleDate) ? toYYYYMMDD(settleDate) : new Date().toISOString().split('T')[0];

    const res = addSupplierPayment({
      date: standardDate,
      vendorId: vendor.id,
      vendorName: vendor.name,
      fromAccountId: account.id,
      fromAccountName: account.name,
      amount: amt,
      paymentMethod: settleMethod,
      referenceNumber: settleRef.trim() || undefined,
      notes: settleNotes.trim() || undefined,
    });

    if (!res.success) {
      setErrorMessage(res.error || 'Failed to record supplier payment.');
      return;
    }

    setIsSettleModalOpen(false);
    setStatusMessage(`Payment of ${formatCurrency(amt)} to ${vendor.name} recorded successfully.`);
    setTimeout(() => setStatusMessage(''), 3500);
  };

  // Filtered expenses list
  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((exp) => {
        const matchesSearch =
          exp.particular.toLowerCase().includes(search.toLowerCase().trim()) ||
          exp.serialNumber.toLowerCase().includes(search.toLowerCase().trim()) ||
          (exp.vendorName && exp.vendorName.toLowerCase().includes(search.toLowerCase().trim())) ||
          (exp.category && exp.category.toLowerCase().includes(search.toLowerCase().trim()));

        if (!matchesSearch) return false;

        if (typeFilter !== 'all' && exp.expenseType !== typeFilter) return false;
        if (statusFilter !== 'all' && exp.paymentStatus !== statusFilter) return false;
        if (categoryFilter !== 'all' && exp.category !== categoryFilter) return false;

        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, search, typeFilter, statusFilter, categoryFilter]);

  // Aggregate Metrics
  const totalOperatingExpenses = useMemo(() => {
    return expenses
      .filter((e) => e.expenseType === 'operating_expense' || e.expenseType === 'financial_charge')
      .reduce((sum, e) => sum + e.finalAmount, 0);
  }, [expenses]);

  const totalInventoryPurchases = useMemo(() => {
    return expenses
      .filter((e) => e.expenseType === 'inventory_purchase')
      .reduce((sum, e) => sum + e.finalAmount, 0);
  }, [expenses]);

  const totalAssetPurchases = useMemo(() => {
    return expenses
      .filter((e) => e.expenseType === 'asset_purchase')
      .reduce((sum, e) => sum + e.finalAmount, 0);
  }, [expenses]);

  const totalOutstandingPayables = useMemo(() => {
    return vendors.reduce((sum, v) => sum + getVendorPayable(v.id), 0);
  }, [vendors, getVendorPayable]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Expenses & Purchases</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track business operating expenses, inventory restock orders, capital equipment, and supplier payables
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {vendors.length > 0 && (
            <button
              type="button"
              onClick={() => openSettleModal()}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <DollarSign className="w-4 h-4" />
              <span>Settle Supplier Payable</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (isFormOpen && !editingExpenseId) {
                setIsFormOpen(false);
              } else {
                resetForm();
                setIsFormOpen(true);
              }
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
          >
            {isFormOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>{isFormOpen ? 'Close Form' : 'New Expense / Purchase'}</span>
          </button>
        </div>
      </div>

      {/* Global Status / Error messages */}
      {statusMessage && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{statusMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="flex items-center justify-between p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
          <button type="button" onClick={() => setErrorMessage('')} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Operating Expenses */}
        <div className="bg-white p-5 rounded-2xl border shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Operating Expenses
          </span>
          <p className="text-2xl font-bold text-slate-900 mt-2">{formatCurrency(totalOperatingExpenses)}</p>
          <p className="text-xs text-slate-400 mt-0.5">Rent, Electricity, Supplies, Internet</p>
        </div>

        {/* Inventory Purchases */}
        <div className="bg-white p-5 rounded-2xl border shadow-sm">
          <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
            Inventory / Stock Purchases
          </span>
          <p className="text-2xl font-bold text-blue-700 mt-2">{formatCurrency(totalInventoryPurchases)}</p>
          <p className="text-xs text-blue-600/70 mt-0.5">Resale goods (increases inventory asset)</p>
        </div>

        {/* Asset Purchases */}
        <div className="bg-white p-5 rounded-2xl border shadow-sm">
          <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider">
            Asset / Equipment Purchases
          </span>
          <p className="text-2xl font-bold text-purple-700 mt-2">{formatCurrency(totalAssetPurchases)}</p>
          <p className="text-xs text-purple-600/70 mt-0.5">Shop machines, furniture, printers</p>
        </div>

        {/* Outstanding Supplier Payables */}
        <div className="bg-white p-5 rounded-2xl border shadow-sm bg-gradient-to-br from-white to-amber-50/40">
          <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
            Total Supplier Payables
          </span>
          <p className="text-2xl font-extrabold text-amber-700 mt-2">{formatCurrency(totalOutstandingPayables)}</p>
          <p className="text-xs text-amber-700/70 mt-0.5">{vendors.length} supplier(s) • Unpaid bills</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('expenses')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'expenses' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>All Expenses & Purchases ({expenses.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('vendors')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'vendors' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Suppliers & Payables ({vendors.length})</span>
        </button>
      </div>

      {/* TAB 1: ALL EXPENSES & PURCHASES */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          {/* New / Edit Form */}
          {isFormOpen && (
            <div className="bg-white p-6 rounded-2xl border shadow-sm animate-in fade-in duration-150">
              <div className="flex justify-between items-center mb-5 pb-3 border-b">
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    {editingExpenseId ? 'Edit Expense / Purchase Record' : 'Record New Expense or Purchase'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Accurately select the transaction type, supplier, payment status, and funding account
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetForm}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Row 1: Type & Date */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Transaction Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={expenseType}
                      onChange={(e) => setExpenseType(e.target.value as ExpenseType)}
                      className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                    >
                      <option value="operating_expense">Operating Expense (Rent, Power, Office Supplies)</option>
                      <option value="inventory_purchase">Inventory / Stock Purchase (Goods for resale)</option>
                      <option value="asset_purchase">Capital Asset Purchase (Equipment, Machinery)</option>
                      <option value="financial_charge">Financial Charge (CC Interest, Annual Fee, Bank Charge)</option>
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {expenseType === 'inventory_purchase'
                        ? 'Increases inventory value. Not an immediate operating expense for profit.'
                        : expenseType === 'operating_expense'
                        ? 'Deducted in Net Profit calculation.'
                        : expenseType === 'asset_purchase'
                        ? 'Recorded as business equipment/asset.'
                        : 'Recorded as finance charge expense.'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      {PRESET_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    {category === 'Other Business Expense' && (
                      <input
                        type="text"
                        placeholder="Type custom category name..."
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        className="w-full mt-1.5 border rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Date (DD/MM/YYYY) <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setDate(getTodayDDMMYYYY())}
                        className="text-[11px] text-blue-600 hover:underline"
                      >
                        Today
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      placeholder="DD/MM/YYYY"
                      className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Row 2: Particular & Supplier */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Particular / Description <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={particular}
                      onChange={(e) => setParticular(e.target.value)}
                      placeholder="e.g. 10 Reams JK Copier Paper, Shop Monthly Rent, Canon Toner..."
                      className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">Supplier / Vendor</label>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingVendorId(null);
                          setIsVendorModalOpen(true);
                        }}
                        className="text-[11px] text-blue-600 hover:underline flex items-center gap-0.5"
                      >
                        + Add Supplier
                      </button>
                    </div>
                    <select
                      value={vendorId}
                      onChange={(e) => setVendorId(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">No Supplier / Retail Purchase</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 3: Quantity, Unit Cost, Subtotal, Discount, Tax, Final Amount */}
                <div className="p-4 bg-slate-50 border rounded-xl space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Qty (Optional)</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={quantity}
                        onChange={(e) => handleQtyOrCostChange(e.target.value, unitCost)}
                        placeholder="1"
                        className="w-full border rounded-lg px-2.5 py-1.5 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Unit Cost (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={unitCost}
                        onChange={(e) => handleQtyOrCostChange(quantity, e.target.value)}
                        placeholder="0.00"
                        className="w-full border rounded-lg px-2.5 py-1.5 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Subtotal (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={subtotal}
                        onChange={(e) => handleSubtotalChange(e.target.value)}
                        placeholder="0.00"
                        className="w-full border rounded-lg px-2.5 py-1.5 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Discount (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={discount}
                        onChange={(e) => handleDiscountChange(e.target.value)}
                        placeholder="0.00"
                        className="w-full border rounded-lg px-2.5 py-1.5 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tax / GST (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={tax}
                        onChange={(e) => handleTaxChange(e.target.value)}
                        placeholder="0.00"
                        className="w-full border rounded-lg px-2.5 py-1.5 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-800 mb-1">Final Amount (₹) *</label>
                      <input
                        type="number"
                        required
                        min="0.01"
                        step="0.01"
                        value={finalAmount}
                        onChange={(e) => {
                          setFinalAmount(e.target.value);
                          if (paymentStatus === 'paid') setAmountPaid(e.target.value);
                        }}
                        placeholder="0.00"
                        className="w-full border rounded-lg px-2.5 py-1.5 text-xs bg-white font-bold text-blue-700"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 4: Payment Status, Paid Amount, Payment Method, Funding Account */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Payment Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => handlePaymentStatusChange(e.target.value as PaymentStatus)}
                      className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white font-semibold"
                    >
                      <option value="paid">Paid in Full</option>
                      <option value="partially_paid">Partially Paid</option>
                      <option value="unpaid">Unpaid / Payable to Supplier</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Amount Paid (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={paymentStatus === 'unpaid'}
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      placeholder="0.00"
                      className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 font-semibold"
                    />
                    {paymentStatus !== 'paid' && (
                      <p className="text-[11px] text-amber-700 mt-1">
                        Remaining Payable:{' '}
                        <strong>
                          {formatCurrency(Math.max(0, (parseFloat(finalAmount) || 0) - (parseFloat(amountPaid) || 0)))}
                        </strong>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                    <select
                      disabled={paymentStatus === 'unpaid'}
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-100"
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Paid From Account (Funding Account)
                    </label>
                    <select
                      disabled={paymentStatus === 'unpaid'}
                      value={fundingAccountId}
                      onChange={(e) => setFundingAccountId(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-100 font-medium"
                    >
                      <option value="">Select funding account...</option>
                      {accounts
                        .filter((a) => a.isActive)
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.type === 'credit_card' ? `CC Due: ${formatCurrency(getAccountBalance(a.id))}` : `Avail: ${formatCurrency(getAccountBalance(a.id))}`})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Row 5: Reference & Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Bill # / Invoice # / Reference
                    </label>
                    <input
                      type="text"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder="e.g. INV-9021, UTR-49102"
                      className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Notes (Optional)</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Additional notes or payment reference..."
                      className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs"
                  >
                    {editingExpenseId ? 'Update Record' : 'Save Expense / Purchase'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Expenses Table */}
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            {/* Filter Toolbar */}
            <div className="p-4 border-b bg-slate-50 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search particular, category, supplier, S/N..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="all">All Types</option>
                  <option value="operating_expense">Operating Expenses</option>
                  <option value="inventory_purchase">Inventory Purchases</option>
                  <option value="asset_purchase">Asset Purchases</option>
                  <option value="financial_charge">Financial Charges</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="all">All Payment Status</option>
                  <option value="paid">Paid in Full</option>
                  <option value="partially_paid">Partially Paid</option>
                  <option value="unpaid">Unpaid (Payable)</option>
                </select>

                {(search || typeFilter !== 'all' || statusFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setTypeFilter('all');
                      setStatusFilter('all');
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
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-500 border-b">
                  <tr>
                    <th className="px-5 py-3.5">S/N</th>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Type & Category</th>
                    <th className="px-5 py-3.5">Particular / Supplier</th>
                    <th className="px-5 py-3.5 text-right">Amount (₹)</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Paid From</th>
                    <th className="px-5 py-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3.5 font-semibold text-slate-700">{exp.serialNumber}</td>
                      <td className="px-5 py-3.5 text-slate-600">{formatDateDDMMYYYY(exp.date)}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            exp.expenseType === 'inventory_purchase'
                              ? 'bg-blue-50 text-blue-700'
                              : exp.expenseType === 'asset_purchase'
                              ? 'bg-purple-50 text-purple-700'
                              : exp.expenseType === 'financial_charge'
                              ? 'bg-red-50 text-red-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {exp.category}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-800">{exp.particular}</div>
                        {exp.vendorName && <div className="text-[11px] text-slate-400">Supplier: {exp.vendorName}</div>}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-slate-900">
                        {formatCurrency(exp.finalAmount)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            exp.paymentStatus === 'paid'
                              ? 'bg-emerald-50 text-emerald-700'
                              : exp.paymentStatus === 'partially_paid'
                              ? 'bg-amber-50 text-amber-800'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {exp.paymentStatus === 'paid'
                            ? 'Paid'
                            : exp.paymentStatus === 'partially_paid'
                            ? `Paid ${formatCurrency(exp.amountPaid)} (${formatCurrency(exp.remainingPayable)} due)`
                            : 'Unpaid'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {exp.fundingAccountName ? (
                          <span>
                            {exp.fundingAccountName}{' '}
                            <span className="text-[10px] text-slate-400">({exp.paymentMethod || 'Paid'})</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEdit(exp)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Record"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete "${exp.particular}"?`)) {
                                deleteExpensePurchase(exp.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredExpenses.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-400 text-xs">
                        No expense or purchase records found matching your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SUPPLIERS & PAYABLES */}
      {activeTab === 'vendors' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border shadow-sm">
            <div>
              <h3 className="font-bold text-sm text-slate-800">Reusable Supplier Directory & Payables Ledger</h3>
              <p className="text-xs text-slate-500">
                Track total purchases and unpaid balances owed to each supplier. Settle payables from cash or bank accounts.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingVendorId(null);
                setVenName('');
                setVenPhone('');
                setVenEmail('');
                setVenAddress('');
                setVenOpeningPayable('0');
                setVenNotes('');
                setIsVendorModalOpen(true);
              }}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Supplier</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vendors.map((vendor) => {
              const payable = getVendorPayable(vendor.id);
              const vendorPurchases = expenses.filter((e) => e.vendorId === vendor.id);
              const totalBilled = vendorPurchases.reduce((sum, e) => sum + e.finalAmount, 0);

              return (
                <div key={vendor.id} className="bg-white p-5 rounded-2xl border shadow-sm space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">{vendor.name}</h4>
                      {vendor.phone && <p className="text-xs text-slate-400">📞 {vendor.phone}</p>}
                      {vendor.email && <p className="text-xs text-slate-400">✉️ {vendor.email}</p>}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingVendorId(vendor.id);
                          setVenName(vendor.name);
                          setVenPhone(vendor.phone || '');
                          setVenEmail(vendor.email || '');
                          setVenAddress(vendor.address || '');
                          setVenOpeningPayable(vendor.openingPayable.toString());
                          setVenNotes(vendor.notes || '');
                          setIsVendorModalOpen(true);
                        }}
                        className="p-1 text-slate-400 hover:text-blue-600 rounded"
                        title="Edit Supplier"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete supplier "${vendor.name}"?`)) {
                            const res = deleteVendor(vendor.id);
                            if (!res.success) alert(res.error);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-red-600 rounded"
                        title="Delete Supplier"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Total Billed Purchases:</span>
                      <span className="font-semibold text-slate-800">{formatCurrency(totalBilled)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Current Outstanding Payable:</span>
                      <span className={`font-bold ${payable > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                        {formatCurrency(payable)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t text-xs">
                    <span className="text-[11px] text-slate-400">{vendorPurchases.length} order(s) recorded</span>
                    {payable > 0 ? (
                      <button
                        type="button"
                        onClick={() => openSettleModal(vendor.id)}
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold rounded-lg text-xs"
                      >
                        Settle Payable &rarr;
                      </button>
                    ) : (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        All Cleared
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {vendors.length === 0 && (
              <div className="md:col-span-3 p-8 text-center bg-white rounded-2xl border text-slate-500 text-sm">
                <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">No suppliers recorded</p>
                <p className="text-xs text-slate-400 mt-1">
                  Click "Add New Supplier" to create a reusable vendor list for purchases and payables.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT VENDOR */}
      {isVendorModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border w-full max-w-md p-6 animate-in zoom-in-95 duration-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-base text-slate-800">
                {editingVendorId ? 'Edit Supplier' : 'Add New Supplier'}
              </h3>
              <button
                type="button"
                onClick={() => setIsVendorModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVendor} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Supplier / Vendor Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={venName}
                  onChange={(e) => setVenName(e.target.value)}
                  placeholder="e.g. Apex Wholesale Depot"
                  className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={venPhone}
                    onChange={(e) => setVenPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Opening Payable (₹)</label>
                  <input
                    type="number"
                    value={venOpeningPayable}
                    onChange={(e) => setVenOpeningPayable(e.target.value)}
                    placeholder="0.00"
                    className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email / Contact</label>
                <input
                  type="text"
                  value={venEmail}
                  onChange={(e) => setVenEmail(e.target.value)}
                  placeholder="orders@supplier.com"
                  className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Address / Memo</label>
                <textarea
                  value={venAddress}
                  onChange={(e) => setVenAddress(e.target.value)}
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Supplier address or notes..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsVendorModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs"
                >
                  {editingVendorId ? 'Save Changes' : 'Add Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SETTLE SUPPLIER PAYABLE */}
      {isSettleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border w-full max-w-md p-6 animate-in zoom-in-95 duration-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-base text-slate-800">Settle Supplier Payable</h3>
              <button
                type="button"
                onClick={() => setIsSettleModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSettleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Supplier</label>
                <select
                  required
                  value={settleVendorId}
                  onChange={(e) => {
                    setSettleVendorId(e.target.value);
                    const pay = getVendorPayable(e.target.value);
                    setSettleAmount(pay > 0 ? pay.toString() : '');
                  }}
                  className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                >
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} (Payable: {formatCurrency(getVendorPayable(v.id))})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pay From Account</label>
                <select
                  required
                  value={settleAccountId}
                  onChange={(e) => setSettleAccountId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                >
                  {accounts
                    .filter((a) => a.isActive && a.type !== 'credit_card')
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} (Avail: {formatCurrency(getAccountBalance(a.id))})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Settlement Amount (₹)</label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-amber-500 font-bold text-amber-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="text"
                    required
                    value={settleDate}
                    onChange={(e) => setSettleDate(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Method</label>
                  <select
                    value={settleMethod}
                    onChange={(e) => setSettleMethod(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  >
                    {PAYMENT_METHODS.filter((m) => m !== 'Credit Card').map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ref # (UTR/Cheque)</label>
                  <input
                    type="text"
                    value={settleRef}
                    onChange={(e) => setSettleRef(e.target.value)}
                    placeholder="Optional reference"
                    className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 text-amber-900 rounded-xl text-xs space-y-1">
                <p className="font-semibold">Accounting Rule Verification:</p>
                <p className="text-[11px] text-amber-800">
                  This transaction settles the outstanding payable balance owed to the supplier. It does NOT create a second purchase expense.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsSettleModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-xs"
                >
                  Confirm Settlement Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
