/**
 * Text Input & Keyboard Target Detection Utilities.
 *
 * Prevents global game actions, driving inputs, and menu navigation shortcuts
 * (WASD, Space, Enter, Backspace, Escape, Camera C, Telemetry T)
 * from intercepting user typing when focused on interactive text elements.
 */

/**
 * Checks if the given DOM node or event target is an editable text control
 * (e.g., `<input type="text">`, `<textarea>`, `<select>`, or contenteditable elements).
 *
 * Non-text controls like checkboxes, radios, or range sliders return false so they can
 * still be navigated or toggled via gamepad / keyboard bindings.
 */
export function isTextInputTarget(target: EventTarget | null): boolean {
  if (!target) {
    return false;
  }

  if (typeof HTMLElement !== 'undefined' && !(target instanceof HTMLElement)) {
    return false;
  }

  const el = target as {
    tagName?: string;
    type?: string;
    isContentEditable?: boolean;
  };

  const tagName = (typeof el.tagName === 'string' ? el.tagName : '').toUpperCase();

  if (tagName === 'INPUT') {
    const nonTextTypes = [
      'button',
      'checkbox',
      'color',
      'file',
      'hidden',
      'image',
      'radio',
      'range',
      'reset',
      'submit',
    ];
    const type = (typeof el.type === 'string' ? el.type : 'text').toLowerCase();
    return !nonTextTypes.includes(type);
  }

  if (tagName === 'TEXTAREA') {
    return true;
  }

  if (tagName === 'SELECT') {
    return true;
  }

  if (el.isContentEditable === true) {
    return true;
  }

  return false;
}

/**
 * Checks if text editing is currently active, considering either the event target
 * or the currently focused document element (`document.activeElement`).
 *
 * @param e - Optional KeyboardEvent or UIEvent to inspect.
 * @returns True if the user is currently typing in an editable field.
 */
export function isTextEditingActive(e?: Event | KeyboardEvent): boolean {
  if (e && isTextInputTarget(e.target)) {
    return true;
  }

  if (typeof document !== 'undefined' && isTextInputTarget(document.activeElement)) {
    return true;
  }

  return false;
}
