
export const formatCurrency = (amount: number, rounded: boolean = false) => {
  const absAmount = Math.abs(amount);
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: rounded ? 0 : 2,
    maximumFractionDigits: rounded ? 0 : 2,
  }).format(absAmount);

  return amount < 0 ? `(${formatted})` : formatted;
};

export const roundToTwo = (num: number): number => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

export const generateId = () => Math.random().toString(36).substr(2, 9);

/**
 * Robustly parses a YYYY-MM-DD string into a Date object that 
 * represents that day in the user's LOCAL timezone.
 */
export const parseLocalDate = (dateStr: string | Date): Date => {
  if (dateStr instanceof Date) return dateStr;
  const [year, month, day] = dateStr.split('-').map(Number);
  // Months are 0-indexed in JS Date constructor
  return new Date(year, month - 1, day);
};

export const getMonthYearKey = (date: Date | string) => {
  const d = parseLocalDate(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const getMonthLabel = (date: Date | string) => {
  return parseLocalDate(date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};

export const formatDisplayDate = (date: string | Date) => {
  return parseLocalDate(date).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'numeric', 
    day: 'numeric' 
  });
};
