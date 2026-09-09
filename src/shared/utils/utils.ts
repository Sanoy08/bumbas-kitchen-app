// src\lib\utils.ts

export function formatPrice(price: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price).replace('₹', '₹ ');
}

/**
 * Removes Google Plus Codes (e.g. "P796+424", "7JQ3+5C") from an address string.
 * Plus Codes follow the pattern: alphanumeric chars + '+' + alphanumeric chars
 */
export function cleanAddress(address: string): string {
  if (!address) return address;
  return address
    .split(',')
    .map(part => part.trim())
    .filter(part => !/^[A-Z0-9]{4}\+[A-Z0-9]{2,}/i.test(part))
    .join(', ')
    .trim();
}
