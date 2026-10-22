// src/shared/utils/notificationRouter.ts
import { Linking } from 'react-native';

/**
 * Checks if a notification is meant for the Admin App / Dashboard
 * so it never shows up in the Customer App.
 */
export function isAdminNotification(notif: any): boolean {
  if (!notif) return false;

  const link = (notif.link || notif.url || '').toLowerCase();
  const title = (notif.title || '').toLowerCase();
  const message = (notif.message || notif.body || '').toLowerCase();
  const type = (notif.type || '').toLowerCase();

  // 1. Link checks: points to admin portal
  if (
    link.includes('admin.bumbaskitchen.app') ||
    link.includes('/admin') ||
    link.includes('admin=') ||
    link.includes('/special-dates')
  ) {
    return true;
  }

  // 2. Title & Type checks for known Admin notifications
  if (
    title.includes('new order') ||
    title.includes('upcoming special dates') ||
    title.includes('cash deposit') ||
    title.includes('deposit request') ||
    type.includes('admin') ||
    notif.forAdmin === true ||
    notif.targetRole === 'admin'
  ) {
    return true;
  }

  // 3. Message check
  if (
    message.includes('customers have a birthday or anniversary') ||
    message.includes('wants to deposit')
  ) {
    return true;
  }

  return false;
}

export function handleNotificationNavigation(rawUrl: string | undefined | null, router: any) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    router.push('/(shop)');
    return;
  }

  let target = rawUrl.trim();
  if (!target) {
    router.push('/(shop)');
    return;
  }

  // Guard: if it's an admin link, do nothing in customer app
  if (
    target.includes('admin.bumbaskitchen.app') ||
    target.startsWith('/admin') ||
    target.includes('/admin') ||
    target.includes('/special-dates')
  ) {
    console.log('[NotificationRouter] Admin link ignored in customer app:', target);
    return;
  }

  // 1. Handle full URLs (e.g. https://www.bumbaskitchen.app/account/wallet or external links)
  if (target.startsWith('http://') || target.startsWith('https://')) {
    try {
      // Check if it's our own domain
      const isInternalDomain = 
        target.includes('bumbaskitchen.app') && 
        !target.includes('admin.bumbaskitchen.app');

      if (isInternalDomain) {
        // Extract path + query (e.g. https://bumbaskitchen.app/account/wallet -> /account/wallet)
        const match = target.match(/^https?:\/\/[^\/]+(\/.*)?$/);
        target = match && match[1] ? match[1] : '/(shop)';
      } else {
        // External link (e.g. admin panel or external website)
        Linking.openURL(target).catch((err) => {
          console.log('[NotificationRouter] Could not open external URL:', target, err);
        });
        return;
      }
    } catch (e) {
      console.log('[NotificationRouter] URL parse error:', e);
      Linking.openURL(target).catch(() => {});
      return;
    }
  }

  // Ensure leading slash
  if (!target.startsWith('/')) {
    target = '/' + target;
  }

  const [pathOnly, queryString] = target.split('?');
  const normalizedPath = pathOnly.toLowerCase().replace(/\/+$/, ''); // remove trailing slash
  const query = queryString ? `?${queryString}` : '';

  // 2. Specific Route Mapping
  switch (normalizedPath) {
    case '':
    case '/':
    case '/home':
    case '/shop':
    case '/(shop)':
      router.push('/(shop)');
      break;

    case '/menus':
    case '/menu':
    case '/explore':
    case '/food':
      router.push(queryString ? `/(shop)?scrollTo=explore&${queryString}` : '/(shop)?scrollTo=explore');
      break;

    case '/cart':
    case '/(shop)/cart':
      router.push('/(shop)/cart');
      break;

    case '/account/wallet':
    case '/wallet':
      router.push('/account/wallet');
      break;

    case '/account/orders':
    case '/orders':
    case '/order':
      router.push('/account/orders');
      break;

    case '/account/coupons':
    case '/coupons':
    case '/coupon':
      router.push('/account/coupons');
      break;

    case '/account/addresses':
    case '/addresses':
    case '/address':
      router.push('/account/addresses');
      break;

    case '/account/favorites':
    case '/favorites':
      router.push('/account/favorites');
      break;

    case '/notifications':
    case '/notification':
      router.push('/notifications');
      break;

    case '/mega-campaign':
    case '/campaign':
      router.push('/mega-campaign');
      break;

    default:
      // Check if it's a dish detail path: /menus/:slug, /menu/:slug, /product/:slug, /dish/:slug
      const dishPrefixMatch = normalizedPath.match(/^\/(menus|menu|product|products|dish|dishes)\/(.+)$/);
      if (dishPrefixMatch) {
        const slug = dishPrefixMatch[2];
        router.push(`/menus/${slug}${query}`);
      } else {
        // Fallback: try navigating, if error fallback to /(shop)
        try {
          router.push(target);
        } catch (err) {
          console.warn('[NotificationRouter] Fallback redirect to home for unmatched:', target);
          router.push('/(shop)');
        }
      }
      break;
  }
}
