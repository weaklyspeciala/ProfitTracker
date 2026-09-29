import { useState, useMemo } from 'react';
import { useAppStore, type Account, type AccountType } from '../store';
import {
  formatCurrency,
  formatDateDDMMYYYY,
  getTodayDDMMYYYY,
  toYYYYMMDD,
  isValidDDMMYYYY,
} from '../lib/utils';
import {
  Landmark,
  Wallet,
  CreditCard,
  Plus,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Trash2,
  Search,
  Filter,
  Eye,
  TrendingDown,
  TrendingUp,
  Receipt,
  X,
  ShieldAlert,
} from 'lucide-react';

export function Accounts() {
  const {
    accounts,
    sales,
    expenses,
    transfers,
    creditCardPayments,
    supplierPayments,
    refunds,
    addAccount,
    updateAccount,
    toggleAccountActive,
    deleteAccount,
    addAccountTransfer,
    deleteAccountTransfer,
    addCreditCardPayment,
    deleteCreditCardPayment,
    getAccountBalance,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'credit_cards' | 'transfers' | 'ledger'>('overview');

  // Modal states
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isCcPaymentModalOpen, setIsCcPaymentModalOpen] = useState(false);
  const [selectedCcIdForPayment, setSelectedCcIdForPayment] = useState<string>('');

  // Messages & Errors
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Account Form State
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState<AccountType>('bank');
  const [accBankName, setAccBankName] = useState('');
  const [accLast4, setAccLast4] = useState('');
  const [accOpeningBalance, setAccOpeningBalance] = useState('0');
  const [accOpeningDate, setAccOpeningDate] = useState(getTodayDDMMYYYY());
  const [accCreditLimit, setAccCreditLimit] = useState('');
  const [accStatementDate, setAccStatementDate] = useState('');
  const [accDueDate, setAccDueDate] = useState('');
  const [accNotes, setAccNotes] = useState('');

  // Transfer Form State
  const [trfFromId, setTrfFromId] = useState('');
  const [trfToId, setTrfToId] = useState('');
  const [trfAmount, setTrfAmount] = useState('');
  const [trfDate, setTrfDate] = useState(getTodayDDMMYYYY());
  const [trfRef, setTrfRef] = useState('');
  const [trfNotes, setTrfNotes] = useState('');

  // Credit Card Payment Form State
  const [ccPayCardId, setCcPayCardId] = useState('');
  const [ccPayFromId, setCcPayFromId] = useState('');
  const [ccPayAmount, setCcPayAmount] = useState('');
  const [ccPayDate, setCcPayDate] = useState(getTodayDDMMYYYY());
  const [ccPayRef, setCcPayRef] = useState('');
  const [ccPayNotes, setCcPayNotes] = useState('');

  // Search & Filter
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerAccountFilter, setLedgerAccountFilter] = useState('all');

  // Computed summary metrics
  const cashAccounts = useMemo(() => accounts.filter((a) => a.type === 'cash'), [accounts]);
  const bankAccounts = useMemo(() => accounts.filter((a) => a.type === 'bank' || a.type === 'other'), [accounts]);
  const creditCardAccounts = useMemo(() => accounts.filter((a) => a.type === 'credit_card'), [accounts]);

  const totalCashBalance = useMemo(() => {
    return cashAccounts
      .filter((a) => a.isActive)
      .reduce((sum, a) => sum + getAccountBalance(a.id), 0);
  }, [cashAccounts, getAccountBalance]);

  const totalBankBalance = useMemo(() => {
    return bankAccounts
      .filter((a) => a.isActive)
      .reduce((sum, a) => sum + getAccountBalance(a.id), 0);
  }, [bankAccounts, getAccountBalance]);

  const totalAvailableFunds = totalCashBalance + totalBankBalance;

  const totalCreditCardDue = useMemo(() => {
    return creditCardAccounts
      .filter((a) => a.isActive)
      .reduce((sum, a) => sum + getAccountBalance(a.id), 0);
  }, [creditCardAccounts, getAccountBalance]);

  // Unified Transaction Ledger Entries
  const ledgerEntries = useMemo(() => {
    const list: Array<{
      id: string;
      date: string;
      ref: string;
      type: string;
      typeLabel: string;
      particular: string;
      partyOrSupplier?: string;
      paymentMethod?: string;
      sourceAccount?: string;
      destAccount?: string;
      amount: number;
      isDebit: boolean; // true = money leaving/spent, false = money received
      notes?: string;
    }> = [];

    // 1. Sales receipts
    sales.forEach((s) => {
      const acc = accounts.find((a) => a.id === s.receivedIntoAccountId);
      list.push({
        id: `sale-${s.id}`,
        date: s.date,
        ref: s.serialNumber,
        type: 'sale',
        typeLabel: 'Sales Receipt',
        particular: s.particular,
        partyOrSupplier: s.partyName || 'Customer',
        paymentMethod: s.paymentType || 'Cash',
        sourceAccount: '-',
        destAccount: acc ? acc.name : s.paymentType === 'Cash' ? 'Cash in Hand (Default)' : 'Bank (Default)',
        amount: s.saleAmount,
        isDebit: false, // Inflow (+)
        notes: s.notes,
      });
    });

    // 2. Expenses & Purchases paid
    expenses.forEach((e) => {
      if (e.amountPaid > 0) {
        const acc = accounts.find((a) => a.id === e.fundingAccountId);
        list.push({
          id: `exp-${e.id}`,
          date: e.date,
          ref: e.serialNumber,
          type: 'expense',
          typeLabel: e.expenseType === 'inventory_purchase' ? 'Inventory Purchase' : 'Expense / Purchase',
          particular: e.particular,
          partyOrSupplier: e.vendorName || 'Supplier',
          paymentMethod: e.paymentMethod || 'Cash',
          sourceAccount: acc ? acc.name : 'Unassigned Account',
          destAccount: '-',
          amount: e.amountPaid,
          isDebit: true, // Outflow (-)
          notes: e.referenceNumber ? `Ref: ${e.referenceNumber}. ${e.notes || ''}` : e.notes,
        });
      }
    });

    // 3. Internal Transfers
    transfers.forEach((t) => {
      list.push({
        id: `trf-${t.id}`,
        date: t.date,
        ref: t.serialNumber,
        type: 'transfer',
        typeLabel: 'Account Transfer',
        particular: `Transfer: ${t.fromAccountName} → ${t.toAccountName}`,
        partyOrSupplier: 'Internal Transfer',
        paymentMethod: 'Bank / Cash Transfer',
        sourceAccount: t.fromAccountName,
        destAccount: t.toAccountName,
        amount: t.amount,
        isDebit: true,
        notes: t.referenceNumber ? `Ref: ${t.referenceNumber}. ${t.notes || ''}` : t.notes,
      });
    });

    // 4. Credit Card Bill Payments
    creditCardPayments.forEach((p) => {
      list.push({
        id: `ccp-${p.id}`,
        date: p.date,
        ref: p.serialNumber,
        type: 'cc_payment',
        typeLabel: 'Credit Card Bill Payment',
        particular: `Bill Payment to ${p.creditCardName} from ${p.fromAccountName}`,
        partyOrSupplier: p.creditCardName,
        paymentMethod: 'Account Payment',
        sourceAccount: p.fromAccountName,
        destAccount: p.creditCardName,
        amount: p.amount,
        isDebit: true,
        notes: p.notes,
      });
    });

    // 5. Supplier Settlements
    supplierPayments.forEach((sp) => {
      list.push({
        id: `spay-${sp.id}`,
        date: sp.date,
        ref: sp.serialNumber,
        type: 'supplier_settlement',
        typeLabel: 'Supplier Payable Settlement',
        particular: `Payment to ${sp.vendorName}`,
        partyOrSupplier: sp.vendorName,
        paymentMethod: sp.paymentMethod,
        sourceAccount: sp.fromAccountName,
        destAccount: sp.vendorName,
        amount: sp.amount,
        isDebit: true,
        notes: sp.notes,
      });
    });

    // 6. Refunds
    refunds.forEach((r) => {
      list.push({
        id: `ref-${r.id}`,
        date: r.date,
        ref: r.serialNumber,
        type: 'refund',
        typeLabel: 'Purchase Refund',
        particular: r.originalParticular ? `Refund for ${r.originalParticular}` : 'Purchase Refund',
        partyOrSupplier: r.vendorName || '-',
        paymentMethod: 'Refund Credit',
        sourceAccount: '-',
        destAccount: r.toAccountName,
        amount: r.amount,
        isDebit: false, // Inflow (+)
        notes: r.reason,
      });
    });

    return list
      .filter((item) => {
        const matchesSearch =
          item.particular.toLowerCase().includes(ledgerSearch.toLowerCase().trim()) ||
          item.ref.toLowerCase().includes(ledgerSearch.toLowerCase().trim()) ||
          (item.partyOrSupplier && item.partyOrSupplier.toLowerCase().includes(ledgerSearch.toLowerCase().trim()));

        if (!matchesSearch) return false;

        if (ledgerAccountFilter !== 'all') {
          const matchSource = item.sourceAccount ? item.sourceAccount.toLowerCase().includes(ledgerAccountFilter.toLowerCase()) : false;
          const matchDest = item.destAccount ? item.destAccount.toLowerCase().includes(ledgerAccountFilter.toLowerCase()) : false;
          if (!matchSource && !matchDest) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, expenses, transfers, creditCardPayments, supplierPayments, refunds, accounts, ledgerSearch, ledgerAccountFilter]);

  // Account Modal Open/Edit
  const openAddAccountModal = () => {
    setEditingAccountId(null);
    setAccName('');
    setAccType('bank');
    setAccBankName('');
    setAccLast4('');
    setAccOpeningBalance('0');
    setAccOpeningDate(getTodayDDMMYYYY());
    setAccCreditLimit('');
    setAccStatementDate('');
    setAccDueDate('');
    setAccNotes('');
    setErrorMessage('');
    setIsAccountModalOpen(true);
  };

  const openEditAccountModal = (acc: Account) => {
    setEditingAccountId(acc.id);
    setAccName(acc.name);
    setAccType(acc.type);
    setAccBankName(acc.bankName || '');
    setAccLast4(acc.accountNumberLast4 || '');
    setAccOpeningBalance(acc.openingBalance.toString());
    setAccOpeningDate(formatDateDDMMYYYY(acc.openingBalanceDate));
    setAccCreditLimit(acc.creditLimit ? acc.creditLimit.toString() : '');
    setAccStatementDate(acc.statementDate ? acc.statementDate.toString() : '');
    setAccDueDate(acc.paymentDueDate ? acc.paymentDueDate.toString() : '');
    setAccNotes(acc.notes || '');
    setErrorMessage('');
    setIsAccountModalOpen(true);
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmedName = accName.trim();
    if (!trimmedName) {
      setErrorMessage('Account name cannot be empty.');
      return;
    }

    const standardDate = isValidDDMMYYYY(accOpeningDate)
      ? toYYYYMMDD(accOpeningDate)
      : new Date().toISOString().split('T')[0];

    const payload = {
      name: trimmedName,
      type: accType,
      bankName: accType === 'bank' || accType === 'credit_card' ? accBankName.trim() : undefined,
      accountNumberLast4: accLast4.trim() || undefined,
      openingBalance: parseFloat(accOpeningBalance) || 0,
      openingBalanceDate: standardDate,
      isActive: true,
      creditLimit: accType === 'credit_card' && accCreditLimit ? parseFloat(accCreditLimit) : undefined,
      statementDate: accType === 'credit_card' && accStatementDate ? parseInt(accStatementDate, 10) : undefined,
      paymentDueDate: accType === 'credit_card' && accDueDate ? parseInt(accDueDate, 10) : undefined,
      notes: accNotes.trim() || undefined,
    };

    if (editingAccountId) {
      const res = updateAccount(editingAccountId, payload);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to update account.');
        return;
      }
      setStatusMessage('Account updated successfully.');
    } else {
      const res = addAccount(payload);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to create account.');
        return;
      }
      setStatusMessage('Account created successfully.');
    }

    setIsAccountModalOpen(false);
    setTimeout(() => setStatusMessage(''), 3500);
  };

  // Transfer Submit
  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!trfFromId || !trfToId) {
      setErrorMessage('Please select both source and destination accounts.');
      return;
    }

    if (trfFromId === trfToId) {
      setErrorMessage('Source and destination accounts must be different.');
      return;
    }

    const amt = parseFloat(trfAmount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMessage('Please enter a valid transfer amount greater than 0.');
      return;
    }

    const fromAcc = accounts.find((a) => a.id === trfFromId);
    const toAcc = accounts.find((a) => a.id === trfToId);
    if (!fromAcc || !toAcc) {
      setErrorMessage('Selected account was not found.');
      return;
    }

    // Check available balance in source
    const currentFromBal = getAccountBalance(fromAcc.id);
    if (currentFromBal < amt) {
      const proceed = window.confirm(
        `Warning: Source account "${fromAcc.name}" has ${formatCurrency(currentFromBal)} available, which is less than the transfer amount ${formatCurrency(amt)}. Proceed anyway?`
      );
      if (!proceed) return;
    }

    const standardDate = isValidDDMMYYYY(trfDate) ? toYYYYMMDD(trfDate) : new Date().toISOString().split('T')[0];

    const res = addAccountTransfer({
      date: standardDate,
      fromAccountId: fromAcc.id,
      fromAccountName: fromAcc.name,
      toAccountId: toAcc.id,
      toAccountName: toAcc.name,
      amount: amt,
      referenceNumber: trfRef.trim() || undefined,
      notes: trfNotes.trim() || undefined,
    });

    if (!res.success) {
      setErrorMessage(res.error || 'Failed to complete transfer.');
      return;
    }

    setIsTransferModalOpen(false);
    setTrfAmount('');
    setTrfRef('');
    setTrfNotes('');
    setStatusMessage(`Transfer of ${formatCurrency(amt)} recorded successfully.`);
    setTimeout(() => setStatusMessage(''), 3500);
  };

  // Credit Card Bill Payment Submit
  const openCreditCardPayModal = (ccId?: string) => {
    const cardId = ccId || (creditCardAccounts.length > 0 ? creditCardAccounts[0].id : '');
    setSelectedCcIdForPayment(cardId);
    setCcPayCardId(cardId);

    // Pick first available bank account as default payer
    const defaultBank = bankAccounts.find((b) => b.isActive) || cashAccounts[0];
    if (defaultBank) {
      setCcPayFromId(defaultBank.id);
    }

    if (cardId) {
      const due = getAccountBalance(cardId);
      setCcPayAmount(due > 0 ? due.toString() : '');
    }

    setCcPayDate(getTodayDDMMYYYY());
    setCcPayRef('');
    setCcPayNotes('');
    setErrorMessage('');
    setIsCcPaymentModalOpen(true);
  };

  const handleCcPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!ccPayCardId || !ccPayFromId) {
      setErrorMessage('Please select both the credit card and the paying bank account.');
      return;
    }

    const amt = parseFloat(ccPayAmount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMessage('Please enter a valid bill payment amount greater than 0.');
      return;
    }

    const ccAcc = creditCardAccounts.find((c) => c.id === ccPayCardId);
    const fromAcc = accounts.find((a) => a.id === ccPayFromId);
    if (!ccAcc || !fromAcc) {
      setErrorMessage('Selected account was not found.');
      return;
    }

    const outstanding = getAccountBalance(ccAcc.id);
    if (amt > outstanding && outstanding > 0) {
      const proceed = window.confirm(
        `Payment amount (${formatCurrency(amt)}) is greater than current outstanding due (${formatCurrency(outstanding)}). Proceed with overpayment?`
      );
      if (!proceed) return;
    }

    const standardDate = isValidDDMMYYYY(ccPayDate) ? toYYYYMMDD(ccPayDate) : new Date().toISOString().split('T')[0];

    const res = addCreditCardPayment({
      date: standardDate,
      creditCardAccountId: ccAcc.id,
      creditCardName: ccAcc.name,
      fromAccountId: fromAcc.id,
      fromAccountName: fromAcc.name,
      amount: amt,
      referenceNumber: ccPayRef.trim() || undefined,
      notes: ccPayNotes.trim() || undefined,
    });

    if (!res.success) {
      setErrorMessage(res.error || 'Failed to record credit card payment.');
      return;
    }

    setIsCcPaymentModalOpen(false);
    setStatusMessage(`Bill payment of ${formatCurrency(amt)} toward ${ccAcc.name} recorded successfully.`);
    setTimeout(() => setStatusMessage(''), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Accounts & Credit Cards</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time balances for Cash in Hand, Bank Accounts, Credit Card Dues, and Internal Transfers
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {creditCardAccounts.length > 0 && (
            <button
              type="button"
              onClick={() => openCreditCardPayModal()}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <CreditCard className="w-4 h-4" />
              <span>Pay Credit Card Bill</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (accounts.length >= 2) {
                setTrfFromId(accounts[0].id);
                setTrfToId(accounts[1].id);
              }
              setErrorMessage('');
              setIsTransferModalOpen(true);
            }}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Transfer Money</span>
          </button>

          <button
            type="button"
            onClick={openAddAccountModal}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Account</span>
          </button>
        </div>
      </div>

      {/* Global Status / Error notifications */}
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

      {/* 4 Summary Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cash in Hand */}
        <div className="bg-white p-5 rounded-2xl border shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Cash in Hand</span>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{formatCurrency(totalCashBalance)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{cashAccounts.length} cash drawer(s)</p>
        </div>

        {/* Bank Balances */}
        <div className="bg-white p-5 rounded-2xl border shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Bank Balance</span>
            <Landmark className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{formatCurrency(totalBankBalance)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{bankAccounts.length} bank account(s)</p>
        </div>

        {/* Total Available Liquid Funds */}
        <div className="bg-white p-5 rounded-2xl border shadow-sm bg-gradient-to-br from-white to-blue-50/40">
          <div className="flex items-center justify-between text-blue-700">
            <span className="text-xs font-bold uppercase tracking-wider">Available Funds (Cash + Banks)</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-extrabold text-blue-700 mt-2">{formatCurrency(totalAvailableFunds)}</p>
          <p className="text-xs text-blue-600/70 mt-0.5">Total liquid purchasing power</p>
        </div>

        {/* Total Credit Card Due (Liability) */}
        <div className="bg-white p-5 rounded-2xl border shadow-sm bg-gradient-to-br from-white to-red-50/30">
          <div className="flex items-center justify-between text-red-700">
            <span className="text-xs font-bold uppercase tracking-wider">Credit Card Outstanding Due</span>
            <CreditCard className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-2xl font-extrabold text-red-700 mt-2">{formatCurrency(totalCreditCardDue)}</p>
          <p className="text-xs text-red-600/70 mt-0.5">
            {creditCardAccounts.length} card(s) • Total outstanding liability
          </p>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Landmark className="w-4 h-4" />
          <span>All Accounts & Balances ({accounts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('credit_cards')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'credit_cards'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Credit Card Center ({creditCardAccounts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('transfers')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'transfers'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>Transfers & History ({transfers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'ledger'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Unified Transaction Ledger ({ledgerEntries.length})</span>
        </button>
      </div>

      {/* TAB 1: ACCOUNTS OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc) => {
            const balance = getAccountBalance(acc.id);
            const isCC = acc.type === 'credit_card';

            return (
              <div
                key={acc.id}
                className={`bg-white rounded-2xl border shadow-sm p-5 relative transition-all ${
                  !acc.isActive ? 'opacity-60 bg-slate-50' : 'hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-2 rounded-xl ${
                        acc.type === 'cash'
                          ? 'bg-emerald-50 text-emerald-700'
                          : acc.type === 'bank'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-purple-50 text-purple-700'
                      }`}
                    >
                      {acc.type === 'cash' ? (
                        <Wallet className="w-5 h-5" />
                      ) : acc.type === 'bank' ? (
                        <Landmark className="w-5 h-5" />
                      ) : (
                        <CreditCard className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                        <span>{acc.name}</span>
                        {!acc.isActive && (
                          <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded">
                            Inactive
                          </span>
                        )}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {acc.type === 'cash'
                          ? 'Cash Account'
                          : acc.type === 'bank'
                          ? `${acc.bankName || 'Bank'} ${acc.accountNumberLast4 ? `(..${acc.accountNumberLast4})` : ''}`
                          : `${acc.bankName || 'Card'} ${acc.accountNumberLast4 ? `(..${acc.accountNumberLast4})` : ''}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditAccountModal(acc)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100"
                      title="Edit Account"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleAccountActive(acc.id)}
                      className={`text-[10px] font-semibold px-2 py-1 rounded-lg border ${
                        acc.isActive
                          ? 'text-slate-600 hover:bg-slate-100'
                          : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                      }`}
                    >
                      {acc.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>

                {/* Balance display */}
                <div className="mt-4 pt-3 border-t">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
                    {isCC ? 'Current Outstanding Due' : 'Available Balance'}
                  </span>
                  <div className="flex items-baseline justify-between mt-0.5">
                    <span
                      className={`text-xl font-bold ${
                        isCC
                          ? balance > 0
                            ? 'text-red-700'
                            : 'text-emerald-700'
                          : balance < 0
                          ? 'text-red-700'
                          : 'text-slate-900'
                      }`}
                    >
                      {formatCurrency(balance)}
                    </span>
                    {isCC && balance > 0 && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                        Payment Due
                      </span>
                    )}
                  </div>

                  {/* Credit Card Specific extras */}
                  {isCC && acc.creditLimit && (
                    <div className="mt-2 text-[11px] text-slate-500 flex justify-between">
                      <span>Limit: {formatCurrency(acc.creditLimit)}</span>
                      <span className="text-emerald-700 font-medium">
                        Avail: {formatCurrency(Math.max(0, acc.creditLimit - balance))}
                      </span>
                    </div>
                  )}

                  {acc.notes && <p className="text-[11px] text-slate-400 mt-2 truncate">{acc.notes}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: CREDIT CARD CENTER */}
      {activeTab === 'credit_cards' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-purple-50 border border-purple-200 p-4 rounded-2xl">
            <div>
              <h3 className="font-bold text-sm text-purple-900">Credit Card Debt & Limit Control</h3>
              <p className="text-xs text-purple-700 mt-0.5">
                Purchases increase liabilities. Bill payments decrease liabilities from bank funds without double-counting expenses.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openCreditCardPayModal()}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5"
            >
              <CreditCard className="w-4 h-4" />
              <span>Record Bill Payment</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {creditCardAccounts.map((card) => {
              const currentDue = getAccountBalance(card.id);
              const limit = card.creditLimit || 0;
              const available = limit > 0 ? Math.max(0, limit - currentDue) : 0;
              const utilization = limit > 0 ? Math.min(100, Math.round((currentDue / limit) * 100)) : 0;

              return (
                <div key={card.id} className="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-base text-slate-800">{card.name}</h4>
                      <p className="text-xs text-slate-400">
                        {card.bankName || 'Bank'} •••• {card.accountNumberLast4 || 'XXXX'}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        currentDue > 0 ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {currentDue > 0 ? `${formatCurrency(currentDue)} Due` : 'No Dues (Paid)'}
                    </span>
                  </div>

                  {/* Card Details Grid */}
                  <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl text-center text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Total Limit</span>
                      <span className="font-bold text-slate-800">{limit > 0 ? formatCurrency(limit) : 'Not Set'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Outstanding Due</span>
                      <span className="font-bold text-red-700">{formatCurrency(currentDue)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Available Credit</span>
                      <span className="font-bold text-emerald-700">{limit > 0 ? formatCurrency(available) : '-'}</span>
                    </div>
                  </div>

                  {limit > 0 && (
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                        <span>Limit Utilization</span>
                        <span className="font-semibold">{utilization}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            utilization > 80 ? 'bg-red-500' : utilization > 50 ? 'bg-amber-500' : 'bg-blue-600'
                          }`}
                          style={{ width: `${utilization}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t">
                    <span>
                      Due Date: <strong>{card.paymentDueDate ? `${card.paymentDueDate}th of month` : 'Not specified'}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => openCreditCardPayModal(card.id)}
                      className="px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 font-semibold rounded-lg text-xs"
                    >
                      Pay Bill &rarr;
                    </button>
                  </div>
                </div>
              );
            })}

            {creditCardAccounts.length === 0 && (
              <div className="md:col-span-2 p-8 text-center bg-white rounded-2xl border text-slate-500 text-sm">
                <CreditCard className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">No credit cards recorded</p>
                <p className="text-xs text-slate-400 mt-1">
                  Add a business credit card using "Add Account" to track purchase charges, statement dues, and bill payments.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: TRANSFERS & HISTORY */}
      {activeTab === 'transfers' && (
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-800">Internal Account Transfer Ledger</h3>
              <p className="text-xs text-slate-500">
                Transfers move money between Cash and Bank accounts without creating income or expense
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsTransferModalOpen(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Transfer</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 border-b">
                <tr>
                  <th className="px-5 py-3.5">Ref #</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">From (Source)</th>
                  <th className="px-5 py-3.5">To (Destination)</th>
                  <th className="px-5 py-3.5 text-right">Amount (₹)</th>
                  <th className="px-5 py-3.5">Notes</th>
                  <th className="px-5 py-3.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transfers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3.5 font-semibold text-slate-700">{t.serialNumber}</td>
                    <td className="px-5 py-3.5 text-slate-600">{formatDateDDMMYYYY(t.date)}</td>
                    <td className="px-5 py-3.5 font-medium text-red-700">{t.fromAccountName}</td>
                    <td className="px-5 py-3.5 font-medium text-emerald-700">{t.toAccountName}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-slate-900">{formatCurrency(t.amount)}</td>
                    <td className="px-5 py-3.5 text-slate-400 truncate max-w-xs">{t.notes || '-'}</td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this transfer? Balances will be reversed.')) {
                            deleteAccountTransfer(t.id);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-red-600 rounded"
                        title="Delete transfer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {transfers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-slate-400 text-xs">
                      No internal account transfers recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: UNIFIED TRANSACTION LEDGER */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-slate-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search ledger by particular, party, reference..."
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            <select
              value={ledgerAccountFilter}
              onChange={(e) => setLedgerAccountFilter(e.target.value)}
              className="border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium text-slate-700"
            >
              <option value="all">All Accounts Flow</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.name}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 border-b">
                <tr>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Ref #</th>
                  <th className="px-5 py-3.5">Type</th>
                  <th className="px-5 py-3.5">Particular / Party</th>
                  <th className="px-5 py-3.5">Account Flow</th>
                  <th className="px-5 py-3.5 text-right">Inflow (+)</th>
                  <th className="px-5 py-3.5 text-right">Outflow (−)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledgerEntries.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3.5 text-slate-600">{formatDateDDMMYYYY(row.date)}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-700">{row.ref}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          row.type === 'sale'
                            ? 'bg-emerald-50 text-emerald-800'
                            : row.type === 'transfer'
                            ? 'bg-blue-50 text-blue-800'
                            : row.type === 'cc_payment'
                            ? 'bg-purple-50 text-purple-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {row.typeLabel}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-800">
                      <div>{row.particular}</div>
                      {row.partyOrSupplier && (
                        <div className="text-[10px] text-slate-400 font-normal">{row.partyOrSupplier}</div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {row.sourceAccount !== '-' && (
                        <span className="text-red-700 font-medium">{row.sourceAccount}</span>
                      )}
                      {row.sourceAccount !== '-' && row.destAccount !== '-' && <span> &rarr; </span>}
                      {row.destAccount !== '-' && (
                        <span className="text-emerald-700 font-medium">{row.destAccount}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-emerald-700">
                      {!row.isDebit ? `+${formatCurrency(row.amount)}` : '-'}
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-red-700">
                      {row.isDebit ? `-${formatCurrency(row.amount)}` : '-'}
                    </td>
                  </tr>
                ))}
                {ledgerEntries.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-xs">
                      No matching financial transactions found in ledger.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT ACCOUNT */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-base text-slate-800">
                {editingAccountId ? 'Edit Account' : 'Create New Account'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAccountModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Account Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  placeholder="e.g. Cash in Hand, SBI Current, HDFC Credit Card..."
                  className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Account Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={accType}
                  onChange={(e) => setAccType(e.target.value as AccountType)}
                  className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="cash">Cash in Hand (Physical Cash)</option>
                  <option value="bank">Bank Account (Savings / Current)</option>
                  <option value="credit_card">Credit Card (Liability / Outstanding Debt)</option>
                  <option value="other">Other Payment Account (Wallet, Gateway)</option>
                </select>
              </div>

              {(accType === 'bank' || accType === 'credit_card') && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={accBankName}
                      onChange={(e) => setAccBankName(e.target.value)}
                      placeholder="e.g. State Bank of India, HDFC"
                      className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Last 4 Digits / Identifier
                    </label>
                    <input
                      type="text"
                      maxLength={8}
                      value={accLast4}
                      onChange={(e) => setAccLast4(e.target.value)}
                      placeholder="e.g. 4812"
                      className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {accType === 'credit_card' ? 'Opening Due / Debt (₹)' : 'Opening Balance (₹)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={accOpeningBalance}
                    onChange={(e) => setAccOpeningBalance(e.target.value)}
                    placeholder="0.00"
                    className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Opening Date</label>
                  <input
                    type="text"
                    value={accOpeningDate}
                    onChange={(e) => setAccOpeningDate(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {accType === 'credit_card' && (
                <div className="grid grid-cols-3 gap-3 p-3 bg-purple-50 rounded-xl">
                  <div>
                    <label className="block text-[11px] font-semibold text-purple-900 mb-1">Credit Limit (₹)</label>
                    <input
                      type="number"
                      value={accCreditLimit}
                      onChange={(e) => setAccCreditLimit(e.target.value)}
                      placeholder="100000"
                      className="w-full border rounded-lg px-2.5 py-1.5 text-xs outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-purple-900 mb-1">Statement Day</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={accStatementDate}
                      onChange={(e) => setAccStatementDate(e.target.value)}
                      placeholder="15"
                      className="w-full border rounded-lg px-2.5 py-1.5 text-xs outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-purple-900 mb-1">Due Day</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={accDueDate}
                      onChange={(e) => setAccDueDate(e.target.value)}
                      placeholder="5"
                      className="w-full border rounded-lg px-2.5 py-1.5 text-xs outline-none bg-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={accNotes}
                  onChange={(e) => setAccNotes(e.target.value)}
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs"
                >
                  {editingAccountId ? 'Save Changes' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TRANSFER MONEY */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border w-full max-w-md p-6 animate-in zoom-in-95 duration-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-base text-slate-800">Transfer Money Between Accounts</h3>
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">From Account (Source)</label>
                <select
                  required
                  value={trfFromId}
                  onChange={(e) => setTrfFromId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">To Account (Destination)</label>
                <select
                  required
                  value={trfToId}
                  onChange={(e) => setTrfToId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {accounts
                    .filter((a) => a.isActive && a.id !== trfFromId && a.type !== 'credit_card')
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} (Avail: {formatCurrency(getAccountBalance(a.id))})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Transfer Amount (₹)</label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={trfAmount}
                    onChange={(e) => setTrfAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="text"
                    required
                    value={trfDate}
                    onChange={(e) => setTrfDate(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reference # (e.g. UTR / Cheque)
                </label>
                <input
                  type="text"
                  value={trfRef}
                  onChange={(e) => setTrfRef(e.target.value)}
                  placeholder="Optional reference number"
                  className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                <textarea
                  value={trfNotes}
                  onChange={(e) => setTrfNotes(e.target.value)}
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-xs"
                >
                  Confirm Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PAY CREDIT CARD BILL */}
      {isCcPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border w-full max-w-md p-6 animate-in zoom-in-95 duration-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-base text-slate-800">Pay Credit Card Bill</h3>
              <button
                type="button"
                onClick={() => setIsCcPaymentModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCcPaymentSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Credit Card</label>
                <select
                  required
                  value={ccPayCardId}
                  onChange={(e) => {
                    setCcPayCardId(e.target.value);
                    const due = getAccountBalance(e.target.value);
                    setCcPayAmount(due > 0 ? due.toString() : '');
                  }}
                  className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                >
                  {creditCardAccounts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Due: {formatCurrency(getAccountBalance(c.id))})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pay From Account</label>
                <select
                  required
                  value={ccPayFromId}
                  onChange={(e) => setCcPayFromId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-purple-500 bg-white"
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Amount (₹)</label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={ccPayAmount}
                    onChange={(e) => setCcPayAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-purple-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Date</label>
                  <input
                    type="text"
                    required
                    value={ccPayDate}
                    onChange={(e) => setCcPayDate(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bank Reference / UTR / Transaction #
                </label>
                <input
                  type="text"
                  value={ccPayRef}
                  onChange={(e) => setCcPayRef(e.target.value)}
                  placeholder="Optional reference number"
                  className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="p-3 bg-purple-50 text-purple-900 rounded-xl text-xs space-y-1">
                <p className="font-semibold">Accounting Rule Verification:</p>
                <p className="text-[11px] text-purple-700">
                  This transaction decreases the paying bank account and decreases the credit card liability. It does NOT generate an operating expense or affect sales.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsCcPaymentModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-xs"
                >
                  Confirm Card Bill Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
