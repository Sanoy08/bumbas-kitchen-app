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

/**
 * Checks whether two products or cart items represent the same dish.
 * Matches by id, dishId, slug, or normalized dish name.
 */
export function isSameDish(a: any, b: any): boolean {
  if (!a || !b) return false;
  
  // 1. Direct ID match
  if (a.id && b.id && a.id === b.id) return true;
  
  // 2. dishId matching (connecting Today's Special with regular menu item)
  if (a.dishId && b.dishId && a.dishId === b.dishId) return true;
  if (a.dishId && b.id && a.dishId === b.id) return true;
  if (a.id && b.dishId && a.id === b.dishId) return true;
  
  // 3. Slug matching
  const cleanSlug = (s: string) => (s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-*|-*$/g, '');
  const slugA = cleanSlug(a.slug || a.name || '');
  const slugB = cleanSlug(b.slug || b.name || '');
  if (slugA && slugB && slugA === slugB) return true;

  // 4. Normalized Name matching
  const cleanName = (n: string) => (n || '').toLowerCase().trim();
  if (cleanName(a.name) && cleanName(b.name) && cleanName(a.name) === cleanName(b.name)) return true;

  return false;
}

