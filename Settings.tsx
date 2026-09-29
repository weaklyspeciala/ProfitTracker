import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore, type Party, type SavedService } from '../store';
import { formatDate, formatDateTime } from '../lib/utils';
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  AlertCircle,
  Search,
  Building2,
  Upload,
  CheckCircle2,
  ShieldCheck,
  Loader2,
  FileDown,
  Database,
  ArrowRight,
  TrendingUp,
  Package,
  Wallet,
  Tag,
  Sparkles,
} from 'lucide-react';

export function Settings() {
  const {
    parties,
    savedServices,
    investments,
    addParty,
    updateParty,
    deleteParty,
    addSavedService,
    updateSavedService,
    deleteSavedService,
    importBackup,
    lastSavedAt,
    saveDataNow,
  } = useAppStore();

  // Save Data Now state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');
  const [saveErrorMessage, setSaveErrorMessage] = useState('');

  // Import backup state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [pendingBackup, setPendingBackup] = useState<{
    fileName: string;
    fileSize: string;
    investments: any[];
    sales: any[];
    products: any[];
    parties: any[];
    stockPurchases: any[];
    savedServices?: any[];
  } | null>(null);

  // Add party state
  const [newPartyName, setNewPartyName] = useState('');
  const [addError, setAddError] = useState('');

  // Edit party state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editError, setEditError] = useState('');

  // Search party state
  const [searchQuery, setSearchQuery] = useState('');

  // Saved Service / Product Names state
  const [newServiceName, setNewServiceName] = useState('');
  const [addServiceError, setAddServiceError] = useState('');
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editingServiceName, setEditingServiceName] = useState('');
  const [editServiceError, setEditServiceError] = useState('');
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [serviceToDelete, setServiceToDelete] = useState<SavedService | null>(null);

  const handleAddParty = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    if (!newPartyName.trim()) {
      setAddError('Party name cannot be empty.');
      return;
    }

    const res = addParty(newPartyName);
    if (!res.success) {
      setAddError(res.error || 'Failed to add party.');
    } else {
      setNewPartyName('');
    }
  };

  const startEdit = (party: Party) => {
    setEditingId(party.id);
    setEditingName(party.name);
    setEditError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName('');
    setEditError('');
  };

  const saveEdit = (id: string) => {
    setEditError('');
    if (!editingName.trim()) {
      setEditError('Party name cannot be empty.');
      return;
    }

    const res = updateParty(id, editingName);
    if (!res.success) {
      setEditError(res.error || 'Failed to update party.');
    } else {
      setEditingId(null);
      setEditingName('');
    }
  };

  const handleDelete = (party: Party) => {
    const isUsed = investments.some(
      (inv) => inv.partyId === party.id || inv.partyName.toLowerCase() === party.name.toLowerCase()
    );
    const message = isUsed
      ? `"${party.name}" is referenced in investment records. Are you sure you want to remove it from Saved Parties? Existing investment records will not be deleted.`
      : `Are you sure you want to delete "${party.name}" from saved parties?`;

    if (window.confirm(message)) {
      deleteParty(party.id);
      if (editingId === party.id) {
        cancelEdit();
      }
    }
  };

  // Saved Services Handlers
  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    setAddServiceError('');
    const trimmed = newServiceName.trim().replace(/\s+/g, ' ');
    if (!trimmed) {
      setAddServiceError('Service or product name cannot be empty.');
      return;
    }

    const res = addSavedService(trimmed);
    if (!res.success) {
      setAddServiceError(res.error || 'Failed to add service name.');
    } else {
      setNewServiceName('');
    }
  };

  const startEditService = (service: SavedService) => {
    setEditingServiceId(service.id);
    setEditingServiceName(service.name);
    setEditServiceError('');
  };

  const cancelEditService = () => {
    setEditingServiceId(null);
    setEditingServiceName('');
    setEditServiceError('');
  };

  const saveEditService = (id: string) => {
    setEditServiceError('');
    const trimmed = editingServiceName.trim().replace(/\s+/g, ' ');
    if (!trimmed) {
      setEditServiceError('Service or product name cannot be empty.');
      return;
    }

    const res = updateSavedService(id, trimmed);
    if (!res.success) {
      setEditServiceError(res.error || 'Failed to update service name.');
    } else {
      setEditingServiceId(null);
      setEditingServiceName('');
    }
  };

  const confirmDeleteService = () => {
    if (serviceToDelete) {
      deleteSavedService(serviceToDelete.id);
      if (editingServiceId === serviceToDelete.id) {
        cancelEditService();
      }
      setServiceToDelete(null);
    }
  };

  const parseSafeNum = (val: any, fallback = 0): number => {
    if (typeof val === 'number') return isNaN(val) ? fallback : val;
    if (typeof val === 'string') {
      const cleaned = val.replace(/[^0-9.-]+/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? fallback : num;
    }
    return fallback;
  };

  const findArrayProperty = (obj: any, keys: string[]): any[] | null => {
    if (!obj || typeof obj !== 'object') return null;
    for (const key of keys) {
      if (Array.isArray(obj[key])) return obj[key];
    }
    const objKeys = Object.keys(obj);
    for (const key of keys) {
      const match = objKeys.find((k) => k.toLowerCase() === key.toLowerCase());
      if (match && Array.isArray(obj[match])) return obj[match];
    }
    return null;
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError('');
    setImportSuccess('');

    // Ensure it's a JSON file
    if (!file.name.toLowerCase().endsWith('.json') && file.type && file.type !== 'application/json' && file.type !== 'text/plain') {
      setImportError('Invalid file type: Please select a valid .json backup file.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        let text = (event.target?.result as string) || '';
        // Strip UTF-8 BOM if present
        if (text.charCodeAt(0) === 0xfeff) {
          text = text.slice(1);
        }
        text = text.trim();

        if (!text) {
          setImportError('Invalid backup file: The selected file is empty.');
          return;
        }

        let parsed: any;
        try {
          parsed = JSON.parse(text);
        } catch {
          setImportError('Invalid backup file: File content is not valid JSON syntax.');
          return;
        }

        // Support multiple nesting structures:
        // 1. Direct root { investments: [...], sales: [...], products: [...], parties: [...] }
        // 2. Zustand wrapper { state: { investments: [...], ... }, version: ... }
        // 3. Nested wrapper { data: { investments: [...] } } or { backup: { ... } }
        let data: any = parsed;
        if (parsed && typeof parsed === 'object') {
          if (parsed.state && typeof parsed.state === 'object' && !Array.isArray(parsed.state)) {
            data = parsed.state;
          } else if (parsed.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data)) {
            data = parsed.data;
          } else if (parsed.backup && typeof parsed.backup === 'object' && !Array.isArray(parsed.backup)) {
            data = parsed.backup;
          }
        }

        let rawInvestments: any[] = [];
        let rawSales: any[] = [];
        let rawProducts: any[] = [];
        let rawParties: any[] = [];
        let rawPurchases: any[] = [];
        let rawSavedServices: any[] = [];

        if (Array.isArray(parsed)) {
          // If the user uploaded a top-level array of items, categorize each item automatically
          parsed.forEach((item) => {
            if (!item || typeof item !== 'object') return;
            if ('saleAmount' in item || 'unitPrice' in item || item.saleType === 'product' || item.saleType === 'service') {
              rawSales.push(item);
            } else if ('purchaseCost' in item || 'currentStock' in item || 'lowStockAlert' in item) {
              rawProducts.push(item);
            } else if ('partyName' in item || ('amount' in item && 'particular' in item)) {
              rawInvestments.push(item);
            } else if ('name' in item && !('purchaseCost' in item) && !('saleAmount' in item)) {
              rawParties.push(item);
            } else if ('quantity' in item && 'unitCost' in item) {
              rawPurchases.push(item);
            } else {
              rawSales.push(item);
            }
          });
        } else if (data && typeof data === 'object') {
          rawInvestments = findArrayProperty(data, ['investments', 'investment']) || [];
          rawSales = findArrayProperty(data, ['sales', 'sale']) || [];
          rawProducts = findArrayProperty(data, ['products', 'product']) || [];
          rawParties = findArrayProperty(data, ['parties', 'party']) || [];
          rawPurchases = findArrayProperty(data, ['stockPurchases', 'stock_purchases', 'purchases']) || [];
          rawSavedServices = findArrayProperty(data, ['savedServices', 'saved_services', 'services']) || [];
        } else {
          setImportError('Invalid backup file: Unrecognized backup file structure.');
          return;
        }

        const totalItemsCount =
          rawInvestments.length + rawSales.length + rawProducts.length + rawParties.length + rawPurchases.length + rawSavedServices.length;

        if (totalItemsCount === 0) {
          setImportError('Invalid backup file: No investments, sales, products, or saved parties found in this file.');
          return;
        }

        const nowIso = new Date().toISOString();
        const todayYmd = nowIso.split('T')[0];

        // Sanitize Investments with resilient numeric and text defaults
        const sanitizedInvestments = rawInvestments
          .filter((item) => item && typeof item === 'object')
          .map((item, idx) => ({
            id: typeof item.id === 'string' && item.id ? item.id : crypto.randomUUID(),
            serialNumber: typeof item.serialNumber === 'string' && item.serialNumber ? item.serialNumber : `INV-${idx + 1}`,
            date: typeof item.date === 'string' && item.date ? item.date : todayYmd,
            partyId: item.partyId || undefined,
            partyName: item.partyName || item.party || 'General Party',
            particular: item.particular || item.notes || item.description || 'Investment Record',
            amount: parseSafeNum(item.amount ?? item.investmentAmount ?? item.cost, 0),
            notes: item.notes || '',
            createdAt: item.createdAt || nowIso,
            updatedAt: item.updatedAt || nowIso,
          }));

        // Sanitize Sales with resilient fields & paymentType support
        const sanitizedSales = rawSales
          .filter((item) => item && typeof item === 'object')
          .map((item, idx) => {
            const rawSaleAmt = parseSafeNum(item.saleAmount ?? item.amount ?? item.total ?? item.price, 0);
            const rawCostAmt = parseSafeNum(item.costAmount ?? item.cost ?? item.totalCost, 0);
            const rawQty = parseSafeNum(item.quantity, 1);
            return {
              id: typeof item.id === 'string' && item.id ? item.id : crypto.randomUUID(),
              serialNumber: typeof item.serialNumber === 'string' && item.serialNumber ? item.serialNumber : `SAL-${idx + 1}`,
              date: typeof item.date === 'string' && item.date ? item.date : todayYmd,
              investmentId: item.investmentId || undefined,
              partyName: item.partyName || '',
              particular: item.particular || item.item || item.productName || item.description || 'Sale Record',
              costAmount: rawCostAmt,
              saleAmount: rawSaleAmt,
              notes: item.notes || '',
              saleType: item.saleType === 'product' || item.saleType === 'service' ? item.saleType : (item.productId ? 'product' : 'service'),
              productId: item.productId || undefined,
              productName: item.productName || undefined,
              quantity: rawQty,
              unitPrice: item.unitPrice !== undefined ? parseSafeNum(item.unitPrice) : (rawQty > 0 ? rawSaleAmt / rawQty : rawSaleAmt),
              unitCost: item.unitCost !== undefined ? parseSafeNum(item.unitCost) : (rawQty > 0 ? rawCostAmt / rawQty : rawCostAmt),
              isCostRecorded: item.isCostRecorded !== undefined ? Boolean(item.isCostRecorded) : true,
              paymentType: item.paymentType || 'Cash',
              createdAt: item.createdAt || nowIso,
              updatedAt: item.updatedAt || nowIso,
            };
          });

        // Sanitize Products
        const sanitizedProducts = rawProducts
          .filter((item) => item && typeof item === 'object')
          .map((item, idx) => ({
            id: typeof item.id === 'string' && item.id ? item.id : crypto.randomUUID(),
            productId: typeof item.productId === 'string' && item.productId ? item.productId : `PRD-${idx + 1}`,
            name: typeof item.name === 'string' && item.name ? item.name : `Product ${idx + 1}`,
            category: item.category || 'Stationery',
            purchaseCost: parseSafeNum(item.purchaseCost ?? item.cost, 0),
            sellingPrice: item.sellingPrice !== undefined ? parseSafeNum(item.sellingPrice) : undefined,
            currentStock: parseSafeNum(item.currentStock ?? item.stock, 0),
            lowStockAlert: parseSafeNum(item.lowStockAlert, 5),
            notes: item.notes || '',
            createdAt: item.createdAt || nowIso,
            updatedAt: item.updatedAt || nowIso,
          }));

        // Sanitize Parties
        const sanitizedParties = rawParties
          .map((item) => {
            if (typeof item === 'string') {
              return {
                id: crypto.randomUUID(),
                name: item.trim(),
                createdAt: nowIso,
                updatedAt: nowIso,
              };
            }
            if (item && typeof item === 'object' && item.name) {
              return {
                id: typeof item.id === 'string' && item.id ? item.id : crypto.randomUUID(),
                name: String(item.name).trim(),
                createdAt: item.createdAt || nowIso,
                updatedAt: item.updatedAt || nowIso,
              };
            }
            return null;
          })
          .filter(Boolean) as Party[];

        // Sanitize Stock Purchases if present
        const sanitizedPurchases = rawPurchases
          .filter((item) => item && typeof item === 'object')
          .map((item, idx) => ({
            id: typeof item.id === 'string' && item.id ? item.id : crypto.randomUUID(),
            serialNumber: typeof item.serialNumber === 'string' && item.serialNumber ? item.serialNumber : `PUR-${idx + 1}`,
            productId: item.productId || '',
            productName: item.productName || 'Stock Purchase',
            date: typeof item.date === 'string' && item.date ? item.date : todayYmd,
            quantity: parseSafeNum(item.quantity, 1),
            unitCost: parseSafeNum(item.unitCost, 0),
            totalCost: parseSafeNum(item.totalCost ?? (item.quantity * item.unitCost), 0),
            notes: item.notes || '',
            createdAt: item.createdAt || nowIso,
          }));

        // Sanitize Saved Services if present
        const sanitizedSavedServices = rawSavedServices
          .map((item) => {
            if (typeof item === 'string') {
              return {
                id: crypto.randomUUID(),
                name: item.trim(),
                createdAt: nowIso,
                updatedAt: nowIso,
              };
            }
            if (item && typeof item === 'object' && item.name) {
              return {
                id: typeof item.id === 'string' && item.id ? item.id : crypto.randomUUID(),
                name: String(item.name).trim(),
                createdAt: item.createdAt || nowIso,
                updatedAt: item.updatedAt || nowIso,
              };
            }
            return null;
          })
          .filter(Boolean) as SavedService[];

        // Open in-UI confirmation modal (safe in iframe, does not rely on window.confirm)
        setPendingBackup({
          fileName: file.name,
          fileSize: file.size < 1024 ? `${file.size} B` : `${(file.size / 1024).toFixed(1)} KB`,
          investments: sanitizedInvestments,
          sales: sanitizedSales,
          products: sanitizedProducts,
          parties: sanitizedParties,
          stockPurchases: sanitizedPurchases,
          savedServices: sanitizedSavedServices,
        });
      } catch (err: any) {
        setImportError(`Failed to process backup file: ${err?.message || 'Unknown error occurred.'}`);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.onerror = () => {
      setImportError('Failed to read the file from device storage.');
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    reader.readAsText(file);
  };

  const confirmRestore = () => {
    if (!pendingBackup) return;

    try {
      importBackup({
        investments: pendingBackup.investments,
        sales: pendingBackup.sales,
        parties: pendingBackup.parties,
        products: pendingBackup.products,
        stockPurchases: pendingBackup.stockPurchases,
        savedServices: pendingBackup.savedServices,
      });

      setImportSuccess(
        `Backup restored successfully from "${pendingBackup.fileName}"! Loaded ${pendingBackup.sales.length} sale(s), ${pendingBackup.investments.length} investment(s), ${pendingBackup.products.length} product(s), and ${pendingBackup.parties.length} saved party/parties.`
      );
      setImportError('');
      setPendingBackup(null);
    } catch (err: any) {
      setImportError(`Failed to apply restore: ${err?.message || 'Unknown error occurred.'}`);
    }
  };

  const cancelRestore = () => {
    setPendingBackup(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveDataNow = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveSuccessMessage('');
    setSaveErrorMessage('');

    // Brief verification delay for realistic feedback
    await new Promise((resolve) => setTimeout(resolve, 350));

    const result = await saveDataNow();
    setIsSaving(false);

    if (result.success) {
      setSaveSuccessMessage('All data saved successfully.');
    } else {
      setSaveErrorMessage(result.error || 'Failed to save data. Please check available browser storage.');
    }
  };

  const filteredParties = parties.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const filteredServices = (savedServices || []).filter((s) =>
    s.name.toLowerCase().includes(serviceSearchQuery.toLowerCase().trim())
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Settings</h1>

      {/* Saved Parties Section */}
      <div className="bg-white rounded-2xl border shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Saved Parties</h2>
              <p className="text-xs text-slate-500">
                Manage party names used across investments and sales
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full w-fit">
            {parties.length} {parties.length === 1 ? 'Party' : 'Parties'}
          </span>
        </div>

        {/* Add Party Form */}
        <form onSubmit={handleAddParty} className="mb-6">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={newPartyName}
                onChange={(e) => {
                  setNewPartyName(e.target.value);
                  if (addError) setAddError('');
                }}
                placeholder="Enter new party name (e.g. Acme Corp, Rajesh Sharma)..."
                className="w-full px-3.5 py-2.5 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors shrink-0 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Party
            </button>
          </div>
          {addError && (
            <div className="flex items-center gap-1.5 text-red-600 text-xs mt-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{addError}</span>
            </div>
          )}
        </form>

        {/* Search if there are multiple parties */}
        {parties.length > 4 && (
          <div className="relative mb-4">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search saved parties..."
              className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white"
            />
          </div>
        )}

        {/* Edit error banner if active */}
        {editError && (
          <div className="flex items-center gap-1.5 text-red-600 text-xs mb-3 p-2.5 bg-red-50 rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{editError}</span>
          </div>
        )}

        {/* Parties List */}
        <div className="border rounded-xl divide-y divide-slate-100 overflow-hidden">
          {parties.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-medium text-slate-700">No saved parties yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Add your parties above. Once added, they will be available in the investment form searchable dropdown.
              </p>
            </div>
          ) : filteredParties.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">
              No parties found matching "{searchQuery}"
            </div>
          ) : (
            filteredParties.map((party, index) => {
              const isEditing = editingId === party.id;
              const linkedCount = investments.filter(
                (inv) => inv.partyId === party.id || inv.partyName.toLowerCase() === party.name.toLowerCase()
              ).length;

              return (
                <div
                  key={party.id}
                  className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    isEditing ? 'bg-blue-50/60' : 'hover:bg-slate-50/80'
                  }`}
                >
                  {isEditing ? (
                    <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => {
                          setEditingName(e.target.value);
                          if (editError) setEditError('');
                        }}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            saveEdit(party.id);
                          } else if (e.key === 'Escape') {
                            cancelEdit();
                          }
                        }}
                        className="flex-1 px-3 py-1.5 text-sm bg-white border border-blue-400 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Party name..."
                      />
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => saveEdit(party.id)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg flex items-center gap-1 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" /> Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-medium rounded-lg flex items-center gap-1 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-semibold text-slate-400 w-6 shrink-0">
                          #{index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 text-sm truncate">
                            {party.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            Added {formatDate(party.createdAt)}
                            {linkedCount > 0 && (
                              <span className="ml-2 text-slate-500 font-medium">
                                • {linkedCount} {linkedCount === 1 ? 'investment' : 'investments'}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 self-end sm:self-auto shrink-0">
                        <button
                          type="button"
                          onClick={() => startEdit(party)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors"
                          title="Edit Party"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(party)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          title="Delete Party"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Saved Service/Product Names Section */}
      <div className="bg-white rounded-2xl border shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Saved Service/Product Names</h2>
              <p className="text-xs text-slate-500">
                Pre-configure frequently used service and product names for instant 1-click selection in the Sales form
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full w-fit border border-purple-100">
            {(savedServices || []).length} Saved {(savedServices || []).length === 1 ? 'Name' : 'Names'}
          </span>
        </div>

        {/* Add Service/Product Form */}
        <form onSubmit={handleAddService} className="mb-6">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={newServiceName}
                onChange={(e) => {
                  setNewServiceName(e.target.value);
                  if (addServiceError) setAddServiceError('');
                }}
                placeholder="Enter service or product name (e.g. B/W Print, Colour Print, Passport Photo)..."
                className="w-full px-3.5 py-2.5 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              />
            </div>
            <button
              type="submit"
              className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors shrink-0 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Name
            </button>
          </div>
          {addServiceError && (
            <div className="flex items-center gap-1.5 text-red-600 text-xs mt-2 p-2 bg-red-50 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{addServiceError}</span>
            </div>
          )}
        </form>

        {/* Search if there are multiple saved services */}
        {(savedServices || []).length > 4 && (
          <div className="relative mb-4">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={serviceSearchQuery}
              onChange={(e) => setServiceSearchQuery(e.target.value)}
              placeholder="Search saved services or product names..."
              className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-purple-500 bg-slate-50 focus:bg-white"
            />
          </div>
        )}

        {/* Edit error banner if active */}
        {editServiceError && (
          <div className="flex items-center gap-1.5 text-red-600 text-xs mb-3 p-2.5 bg-red-50 rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{editServiceError}</span>
          </div>
        )}

        {/* Services List */}
        <div className="border rounded-xl divide-y divide-slate-100 overflow-hidden">
          {(savedServices || []).length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Tag className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-medium text-slate-700">No saved service/product names yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Add your common names above. Once added, they will appear in the searchable dropdown in the Sales form.
              </p>
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">
              No saved names found matching "{serviceSearchQuery}"
            </div>
          ) : (
            filteredServices.map((service, index) => {
              const isEditing = editingServiceId === service.id;

              return (
                <div
                  key={service.id}
                  className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    isEditing ? 'bg-purple-50/60' : 'hover:bg-slate-50/80'
                  }`}
                >
                  {isEditing ? (
                    <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        type="text"
                        value={editingServiceName}
                        onChange={(e) => {
                          setEditingServiceName(e.target.value);
                          if (editServiceError) setEditServiceError('');
                        }}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            saveEditService(service.id);
                          } else if (e.key === 'Escape') {
                            cancelEditService();
                          }
                        }}
                        className="flex-1 px-3 py-1.5 text-sm bg-white border border-purple-400 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Service/product name..."
                      />
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => saveEditService(service.id)}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg flex items-center gap-1 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" /> Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditService}
                          className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-medium rounded-lg flex items-center gap-1 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-semibold text-slate-400 w-6 shrink-0">
                          #{index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 text-sm truncate">
                            {service.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            Saved {formatDate(service.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 self-end sm:self-auto shrink-0">
                        <button
                          type="button"
                          onClick={() => startEditService(service)}
                          className="p-1.5 text-slate-400 hover:text-purple-600 rounded-lg hover:bg-slate-100 transition-colors"
                          title="Edit Name"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setServiceToDelete(service)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          title="Delete Name"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Application Details */}
      <div className="bg-white rounded-2xl border shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Application Details</h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-slate-500">App Name</p>
            <p className="text-slate-800 font-medium">Sales & Investment Management</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Version</p>
            <p className="text-slate-800">1.1.0</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Storage</p>
            <p className="text-slate-800">Local Storage (Browser-based persistence)</p>
            <p className="text-sm text-amber-600 mt-1">
              Warning: Clearing browser data will remove all stored parties, investments, and sales.
            </p>
          </div>
        </div>
      </div>

      {/* Data Safety Section */}
      <div className="bg-white rounded-2xl border shadow-sm p-6">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Data Safety</h2>
            <p className="text-xs text-slate-500">
              Automatic saving is always active. Use this option to immediately save and verify all data.
            </p>
          </div>
        </div>

        <p className="text-slate-600 text-sm mb-4">
          All investments, sales, and saved parties are saved in your browser's local storage automatically. Click below whenever you want additional reassurance that your latest changes are safely stored and verified.
        </p>

        {saveSuccessMessage && (
          <div className="flex items-start gap-2.5 p-3.5 mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
            <div>
              <p className="font-semibold text-xs text-emerald-800 uppercase tracking-wider">Saved Successfully</p>
              <p className="text-xs text-emerald-700 mt-0.5">{saveSuccessMessage}</p>
            </div>
          </div>
        )}

        {saveErrorMessage && (
          <div className="flex items-start gap-2.5 p-3.5 mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
            <div>
              <p className="font-semibold text-xs text-red-800 uppercase tracking-wider">Save Error</p>
              <p className="text-xs text-red-700 mt-0.5">{saveErrorMessage}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveDataNow}
            className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 shadow-sm ${
              isSaving
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-98'
            }`}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving data...</span>
              </>
            ) : (
              <span>💾 Save Data Now</span>
            )}
          </button>

          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
            <span>
              {lastSavedAt ? (
                <>Last successful save: <strong className="text-slate-700 font-semibold">{formatDateTime(lastSavedAt)}</strong></>
              ) : (
                'Auto-saved continuously in browser storage'
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Export Data */}
      <div className="bg-white rounded-2xl border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-2">
          <Database className="w-5 h-5 text-slate-700" />
          <h2 className="text-lg font-bold text-slate-800">Export Backup</h2>
        </div>
        <p className="text-slate-600 text-sm mb-4">
          Export your complete database (including sales, investments, products & stock catalog, stock purchases, and saved parties) as a clean JSON backup file.
        </p>
        <button
          type="button"
          onClick={() => {
            const state = useAppStore.getState();
            const exportPayload = {
              version: 1,
              exportedAt: new Date().toISOString(),
              sales: state.sales,
              investments: state.investments,
              products: state.products,
              stockPurchases: state.stockPurchases,
              parties: state.parties,
              savedServices: state.savedServices,
            };
            const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm shadow-sm"
        >
          <FileDown className="w-4 h-4" />
          <span>Download Complete Backup JSON</span>
        </button>
      </div>

      {/* Import Backup */}
      <div className="bg-white rounded-2xl border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-2">
          <Upload className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold text-slate-800">Restore Backup Data</h2>
        </div>
        <p className="text-slate-600 text-sm mb-4">
          Select a previously downloaded backup JSON file from your device to restore your data. The restore will immediately update your records across Sales, Investments, Products, and Dashboard.
        </p>

        {importError && (
          <div className="flex items-start gap-2.5 p-3.5 mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
            <div>
              <p className="font-semibold text-xs text-red-800 uppercase tracking-wider">Import Error</p>
              <p className="text-xs text-red-700 mt-0.5">{importError}</p>
            </div>
          </div>
        )}

        {importSuccess && (
          <div className="p-4 mb-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl space-y-3">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
              <div>
                <p className="font-semibold text-xs text-emerald-800 uppercase tracking-wider">Restore Complete & Applied</p>
                <p className="text-xs text-emerald-700 mt-0.5 font-medium">{importSuccess}</p>
              </div>
            </div>

            {/* Quick Navigation Links */}
            <div className="pt-2 border-t border-emerald-200/60 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-medium text-emerald-800">View restored data in:</span>
              <Link
                to="/sales"
                className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 rounded-md border border-emerald-300 font-medium inline-flex items-center gap-1 transition-colors"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Sales
              </Link>
              <Link
                to="/investments"
                className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 rounded-md border border-emerald-300 font-medium inline-flex items-center gap-1 transition-colors"
              >
                <Wallet className="w-3.5 h-3.5" />
                Investments
              </Link>
              <Link
                to="/products"
                className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 rounded-md border border-emerald-300 font-medium inline-flex items-center gap-1 transition-colors"
              >
                <Package className="w-3.5 h-3.5" />
                Products & Stock
              </Link>
              <Link
                to="/"
                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md font-medium inline-flex items-center gap-1 transition-colors"
              >
                Dashboard
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json,text/plain"
          onChange={handleFileImport}
          className="hidden"
        />

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm shadow-sm"
          >
            <Upload className="w-4 h-4" />
            Select Backup JSON to Restore
          </button>
          <span className="text-xs text-slate-500">
            Accepts JSON backup files (.json)
          </span>
        </div>
      </div>

      {/* In-UI Confirmation Modal for Restore */}
      {pendingBackup && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Confirm Backup Restore</h3>
                  <p className="text-xs text-slate-500">
                    File: <span className="font-semibold text-slate-700">{pendingBackup.fileName}</span> ({pendingBackup.fileSize})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={cancelRestore}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              The selected backup file was verified successfully. Here is the summary of records detected:
            </p>

            {/* Record Breakdown Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 py-1">
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-center">
                <span className="block text-xl font-bold text-blue-800">{pendingBackup.sales.length}</span>
                <span className="text-[11px] font-medium text-blue-600">Sale Record(s)</span>
              </div>
              <div className="p-3 rounded-xl bg-purple-50 border border-purple-100 text-center">
                <span className="block text-xl font-bold text-purple-800">{pendingBackup.investments.length}</span>
                <span className="text-[11px] font-medium text-purple-600">Investment(s)</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
                <span className="block text-xl font-bold text-emerald-800">{pendingBackup.products.length}</span>
                <span className="text-[11px] font-medium text-emerald-600">Product(s)</span>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-center">
                <span className="block text-xl font-bold text-amber-800">{pendingBackup.parties.length}</span>
                <span className="text-[11px] font-medium text-amber-600">Party/Parties</span>
              </div>
              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-center col-span-2 sm:col-span-1">
                <span className="block text-xl font-bold text-indigo-800">{pendingBackup.stockPurchases.length}</span>
                <span className="text-[11px] font-medium text-indigo-600">Stock Purchase(s)</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <span className="font-semibold">Important:</span> Restoring this backup will replace current records with this file's data and immediately synchronize all views across the website.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={cancelRestore}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRestore}
                className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Restore & Apply Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Service Confirmation Modal */}
      {serviceToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900">Delete Saved Name</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Are you sure you want to remove <strong className="text-slate-800 font-semibold">"{serviceToDelete.name}"</strong> from your saved service/product names?
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
              Note: Historical sales records will not be deleted or modified.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setServiceToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteService}
                className="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Delete Name
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
