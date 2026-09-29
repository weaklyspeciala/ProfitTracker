import { useState, useEffect } from 'react';
import { useAppStore, type Investment, type Party } from '../store';
import { formatCurrency, formatDate } from '../lib/utils';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { SearchablePartySelect } from '../components/SearchablePartySelect';
import { Link } from 'react-router-dom';

const STORAGE_KEY_LAST_PARTY = 'last-selected-investment-party-id';

export function Investments() {
  const { investments, sales, parties, addInvestment, updateInvestment, deleteInvestment } = useAppStore();

  // Helper to determine the initial/remembered party
  const getRememberedParty = (): { id: string | undefined; name: string } => {
    if (!parties || parties.length === 0) {
      return { id: undefined, name: '' };
    }

    try {
      const savedPartyId = localStorage.getItem(STORAGE_KEY_LAST_PARTY);
      if (savedPartyId) {
        const found = parties.find((p) => p.id === savedPartyId);
        if (found) {
          return { id: found.id, name: found.name };
        }
      }
    } catch {}

    // Fallback to the first available saved party
    return { id: parties[0].id, name: parties[0].name };
  };

  // 1. New Investment Form — Always Open by Default
  const [isFormOpen, setIsFormOpen] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deletingInvestment, setDeletingInvestment] = useState<Investment | null>(null);

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const initialParty = getRememberedParty();
  const [partyId, setPartyId] = useState<string | undefined>(initialParty.id);
  const [partyName, setPartyName] = useState(initialParty.name);
  const [particular, setParticular] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  // 2. Smart Party Name Selection - Keep in sync when parties change or load
  useEffect(() => {
    // When editing an existing investment, preserve the saved party of that investment
    if (editingId) return;

    if (parties.length === 0) {
      setPartyId(undefined);
      setPartyName('');
      return;
    }

    // Check if the currently chosen partyId is still valid in the saved parties list
    const currentIsValid = parties.some((p) => p.id === partyId);
    if (!currentIsValid || !partyId) {
      const fallback = getRememberedParty();
      setPartyId(fallback.id);
      setPartyName(fallback.name);
      if (fallback.id) {
        try {
          localStorage.setItem(STORAGE_KEY_LAST_PARTY, fallback.id);
        } catch {}
      }
    }
  }, [parties, editingId, partyId]);

  // Handle party selection change
  const handleSelectParty = (selected: Party | null) => {
    if (selected) {
      setPartyId(selected.id);
      setPartyName(selected.name);

      // Only update the remembered default party when in New Investment mode (not editing)
      if (!editingId) {
        try {
          localStorage.setItem(STORAGE_KEY_LAST_PARTY, selected.id);
        } catch {}
      }
    } else {
      // The Party Name field must always have a selected party whenever saved parties are available.
      if (!editingId && parties.length > 0) {
        const fallback = getRememberedParty();
        setPartyId(fallback.id);
        setPartyName(fallback.name);
      } else {
        setPartyId(undefined);
        setPartyName('');
      }
    }
  };

  const handleEdit = (inv: Investment) => {
    setDate(inv.date);
    setPartyId(inv.partyId);
    setPartyName(inv.partyName);
    setParticular(inv.particular);
    setAmount(inv.amount.toString());
    setNotes(inv.notes || '');
    setEditingId(inv.id);
    setIsFormOpen(true);
    setSaveMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    const remembered = getRememberedParty();
    setPartyId(remembered.id);
    setPartyName(remembered.name);
    setParticular('');
    setAmount('');
    setNotes('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!partyName || !particular || isNaN(numAmount) || numAmount <= 0) return;

    if (editingId) {
      updateInvestment(editingId, { date, partyId, partyName, particular, amount: numAmount, notes });
      setSaveMessage('Investment updated successfully.');
      setEditingId(null);

      // Revert to the remembered default party for subsequent new entries
      const remembered = getRememberedParty();
      setPartyId(remembered.id);
      setPartyName(remembered.name);
    } else {
      addInvestment({ date, partyId, partyName, particular, amount: numAmount, notes });
      setSaveMessage('Investment saved successfully! Ready for next entry.');

      // Update remembered party if valid
      if (partyId) {
        try {
          localStorage.setItem(STORAGE_KEY_LAST_PARTY, partyId);
        } catch {}
      }
    }

    // Clear transaction-specific fields only (keep date & selected party)
    setParticular('');
    setAmount('');
    setNotes('');

    // DO NOT hide form automatically. Keep it open so user can enter another investment quickly!
    setIsFormOpen(true);

    setTimeout(() => {
      setSaveMessage('');
    }, 4000);
  };

  const executeDelete = (inv: Investment) => {
    try {
      if (!inv || !inv.id) {
        setDeleteError('Cannot delete investment: Invalid record ID.');
        return;
      }

      const res = deleteInvestment(inv.id);
      if (res && res.success === false) {
        setDeleteError(res.error || 'Failed to delete investment.');
        return;
      }

      setDeleteError('');
      setSaveMessage(`Investment ${inv.serialNumber} (${inv.particular}) deleted successfully.`);
      if (editingId === inv.id) {
        handleCancelEdit();
      }
      setDeletingInvestment(null);

      setTimeout(() => {
        setSaveMessage('');
      }, 4000);
    } catch (err: any) {
      setDeleteError(err?.message || 'An error occurred while deleting the investment.');
    }
  };

  const handleDelete = (inv: Investment, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    setDeleteError('');

    // Attempt native window.confirm first (preserves existing confirmation dialog behavior)
    let confirmed = false;
    let didShowNativePrompt = false;

    try {
      const startTime = Date.now();
      confirmed = window.confirm(
        `Are you sure you want to delete investment ${inv.serialNumber} (${inv.particular})? Related sales will also be deleted.`
      );
      const duration = Date.now() - startTime;
      didShowNativePrompt = true;

      if (confirmed) {
        executeDelete(inv);
        return;
      } else if (duration > 120) {
        // User saw the native dialog and deliberately clicked Cancel
        return;
      }
    } catch {
      didShowNativePrompt = false;
    }

    // If window.confirm was blocked/silently rejected by the browser or sandbox (duration <= 120ms or threw error),
    // open the in-app confirmation modal so deletion can proceed reliably!
    setDeletingInvestment(inv);
  };

  const getCalculatedInvestment = (inv: Investment) => {
    const recovered = sales
      .filter((s) => s.investmentId === inv.id)
      .reduce((sum, s) => sum + (s.costAmount || 0), 0);

    const remaining = inv.amount - recovered;

    let status = 'Running';
    if (remaining <= 0) status = 'Completed';
    else if (recovered > 0) status = 'Partially Recovered';

    return { ...inv, recovered, remaining, status };
  };

  const filteredInvestments = investments
    .map(getCalculatedInvestment)
    .filter(
      (inv) =>
        inv.partyName.toLowerCase().includes(search.toLowerCase()) ||
        inv.particular.toLowerCase().includes(search.toLowerCase()) ||
        inv.serialNumber.toLowerCase().includes(search.toLowerCase()) ||
        inv.status.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Investments</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage capital investments and track repayment recovery
          </p>
        </div>

        {/* Small collapse/expand dropdown toggle */}
        <button
          type="button"
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors text-sm shadow-xs"
          title={isFormOpen ? 'Collapse investment form' : 'Expand investment form'}
        >
          {isFormOpen ? (
            <>
              <ChevronUp className="w-4 h-4" />
              <span>Collapse Form</span>
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              <span>New Investment</span>
            </>
          )}
        </button>
      </div>

      {/* Global Delete Error or Notice */}
      {deleteError && (
        <div className="flex items-center justify-between p-3.5 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span className="font-medium">{deleteError}</span>
          </div>
          <button
            type="button"
            onClick={() => setDeleteError('')}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. New Investment Form — Always Open by Default */}
      {isFormOpen && (
        <div className="bg-white p-6 rounded-2xl border shadow-sm animate-in fade-in duration-150">
          <div className="flex justify-between items-center mb-5">
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {editingId ? 'Edit Investment' : 'New Investment'}
              </h2>
              <p className="text-xs text-slate-500">
                {editingId
                  ? 'Editing existing record. Saved party is preserved.'
                  : 'Form remains open for fast consecutive entries with smart party selection.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-xs px-2.5 py-1 text-slate-600 hover:bg-slate-100 rounded-lg font-medium border"
                >
                  Cancel Edit
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                title="Collapse form"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Success banner after saving */}
          {saveMessage && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{saveMessage}</span>
            </div>
          )}

          {/* Warning if no saved parties exist */}
          {parties.length === 0 && (
            <div className="mb-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">No Saved Parties Found</p>
                <p className="mt-0.5">
                  You need to create at least one party before recording investments.{' '}
                  <Link
                    to="/settings"
                    className="font-semibold underline hover:text-amber-950 inline-flex items-center gap-0.5"
                  >
                    Go to Settings → Saved Parties <ExternalLink className="w-3 h-3" />
                  </Link>
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Party / Name <span className="text-red-500">*</span>
              </label>
              <SearchablePartySelect
                selectedPartyId={partyId}
                selectedPartyName={partyName}
                onSelect={handleSelectParty}
                required
              />
              <p className="text-[11px] text-slate-400 mt-1">
                {editingId
                  ? 'Showing saved party for this investment.'
                  : 'Automatically remembers your last selected party for consecutive entries.'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Particular</label>
              <input
                type="text"
                required
                value={particular}
                onChange={(e) => setParticular(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Gold Purchase, Shop Equipment..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Investment Amount (₹)</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                placeholder="0.00"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Additional notes or payment reference..."
              />
            </div>

            <div className="md:col-span-2 flex items-center justify-between pt-2">
              <div className="text-xs text-slate-400">
                {parties.length > 0 && partyName && (
                  <span>
                    Selected Party: <strong className="text-slate-700 font-semibold">{partyName}</strong>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {editingId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg text-sm"
                  >
                    Cancel Edit
                  </button>
                )}
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white font-semibold hover:bg-blue-700 rounded-lg text-sm shadow-xs transition-colors"
                >
                  {editingId ? 'Update Investment' : 'Save Investment'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Investments Table */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b flex items-center bg-slate-50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by party, particular, status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 border-b">
              <tr>
                <th className="px-6 py-4 font-medium">S/N</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Party & Particular</th>
                <th className="px-6 py-4 font-medium text-right">Investment</th>
                <th className="px-6 py-4 font-medium text-right">Recovered</th>
                <th className="px-6 py-4 font-medium text-right">Remaining</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvestments.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-slate-600">{inv.serialNumber}</td>
                  <td className="px-6 py-4 text-slate-600">{formatDate(inv.date)}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-800">{inv.partyName}</div>
                    <div className="text-slate-500 text-xs">{inv.particular}</div>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-slate-800">
                    {formatCurrency(inv.amount)}
                  </td>
                  <td className="px-6 py-4 text-right text-green-600">{formatCurrency(inv.recovered)}</td>
                  <td className="px-6 py-4 text-right font-medium text-indigo-600">
                    {formatCurrency(inv.remaining)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                        inv.status === 'Completed'
                          ? 'bg-green-50 text-green-700'
                          : inv.status === 'Partially Recovered'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(inv)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit investment"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(inv, e)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete investment"
                        aria-label={`Delete investment ${inv.serialNumber}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredInvestments.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                    No investments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal for Deletion */}
      {deletingInvestment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div
            className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5 mb-4">
              <div className="p-2.5 bg-red-50 text-red-600 rounded-xl shrink-0 mt-0.5">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Investment</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Are you sure you want to delete investment{' '}
                  <strong className="text-slate-800 font-semibold">{deletingInvestment.serialNumber}</strong>{' '}
                  ({deletingInvestment.particular} — {formatCurrency(deletingInvestment.amount)})?
                  Related sales will also be deleted.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5 mb-5">
              <div className="flex justify-between">
                <span className="text-slate-500">Party:</span>
                <span className="font-semibold text-slate-800">{deletingInvestment.partyName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date:</span>
                <span className="font-medium text-slate-700">{formatDate(deletingInvestment.date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount:</span>
                <span className="font-bold text-slate-900">{formatCurrency(deletingInvestment.amount)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingInvestment(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeDelete(deletingInvestment)}
                className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-xs"
              >
                Yes, Delete Investment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
