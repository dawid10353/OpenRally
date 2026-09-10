import type { MenuView } from './types';

/**
 * Interface implemented by dynamic menu subviews (e.g. MultiplayerView)
 * to handle specialized gamepad / keyboard navigation events without mouse.
 */
export interface MenuGamepadDelegate {
  /** Move focus up */
  handleNavUp?: () => void;
  /** Move focus down */
  handleNavDown?: () => void;
  /** Move focus left / previous column or category */
  handleNavLeft?: () => void;
  /** Move focus right / next column or category */
  handleNavRight?: () => void;
  /** Bumper LB / Q / PageUp (e.g. cycle previous car or tab) */
  handleTabLeft?: () => void;
  /** Bumper RB / E / PageDown (e.g. cycle next car or tab) */
  handleTabRight?: () => void;
  /** Action Button A / Enter / Space (confirm / click / select) */
  handleConfirm?: () => void;
  /**
   * Action Button B / Escape / Backspace (cancel / back)
   * Return true if the subview consumed the back event (e.g. closed a modal or dialog),
   * or false / undefined if navigation should perform the default view back (e.g. to 'main').
   */
  handleBack?: () => boolean | void;
  /** Action Button X / Key Delete (e.g. delete room, reset item) */
  handleSpecialX?: () => void;
  /** Action Button Y / Key R (e.g. refresh rooms or list) */
  handleSpecialY?: () => void;
}

const delegates = new Map<MenuView, MenuGamepadDelegate>();

/**
 * Register a gamepad delegate for a specific MenuView.
 * Returns an unregister cleanup function to be called on component unmount.
 */
export function registerMenuGamepadDelegate(
  view: MenuView,
  delegate: MenuGamepadDelegate,
): () => void {
  delegates.set(view, delegate);
  return () => {
    if (delegates.get(view) === delegate) {
      delegates.delete(view);
    }
  };
}

/**
 * Retrieve the active gamepad delegate for a given MenuView.
 */
export function getMenuGamepadDelegate(view: MenuView): MenuGamepadDelegate | null {
  return delegates.get(view) ?? null;
}

/**
 * Known menu views that are handled natively inside useMenuGamepadNavigation.
 */
export const NATIVELY_HANDLED_MENU_VIEWS: readonly MenuView[] = [
  'main',
  'start_mode',
  'options',
  'controls',
  'garage',
  'tracks',
  'credits',
] as const;

/**
 * All known Menu Views registered in the system.
 */
export const ALL_MENU_VIEWS: readonly MenuView[] = [
  'main',
  'start_mode',
  'options',
  'controls',
  'garage',
  'tracks',
  'credits',
  'multiplayer',
] as const;

/**
 * Architectural invariant validator: verifies that every MenuView defined in
 * the system is either handled natively or has an architectural delegate contract.
 * Used in automated integrity tests to ensure no developer creates a menu view
 * without gamepad / controller support.
 */
export function validateAllMenuViewsSupported(allViews: readonly MenuView[] = ALL_MENU_VIEWS): {
  valid: boolean;
  unsupportedViews: MenuView[];
} {
  const unsupportedViews: MenuView[] = [];

  for (const v of allViews) {
    const isNative = NATIVELY_HANDLED_MENU_VIEWS.includes(v);
    const hasDelegate = delegates.has(v) || v === 'multiplayer';
    if (!isNative && !hasDelegate) {
      unsupportedViews.push(v);
    }
  }

  return {
    valid: unsupportedViews.length === 0,
    unsupportedViews,
  };
}
