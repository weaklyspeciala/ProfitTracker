import { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { formatCurrency, formatDateDDMMYYYY, formatDateTime } from '../lib/utils';
import {
  Calendar,
  Filter,
  Package,
  Zap,
  TrendingUp,
  ArrowDownRight,
  Scale,
  Receipt,
  Download,
  FileText,
  Loader2,
  DollarSign,
  Landmark,
  CreditCard,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  parseISO,
  isWithinInterval,
  format,
} from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ReportType = 'daily' | 'monthly' | 'yearly' | 'custom';
type ReportTab = 'sales_ledger' | 'pnl_statement';

export function Reports() {
  const { sales, expenses, accounts, vendors } = useAppStore();
  const [activeTab, setActiveTab] = useState<ReportTab>('sales_ledger');
  const [reportType, setReportType] = useState<ReportType>('monthly');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'product' | 'service'>('all');
  const [isExporting, setIsExporting] = useState(false);

  const reportData = useMemo(() => {
    let startDate: Date;
    let endDate: Date;

    const baseDate = selectedDate ? new Date(selectedDate) : new Date();

    if (reportType === 'daily') {
      startDate = startOfDay(baseDate);
      endDate = endOfDay(baseDate);
    } else if (reportType === 'monthly') {
      const monthDate = new Date(selectedMonth + '-01');
      startDate = startOfMonth(monthDate);
      endDate = endOfMonth(monthDate);
    } else if (reportType === 'yearly') {
      const yearDate = new Date(selectedYear + '-01-01');
      startDate = startOfYear(yearDate);
      endDate = endOfYear(yearDate);
    } else {
      startDate = customStart ? startOfDay(new Date(customStart)) : new Date(0);
      endDate = customEnd ? endOfDay(new Date(customEnd)) : new Date();
    }

    // 1. Filter Sales
    const filteredSales = sales.filter((sale) => {
      const saleDate = parseISO(sale.date);
      const inInterval = isWithinInterval(saleDate, { start: startDate, end: endDate });
      if (!inInterval) return false;

      if (typeFilter !== 'all') {
        const type = sale.saleType || 'service';
        if (type !== typeFilter) return false;
      }

      return true;
    });

    const totalSales = filteredSales.reduce((sum, s) => sum + (s.saleAmount || 0), 0);

    let totalCost = 0;
    let totalGrossProfit = 0;
    let totalLoss = 0;
    let productSalesCount = 0;
    let serviceSalesCount = 0;
    let unrecordedCostCount = 0;

    filteredSales.forEach((s) => {
      if (s.saleType === 'product') productSalesCount++;
      else serviceSalesCount++;

      const hasCost =
        s.isCostRecorded ||
        (s.costAmount !== undefined && s.costAmount > 0) ||
        s.saleType === 'product';

      if (hasCost) {
        const cost = s.costAmount || 0;
        totalCost += cost;
        const diff = s.saleAmount - cost;
        if (diff > 0) totalGrossProfit += diff;
        else if (diff < 0) totalLoss += Math.abs(diff);
      } else {
        unrecordedCostCount++;
      }
    });

    const netSalesMargin = totalGrossProfit - totalLoss;

    // 2. Filter Expenses in Period
    const filteredExpenses = expenses.filter((e) => {
      const expDate = parseISO(e.date);
      return isWithinInterval(expDate, { start: startDate, end: endDate });
    });

    const operatingExpensesList = filteredExpenses.filter((e) => e.expenseType === 'operating_expense');
    const totalOperatingExpenses = operatingExpensesList.reduce((sum, e) => sum + (e.finalAmount || 0), 0);

    const financialChargesList = filteredExpenses.filter((e) => e.expenseType === 'financial_charge');
    const totalFinancialCharges = financialChargesList.reduce((sum, e) => sum + (e.finalAmount || 0), 0);

    const inventoryPurchasesList = filteredExpenses.filter((e) => e.expenseType === 'inventory_purchase');
    const totalInventoryPurchases = inventoryPurchasesList.reduce((sum, e) => sum + (e.finalAmount || 0), 0);

    const assetPurchasesList = filteredExpenses.filter((e) => e.expenseType === 'asset_purchase');
    const totalAssetPurchases = assetPurchasesList.reduce((sum, e) => sum + (e.finalAmount || 0), 0);

    // Overhead sum and true Net Business Profit
    const totalOverheadExpenses = totalOperatingExpenses + totalFinancialCharges;
    const trueNetBusinessProfit = netSalesMargin - totalOverheadExpenses;

    const grossMarginPct = totalSales > 0 ? ((netSalesMargin / totalSales) * 100) : 0;
    const netMarginPct = totalSales > 0 ? ((trueNetBusinessProfit / totalSales) * 100) : 0;

    // Categorized breakdown
    const operatingExpensesByCategory: Record<string, number> = {};
    operatingExpensesList.forEach((e) => {
      const cat = e.category || 'Other Operating Expense';
      operatingExpensesByCategory[cat] = (operatingExpensesByCategory[cat] || 0) + (e.finalAmount || 0);
    });

    const financialChargesByCategory: Record<string, number> = {};
    financialChargesList.forEach((e) => {
      const cat = e.category || 'Financial Charge';
      financialChargesByCategory[cat] = (financialChargesByCategory[cat] || 0) + (e.finalAmount || 0);
    });

    return {
      sales: filteredSales,
      totalSales,
      totalCost,
      totalGrossProfit,
      totalLoss,
      netResult: netSalesMargin,
      count: filteredSales.length,
      productSalesCount,
      serviceSalesCount,
      unrecordedCostCount,

      // P&L elements
      filteredExpenses,
      operatingExpensesList,
      totalOperatingExpenses,
      financialChargesList,
      totalFinancialCharges,
      inventoryPurchasesList,
      totalInventoryPurchases,
      assetPurchasesList,
      totalAssetPurchases,
      totalOverheadExpenses,
      trueNetBusinessProfit,
      grossMarginPct,
      netMarginPct,
      operatingExpensesByCategory,
      financialChargesByCategory,
    };
  }, [sales, expenses, reportType, selectedDate, selectedMonth, selectedYear, customStart, customEnd, typeFilter]);

  const getPeriodLabel = () => {
    if (reportType === 'daily') {
      return `Daily Report — ${formatDateDDMMYYYY(selectedDate)}`;
    } else if (reportType === 'monthly') {
      const d = new Date(selectedMonth + '-01');
      const monthName = isNaN(d.getTime()) ? selectedMonth : format(d, 'MMMM yyyy');
      return `Monthly Report — ${monthName}`;
    } else if (reportType === 'yearly') {
      return `Yearly Report — ${selectedYear}`;
    } else {
      return `Custom Range Report — ${customStart ? formatDateDDMMYYYY(customStart) : 'Beginning'} to ${customEnd ? formatDateDDMMYYYY(customEnd) : 'Today'}`;
    }
  };

  const getTypeFilterLabel = () => {
    if (typeFilter === 'product') return 'Products Only';
    if (typeFilter === 'service') return 'Services Only';
    return 'All Transactions (Products & Services)';
  };

  // Helper to format currency for PDF cleanly (Rs. notation to ensure 100% universal font support)
  const formatCurrencyPdf = (amount: number): string => {
    return 'Rs. ' + amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // PDF Export Function
  const handleExportPDF = () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const periodLabel = getPeriodLabel();
      const generatedOn = formatDateTime(new Date().toISOString());

      // 1. Primary Header Banner
      doc.setFillColor(30, 41, 59); // Slate-800
      doc.rect(0, 0, pageWidth, 28, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(
        activeTab === 'pnl_statement'
          ? 'PROFIT & LOSS (P&L) FINANCIAL STATEMENT'
          : 'SALES & FINANCIAL REPORT',
        14,
        12
      );

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(203, 213, 225); // Slate-300
      doc.text('Cyber Cafe, Stationery & Accounting Management', 14, 18);

      doc.setFontSize(8);
      doc.text(`Generated: ${generatedOn}`, pageWidth - 14, 18, { align: 'right' });

      // 2. Report Meta Subheader
      let currentY = 36;
      doc.setTextColor(15, 23, 42); // Slate-900
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(periodLabel, 14, currentY);

      currentY += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139); // Slate-500

      if (activeTab === 'pnl_statement') {
        doc.text(
          `Statement Type: Comprehensive Business P&L   |   Status: Final Calculated`,
          14,
          currentY
        );

        currentY += 8;

        // P&L Statement Table
        const pnlRows: any[] = [
          // Revenue
          ['1. REVENUE FROM OPERATIONS', '', ''],
          ['    Total Sales Revenue (Stationery Products & Cyber Services)', formatCurrencyPdf(reportData.totalSales), ''],
          ['    Less: Cost of Goods Sold (COGS) & Direct Delivery Costs', `(${formatCurrencyPdf(reportData.totalCost)})`, ''],
          ['GROSS OPERATING PROFIT', '', formatCurrencyPdf(reportData.netResult)],
          ['', '', ''],

          // Operating Expenses
          ['2. OPERATING OVERHEAD EXPENSES', '', ''],
          ...Object.entries(reportData.operatingExpensesByCategory).map(([cat, amt]) => [
            `    ${cat}`,
            formatCurrencyPdf(amt),
            '',
          ]),
          ['TOTAL OPERATING OVERHEADS', '', `(${formatCurrencyPdf(reportData.totalOperatingExpenses)})`],
          ['', '', ''],

          // Financial Charges
          ['3. FINANCIAL CHARGES & CARD COSTS', '', ''],
          ...Object.entries(reportData.financialChargesByCategory).map(([cat, amt]) => [
            `    ${cat}`,
            formatCurrencyPdf(amt),
            '',
          ]),
          ['TOTAL FINANCIAL CHARGES', '', `(${formatCurrencyPdf(reportData.totalFinancialCharges)})`],
          ['', '', ''],

          // Net Business Profit
          [
            'NET BUSINESS PROFIT / (LOSS)',
            '',
            (reportData.trueNetBusinessProfit >= 0 ? '+' : '') + formatCurrencyPdf(reportData.trueNetBusinessProfit),
          ],
        ];

        autoTable(doc, {
          startY: currentY,
          head: [['Particulars', 'Subtotal', 'Net Amount']],
          body: pnlRows,
          theme: 'striped',
          headStyles: {
            fillColor: [30, 41, 59],
            textColor: [255, 255, 255],
            fontSize: 8.5,
            fontStyle: 'bold',
          },
          bodyStyles: {
            fontSize: 8,
            cellPadding: 2.5,
          },
          columnStyles: {
            0: { cellWidth: 100 },
            1: { cellWidth: 42, halign: 'right' },
            2: { cellWidth: 42, halign: 'right', fontStyle: 'bold' },
          },
          margin: { left: 14, right: 14 },
          didDrawPage: (data) => {
            const pageCount = doc.internal.pages.length - 1;
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(148, 163, 184);
            doc.text(
              `Page ${data.pageNumber} of ${pageCount}  •  Profit & Loss Statement`,
              pageWidth / 2,
              doc.internal.pageSize.getHeight() - 8,
              { align: 'center' }
            );
          },
        });
      } else {
        // Sales Ledger PDF
        const typeLabel = getTypeFilterLabel();
        doc.text(
          `Filter: ${typeLabel}   |   Total Transactions: ${reportData.count} (${reportData.productSalesCount} Products, ${reportData.serviceSalesCount} Services)`,
          14,
          currentY
        );

        currentY += 6;

        // Summary Metric Cards Table in PDF
        autoTable(doc, {
          startY: currentY,
          theme: 'grid',
          head: [
            [
              'Total Sales Revenue',
              'Total Recorded Cost',
              'Total Gross Profit',
              'Total Loss',
              'Net Transaction Result',
            ],
          ],
          body: [
            [
              formatCurrencyPdf(reportData.totalSales),
              formatCurrencyPdf(reportData.totalCost),
              formatCurrencyPdf(reportData.totalGrossProfit),
              reportData.totalLoss > 0 ? formatCurrencyPdf(reportData.totalLoss) : 'Rs. 0.00',
              (reportData.netResult >= 0 ? '+' : '') + formatCurrencyPdf(reportData.netResult),
            ],
          ],
          headStyles: {
            fillColor: [241, 245, 249],
            textColor: [71, 85, 105],
            fontSize: 7.5,
            fontStyle: 'bold',
            halign: 'center',
          },
          bodyStyles: {
            fontSize: 9,
            fontStyle: 'bold',
            halign: 'center',
            textColor: [15, 23, 42],
          },
          styles: {
            cellPadding: 3,
          },
          columnStyles: {
            0: { textColor: [37, 99, 235] },
            1: { textColor: [51, 65, 85] },
            2: { textColor: [16, 185, 129] },
            3: { textColor: [239, 68, 68] },
            4: { textColor: reportData.netResult >= 0 ? [5, 150, 105] : [220, 38, 38] },
          },
          margin: { left: 14, right: 14 },
        });

        const finalYAfterSummary = (doc as any).lastAutoTable?.finalY || currentY + 20;

        // Transaction Details Table
        const tableBody = reportData.sales.map((sale, idx) => {
          const isProd = sale.saleType === 'product';
          const hasCost =
            sale.isCostRecorded ||
            (sale.costAmount !== undefined && sale.costAmount > 0) ||
            isProd;
          const cost = sale.costAmount || 0;
          const margin = sale.saleAmount - cost;

          return [
            (idx + 1).toString(),
            formatDateDDMMYYYY(sale.date),
            isProd ? 'Product' : 'Service',
            isProd && sale.quantity ? `${sale.particular} (Qty: ${sale.quantity})` : sale.particular,
            hasCost ? formatCurrencyPdf(cost) : 'Not Recorded',
            formatCurrencyPdf(sale.saleAmount),
            hasCost
              ? (margin >= 0 ? '+' : '') + formatCurrencyPdf(margin)
              : '—',
          ];
        });

        autoTable(doc, {
          startY: finalYAfterSummary + 8,
          head: [['#', 'Date', 'Type', 'Particular / Item', 'Cost', 'Sale Amount', 'Margin / Profit']],
          body: tableBody.length > 0 ? tableBody : [['', '', '', 'No transactions found for the selected period.', '', '', '']],
          foot:
            reportData.sales.length > 0
              ? [
                  [
                    'Total',
                    '',
                    `${reportData.sales.length} items`,
                    '',
                    formatCurrencyPdf(reportData.totalCost),
                    formatCurrencyPdf(reportData.totalSales),
                    (reportData.netResult >= 0 ? '+' : '') + formatCurrencyPdf(reportData.netResult),
                  ],
                ]
              : undefined,
          theme: 'striped',
          headStyles: {
            fillColor: [30, 41, 59],
            textColor: [255, 255, 255],
            fontSize: 7.5,
            fontStyle: 'bold',
          },
          footStyles: {
            fillColor: [248, 250, 252],
            textColor: [15, 23, 42],
            fontSize: 8,
            fontStyle: 'bold',
          },
          bodyStyles: {
            fontSize: 7.5,
            cellPadding: 2.2,
          },
          columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 22 },
            2: { cellWidth: 20 },
            3: { cellWidth: 'auto' },
            4: { cellWidth: 26, halign: 'right' },
            5: { cellWidth: 26, halign: 'right' },
            6: { cellWidth: 32, halign: 'right' },
          },
          margin: { left: 14, right: 14 },
          didDrawPage: (data) => {
            const pageCount = doc.internal.pages.length - 1;
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(148, 163, 184);
            doc.text(
              `Page ${data.pageNumber} of ${pageCount}  •  Sales & Financial Report`,
              pageWidth / 2,
              doc.internal.pageSize.getHeight() - 8,
              { align: 'center' }
            );
          },
        });
      }

      // Save the generated PDF
      const fileDateStr = new Date().toISOString().split('T')[0];
      const safeType = reportType.toLowerCase();
      const filename =
        activeTab === 'pnl_statement'
          ? `profit-and-loss-statement-${safeType}-${fileDateStr}.pdf`
          : `financial-report-${safeType}-${fileDateStr}.pdf`;
      doc.save(filename);
    } catch (error) {
      console.error('Failed to generate PDF document:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Export to PDF Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Financial Reports & Accounts</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit-grade performance, sales ledger, and comprehensive Profit & Loss (P&L) statements
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportPDF}
          disabled={isExporting}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-all ${
            isExporting
              ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
              : 'bg-slate-900 hover:bg-slate-800 text-white active:scale-98'
          }`}
          title="Export current filtered view to PDF document"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating PDF...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>{activeTab === 'pnl_statement' ? 'Export P&L to PDF' : 'Export Ledger to PDF'}</span>
            </>
          )}
        </button>
      </div>

      {/* Report View Mode Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('sales_ledger')}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'sales_ledger'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Sales & Margin Ledger</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pnl_statement')}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'pnl_statement'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Profit & Loss (P&L) Statement</span>
        </button>
      </div>

      {/* Filter Controls */}
      <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Report Period</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="daily">Daily Report</option>
              <option value="monthly">Monthly Report</option>
              <option value="yearly">Yearly Report</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {reportType === 'daily' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Select Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {reportType === 'monthly' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Select Month</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {reportType === 'yearly' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Select Year</label>
              <input
                type="number"
                min="2000"
                max="2100"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 w-28"
              />
            </div>
          )}

          {reportType === 'custom' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {activeTab === 'sales_ledger' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Transaction Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">All Transactions</option>
                <option value="product">Products Only</option>
                <option value="service">Services Only</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {activeTab === 'pnl_statement' ? (
        /* Comprehensive Profit & Loss (P&L) Statement View */
        <div className="space-y-6">
          {/* Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border shadow-sm">
              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
                Sales Revenue
              </span>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {formatCurrency(reportData.totalSales)}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">Total top-line turnover</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Gross Profit (Trading)
              </span>
              <p className="text-2xl font-bold text-slate-800 mt-1">
                {formatCurrency(reportData.netResult)}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Margin: {reportData.grossMarginPct.toFixed(1)}% of sales
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border shadow-sm">
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
                Operating Overheads
              </span>
              <p className="text-2xl font-bold text-amber-600 mt-1">
                {formatCurrency(reportData.totalOverheadExpenses)}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Rent, utilities, card fees & bills
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border shadow-sm">
              <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">
                True Net Business Profit
              </span>
              <p
                className={`text-2xl font-bold mt-1 ${
                  reportData.trueNetBusinessProfit >= 0 ? 'text-emerald-700' : 'text-red-700'
                }`}
              >
                {reportData.trueNetBusinessProfit >= 0 ? '+' : ''}
                {formatCurrency(reportData.trueNetBusinessProfit)}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Net Margin: {reportData.netMarginPct.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Formatted Profit & Loss Statement Card */}
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold tracking-wide">Profit & Loss Statement</h2>
                <p className="text-xs text-slate-300 mt-0.5">{getPeriodLabel()}</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-white/10 rounded-lg text-slate-200">
                Auditable Transaction Ledger
              </span>
            </div>

            <div className="p-6 divide-y divide-slate-100 text-sm">
              {/* Section 1: Sales Revenue */}
              <div className="py-4">
                <div className="flex justify-between items-center font-bold text-slate-800 mb-2">
                  <span className="text-base">1. Revenue from Operations</span>
                  <span className="text-base text-blue-700">{formatCurrency(reportData.totalSales)}</span>
                </div>
                <div className="pl-4 space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Stationery Product Sales & Cyber Cafe Services ({reportData.count} transactions)</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(reportData.totalSales)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Less: Cost of Goods Sold (Purchase Costs & Direct Costs)</span>
                    <span className="font-semibold">− {formatCurrency(reportData.totalCost)}</span>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200 flex justify-between font-bold text-emerald-700 text-sm">
                  <span>Gross Operating Profit</span>
                  <span>{formatCurrency(reportData.netResult)}</span>
                </div>
              </div>

              {/* Section 2: Operating Overhead Expenses */}
              <div className="py-4">
                <div className="flex justify-between items-center font-bold text-slate-800 mb-2">
                  <span className="text-base">2. Operating Overhead Expenses</span>
                  <span className="text-base text-amber-700">− {formatCurrency(reportData.totalOperatingExpenses)}</span>
                </div>
                <div className="pl-4 space-y-1.5 text-xs text-slate-600">
                  {Object.entries(reportData.operatingExpensesByCategory).map(([cat, amt]) => (
                    <div key={cat} className="flex justify-between">
                      <span>{cat}</span>
                      <span className="font-semibold text-slate-800">{formatCurrency(amt)}</span>
                    </div>
                  ))}
                  {Object.keys(reportData.operatingExpensesByCategory).length === 0 && (
                    <p className="text-slate-400 italic">No operating overhead expenses recorded in this period.</p>
                  )}
                </div>
              </div>

              {/* Section 3: Financial Charges & Credit Card Costs */}
              <div className="py-4">
                <div className="flex justify-between items-center font-bold text-slate-800 mb-2">
                  <span className="text-base">3. Financial Charges & Card Costs</span>
                  <span className="text-base text-rose-700">− {formatCurrency(reportData.totalFinancialCharges)}</span>
                </div>
                <div className="pl-4 space-y-1.5 text-xs text-slate-600">
                  {Object.entries(reportData.financialChargesByCategory).map(([cat, amt]) => (
                    <div key={cat} className="flex justify-between">
                      <span>{cat}</span>
                      <span className="font-semibold text-slate-800">{formatCurrency(amt)}</span>
                    </div>
                  ))}
                  {Object.keys(reportData.financialChargesByCategory).length === 0 && (
                    <p className="text-slate-400 italic">No financial charges or interest recorded in this period.</p>
                  )}
                </div>
              </div>

              {/* Section 4: Final Net Profit */}
              <div className="pt-4 bg-slate-50/80 -mx-6 px-6 pb-2">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span className="text-slate-900">Net Business Operating Result</span>
                  <span
                    className={
                      reportData.trueNetBusinessProfit >= 0 ? 'text-emerald-700' : 'text-red-700'
                    }
                  >
                    {reportData.trueNetBusinessProfit >= 0 ? '+' : ''}
                    {formatCurrency(reportData.trueNetBusinessProfit)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Gross Profit ({formatCurrency(reportData.netResult)}) − Overheads ({formatCurrency(reportData.totalOverheadExpenses)})
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Sales & Margin Ledger View */
        <div className="space-y-6">
          {/* Financial Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Sales */}
            <div className="bg-white p-5 rounded-2xl border shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Sales Revenue
              </span>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {formatCurrency(reportData.totalSales)}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {reportData.count} transactions ({reportData.productSalesCount} products, {reportData.serviceSalesCount} services)
              </p>
            </div>

            {/* Total Cost */}
            <div className="bg-white p-5 rounded-2xl border shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Recorded Cost
              </span>
              <p className="text-2xl font-bold text-slate-800 mt-1">
                {formatCurrency(reportData.totalCost)}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Product cost + direct service expenses
              </p>
            </div>

            {/* Gross Profit */}
            <div className="bg-white p-5 rounded-2xl border shadow-sm">
              <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                Total Gross Profit
              </span>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {formatCurrency(reportData.totalGrossProfit)}
              </p>
              <p className="text-xs text-emerald-700 mt-0.5">
                Sum of positive margins
              </p>
            </div>

            {/* Net Result */}
            <div className="bg-white p-5 rounded-2xl border shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Net Transaction Result
              </span>
              <p
                className={`text-2xl font-bold mt-1 ${
                  reportData.netResult >= 0 ? 'text-emerald-700' : 'text-red-700'
                }`}
              >
                {reportData.netResult >= 0 ? '+' : ''}
                {formatCurrency(reportData.netResult)}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Profit ({formatCurrency(reportData.totalGrossProfit)}) − Loss ({formatCurrency(reportData.totalLoss)})
              </p>
            </div>
          </div>

          {reportData.unrecordedCostCount > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
              <Filter className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                {reportData.unrecordedCostCount} older transaction(s) have unrecorded cost data and are excluded from profit calculations until edited.
              </span>
            </div>
          )}

          {/* Transactions Breakdown Table */}
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800">Transactions in Selected Period</h2>
              <span className="text-xs text-slate-500">{reportData.sales.length} record(s)</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 font-medium border-b">
                  <tr>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Type</th>
                    <th className="px-5 py-3.5">Particular / Item</th>
                    <th className="px-5 py-3.5 text-right">Cost (₹)</th>
                    <th className="px-5 py-3.5 text-right">Sale Amount (₹)</th>
                    <th className="px-5 py-3.5 text-right">Gross Profit / Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.sales.map((sale) => {
                    const isProd = sale.saleType === 'product';
                    const hasCost =
                      sale.isCostRecorded ||
                      (sale.costAmount !== undefined && sale.costAmount > 0) ||
                      isProd;

                    const cost = sale.costAmount || 0;
                    const margin = sale.saleAmount - cost;

                    return (
                      <tr key={sale.id} className="hover:bg-slate-50">
                        <td className="px-5 py-4 text-slate-600">{formatDateDDMMYYYY(sale.date)}</td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              isProd
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}
                          >
                            {isProd ? <Package className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                            {isProd ? 'Product' : 'Service'}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-800">
                          {sale.particular}
                          {isProd && sale.quantity && (
                            <span className="text-xs font-normal text-slate-400 ml-2">
                              (Qty: {sale.quantity})
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          {hasCost ? (
                            <span className="text-slate-700 font-medium">{formatCurrency(cost)}</span>
                          ) : (
                            <span className="text-xs text-amber-700 italic">Cost Not Recorded</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-slate-900">
                          {formatCurrency(sale.saleAmount)}
                        </td>
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
                              {!isProd && cost === 0 && (
                                <div className="text-[10px] text-emerald-700 font-medium">Gross Profit</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {reportData.sales.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                        No transactions found for the selected period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
