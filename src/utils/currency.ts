/** Amounts stored as full rupiah integers; displayed in Indonesian format (Rp150.000,00). */

export const ADMIN_FEE_RATE = 0.15;

const idrFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function isPeerService(type: string, price?: number | null): boolean {
  const normalized = type.toLowerCase();
  return normalized === 'peer' || normalized === 'study_buddy' || price === 0 || price === null;
}

export function serviceTypeForRole(role: 'student' | 'tutor'): 'peer' | 'tutoring' {
  return role === 'student' ? 'peer' : 'tutoring';
}

export function formatIdr(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return 'Rp0,00';
  }
  return idrFormatter.format(Number(amount)).replace(/^Rp\s+/i, 'Rp');
}

export function withAdminFee(basePrice: number): number {
  return Math.round(basePrice * (1 + ADMIN_FEE_RATE));
}

export function adminFeeAmount(basePrice: number): number {
  return withAdminFee(basePrice) - basePrice;
}

export function formatPriceIdr(type: string, price: number | null): string {
  if (isPeerService(type, price)) {
    return 'Free';
  }
  return `${formatIdr(withAdminFee(Number(price ?? 0)))} (incl. admin fee)`;
}

export function formatBookingPrice(basePrice: number, type?: string): string {
  if (type && isPeerService(type, basePrice)) {
    return 'Free';
  }
  if (basePrice <= 0) return 'Free';
  const fee = adminFeeAmount(basePrice);
  return `${formatIdr(withAdminFee(basePrice))} (${formatIdr(basePrice)} + ${formatIdr(fee)} admin fee)`;
}

export function formatPriceIdrPlain(price: number | null, type?: string): string {
  if (type && isPeerService(type, price)) {
    return 'Free';
  }
  if (price === 0 || price === null) {
    return 'Free';
  }
  return formatIdr(price);
}

export function formatWalletBalance(amount: number): string {
  return formatIdr(amount);
}

/** Parse Indonesian-style (150.000,00) or plain numeric input into full rupiah. */
export function parseIdrInput(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;

  let normalized = trimmed.replace(/^Rp\s?/i, '').replace(/\s/g, '');

  if (normalized.includes(',')) {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else {
    normalized = normalized.replace(/\./g, '');
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

/** Format for price text inputs (without Rp prefix). */
export function formatIdrInputValue(amount: number): string {
  return formatIdr(amount).replace(/^Rp\s?/i, '').trim();
}
