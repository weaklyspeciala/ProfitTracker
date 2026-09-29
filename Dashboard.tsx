import { useState, useMemo } from 'react';
import { useAppStore, type Investment, type Sale, type Product } from '../store';
import {
  formatCurrency,
  formatDateDDMMYYYY,
  getDateRangeBounds,
  isDateWithinRange,
  type DateRangePeriod,
} from '../lib/utils';
import { DateFilterDropdown } from '../components/DateFilterDropdown';
import {
  Wallet,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  X,
  Search,
  AlertCircle,
  HelpCircle,
  Info,
  Calendar,
  ExternalLink,
  Package,
  Boxes,
  AlertTriangle,
  Receipt,
  Scale,
  Zap,
  Menu,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSidebar } from '../Layout';

export function Dashboard() {
  const { investments, sales, products } = useAppStore();
  const { isCollapsed, toggleSidebar, openMobileMenu } = useSidebar();

  const handleToggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      openMobileMenu();
    } else {
      toggleSidebar();
    }
  };

  // Independent Date Filter State
  const [salesPeriod, setSalesPeriod] = useState<DateRangePeriod>('this_month');
  const [salesCustomStart, setSalesCustomStart] = useState<string>('');
  const [salesCustomEnd, setSalesCustomEnd] = useState<string>('');

  const [costPeriod, setCostPeriod] = useState<DateRangePeriod>('this_month');
  const [costCustomStart, setCostCustomStart] = useState<string>('');
  const [costCustomEnd, setCostCustomEnd] = useState<string>('');

  const [profitPeriod, setProfitPeriod] = useState<DateRangePeriod>('this_month');
  const [profitCustomStart, setProfitCustomStart] = useState<string>('');
  const [profitCustomEnd, setProfitCustomEnd] = useState<string>('');

  const [lossPeriod, setLossPeriod] = useState<DateRangePeriod>('this_month');
  const [lossCustomStart, setLossCustomStart] = useState<string>('');
  const [lossCustomEnd, setLossCustomEnd] = useState<string>('');

  const [netPeriod, setNetPeriod] = useState<DateRangePeriod>('this_month');
  const [netCustomStart, setNetCustomStart] = useState<string>('');
  const [netCustomEnd, setNetCustomEnd] = useState<string>('');

  // Detailed Modal State
  type ModalType =
    | 'products'
    | 'stockValue'
    | 'lowStock'
    | 'sales'
    | 'cost'
    | 'profit'
    | 'loss'
    | 'netResult'
    | 'investment'
    | 'remaining'
    | null;

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [modalSearch, setModalSearch] = useState('');

  // Product & Inventory Metrics
  const totalProductsCount = products.length;
  const lowStockProducts = useMemo(() => {
    return products.filter((p) => p.currentStock <= p.lowStockAlert);
  }, [products]);

  const totalInventoryStockValue = useMemo(() => {
    return products.reduce((sum, p) => sum + Math.max(0, p.currentStock) * p.purchaseCost, 0);
  }, [products]);

  // Total Business Investment (Separate from Sales Costs)
  const totalInvestment = useMemo(() => {
    return investments.reduce((sum, inv) => sum + inv.amount, 0);
  }, [investments]);

  // Remaining Investment & Recovery
  const investmentRecoveryData = useMemo(() => {
    return investments.map((inv) => {
      const recovered = sales
        .filter((s) => s.investmentId === inv.id)
        .reduce((sum, s) => sum + (s.costAmount || 0), 0);
      const remaining = Math.max(0, inv.amount - recovered);
      let status: 'Running' | 'Partially Recovered' | 'Completed' = 'Running';
      if (remaining <= 0) status = 'Completed';
      else if (recovered > 0) status = 'Partially Recovered';
      return { ...inv, recovered, remaining, status };
    });
  }, [investments, sales]);

  const totalRecovered = useMemo(() => {
    return investmentRecoveryData.reduce((sum, inv) => sum + inv.recovered, 0);
  }, [investmentRecoveryData]);

  const totalRemainingInvestment = useMemo(() => {
    return investmentRecoveryData.reduce((sum, inv) => sum + inv.remaining, 0);
  }, [investmentRecoveryData]);

  // 1. Total Sales Calculation (filtered by salesPeriod)
  const salesRangeBounds = useMemo(() => {
    return getDateRangeBounds(salesPeriod, salesCustomStart, salesCustomEnd);
  }, [salesPeriod, salesCustomStart, salesCustomEnd]);

  const filteredSalesForSales = useMemo(() => {
    return sales.filter((s) =>
      isDateWithinRange(s.date, salesRangeBounds.start, salesRangeBounds.end)
    );
  }, [sales, salesRangeBounds]);

  const totalSalesRevenue = useMemo(() => {
    return filteredSalesForSales.reduce((sum, s) => sum + (s.saleAmount || 0), 0);
  }, [filteredSalesForSales]);

  // 2. Total Cost Calculation (filtered by costPeriod)
  const costRangeBounds = useMemo(() => {
    return getDateRangeBounds(costPeriod, costCustomStart, costCustomEnd);
  }, [costPeriod, costCustomStart, costCustomEnd]);

  const filteredSalesForCost = useMemo(() => {
    return sales.filter((s) =>
      isDateWithinRange(s.date, costRangeBounds.start, costRangeBounds.end)
    );
  }, [sales, costRangeBounds]);

  const totalRecordedCost = useMemo(() => {
    return filteredSalesForCost.reduce((sum, s) => {
      if (s.isCostRecorded || (s.costAmount !== undefined && s.costAmount > 0) || s.saleType === 'product') {
        return sum + (s.costAmount || 0);
      }
      return sum;
    }, 0);
  }, [filteredSalesForCost]);

  // 3. Gross Profit Calculation (filtered by profitPeriod)
  const profitRangeBounds = useMemo(() => {
    return getDateRangeBounds(profitPeriod, profitCustomStart, profitCustomEnd);
  }, [profitPeriod, profitCustomStart, profitCustomEnd]);

  const filteredSalesForProfit = useMemo(() => {
    return sales.filter((s) =>
      isDateWithinRange(s.date, profitRangeBounds.start, profitRangeBounds.end)
    );
  }, [sales, profitRangeBounds]);

  const profitCalculations = useMemo(() => {
    // Only sales with recorded cost can be evaluated
    const salesWithCost = filteredSalesForProfit.filter(
      (s) => s.isCostRecorded || (s.costAmount !== undefined && s.costAmount > 0) || s.saleType === 'product'
    );

    const profitSales = salesWithCost.filter((s) => s.saleAmount > (s.costAmount || 0));
    const totalGrossProfit = profitSales.reduce(
      (sum, s) => sum + (s.saleAmount - (s.costAmount || 0)),
      0
    );

    const unrecordedCount = filteredSalesForProfit.length - salesWithCost.length;

    return {
      totalGrossProfit,
      profitSales,
      salesWithCostCount: salesWithCost.length,
      unrecordedCount,
    };
  }, [filteredSalesForProfit]);

  // Helper to format Total Loss according to required specifications
  const formatTotalLoss = (val: number | undefined | null): string => {
    if (val === undefined || val === null || isNaN(val)) {
      return '₹0.00';
    }
    if (Math.abs(val) < 0.000001) {
      return '₹0.00';
    }
    const isNegative = val < 0;
    const absVal = Math.abs(val);
    const formattedAbs = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(absVal);

    return isNegative ? `−${formattedAbs}` : formattedAbs;
  };

  // 4. Total Loss Calculation (Total Loss = Remaining Investment − Gross Profit)
  const lossRangeBounds = useMemo(() => {
    return getDateRangeBounds(lossPeriod, lossCustomStart, lossCustomEnd);
  }, [lossPeriod, lossCustomStart, lossCustomEnd]);

  const filteredSalesForLoss = useMemo(() => {
    return sales.filter((s) =>
      isDateWithinRange(s.date, lossRangeBounds.start, lossRangeBounds.end)
    );
  }, [sales, lossRangeBounds]);

  const lossCalculations = useMemo(() => {
    const salesWithCost = filteredSalesForLoss.filter(
      (s) => s.isCostRecorded || (s.costAmount !== undefined && s.costAmount > 0) || s.saleType === 'product'
    );

    const lossSales = salesWithCost.filter((s) => (s.costAmount || 0) > s.saleAmount);

    // Required Formula: Total Loss = Remaining Investment − Gross Profit
    const safeRemainingInvestment =
      typeof totalRemainingInvestment === 'number' && !isNaN(totalRemainingInvestment)
        ? totalRemainingInvestment
        : 0;

    const safeGrossProfit =
      typeof profitCalculations?.totalGrossProfit === 'number' && !isNaN(profitCalculations.totalGrossProfit)
        ? profitCalculations.totalGrossProfit
        : 0;

    const totalLoss = safeRemainingInvestment - safeGrossProfit;

    const unrecordedCount = filteredSalesForLoss.length - salesWithCost.length;

    return {
      totalLoss,
      lossSales,
      salesWithCostCount: salesWithCost.length,
      unrecordedCount,
    };
  }, [filteredSalesForLoss, totalRemainingInvestment, profitCalculations]);

  // 5. Net Transaction Result (filtered by netPeriod: Gross Profit − Total Loss)
  const netRangeBounds = useMemo(() => {
    return getDateRangeBounds(netPeriod, netCustomStart, netCustomEnd);
  }, [netPeriod, netCustomStart, netCustomEnd]);

  const filteredSalesForNet = useMemo(() => {
    return sales.filter((s) =>
      isDateWithinRange(s.date, netRangeBounds.start, netRangeBounds.end)
    );
  }, [sales, netRangeBounds]);

  const netCalculations = useMemo(() => {
    const salesWithCost = filteredSalesForNet.filter(
      (s) => s.isCostRecorded || (s.costAmount !== undefined && s.costAmount > 0) || s.saleType === 'product'
    );

    let grossProfit = 0;
    let totalLoss = 0;

    salesWithCost.forEach((s) => {
      const cost = s.costAmount || 0;
      const margin = s.saleAmount - cost;
      if (margin > 0) grossProfit += margin;
      else if (margin < 0) totalLoss += Math.abs(margin);
    });

    const netResult = grossProfit - totalLoss;
    const unrecordedCount = filteredSalesForNet.length - salesWithCost.length;

    return {
      grossProfit,
      totalLoss,
      netResult,
      salesWithCostCount: salesWithCost.length,
      unrecordedCount,
    };
  }, [filteredSalesForNet]);

  // Latest 10 Transactions
  const latestTransactions = useMemo(() => {
    return [
      ...investments.map((inv) => ({ ...inv, type: 'investment' as const })),
      ...sales.map((sale) => ({ ...sale, type: 'sale' as const })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }, [investments, sales]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleToggleSidebar}
            className="p-2.5 rounded-xl text-slate-700 hover:text-slate-950 bg-white hover:bg-slate-100 border border-slate-200/90 shadow-xs transition-all flex items-center justify-center shrink-0 active:scale-95"
            title={
              isCollapsed
                ? 'Expand sidebar (show navigation labels)'
                : 'Collapse sidebar (maximize dashboard workspace)'
            }
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <h1 className="text-2xl font-bold text-slate-800">Cyber Cafe & Stationery Dashboard</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time financial performance, independent date filters, and product inventory status
            </p>
          </div>
        </div>

        <Link
          to="/products"
          className="text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors flex items-center gap-1.5 shrink-0"
        >
          <Package className="w-3.5 h-3.5" />
          <span>Manage Stock & Restock &rarr;</span>
        </Link>
      </div>

      {/* Product & Stock Summary Cards (Section 4) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Products */}
        <div
          onClick={() => {
            setActiveModal('products');
            setModalSearch('');
          }}
          className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex items-center justify-between group"
        >
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Products
            </span>
            <p className="text-2xl font-bold text-slate-800 mt-1">{totalProductsCount}</p>
            <p className="text-xs text-slate-400 mt-0.5">Stationery & shop catalog</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-100 transition-colors">
            <Boxes className="w-6 h-6" />
          </div>
        </div>

        {/* Current Stock Value */}
        <div
          onClick={() => {
            setActiveModal('stockValue');
            setModalSearch('');
          }}
          className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer flex items-center justify-between group"
        >
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Current Stock Value
            </span>
            <p className="text-2xl font-bold text-emerald-700 mt-1">
              {formatCurrency(totalInventoryStockValue)}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Based on purchase costs</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-100 transition-colors">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Low Stock Items Alert */}
        <div
          onClick={() => {
            setActiveModal('lowStock');
            setModalSearch('');
          }}
          className={`bg-white p-4.5 rounded-2xl border shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between group ${
            lowStockProducts.length > 0 ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'
          }`}
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
                Low Stock Items
              </span>
              {lowStockProducts.length > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full">
                  Alert
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-amber-600 mt-1">{lowStockProducts.length}</p>
            <p className="text-xs text-slate-400 mt-0.5">At or below reorder threshold</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-100 transition-colors">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 5 Financial Cards with Independent Date Filters (Section 2 & 4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Total Sales */}
        <div
          onClick={() => {
            setActiveModal('sales');
            setModalSearch('');
          }}
          className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-purple-300 transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Sales
              </span>
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-100">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="mb-2">
              <DateFilterDropdown
                period={salesPeriod}
                customStart={salesCustomStart}
                customEnd={salesCustomEnd}
                onChange={(p, start, end) => {
                  setSalesPeriod(p);
                  if (start) setSalesCustomStart(start);
                  if (end) setSalesCustomEnd(end);
                }}
              />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {formatCurrency(totalSalesRevenue)}
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>{filteredSalesForSales.length} sales</span>
            <span className="text-purple-600 group-hover:underline font-medium">Details &rarr;</span>
          </div>
        </div>

        {/* 2. Total Product & Service Cost */}
        <div
          onClick={() => {
            setActiveModal('cost');
            setModalSearch('');
          }}
          className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-400 transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Cost
              </span>
              <div className="p-2 rounded-xl bg-slate-100 text-slate-600 group-hover:bg-slate-200">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="mb-2">
              <DateFilterDropdown
                period={costPeriod}
                customStart={costCustomStart}
                customEnd={costCustomEnd}
                onChange={(p, start, end) => {
                  setCostPeriod(p);
                  if (start) setCostCustomStart(start);
                  if (end) setCostCustomEnd(end);
                }}
              />
            </div>
            <p className="text-2xl font-bold text-slate-800 mt-1">
              {formatCurrency(totalRecordedCost)}
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Sold stock & direct fees</span>
            <span className="text-slate-700 group-hover:underline font-medium">Details &rarr;</span>
          </div>
        </div>

        {/* 3. Gross Profit */}
        <div
          onClick={() => {
            setActiveModal('profit');
            setModalSearch('');
          }}
          className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Gross Profit
              </span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="mb-2">
              <DateFilterDropdown
                period={profitPeriod}
                customStart={profitCustomStart}
                customEnd={profitCustomEnd}
                onChange={(p, start, end) => {
                  setProfitPeriod(p);
                  if (start) setProfitCustomStart(start);
                  if (end) setProfitCustomEnd(end);
                }}
              />
            </div>
            <p className="text-2xl font-bold text-emerald-600 mt-1">
              {formatCurrency(profitCalculations.totalGrossProfit)}
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>{profitCalculations.profitSales.length} profitable</span>
            <span className="text-emerald-600 group-hover:underline font-medium">Breakdown &rarr;</span>
          </div>
        </div>

        {/* 4. Total Loss */}
        <div
          onClick={() => {
            setActiveModal('loss');
            setModalSearch('');
          }}
          className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-red-300 transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Loss
              </span>
              <div className="p-2 rounded-xl bg-red-50 text-red-600 group-hover:bg-red-100">
                <ArrowDownRight className="w-4 h-4" />
              </div>
            </div>
            <div className="mb-2">
              <DateFilterDropdown
                period={lossPeriod}
                customStart={lossCustomStart}
                customEnd={lossCustomEnd}
                onChange={(p, start, end) => {
                  setLossPeriod(p);
                  if (start) setLossCustomStart(start);
                  if (end) setLossCustomEnd(end);
                }}
              />
            </div>
            <p className="text-2xl font-bold text-red-600 mt-1">
              {formatTotalLoss(lossCalculations.totalLoss)}
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>{lossCalculations.lossSales.length} loss sales</span>
            <span className="text-red-600 group-hover:underline font-medium">Details &rarr;</span>
          </div>
        </div>

        {/* 5. Net Transaction Result */}
        <div
          onClick={() => {
            setActiveModal('netResult');
            setModalSearch('');
          }}
          className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Net Result
              </span>
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-100">
                <Scale className="w-4 h-4" />
              </div>
            </div>
            <div className="mb-2">
              <DateFilterDropdown
                period={netPeriod}
                customStart={netCustomStart}
                customEnd={netCustomEnd}
                onChange={(p, start, end) => {
                  setNetPeriod(p);
                  if (start) setNetCustomStart(start);
                  if (end) setNetCustomEnd(end);
                }}
              />
            </div>
            <p
              className={`text-2xl font-bold mt-1 ${
                netCalculations.netResult >= 0 ? 'text-emerald-700' : 'text-red-700'
              }`}
            >
              {netCalculations.netResult >= 0 ? '+' : ''}
              {formatCurrency(netCalculations.netResult)}
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Profit − Loss</span>
            <span className="text-blue-600 group-hover:underline font-medium">Summary &rarr;</span>
          </div>
        </div>
      </div>

      {/* Business Capital & Investment Cards (Separate from Sales Costs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Total Investment (Business Capital) */}
        <div
          onClick={() => {
            setActiveModal('investment');
            setModalSearch('');
          }}
          className="bg-white p-5 rounded-2xl border shadow-sm hover:border-blue-300 transition-all cursor-pointer flex items-center justify-between"
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Investment (Business Capital)
              </span>
              <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-medium">
                Capital Fund
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {formatCurrency(totalInvestment)}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {investments.length} investment record(s) • Kept separate from sales revenue
            </p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        {/* Remaining Unrecovered Investment */}
        <div
          onClick={() => {
            setActiveModal('remaining');
            setModalSearch('');
          }}
          className="bg-white p-5 rounded-2xl border shadow-sm hover:border-amber-300 transition-all cursor-pointer flex items-center justify-between"
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Remaining Investment
              </span>
              <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md font-medium">
                Unrecovered Capital
              </span>
            </div>
            <p className="text-2xl font-bold text-amber-600 mt-1">
              {formatCurrency(totalRemainingInvestment)}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Recovered: {formatCurrency(totalRecovered)} • Tracks capital payback
            </p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Activity className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Latest 10 Transactions Table */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Latest Transactions</h2>
            <p className="text-xs text-slate-500">
              Recent activity across shop sales, services, and investments
            </p>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Showing latest {latestTransactions.length} records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 border-b font-medium">
              <tr>
                <th className="px-6 py-3.5">S/N</th>
                <th className="px-6 py-3.5">Category</th>
                <th className="px-6 py-3.5">Date</th>
                <th className="px-6 py-3.5">Particular / Item</th>
                <th className="px-6 py-3.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {latestTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4 text-slate-700 font-medium">{tx.serialNumber}</td>
                  <td className="px-6 py-4">
                    {tx.type === 'investment' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        Investment
                      </span>
                    ) : (tx as any).saleType === 'product' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Package className="w-3 h-3" /> Product Sale
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                        <Zap className="w-3 h-3" /> Service Fee
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{formatDateDDMMYYYY(tx.date)}</td>
                  <td className="px-6 py-4 text-slate-800 font-medium">
                    {tx.partyName ? (
                      <>
                        <div>{tx.partyName}</div>
                        <div className="text-xs text-slate-400 font-normal">{tx.particular}</div>
                      </>
                    ) : (
                      tx.particular || '-'
                    )}
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-900 text-right">
                    {tx.type === 'investment'
                      ? formatCurrency(tx.amount)
                      : formatCurrency((tx as any).saleAmount)}
                  </td>
                </tr>
              ))}
              {latestTransactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                    No transactions recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Modal Drill-Down (Section 4) */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[88vh] overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  {activeModal === 'products' && 'Product Inventory Catalog'}
                  {activeModal === 'stockValue' && 'Current Stock Value Breakdown'}
                  {activeModal === 'lowStock' && 'Low & Out of Stock Alerts'}
                  {activeModal === 'sales' && `Sales Revenue (${salesRangeBounds.label})`}
                  {activeModal === 'cost' && `Recorded Cost of Sales (${costRangeBounds.label})`}
                  {activeModal === 'profit' && `Gross Profit Breakdown (${profitRangeBounds.label})`}
                  {activeModal === 'loss' && `Loss Transactions (${lossRangeBounds.label})`}
                  {activeModal === 'netResult' && `Net Transaction Result (${netRangeBounds.label})`}
                  {activeModal === 'investment' && 'Total Business Investment Capital'}
                  {activeModal === 'remaining' && 'Remaining Investment Recovery'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeModal === 'products' && `${products.length} products registered`}
                  {activeModal === 'stockValue' && `Total Inventory Value: ${formatCurrency(totalInventoryStockValue)}`}
                  {activeModal === 'lowStock' && `${lowStockProducts.length} items needing reorder`}
                  {activeModal === 'sales' && `Total Revenue: ${formatCurrency(totalSalesRevenue)}`}
                  {activeModal === 'cost' && `Total Cost: ${formatCurrency(totalRecordedCost)}`}
                  {activeModal === 'profit' && `Total Gross Profit: ${formatCurrency(profitCalculations.totalGrossProfit)}`}
                  {activeModal === 'loss' && `Total Loss: ${formatTotalLoss(lossCalculations.totalLoss)}`}
                  {activeModal === 'netResult' && `Gross Profit (${formatCurrency(netCalculations.grossProfit)}) − Loss (${formatCurrency(netCalculations.totalLoss)}) = Net ${formatCurrency(netCalculations.netResult)}`}
                  {activeModal === 'investment' && `Capital: ${formatCurrency(totalInvestment)}`}
                  {activeModal === 'remaining' && `Unrecovered: ${formatCurrency(totalRemainingInvestment)}`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Search */}
            <div className="p-3 border-b bg-white">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter within this list..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                />
              </div>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto p-4 flex-1">
              {/* MODAL: Products or Stock Value or Low Stock */}
              {(activeModal === 'products' || activeModal === 'stockValue' || activeModal === 'lowStock') && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 text-slate-600 font-medium border-b">
                      <tr>
                        <th className="px-4 py-3">ID</th>
                        <th className="px-4 py-3">Product Name</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3 text-right">Cost (₹)</th>
                        <th className="px-4 py-3 text-right">Selling Price</th>
                        <th className="px-4 py-3 text-center">Stock</th>
                        <th className="px-4 py-3 text-right">Total Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(activeModal === 'lowStock' ? lowStockProducts : products)
                        .filter(
                          (p) =>
                            p.name.toLowerCase().includes(modalSearch.toLowerCase()) ||
                            p.productId.toLowerCase().includes(modalSearch.toLowerCase()) ||
                            p.category.toLowerCase().includes(modalSearch.toLowerCase())
                        )
                        .map((prod) => (
                          <tr key={prod.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-semibold text-slate-700">{prod.productId}</td>
                            <td className="px-4 py-3 font-semibold text-slate-800">{prod.name}</td>
                            <td className="px-4 py-3 text-xs text-slate-500">{prod.category}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(prod.purchaseCost)}</td>
                            <td className="px-4 py-3 text-right">
                              {prod.sellingPrice ? formatCurrency(prod.sellingPrice) : '—'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                  prod.currentStock <= 0
                                    ? 'bg-red-100 text-red-700'
                                    : prod.currentStock <= prod.lowStockAlert
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {prod.currentStock} units
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-slate-900">
                              {formatCurrency(Math.max(0, prod.currentStock) * prod.purchaseCost)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* MODAL: Sales, Cost, Profit, Loss, Net Result */}
              {(activeModal === 'sales' ||
                activeModal === 'cost' ||
                activeModal === 'profit' ||
                activeModal === 'loss' ||
                activeModal === 'netResult') && (
                <div className="space-y-3">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-slate-50 text-slate-600 font-medium border-b">
                        <tr>
                          <th className="px-4 py-3">S/N</th>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Type</th>
                          <th className="px-4 py-3">Particular / Product</th>
                          <th className="px-4 py-3 text-right">Cost (₹)</th>
                          <th className="px-4 py-3 text-right">Sale (₹)</th>
                          <th className="px-4 py-3 text-right">Profit / Margin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(activeModal === 'sales'
                          ? filteredSalesForSales
                          : activeModal === 'cost'
                          ? filteredSalesForCost
                          : activeModal === 'profit'
                          ? profitCalculations.profitSales
                          : activeModal === 'loss'
                          ? lossCalculations.lossSales
                          : filteredSalesForNet
                        )
                          .filter(
                            (s) =>
                              s.particular.toLowerCase().includes(modalSearch.toLowerCase()) ||
                              s.serialNumber.toLowerCase().includes(modalSearch.toLowerCase())
                          )
                          .map((sale) => {
                            const cost = sale.costAmount || 0;
                            const margin = sale.saleAmount - cost;
                            const hasCost =
                              sale.isCostRecorded ||
                              (sale.costAmount !== undefined && sale.costAmount > 0) ||
                              sale.saleType === 'product';

                            return (
                              <tr key={sale.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 font-semibold text-slate-700">{sale.serialNumber}</td>
                                <td className="px-4 py-3 text-slate-600">{formatDateDDMMYYYY(sale.date)}</td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                      sale.saleType === 'product'
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'bg-purple-50 text-purple-700'
                                    }`}
                                  >
                                    {sale.saleType === 'product' ? 'Product' : 'Service'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 font-semibold text-slate-800">{sale.particular}</td>
                                <td className="px-4 py-3 text-right text-slate-600">
                                  {hasCost ? formatCurrency(cost) : 'Not Recorded'}
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-slate-900">
                                  {formatCurrency(sale.saleAmount)}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {hasCost ? (
                                    <span
                                      className={`font-bold ${
                                        margin >= 0 ? 'text-emerald-600' : 'text-red-600'
                                      }`}
                                    >
                                      {margin >= 0 ? '+' : ''}
                                      {formatCurrency(margin)}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-slate-400 italic">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* MODAL: Investments */}
              {activeModal === 'investment' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 text-slate-600 font-medium border-b">
                      <tr>
                        <th className="px-4 py-3">S/N</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Party & Particular</th>
                        <th className="px-4 py-3 text-right">Investment Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {investments
                        .filter(
                          (inv) =>
                            inv.particular.toLowerCase().includes(modalSearch.toLowerCase()) ||
                            inv.partyName.toLowerCase().includes(modalSearch.toLowerCase()) ||
                            inv.serialNumber.toLowerCase().includes(modalSearch.toLowerCase())
                        )
                        .map((inv) => (
                          <tr key={inv.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-semibold text-slate-700">{inv.serialNumber}</td>
                            <td className="px-4 py-3 text-slate-600">{formatDateDDMMYYYY(inv.date)}</td>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-800">{inv.partyName}</div>
                              <div className="text-xs text-slate-400">{inv.particular}</div>
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-slate-900">
                              {formatCurrency(inv.amount)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* MODAL: Remaining Investment */}
              {activeModal === 'remaining' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 text-slate-600 font-medium border-b">
                      <tr>
                        <th className="px-4 py-3">S/N</th>
                        <th className="px-4 py-3">Party & Particular</th>
                        <th className="px-4 py-3 text-right">Invested</th>
                        <th className="px-4 py-3 text-right">Recovered</th>
                        <th className="px-4 py-3 text-right">Remaining</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {investmentRecoveryData
                        .filter(
                          (inv) =>
                            inv.particular.toLowerCase().includes(modalSearch.toLowerCase()) ||
                            inv.partyName.toLowerCase().includes(modalSearch.toLowerCase()) ||
                            inv.serialNumber.toLowerCase().includes(modalSearch.toLowerCase())
                        )
                        .map((inv) => (
                          <tr key={inv.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-semibold text-slate-700">{inv.serialNumber}</td>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-800">{inv.partyName}</div>
                              <div className="text-xs text-slate-400">{inv.particular}</div>
                            </td>
                            <td className="px-4 py-3 text-right">{formatCurrency(inv.amount)}</td>
                            <td className="px-4 py-3 text-right text-emerald-600 font-semibold">
                              {formatCurrency(inv.recovered)}
                            </td>
                            <td className="px-4 py-3 text-right text-amber-600 font-bold">
                              {formatCurrency(inv.remaining)}
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                                {inv.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Click outside or the close button to dismiss.
              </span>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
