// opszStepper/src/__tests__/review-fixes.test.ts — regression tests for the 2026-10 review: cut order, hysteresis, axes, restore, stale stops.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { applyOpszStepper, removeOpszStepper, startOpszStepper } from '../core/adjust'
import type { OpszStepperCut } from '../core/types'

/** Stub getComputedStyle with a font-size and (optionally) a computed font-variation-settings. */
function stubComputed(px: number, fvs = 'normal'): void {
	vi.stubGlobal('getComputedStyle', () => ({
		fontSize: `${px}px`,
		getPropertyValue: (p: string) => (p === 'font-variation-settings' ? fvs : ''),
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

/** A paragraph in the document. */
function make(): HTMLElement {
	const el = document.createElement('p')
	document.body.appendChild(el)
	return el
}

const A = { family: 'A' }, B = { family: 'B' }, C = { family: 'C' }

beforeEach(() => { document.body.innerHTML = ''; vi.spyOn(console, 'warn').mockImplementation(() => {}) })
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('cut order and bounds', () => {
	it('picks the right cut from a list given in descending order', () => {
		const cuts: OpszStepperCut[] = [{ ...C, minSize: 28 }, { ...B, minSize: 13, maxSize: 28 }, { ...A, maxSize: 13 }]
		const el = make()
		stubComputed(40)
		applyOpszStepper(el, { cuts })
		expect(el.style.fontFamily).toBe('C')
	})

	it('steps back down through cuts given only as maxSize values', async () => {
		const cuts: OpszStepperCut[] = [{ ...A, maxSize: 13 }, { ...B, maxSize: 28 }, { ...C }]
		const fire = stubRO()
		const el = make()
		stubComputed(40)
		const stop = startOpszStepper(el, { cuts })
		expect(el.style.fontFamily).toBe('C')
		stubComputed(20); fire(); await Promise.resolve()
		expect(el.style.fontFamily).toBe('B')
		stubComputed(10); fire(); await Promise.resolve()
		expect(el.style.fontFamily).toBe('A')
		stop()
	})
})

describe('axes and restore', () => {
	it('opsz mode keeps the other axes', () => {
		const el = make()
		stubComputed(40, '"wght" 800')
		applyOpszStepper(el, { cuts: [{ family: 'RF', opszValue: 144 }] })
		expect(el.style.fontVariationSettings).toContain('"wght" 800')
		expect(el.style.fontVariationSettings).toContain('"opsz" 144')
	})

	it("family mode leaves the author's font-variation-settings alone, and remove restores the style attribute exactly", () => {
		const el = make()
		el.setAttribute('style', 'font-variation-settings: "wght" 800; font-family: Georgia')
		const before = el.getAttribute('style')
		stubComputed(40)
		applyOpszStepper(el, { cuts: [C] })
		expect(el.style.fontVariationSettings).toBe('"wght" 800')
		removeOpszStepper(el)
		expect(el.getAttribute('style')).toBe(before)
	})

	it('leaves no style attribute on an element that had none', () => {
		const el = make()
		stubComputed(40)
		applyOpszStepper(el, { cuts: [C] })
		removeOpszStepper(el)
		expect(el.hasAttribute('style')).toBe(false)
	})
})

describe('handles and callbacks', () => {
	it('a stale stop handle does nothing', () => {
		stubRO()
		const el = make()
		el.style.fontFamily = 'Georgia'
		stubComputed(40)
		const s1 = startOpszStepper(el, { cuts: [C] })
		startOpszStepper(el, { cuts: [B] })
		s1()
		expect(el.style.fontFamily).toBe('B')
		removeOpszStepper(el)
		expect(el.style.fontFamily).toBe('Georgia')
	})

	it('onCutChange fires only when the cut changes', () => {
		const el = make()
		stubComputed(40)
		const onCutChange = vi.fn()
		applyOpszStepper(el, { cuts: [C], onCutChange })
		applyOpszStepper(el, { cuts: [C], onCutChange })
		expect(onCutChange).toHaveBeenCalledTimes(1)
	})
})
