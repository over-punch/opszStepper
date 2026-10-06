// opszStepper/src/__tests__/adjust.test.ts — core algorithm tests
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { applyOpszStepper, removeOpszStepper, startOpszStepper } from '../core/adjust'
import type { OpszStepperCut, OpszStepperOptions } from '../core/types'

// ─── Test helpers ─────────────────────────────────────────────────────────────

/** Sample optical cuts used across multiple tests */
const SAMPLE_CUTS: OpszStepperCut[] = [
	{ family: 'Halyard Micro, sans-serif', maxSize: 13 },
	{ family: 'Halyard Text, sans-serif', minSize: 13, maxSize: 28 },
	{ family: 'Halyard Display, sans-serif', minSize: 28 },
]

/** Stub getComputedStyle to return a specific fontSize string */
function stubFontSize(px: number): void {
	vi.stubGlobal('getComputedStyle', (_el: Element) => ({
		fontSize: `${px}px`,
	}))
}

/** Create a bare HTMLElement for testing */
function makeElement(): HTMLElement {
	const el = document.createElement('p')
	document.body.appendChild(el)
	return el
}

/**
 * Return the DOM-normalised form of a fontFamily string.
 * happy-dom (and real browsers) wrap multi-word family names in quotes when
 * serialising el.style.fontFamily, so "Halyard Text, sans-serif" becomes
 * '"Halyard Text", sans-serif'. This helper lets tests compare against what
 * the DOM will actually produce rather than the raw assignment string.
 */
