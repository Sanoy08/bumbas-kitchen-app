// src/app/menus/index.tsx
import { Redirect } from 'expo-router';

/**
 * Handles `/menus` route by redirecting directly to the Shop food explore section
 */
export default function MenusIndex() {
  return <Redirect href="/(shop)?scrollTo=explore" />;
}
