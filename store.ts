import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Party {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavedService {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Investment {
  id: string;
  serialNumber: string;
  date: string;
  partyId?: string;
  partyName: string;
  particular: string;
  amount: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  productId: string; // e.g. PRD-001
  name: string;
  category: string;
  purchaseCost: number; // Purchase Cost per Unit (₹)
  sellingPrice?: number; // Selling Price per Unit (₹, optional)
  currentStock: number; // Current Stock Quantity
  lowStockAlert: number; // Low Stock Alert Quantity
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockPurchase {
  id: string;
  serialNumber: string; // e.g. PUR-001
  productId: string;
  productName: string;
  date: string; // YYYY-MM-DD
  quantity: number;
  unitCost: number;
  totalCost: number;
  notes?: string;
  createdAt: string;
}

export interface Sale {
  id: string;
  serialNumber: string;
  date: string;
  investmentId?: string;
  partyName?: string;
  particular: string;
  costAmount?: number;
  saleAmount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;

  // Cyber Cafe & Stationery shop enhancements
  saleType?: 'product' | 'service';
  productId?: string;
  productName?: string;
  quantity?: number;
  unitPrice?: number;
  unitCost?: number;
  isCostRecorded?: boolean;
  paymentType?: string;
}

interface AppState {
  isAuthenticated: boolean;
  loginTime: string | null;
  failedAttempts: number;
  lockedUntil: string | null;
  login: (code: string) => { success: boolean; error?: string };
  logout: () => void;
  checkSession: () => void;
  
  parties: Party[];
  addParty: (name: string) => { success: boolean; error?: string; party?: Party };
  updateParty: (id: string, name: string) => { success: boolean; error?: string };
  deleteParty: (id: string) => void;

  savedServices: SavedService[];
  addSavedService: (name: string) => { success: boolean; error?: string; service?: SavedService };
  updateSavedService: (id: string, name: string) => { success: boolean; error?: string };
  deleteSavedService: (id: string) => void;

  investments: Investment[];
  sales: Sale[];
  products: Product[];
  stockPurchases: StockPurchase[];

  addInvestment: (inv: Omit<Investment, 'id' | 'serialNumber' | 'createdAt' | 'updatedAt'>) => void;
  updateInvestment: (id: string, inv: Partial<Investment>) => void;
  deleteInvestment: (id: string) => { success: boolean; error?: string };

  addProduct: (prod: Omit<Product, 'id' | 'productId' | 'createdAt' | 'updatedAt'>) => { success: boolean; error?: string; product?: Product };
  updateProduct: (id: string, prod: Partial<Product>) => { success: boolean; error?: string };
  deleteProduct: (id: string) => { success: boolean; error?: string };
  restockProduct: (purchase: Omit<StockPurchase, 'id' | 'serialNumber' | 'createdAt'>, updateProductPurchaseCost?: boolean) => { success: boolean; error?: string };

  addSale: (sale: Omit<Sale, 'id' | 'serialNumber' | 'createdAt' | 'updatedAt'>) => void;
  updateSale: (id: string, sale: Partial<Sale>) => void;
  deleteSale: (id: string) => void;

  importBackup: (backup: {
    parties?: Party[];
    savedServices?: SavedService[];
    investments?: Investment[];
    sales?: Sale[];
    products?: Product[];
    stockPurchases?: StockPurchase[];
  }) => void;

  lastSavedAt: string | null;
  saveDataNow: () => Promise<{ success: boolean; timestamp: string; error?: string }>;
}

const VALID_CODES = ['199720', '199730'];
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export const DEFAULT_SAVED_SERVICES: SavedService[] = [
  'B/W Print',
  'Colour Print',
  'Photocopy',
  'Scanning',
  'Passport Photo',
  'Lamination',
  'Online Form Fill-up',
  'PAN Card Service',
  'Aadhaar Print',
  'Document Typing',
  'Photo Editing',
  'Recharge',
  'Other Services',
].map((name, index) => ({
  id: `srv-${index + 1}`,
  name,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}));

const DEFAULT_SAMPLE_PRODUCTS: Product[] = [
  {
    id: 'prd-sample-1',
    productId: 'PRD-001',
    name: 'Classmate A4 Spiral Notebook 200p',
    category: 'Notebooks',
    purchaseCost: 55,
    sellingPrice: 80,
    currentStock: 35,
    lowStockAlert: 8,
    notes: 'Single line, 200 pages ruled paper',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prd-sample-2',
    productId: 'PRD-002',
    name: 'Reynolds 045 Ball Pen Blue (Pack of 5)',
    category: 'Pens & Writing',
    purchaseCost: 35,
    sellingPrice: 50,
    currentStock: 45,
    lowStockAlert: 10,
    notes: '0.5mm tip fine ball pens',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prd-sample-3',
    productId: 'PRD-003',
    name: 'JK Copier A4 Paper 75 GSM Ream (500 Sheets)',
    category: 'Paper & Printing',
    purchaseCost: 260,
    sellingPrice: 340,
    currentStock: 12,
    lowStockAlert: 4,
    notes: 'Multi-purpose office & Xerox paper',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prd-sample-4',
    productId: 'PRD-004',
    name: 'Ivory Art Card Paper 250 GSM (Pack of 25)',
    category: 'Art Supplies',
    purchaseCost: 110,
    sellingPrice: 160,
    currentStock: 5,
    lowStockAlert: 5,
    notes: 'For certificates, project covers & artwork',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      loginTime: null,
      failedAttempts: 0,
      lockedUntil: null,
      login: (code: string) => {
        const { failedAttempts, lockedUntil } = get();
        
        if (lockedUntil && new Date(lockedUntil) > new Date()) {
          const minutes = Math.ceil((new Date(lockedUntil).getTime() - Date.now()) / 60000);
          return { success: false, error: `Too many failed attempts. Try again in ${minutes} minutes.` };
        }

        if (VALID_CODES.includes(code)) {
          set({ isAuthenticated: true, loginTime: new Date().toISOString(), failedAttempts: 0, lockedUntil: null });
          return { success: true };
        } else {
          const newAttempts = failedAttempts + 1;
          if (newAttempts >= MAX_ATTEMPTS) {
            const lockTime = new Date();
            lockTime.setMinutes(lockTime.getMinutes() + LOCKOUT_MINUTES);
            set({ failedAttempts: newAttempts, lockedUntil: lockTime.toISOString() });
            return { success: false, error: `Too many failed attempts. Try again in ${LOCKOUT_MINUTES} minutes.` };
          }
          set({ failedAttempts: newAttempts });
          return { success: false, error: 'Invalid access code.' };
        }
      },
      logout: () => {
        set({ isAuthenticated: false, loginTime: null });
      },
      checkSession: () => {
        const { isAuthenticated, loginTime } = get();
        if (isAuthenticated && loginTime) {
          const hours = (Date.now() - new Date(loginTime).getTime()) / (1000 * 60 * 60);
          if (hours > 12) {
            set({ isAuthenticated: false, loginTime: null });
          }
        }
      },

      parties: [
        { id: '1', name: 'ABC Traders', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: '2', name: 'XYZ Enterprises', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: '3', name: 'Global Tech Corp', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: '4', name: 'Apex Stationery Mart', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ],

      addParty: (name: string) => {
        const trimmed = name.trim();
        if (!trimmed) {
          return { success: false, error: 'Party name cannot be empty.' };
        }

        const state = get();
        const exists = state.parties.some(
          p => p.name.toLowerCase() === trimmed.toLowerCase()
        );
        if (exists) {
          return { success: false, error: `Party "${trimmed}" already exists.` };
        }

        const newParty: Party = {
          id: crypto.randomUUID(),
          name: trimmed,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set({ parties: [...state.parties, newParty] });
        return { success: true, party: newParty };
      },

      updateParty: (id: string, name: string) => {
        const trimmed = name.trim();
        if (!trimmed) {
          return { success: false, error: 'Party name cannot be empty.' };
        }

        const state = get();
        const exists = state.parties.some(
          p => p.id !== id && p.name.toLowerCase() === trimmed.toLowerCase()
        );
        if (exists) {
          return { success: false, error: `Another party named "${trimmed}" already exists.` };
        }

        set(state => ({
          parties: state.parties.map(p =>
            p.id === id ? { ...p, name: trimmed, updatedAt: new Date().toISOString() } : p
          ),
          investments: state.investments.map(inv =>
            inv.partyId === id ? { ...inv, partyName: trimmed, updatedAt: new Date().toISOString() } : inv
          ),
          sales: state.sales.map(s => {
            const inv = state.investments.find(i => i.id === s.investmentId);
            if (inv && inv.partyId === id) {
              return { ...s, partyName: trimmed, updatedAt: new Date().toISOString() };
            }
            return s;
          }),
        }));
        return { success: true };
      },

      deleteParty: (id: string) => {
        set(state => ({
          parties: state.parties.filter(p => p.id !== id),
        }));
      },

      savedServices: DEFAULT_SAVED_SERVICES,

      addSavedService: (name: string) => {
        const trimmed = name.trim().replace(/\s+/g, ' ');
        if (!trimmed) {
          return { success: false, error: 'Service/product name cannot be empty.' };
        }

        const state = get();
        const currentList = state.savedServices || [];
        const exists = currentList.some(
          s => s.name.trim().toLowerCase() === trimmed.toLowerCase()
        );
        if (exists) {
          return { success: false, error: `"${trimmed}" already exists.` };
        }

        const newService: SavedService = {
          id: crypto.randomUUID(),
          name: trimmed,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set({ savedServices: [...currentList, newService] });
        return { success: true, service: newService };
      },

      updateSavedService: (id: string, name: string) => {
        const trimmed = name.trim().replace(/\s+/g, ' ');
        if (!trimmed) {
          return { success: false, error: 'Service/product name cannot be empty.' };
        }

        const state = get();
        const currentList = state.savedServices || [];
        const exists = currentList.some(
          s => s.id !== id && s.name.trim().toLowerCase() === trimmed.toLowerCase()
        );
        if (exists) {
          return { success: false, error: `Another saved service named "${trimmed}" already exists.` };
        }

        set(state => ({
          savedServices: (state.savedServices || []).map(s =>
            s.id === id ? { ...s, name: trimmed, updatedAt: new Date().toISOString() } : s
          ),
        }));
        return { success: true };
      },

      deleteSavedService: (id: string) => {
        set(state => ({
          savedServices: (state.savedServices || []).filter(s => s.id !== id),
        }));
      },

      investments: [],
      sales: [],
      products: DEFAULT_SAMPLE_PRODUCTS,
      stockPurchases: [],
      
      addInvestment: (inv) => set((state) => {
        const nextId = String(state.investments.length + 1).padStart(3, '0');
        const newInv: Investment = {
          ...inv,
          id: crypto.randomUUID(),
          serialNumber: `INV-${nextId}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        return { investments: [...state.investments, newInv] };
      }),
      
      updateInvestment: (id, updated) => set((state) => ({
        investments: state.investments.map(inv => 
          inv.id === id ? { ...inv, ...updated, updatedAt: new Date().toISOString() } : inv
        )
      })),
      
      deleteInvestment: (id: string) => {
        if (!id) {
          return { success: false, error: 'No investment ID provided for deletion.' };
        }

        const state = get();
        const target = state.investments.find(
          (inv) => inv.id === id || inv.serialNumber === id || (inv as any)._id === id
        );

        if (!target) {
          return { success: false, error: `Investment record with ID "${id}" was not found.` };
        }

        const targetId = target.id;
        const remainingInvestments = state.investments.filter(
          (inv) => inv.id !== targetId && inv.id !== id && inv.serialNumber !== id
        );
        const remainingSales = state.sales.filter(
          (s) => s.investmentId !== targetId && s.investmentId !== id
        );

        set({
          investments: remainingInvestments,
          sales: remainingSales,
        });

        // Ensure persistent storage (localStorage) is immediately synced
        try {
          const storageKey = 'sales-investment-storage';
          const raw = localStorage.getItem(storageKey);
          let payload = raw ? JSON.parse(raw) : { state: {}, version: 0 };
          if (!payload.state) payload.state = {};
          payload.state = {
            ...payload.state,
            investments: remainingInvestments,
            sales: remainingSales,
          };
          localStorage.setItem(storageKey, JSON.stringify(payload));
        } catch (err) {
          console.warn('Storage sync failed:', err);
        }

        return { success: true };
      },

      // PRODUCT & STOCK ACTIONS
      addProduct: (prod) => {
        const state = get();
        const trimmedName = prod.name.trim();
        if (!trimmedName) {
          return { success: false, error: 'Product name is required.' };
        }

        const nextNum = state.products.length + 1;
        const nextId = `PRD-${String(nextNum).padStart(3, '0')}`;

        const newProduct: Product = {
          ...prod,
          name: trimmedName,
          id: crypto.randomUUID(),
          productId: nextId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set({ products: [...state.products, newProduct] });
        return { success: true, product: newProduct };
      },

      updateProduct: (id, prod) => {
        const state = get();
        const exists = state.products.find(p => p.id === id);
        if (!exists) {
          return { success: false, error: 'Product not found.' };
        }

        set({
          products: state.products.map(p =>
            p.id === id
              ? { ...p, ...prod, updatedAt: new Date().toISOString() }
              : p
          ),
        });
        return { success: true };
      },

      deleteProduct: (id) => {
        const state = get();
        // Check if product is referenced in sales
        const linkedSales = state.sales.filter(s => s.productId === id);
        if (linkedSales.length > 0) {
          return {
            success: false,
            error: `Cannot delete product: It is linked to ${linkedSales.length} sale record(s). Edit product or remove sales first.`,
          };
        }

        set({
          products: state.products.filter(p => p.id !== id),
        });
        return { success: true };
      },

      restockProduct: (purchase, updateProductPurchaseCost = false) => {
        const state = get();
        const product = state.products.find(p => p.id === purchase.productId);
        if (!product) {
          return { success: false, error: 'Selected product not found.' };
        }

        const nextNum = state.stockPurchases.length + 1;
        const serialNumber = `PUR-${String(nextNum).padStart(3, '0')}`;

        const newPurchase: StockPurchase = {
          ...purchase,
          id: crypto.randomUUID(),
          serialNumber,
          createdAt: new Date().toISOString(),
        };

        set({
          stockPurchases: [newPurchase, ...state.stockPurchases],
          products: state.products.map(p => {
            if (p.id === purchase.productId) {
              return {
                ...p,
                currentStock: p.currentStock + purchase.quantity,
                purchaseCost: updateProductPurchaseCost ? purchase.unitCost : p.purchaseCost,
                updatedAt: new Date().toISOString(),
              };
            }
            return p;
          }),
        });

        return { success: true };
      },
      
      // SALES ACTIONS WITH REVERSIBLE STOCK MOVEMENTS
      addSale: (sale) => set((state) => {
        const nextId = String(state.sales.length + 1).padStart(3, '0');
        const newSale: Sale = {
          investmentId: '',
          partyName: '',
          costAmount: sale.costAmount !== undefined ? sale.costAmount : 0,
          notes: '',
          paymentType: sale.paymentType || 'Cash',
          ...sale,
          id: crypto.randomUUID(),
          serialNumber: `SAL-${nextId}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Deduct stock if it's a product sale
        let updatedProducts = state.products;
        if (newSale.saleType === 'product' && newSale.productId && newSale.quantity) {
          updatedProducts = state.products.map(p => {
            if (p.id === newSale.productId) {
              return {
                ...p,
                currentStock: Math.max(0, p.currentStock - (newSale.quantity || 0)),
                updatedAt: new Date().toISOString(),
              };
            }
            return p;
          });
        }

        return {
          sales: [...state.sales, newSale],
          products: updatedProducts,
        };
      }),
      
      updateSale: (id, updated) => set((state) => {
        const existingSale = state.sales.find(s => s.id === id);
        if (!existingSale) return state;

        const mergedSale: Sale = {
          ...existingSale,
          ...updated,
          updatedAt: new Date().toISOString(),
        };

        let updatedProducts = [...state.products];

        // 1. Revert previous stock deduction
        if (existingSale.saleType === 'product' && existingSale.productId && existingSale.quantity) {
          updatedProducts = updatedProducts.map(p =>
            p.id === existingSale.productId
              ? { ...p, currentStock: p.currentStock + (existingSale.quantity || 0), updatedAt: new Date().toISOString() }
              : p
          );
        }

        // 2. Apply new stock deduction
        if (mergedSale.saleType === 'product' && mergedSale.productId && mergedSale.quantity) {
          updatedProducts = updatedProducts.map(p =>
            p.id === mergedSale.productId
              ? { ...p, currentStock: Math.max(0, p.currentStock - (mergedSale.quantity || 0)), updatedAt: new Date().toISOString() }
              : p
          );
        }

        return {
          sales: state.sales.map(s => s.id === id ? mergedSale : s),
          products: updatedProducts,
        };
      }),
      
      deleteSale: (id) => set((state) => {
        const existingSale = state.sales.find(s => s.id === id);
        let updatedProducts = state.products;

        // Revert stock deduction when sale is deleted
        if (existingSale && existingSale.saleType === 'product' && existingSale.productId && existingSale.quantity) {
          updatedProducts = state.products.map(p =>
            p.id === existingSale.productId
              ? { ...p, currentStock: p.currentStock + (existingSale.quantity || 0), updatedAt: new Date().toISOString() }
              : p
          );
        }

        return {
          sales: state.sales.filter(sale => sale.id !== id),
          products: updatedProducts,
        };
      }),

      importBackup: (backup) => set((state) => {
        const timestamp = new Date().toISOString();
        const nextParties = Array.isArray(backup.parties) && backup.parties.length > 0
          ? backup.parties
          : (backup.parties !== undefined ? backup.parties : state.parties);
        const nextSavedServices = Array.isArray(backup.savedServices) && backup.savedServices.length > 0
          ? backup.savedServices
          : (backup.savedServices !== undefined ? backup.savedServices : (state.savedServices || DEFAULT_SAVED_SERVICES));
        const nextInvestments = Array.isArray(backup.investments)
          ? backup.investments
          : state.investments;
        const nextSales = Array.isArray(backup.sales)
          ? backup.sales
          : state.sales;
        const nextProducts = Array.isArray(backup.products) && backup.products.length > 0
          ? backup.products
          : (backup.products !== undefined ? backup.products : state.products);
        const nextPurchases = Array.isArray(backup.stockPurchases)
          ? backup.stockPurchases
          : state.stockPurchases;

        const nextState = {
          parties: nextParties,
          savedServices: nextSavedServices,
          investments: nextInvestments,
          sales: nextSales,
          products: nextProducts,
          stockPurchases: nextPurchases,
          lastSavedAt: timestamp,
        };

        // Ensure immediate localStorage persistence for instant reflection and reload stability
        try {
          const storageKey = 'sales-investment-storage';
          const payload = {
            state: {
              isAuthenticated: state.isAuthenticated,
              loginTime: state.loginTime,
              failedAttempts: state.failedAttempts,
              lockedUntil: state.lockedUntil,
              ...nextState,
            },
            version: 0,
          };
          localStorage.setItem(storageKey, JSON.stringify(payload));
        } catch (e) {
          console.error('Failed to sync backup directly to localStorage:', e);
        }

        return nextState;
      }),

      lastSavedAt: null,

      saveDataNow: async () => {
        try {
          const state = get();
          const timestamp = new Date().toISOString();

          const storageKey = 'sales-investment-storage';
          const snapshot = {
            state: {
              isAuthenticated: state.isAuthenticated,
              loginTime: state.loginTime,
              failedAttempts: state.failedAttempts,
              lockedUntil: state.lockedUntil,
              parties: state.parties,
              savedServices: state.savedServices || DEFAULT_SAVED_SERVICES,
              investments: state.investments,
              sales: state.sales,
              products: state.products,
              stockPurchases: state.stockPurchases,
              lastSavedAt: timestamp,
            },
            version: 0,
          };

          // Save to localStorage
          localStorage.setItem(storageKey, JSON.stringify(snapshot));

          // Immediately verify storage integrity
          const verifiedRaw = localStorage.getItem(storageKey);
          if (!verifiedRaw) {
            throw new Error('Verification failed: Storage item could not be retrieved from localStorage.');
          }

          const parsed = JSON.parse(verifiedRaw);
          if (!parsed?.state || !Array.isArray(parsed.state.investments) || !Array.isArray(parsed.state.sales) || !Array.isArray(parsed.state.parties)) {
            throw new Error('Verification failed: Data integrity check failed in localStorage.');
          }

          set({ lastSavedAt: timestamp });

          return { success: true, timestamp };
        } catch (err: any) {
          return {
            success: false,
            timestamp: '',
            error: err?.message || 'Failed to save data to localStorage.',
          };
        }
      },
    }),
    {
      name: 'sales-investment-storage',
    }
  )
);