function normFontFamily(family: string): string {
	const probe = document.createElement('span')
	probe.style.fontFamily = family
	return probe.style.fontFamily
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('opszStepper', () => {
	beforeEach(() => {
		document.body.innerHTML = ''
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	// 1. applyOpszStepper applies the correct cut for a font-size in Text range
	it('applyOpszStepper applies the Text cut when font-size is 20px', () => {
		stubFontSize(20)
		const el = makeElement()
		const options: OpszStepperOptions = { cuts: SAMPLE_CUTS }
		applyOpszStepper(el, options)
		expect(el.style.fontFamily).toBe(normFontFamily('Halyard Text, sans-serif'))
	})

	// 2. applyOpszStepper applies the Micro cut when font-size is below 13px
	it('applyOpszStepper applies the Micro cut when font-size is 10px', () => {
		stubFontSize(10)
		const el = makeElement()
		applyOpszStepper(el, { cuts: SAMPLE_CUTS })
		expect(el.style.fontFamily).toBe(normFontFamily('Halyard Micro, sans-serif'))
	})

	// 3. applyOpszStepper applies the Display cut when font-size is 32px
	it('applyOpszStepper applies the Display cut when font-size is 32px', () => {
		stubFontSize(32)
		const el = makeElement()
		applyOpszStepper(el, { cuts: SAMPLE_CUTS })
		expect(el.style.fontFamily).toBe(normFontFamily('Halyard Display, sans-serif'))
	})

	// 4. applyOpszStepper is a no-op if cuts array is empty
	it('applyOpszStepper is a no-op when cuts is empty', () => {
		stubFontSize(20)
		const el = makeElement()
		el.style.fontFamily = 'Original Family, serif'
		const expected = normFontFamily('Original Family, serif')
		applyOpszStepper(el, { cuts: [] })
		expect(el.style.fontFamily).toBe(expected)
	})

	// 5. applyOpszStepper uses Infinity/0 defaults for missing minSize/maxSize
	it('applyOpszStepper handles cuts with missing minSize (defaults to 0)', () => {
		stubFontSize(5)
		const el = makeElement()
		// Only one cut with no minSize — should match any size >= 0
		applyOpszStepper(el, { cuts: [{ family: 'Micro Cut, sans-serif', maxSize: 13 }] })
		expect(el.style.fontFamily).toBe(normFontFamily('Micro Cut, sans-serif'))
	})

	it('applyOpszStepper handles cuts with missing maxSize (defaults to Infinity)', () => {
		stubFontSize(999)
		const el = makeElement()
		// Only one cut with no maxSize — should match any large size
		applyOpszStepper(el, { cuts: [{ family: 'Display Cut, serif', minSize: 28 }] })
		expect(el.style.fontFamily).toBe(normFontFamily('Display Cut, serif'))
	})

	// 6. removeOpszStepper restores original fontFamily
	it('removeOpszStepper restores the original fontFamily after applyOpszStepper', () => {
		stubFontSize(20)
		const el = makeElement()
		el.style.fontFamily = 'My Original Font, serif'
		const originalNorm = normFontFamily('My Original Font, serif')
		applyOpszStepper(el, { cuts: SAMPLE_CUTS })
		expect(el.style.fontFamily).toBe(normFontFamily('Halyard Text, sans-serif'))
		removeOpszStepper(el)
		expect(el.style.fontFamily).toBe(originalNorm)
	})

	// 7. removeOpszStepper is a no-op if never applied
	it('removeOpszStepper does not throw if called on an untouched element', () => {
		const el = makeElement()
		el.style.fontFamily = 'Untouched Font, serif'
		const expected = normFontFamily('Untouched Font, serif')
		expect(() => removeOpszStepper(el)).not.toThrow()
		// fontFamily should remain unchanged
		expect(el.style.fontFamily).toBe(expected)
	})

	// 8. startOpszStepper returns a function (the stop function)
	it('startOpszStepper returns a function', () => {
		stubFontSize(20)
		const el = makeElement()
		const stop = startOpszStepper(el, { cuts: SAMPLE_CUTS })
		expect(typeof stop).toBe('function')
		stop()
	})

	// 9. Stop function restores original fontFamily
	it('stop function from startOpszStepper restores original fontFamily', () => {
		stubFontSize(20)
		const el = makeElement()
		el.style.fontFamily = 'Original Font, serif'
		const originalNorm = normFontFamily('Original Font, serif')
		const stop = startOpszStepper(el, { cuts: SAMPLE_CUTS })
		expect(el.style.fontFamily).toBe(normFontFamily('Halyard Text, sans-serif'))
		stop()
		expect(el.style.fontFamily).toBe(originalNorm)
	})

	// 10. startOpszStepper applies the correct cut immediately on call
	it('startOpszStepper applies the correct cut immediately', () => {
		stubFontSize(32)
		const el = makeElement()
		const stop = startOpszStepper(el, { cuts: SAMPLE_CUTS })
		expect(el.style.fontFamily).toBe(normFontFamily('Halyard Display, sans-serif'))
		stop()
	})

	// 11. onCutChange callback is called when cut is applied
	it('applyOpszStepper calls onCutChange with the applied cut', () => {
		stubFontSize(20)
		const el = makeElement()
		const onCutChange = vi.fn()
		applyOpszStepper(el, { cuts: SAMPLE_CUTS, onCutChange })
		expect(onCutChange).toHaveBeenCalledOnce()
		expect(onCutChange).toHaveBeenCalledWith(SAMPLE_CUTS[1])
	})

	// 12. SSR guard: applyOpszStepper returns without error when window is undefined
	it('applyOpszStepper is a no-op in SSR (no window)', () => {
		const original = globalThis.window
		// @ts-expect-error — intentionally removing window to simulate SSR
		delete globalThis.window
		const el = makeElement()
		expect(() => applyOpszStepper(el, { cuts: SAMPLE_CUTS })).not.toThrow()
		globalThis.window = original
	})

	// 13. Boundary: font-size exactly at minSize is inclusive (belongs to that cut)
	it('font-size exactly at minSize boundary is assigned to the correct cut', () => {
		// minSize: 13 is inclusive — 13px should be Text, not Micro
		stubFontSize(13)
		const el = makeElement()
		applyOpszStepper(el, { cuts: SAMPLE_CUTS })
		expect(el.style.fontFamily).toBe(normFontFamily('Halyard Text, sans-serif'))
	})

	// 14. Boundary: font-size exactly at maxSize is exclusive (belongs to the next cut)
	it('font-size exactly at maxSize boundary belongs to the next cut (exclusive)', () => {
		// maxSize: 28 is exclusive — 28px should be Display, not Text
		stubFontSize(28)
		const el = makeElement()
		applyOpszStepper(el, { cuts: SAMPLE_CUTS })
		expect(el.style.fontFamily).toBe(normFontFamily('Halyard Display, sans-serif'))
	})

	// 15. Hysteresis: moving UP — font-size barely past boundary does not trigger switch
	it('hysteresis holds cut when moving up but not past threshold', async () => {
		// Start in Text cut (20px). Boundary to Display is at minSize=28.
		// With hysteresis=2, need fontSize > 28+2=30 to switch to Display.
		stubFontSize(20)
		const el = makeElement()

		let roCallback: ResizeObserverCallback | null = null
		vi.stubGlobal('ResizeObserver', class {
			constructor(cb: ResizeObserverCallback) { roCallback = cb }
			observe() {}
			disconnect() {}
		})

		const stop = startOpszStepper(el, { cuts: SAMPLE_CUTS, hysteresis: 2 })
		expect(el.style.fontFamily).toBe(normFontFamily('Halyard Text, sans-serif'))

		// Move to 29px — raw index is Display, but only 1px past boundary; threshold is 30
		stubFontSize(29)
		roCallback!([{ contentRect: { width: 100 } } as ResizeObserverEntry], null as unknown as ResizeObserver)
		await Promise.resolve() // the check runs in a batched microtask

		// Should still be Text — not past the hysteresis threshold
		expect(el.style.fontFamily).toBe(normFontFamily('Halyard Text, sans-serif'))
		stop()
	})

	// 16. Hysteresis: moving UP — font-size clearly past threshold triggers switch
	it('hysteresis switches cut when moving up past threshold', async () => {
		// Start in Text cut (20px). With hysteresis=2, need > 30px to switch to Display.
		stubFontSize(20)
		const el = makeElement()

		let roCallback: ResizeObserverCallback | null = null
		vi.stubGlobal('ResizeObserver', class {
			constructor(cb: ResizeObserverCallback) { roCallback = cb }
			observe() {}
			disconnect() {}
		})

		const stop = startOpszStepper(el, { cuts: SAMPLE_CUTS, hysteresis: 2 })
		expect(el.style.fontFamily).toBe(normFontFamily('Halyard Text, sans-serif'))

		// Move to 31px — clearly past the 30px threshold
		stubFontSize(31)
		roCallback!([{ contentRect: { width: 100 } } as ResizeObserverEntry], null as unknown as ResizeObserver)
		await Promise.resolve() // the check runs in a batched microtask

		expect(el.style.fontFamily).toBe(normFontFamily('Halyard Display, sans-serif'))
		stop()
	})

	// 17. Hysteresis: moving DOWN — font-size barely below boundary does not trigger switch
	it('hysteresis holds cut when moving down but not past threshold', async () => {
		// Start in Display cut (32px). Current cut minSize=28. With hysteresis=2,
		// need fontSize < 28-2=26 to switch down to Text.
		stubFontSize(32)
		const el = makeElement()

		let roCallback: ResizeObserverCallback | null = null
		vi.stubGlobal('ResizeObserver', class {
			constructor(cb: ResizeObserverCallback) { roCallback = cb }
			observe() {}
			disconnect() {}
		})

		const stop = startOpszStepper(el, { cuts: SAMPLE_CUTS, hysteresis: 2 })
		expect(el.style.fontFamily).toBe(normFontFamily('Halyard Display, sans-serif'))

		// Move to 27px — raw index is Text, but 27 < 26 is false; threshold is 26
		stubFontSize(27)
		roCallback!([{ contentRect: { width: 100 } } as ResizeObserverEntry], null as unknown as ResizeObserver)
		await Promise.resolve() // the check runs in a batched microtask

		// Should still be Display — not past the downward hysteresis threshold
		expect(el.style.fontFamily).toBe(normFontFamily('Halyard Display, sans-serif'))
		stop()
	})

	// 18. Hysteresis: moving DOWN — font-size clearly past threshold triggers switch
	it('hysteresis switches cut when moving down past threshold', async () => {
		// Start in Display cut (32px). Current cut minSize=28. With hysteresis=2,
		// need fontSize < 26 to switch down to Text.
		stubFontSize(32)
		const el = makeElement()

		let roCallback: ResizeObserverCallback | null = null
		vi.stubGlobal('ResizeObserver', class {
			constructor(cb: ResizeObserverCallback) { roCallback = cb }
			observe() {}
			disconnect() {}
		})

		const stop = startOpszStepper(el, { cuts: SAMPLE_CUTS, hysteresis: 2 })
		expect(el.style.fontFamily).toBe(normFontFamily('Halyard Display, sans-serif'))

		// Move to 25px — clearly past the 26px downward threshold
		stubFontSize(25)
		roCallback!([{ contentRect: { width: 100 } } as ResizeObserverEntry], null as unknown as ResizeObserver)
		await Promise.resolve() // the check runs in a batched microtask

		expect(el.style.fontFamily).toBe(normFontFamily('Halyard Text, sans-serif'))
		stop()
	})

	// 19. removeOpszStepper via stopFnMap path (startOpszStepper users)
	it('removeOpszStepper disconnects the ResizeObserver and restores fontFamily', () => {
		stubFontSize(20)
		const el = makeElement()
		el.style.fontFamily = 'Original Font, serif'
		const originalNorm = normFontFamily('Original Font, serif')

		let disconnected = false
		vi.stubGlobal('ResizeObserver', class {
			constructor(_cb: ResizeObserverCallback) {}
			observe() {}
			disconnect() { disconnected = true }
		})

		startOpszStepper(el, { cuts: SAMPLE_CUTS })
		expect(el.style.fontFamily).toBe(normFontFamily('Halyard Text, sans-serif'))

		removeOpszStepper(el)

		expect(el.style.fontFamily).toBe(originalNorm)
		expect(disconnected).toBe(true)
	})

	// 20. startOpszStepper onCutChange fires on initial apply
	it('startOpszStepper calls onCutChange with the initial cut', () => {
		stubFontSize(32)
		const el = makeElement()

		vi.stubGlobal('ResizeObserver', class {
			constructor(_cb: ResizeObserverCallback) {}
			observe() {}
			disconnect() {}
		})

		const onCutChange = vi.fn()
		const stop = startOpszStepper(el, { cuts: SAMPLE_CUTS, onCutChange })
		expect(onCutChange).toHaveBeenCalledOnce()
		expect(onCutChange).toHaveBeenCalledWith(SAMPLE_CUTS[2])
		stop()
	})

	// 21. startOpszStepper onCutChange fires when ResizeObserver triggers a cut switch
	it('startOpszStepper calls onCutChange when ResizeObserver triggers cut switch', async () => {
		stubFontSize(20)
		const el = makeElement()

		let roCallback: ResizeObserverCallback | null = null
		vi.stubGlobal('ResizeObserver', class {
			constructor(cb: ResizeObserverCallback) { roCallback = cb }
			observe() {}
			disconnect() {}
		})

		const onCutChange = vi.fn()
		const stop = startOpszStepper(el, { cuts: SAMPLE_CUTS, onCutChange })
		onCutChange.mockClear()

		// Move to 32px — should switch to Display and fire onCutChange
		stubFontSize(32)
		roCallback!([{ contentRect: { width: 100 } } as ResizeObserverEntry], null as unknown as ResizeObserver)
		await Promise.resolve() // the check runs in a batched microtask

		expect(onCutChange).toHaveBeenCalledOnce()
		expect(onCutChange).toHaveBeenCalledWith(SAMPLE_CUTS[2])
		stop()
	})

	// 22. startOpszStepper SSR guard returns a no-op stop function
	it('startOpszStepper is a no-op in SSR (no window)', () => {
		const original = globalThis.window
		// @ts-expect-error — intentionally removing window to simulate SSR
		delete globalThis.window
		const el = makeElement()
		const stop = startOpszStepper(el, { cuts: SAMPLE_CUTS })
		expect(typeof stop).toBe('function')
		expect(() => stop()).not.toThrow()
		globalThis.window = original
	})

	// 23. startOpszStepper called twice on same element — second call stops first observer
	it('calling startOpszStepper twice stops the first observer before creating a new one', () => {
		stubFontSize(20)
		const el = makeElement()

		let disconnectCount = 0
		vi.stubGlobal('ResizeObserver', class {
			constructor(_cb: ResizeObserverCallback) {}
			observe() {}
			disconnect() { disconnectCount++ }
		})

		const stop1 = startOpszStepper(el, { cuts: SAMPLE_CUTS })
		// Second call should stop the first observer internally before creating a new one
		const stop2 = startOpszStepper(el, { cuts: SAMPLE_CUTS })

		// The first observer should have been disconnected by the second call
		expect(disconnectCount).toBe(1)

		stop2()
		// Now the second observer is also disconnected
		expect(disconnectCount).toBe(2)
		// stop1 is now a no-op (its observer was already disconnected)
		expect(() => stop1()).not.toThrow()
	})

	// 24. NaN guard: applyOpszStepper is a no-op when fontSize is NaN (detached element)
	it('applyOpszStepper is a no-op when getComputedStyle returns empty string for fontSize', () => {
		vi.stubGlobal('getComputedStyle', (_el: Element) => ({ fontSize: '' }))
		const el = makeElement()
		el.style.fontFamily = 'Original Font, serif'
		const originalNorm = normFontFamily('Original Font, serif')
		applyOpszStepper(el, { cuts: SAMPLE_CUTS })
		// fontFamily should be unchanged — NaN guard kicked in
		expect(el.style.fontFamily).toBe(originalNorm)
	})

	// 25. opszValue: applyCut writes font-variation-settings when cut has opszValue
	it('applyOpszStepper writes font-variation-settings when cut has opszValue', () => {
		stubFontSize(20)
		const el = makeElement()
		const cutsWithOpsz = [
			{ family: 'Fraunces, serif', maxSize: 13, opszValue: 9, opszMin: 9, opszMax: 144 },
			{ family: 'Fraunces, serif', minSize: 13, maxSize: 28, opszValue: 24, opszMin: 9, opszMax: 144 },
			{ family: 'Fraunces, serif', minSize: 28, opszValue: 72, opszMin: 9, opszMax: 144 },
		]
		applyOpszStepper(el, { cuts: cutsWithOpsz })
		// 20px matches cut index 1 — opszValue 24, clamped to [9,144]
		expect(el.style.fontVariationSettings).toBe('"opsz" 24')
	})

	// 26. opszValue: clamping is applied against opszMin/opszMax
	it('applyOpszStepper clamps opszValue to opszMin/opszMax', () => {
		stubFontSize(5)
		const el = makeElement()
		// opszValue is below opszMin — should be clamped up to 9
		const cutsWithOpsz = [
			{ family: 'Fraunces, serif', maxSize: 13, opszValue: 1, opszMin: 9, opszMax: 144 },
		]
		applyOpszStepper(el, { cuts: cutsWithOpsz })
		expect(el.style.fontVariationSettings).toBe('"opsz" 9')
	})
})
