import { describe, expect, it, vi } from 'vitest';
import { swipeDown } from './swipe-down';

type Listener = (event: Record<string, unknown>) => void;

function fakeSheet({ scrollTop = 0, offsetHeight = 600 } = {}) {
	const listeners = new Map<string, Set<Listener>>();
	const element = {
		scrollTop,
		offsetHeight,
		style: { transition: '', transform: '' },
		setPointerCapture: vi.fn(),
		addEventListener(type: string, listener: Listener) {
			if (!listeners.has(type)) listeners.set(type, new Set());
			listeners.get(type)?.add(listener);
		},
		removeEventListener(type: string, listener: Listener) {
			listeners.get(type)?.delete(listener);
		},
		fire(type: string, event: Record<string, unknown>) {
			for (const listener of listeners.get(type) ?? []) listener(event);
		},
		hasListeners(type: string) {
			return (listeners.get(type)?.size ?? 0) > 0;
		}
	};
	return element;
}

const attach = (element: ReturnType<typeof fakeSheet>, onDismiss: () => void) =>
	swipeDown(onDismiss)(element as unknown as HTMLElement) as () => void;

describe('swipeDown attachment', () => {
	it('drags the sheet with the finger and dismisses past the threshold', () => {
		const element = fakeSheet();
		const onDismiss = vi.fn();
		attach(element, onDismiss);

		element.fire('pointerdown', { button: 0, pointerId: 1, clientY: 100, timeStamp: 0 });
		element.fire('pointermove', { pointerId: 1, clientY: 400, timeStamp: 300 });
		expect(element.style.transform).toBe('translateY(300px)');
		expect(element.setPointerCapture).toHaveBeenCalledWith(1);

		element.fire('pointerup', { pointerId: 1, clientY: 400, timeStamp: 300 });
		expect(onDismiss).toHaveBeenCalledOnce();
		expect(element.style.transform).toBe('');
	});

	it('springs back below the threshold', () => {
		const element = fakeSheet();
		const onDismiss = vi.fn();
		attach(element, onDismiss);

		element.fire('pointerdown', { button: 0, pointerId: 1, clientY: 100, timeStamp: 0 });
		element.fire('pointermove', { pointerId: 1, clientY: 150, timeStamp: 300 });
		element.fire('pointerup', { pointerId: 1, clientY: 150, timeStamp: 300 });

		expect(element.style.transform).toBe('');
		expect(onDismiss).not.toHaveBeenCalled();
	});

	it('does not engage while the contents are scrolled down', () => {
		const element = fakeSheet({ scrollTop: 120 });
		const onDismiss = vi.fn();
		attach(element, onDismiss);

		element.fire('pointerdown', { button: 0, pointerId: 1, clientY: 100, timeStamp: 0 });
		element.fire('pointermove', { pointerId: 1, clientY: 400, timeStamp: 300 });
		element.fire('pointerup', { pointerId: 1, clientY: 400, timeStamp: 300 });

		expect(element.style.transform).toBe('');
		expect(onDismiss).not.toHaveBeenCalled();
	});

	it('cancels the native touch scroll only while dragging down', () => {
		const element = fakeSheet();
		attach(element, vi.fn());
		const draggingPrevent = vi.fn();
		const idlePrevent = vi.fn();

		element.fire('pointerdown', { button: 0, pointerId: 1, clientY: 100, timeStamp: 0 });
		element.fire('touchmove', { touches: [{ clientY: 200 }], preventDefault: draggingPrevent });
		expect(draggingPrevent).toHaveBeenCalled();

		element.fire('pointerup', { pointerId: 1, clientY: 100, timeStamp: 0 });
		element.fire('touchmove', { touches: [{ clientY: 200 }], preventDefault: idlePrevent });
		expect(idlePrevent).not.toHaveBeenCalled();
	});

	it('removes its listeners when detached', () => {
		const element = fakeSheet();
		const destroy = attach(element, vi.fn());

		expect(element.hasListeners('pointerdown')).toBe(true);
		destroy();
		expect(element.hasListeners('pointerdown')).toBe(false);
		expect(element.hasListeners('touchmove')).toBe(false);
	});
});
