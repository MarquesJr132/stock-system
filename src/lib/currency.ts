// Utilities for Mozambique currency and number formatting

// Mozambique locale configuration
export const MOZAMBIQUE_LOCALE = 'pt-MZ';
export const CURRENCY_CODE = 'MZN';

/**
 * Format currency value to Mozambique Metical (MZN)
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat(MOZAMBIQUE_LOCALE, {
    style: 'currency',
    currency: CURRENCY_CODE,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format number according to Mozambique standards
 */
export function formatNumber(value: number, minimumFractionDigits: number = 0): string {
  return new Intl.NumberFormat(MOZAMBIQUE_LOCALE, {
    minimumFractionDigits,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format date according to Mozambique standards
 */
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) {
    return 'Data inválida';
  }
  return new Intl.DateTimeFormat(MOZAMBIQUE_LOCALE, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(dateObj);
}

/**
 * Format date and time according to Mozambique standards
 */
export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) {
    return 'Data inválida';
  }
  return new Intl.DateTimeFormat(MOZAMBIQUE_LOCALE, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
}

/**
 * Format percentage according to Mozambique standards
 */
export function formatPercentage(value: number): string {
  return new Intl.NumberFormat(MOZAMBIQUE_LOCALE, {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}