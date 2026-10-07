// opszStepper/src/__tests__/restore-inline.test.ts — regression tests: stopping must not roll back inline styles the author changed while the stepper was running.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { removeOpszStepper, startOpszStepper } from '../core/adjust'
import type { OpszStepperCut } from '../core/types'

/** Stub getComputedStyle so the computed font-size follows the element's inline font-size. */
function stubComputedFromInline(): void {
	vi.stubGlobal('getComputedStyle', (el: HTMLElement) => ({
		fontSize: el.style.fontSize || '16px',
		getPropertyValue: (p: string) => (p === 'font-variation-settings' ? 'normal' : ''),
	}))
}

/** Stub ResizeObserver and return a function that fires its callback. */
function stubRO(): () => void {
	let cb: ResizeObserverCallback | null = null
	vi.stubGlobal('ResizeObserver', class {
		constructor(c: ResizeObserverCallback) { cb = c }
		observe() {}
		unobserve() {}
		disconnect() {}
	})
	return () => cb?.([], null as unknown as ResizeObserver)
}

/** Two cuts with a boundary at 16px. */
const CUTS: OpszStepperCut[] = [{ family: 'Caption', maxSize: 16 }, { family: 'Text', minSize: 16 }]

beforeEach(() => { document.body.innerHTML = '' })
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('restore keeps inline styles the author changed while the stepper ran', () => {
	it('keeps a new inline font-size when the change crossed a cut (stop)', async () => {
		stubComputedFromInline()
		const fire = stubRO()
		const el = document.createElement('p')
		el.style.fontSize = '32px'
		el.style.lineHeight = '1.3'
		document.body.appendChild(el)

		const stop = startOpszStepper(el, { cuts: CUTS })
		expect(el.style.fontFamily).toBe('Text')

		// The author (or React) shrinks the text; the stepper swaps to the Caption cut.
		el.style.fontSize = '12px'
		fire(); await Promise.resolve()
		expect(el.style.fontFamily).toBe('Caption')

		stop()
		// Only opszStepper's own font-family is undone: the author's 12px stays.
		expect(el.style.fontSize).toBe('12px')
		expect(el.style.lineHeight).toBe('1.3')
		expect(el.style.fontFamily).toBe('')
	})

	it('restarting with new options picks the cut for the current size, not the size at first start', async () => {
		stubComputedFromInline()
		const fire = stubRO()
		const el = document.createElement('p')
		el.style.fontSize = '32px'
		document.body.appendChild(el)

		startOpszStepper(el, { cuts: CUTS })
		el.style.fontSize = '12px'
		fire(); await Promise.resolve()
		expect(el.style.fontFamily).toBe('Caption')

		// What the React hook does when `hysteresis` or `cuts` change: start again on the same element.
		const stop = startOpszStepper(el, { cuts: CUTS, hysteresis: 4 })
		expect(el.style.fontSize).toBe('12px')
		expect(el.style.fontFamily).toBe('Caption')
		stop()
		expect(el.style.fontSize).toBe('12px')
	})

	it('keeps an inline property added while running, and one the author removed stays removed (removeOpszStepper)', async () => {
		stubComputedFromInline()
		const fire = stubRO()
		const el = document.createElement('p')
		el.style.fontSize = '12px'
		el.style.color = 'red'
		document.body.appendChild(el)

		startOpszStepper(el, { cuts: CUTS })
		el.style.removeProperty('color')
		el.style.letterSpacing = '1px'
		el.style.fontSize = '40px'
		fire(); await Promise.resolve()
		expect(el.style.fontFamily).toBe('Text')

		removeOpszStepper(el)
		expect(el.style.color).toBe('')
		expect(el.style.letterSpacing).toBe('1px')
		expect(el.style.fontSize).toBe('40px')
		expect(el.style.fontFamily).toBe('')
	})

	it('still restores the style attribute exactly when nothing else changed it', async () => {
		stubComputedFromInline()
		const fire = stubRO()
		const el = document.createElement('p')
		el.setAttribute('style', 'font-size:12px;  color: red')
		document.body.appendChild(el)
		const bare = document.createElement('p')
		document.body.appendChild(bare)

		const stop = startOpszStepper(el, { cuts: CUTS })
		const stopBare = startOpszStepper(bare, { cuts: CUTS })
		fire(); await Promise.resolve()
		stop(); stopBare()
		expect(el.getAttribute('style')).toBe('font-size:12px;  color: red')
		expect(bare.hasAttribute('style')).toBe(false)
	})
})
