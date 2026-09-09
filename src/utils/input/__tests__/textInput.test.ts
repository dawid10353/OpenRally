import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isTextInputTarget, isTextEditingActive } from '../textInput';

describe('textInput target detection utilities', () => {
  const originalDocument = globalThis.document;

  beforeEach(() => {
    // Mock minimal document for Node.js Vitest environment
    let activeEl: EventTarget | null = null;
    const docMock = {
      get activeElement() {
        return activeEl;
      },
      setActiveElement(el: EventTarget | null) {
        activeEl = el;
      },
    };

    Object.defineProperty(globalThis, 'document', {
      value: docMock,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    if (originalDocument !== undefined) {
      Object.defineProperty(globalThis, 'document', {
        value: originalDocument,
        configurable: true,
        writable: true,
      });
    } else {
      // @ts-expect-error cleanup global
      delete globalThis.document;
    }
  });

  describe('isTextInputTarget', () => {
    it('returns false for null or undefined targets', () => {
      expect(isTextInputTarget(null)).toBe(false);
    });

    it('returns false for generic div, span, button', () => {
      const div = { tagName: 'DIV' } as unknown as EventTarget;
      const span = { tagName: 'SPAN' } as unknown as EventTarget;
      const button = { tagName: 'BUTTON' } as unknown as EventTarget;

      expect(isTextInputTarget(div)).toBe(false);
      expect(isTextInputTarget(span)).toBe(false);
      expect(isTextInputTarget(button)).toBe(false);
    });

    it('returns true for text-based HTMLInputElement types', () => {
      const types = ['text', 'password', 'search', 'email', 'number', 'tel', 'url'];
      for (const t of types) {
        const input = { tagName: 'INPUT', type: t } as unknown as EventTarget;
        expect(isTextInputTarget(input)).toBe(true);
      }

      // Default input (no type attribute specified) defaults to text
      const defaultInput = { tagName: 'INPUT' } as unknown as EventTarget;
      expect(isTextInputTarget(defaultInput)).toBe(true);
    });

    it('returns false for non-text inputs (checkbox, radio, range, button)', () => {
      const nonText = ['checkbox', 'radio', 'range', 'button', 'submit', 'reset', 'file', 'color', 'hidden'];
      for (const t of nonText) {
        const input = { tagName: 'INPUT', type: t } as unknown as EventTarget;
        expect(isTextInputTarget(input)).toBe(false);
      }
    });

    it('returns true for textarea and select elements', () => {
      const textarea = { tagName: 'TEXTAREA' } as unknown as EventTarget;
      const select = { tagName: 'SELECT' } as unknown as EventTarget;

      expect(isTextInputTarget(textarea)).toBe(true);
      expect(isTextInputTarget(select)).toBe(true);
    });

    it('returns true for contenteditable elements', () => {
      const editableDiv = { tagName: 'DIV', isContentEditable: true } as unknown as EventTarget;
      expect(isTextInputTarget(editableDiv)).toBe(true);
    });
  });

  describe('isTextEditingActive', () => {
    it('returns true when event target is an active text input', () => {
      const input = { tagName: 'INPUT', type: 'text' } as unknown as EventTarget;
      const event = { target: input } as unknown as KeyboardEvent;

      expect(isTextEditingActive(event)).toBe(true);
    });

    it('returns true when document.activeElement is focused on an input even if event has no target', () => {
      const input = { tagName: 'INPUT', type: 'text' } as unknown as EventTarget;
      // @ts-expect-error mock helper
      (globalThis.document as { setActiveElement: (el: EventTarget | null) => void }).setActiveElement(input);

      expect(isTextEditingActive()).toBe(true);
    });

    it('returns false when activeElement is body or a normal button', () => {
      const button = { tagName: 'BUTTON' } as unknown as EventTarget;
      // @ts-expect-error mock helper
      (globalThis.document as { setActiveElement: (el: EventTarget | null) => void }).setActiveElement(button);

      expect(isTextEditingActive()).toBe(false);
    });
  });
});
