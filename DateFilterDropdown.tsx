import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';
import { toYYYYMMDD, formatDateDDMMYYYY } from '../lib/utils';

export type DateFilterPeriod =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'all_time'
  | 'custom';

interface DateFilterDropdownProps {
  period: DateFilterPeriod;
  customStart?: string;
  customEnd?: string;
  onChange: (period: DateFilterPeriod, customStart?: string, customEnd?: string) => void;
  align?: 'left' | 'right';
}

const FILTER_OPTIONS: { id: DateFilterPeriod; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last_7_days', label: 'Last 7 Days' },
  { id: 'last_30_days', label: 'Last 30 Days' },
  { id: 'this_month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'this_year', label: 'This Year' },
  { id: 'all_time', label: 'All Time' },
  { id: 'custom', label: 'Custom Date Range' },
];

export function DateFilterDropdown({
  period,
  customStart,
  customEnd,
  onChange,
  align = 'right',
}: DateFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(period === 'custom');
  
  // Custom date inputs
  const todayYmd = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(customStart || todayYmd);
  const [endDate, setEndDate] = useState(customEnd || todayYmd);
  const [customError, setCustomError] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsCustomMode(period === 'custom');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [period]);

  const handleSelectOption = (optId: DateFilterPeriod) => {
    if (optId === 'custom') {
      setIsCustomMode(true);
    } else {
      setIsCustomMode(false);
      onChange(optId);
      setIsOpen(false);
    }
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCustomError('');

    if (!startDate || !endDate) {
      setCustomError('Please select both start and end dates.');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setCustomError('From Date must be before or equal to To Date.');
      return;
    }

    onChange('custom', startDate, endDate);
    setIsOpen(false);
  };

  // Label to display on trigger button
  const getActiveLabel = () => {
    if (period === 'custom') {
      if (customStart && customEnd) {
        return `${formatDateDDMMYYYY(customStart)} – ${formatDateDDMMYYYY(customEnd)}`;
      }
      return 'Custom Range';
    }
    const match = FILTER_OPTIONS.find((o) => o.id === period);
    return match ? match.label : 'Select Period';
  };

  return (
    <div
      className="relative inline-block text-left"
      ref={containerRef}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setIsCustomMode(period === 'custom');
        }}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200"
        title="Change date filter"
      >
        <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <span className="truncate max-w-[130px]">{getActiveLabel()}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute z-30 mt-1.5 w-64 rounded-xl bg-white shadow-xl border border-slate-200 py-1 text-xs text-slate-700 animate-in fade-in zoom-in-95 duration-100 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {!isCustomMode ? (
            <div className="max-h-72 overflow-y-auto py-1">
              <div className="px-3 py-1.5 font-semibold text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-100 mb-1">
                Select Date Range
              </div>
              {FILTER_OPTIONS.map((opt) => {
                const isSelected = period === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectOption(opt.id)}
                    className={`w-full text-left px-3.5 py-2 flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-slate-800 text-xs">Custom Date Range</span>
                <button
                  type="button"
                  onClick={() => setIsCustomMode(false)}
                  className="text-[11px] text-blue-600 hover:underline"
                >
                  Back to list
                </button>
              </div>

              {customError && (
                <div className="p-2 mb-2 bg-red-50 text-red-600 text-[11px] rounded border border-red-200">
                  {customError}
                </div>
              )}

              <form onSubmit={handleApplyCustom} className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                    From Date (Day/Month/Year)
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                  <span className="text-[10px] text-slate-400">
                    {startDate ? formatDateDDMMYYYY(startDate) : ''}
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                    To Date (Day/Month/Year)
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full border rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                  <span className="text-[10px] text-slate-400">
                    {endDate ? formatDateDDMMYYYY(endDate) : ''}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomMode(false);
                      setIsOpen(false);
                    }}
                    className="px-2.5 py-1 text-slate-500 hover:bg-slate-100 rounded text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-xs shadow-sm transition-colors"
                  >
                    Apply Range
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
