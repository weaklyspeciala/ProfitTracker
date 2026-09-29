export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Formats a date string (YYYY-MM-DD or ISO) into DD/MM/YYYY
 */
export const formatDateDDMMYYYY = (dateString: string): string => {
  if (!dateString) return '';
  const clean = dateString.split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    const [year, month, day] = parts;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
    return dateString;
  }
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Converts a DD/MM/YYYY string to YYYY-MM-DD for standard date parsing / storage
 */
export const toYYYYMMDD = (ddmmyyyy: string): string => {
  if (!ddmmyyyy) return '';
  const trimmed = ddmmyyyy.trim();
  const parts = trimmed.split(/[\/\-\.]/);
  if (parts.length === 3) {
    if (parts[0].length <= 2 && parts[2].length === 4) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
  }
  return trimmed;
};

/**
 * Returns today's date in DD/MM/YYYY format
 */
export const getTodayDDMMYYYY = (): string => {
  const date = new Date();
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Validates whether a DD/MM/YYYY string is a valid calendar date
 */
export const isValidDDMMYYYY = (str: string): boolean => {
  if (!str) return false;
  const match = str.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return false;
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > 2100) return false;

  // Check actual days in month
  const daysInMonth = new Date(year, month, 0).getDate();
  return day <= daysInMonth;
};

/**
 * Formats an ISO date string into DD/MM/YYYY, hh:mm:ss A
 */
export const formatDateTime = (dateString: string | null | undefined): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const timeStr = date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  return `${day}/${month}/${year}, ${timeStr}`;
};

export type DateRangePeriod =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'all_time'
  | 'custom';

export const getDateRangeBounds = (
  period: DateRangePeriod,
  customStart?: string,
  customEnd?: string
): { start: Date; end: Date; label: string } => {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  switch (period) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now), label: 'Today' };
    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { start: startOfDay(y), end: endOfDay(y), label: 'Yesterday' };
    }
    case 'last_7_days': {
      const past = new Date(now);
      past.setDate(past.getDate() - 6);
      return { start: startOfDay(past), end: endOfDay(now), label: 'Last 7 Days' };
    }
    case 'last_30_days': {
      const past = new Date(now);
      past.setDate(past.getDate() - 29);
      return { start: startOfDay(past), end: endOfDay(now), label: 'Last 30 Days' };
    }
    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start, end, label: 'This Month' };
    }
    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { start, end, label: 'Last Month' };
    }
    case 'this_year': {
      const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return { start, end, label: 'This Year' };
    }
    case 'custom': {
      const s = customStart ? new Date(customStart) : new Date(0);
      const e = customEnd ? new Date(customEnd) : now;
      return {
        start: startOfDay(s),
        end: endOfDay(e),
        label:
          customStart && customEnd
            ? `${formatDateDDMMYYYY(customStart)} – ${formatDateDDMMYYYY(customEnd)}`
            : 'Custom Range',
      };
    }
    case 'all_time':
    default:
      return { start: new Date(0), end: new Date(8640000000000000), label: 'All Time' };
  }
};

export const isDateWithinRange = (dateStr: string, start: Date, end: Date): boolean => {
  if (!dateStr) return false;
  const ymd = toYYYYMMDD(dateStr);
  const parts = ymd.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day, 12, 0, 0);
    return d.getTime() >= start.getTime() && d.getTime() <= end.getTime();
  }
  const d = new Date(dateStr);
  return !isNaN(d.getTime()) && d.getTime() >= start.getTime() && d.getTime() <= end.getTime();
};

