// opszStepper/src/webflow/embed.ts — zero-config browser bundle for Webflow Custom Code Embed.
// Auto-initialises opszStepper on any element marked with [data-opszstepper], reading its optical
// cuts from data-* attributes, and exposes a small window.OpszStepper API for manual control.
import { startOpszStepper, removeOpszStepper } from '../core/adjust'
import type { OpszStepperOptions, OpszStepperCut, OpszStepperStop } from '../core/types'

/** Attribute that opts an element in to the optical-cut hot-swap. */
const OPT_IN_ATTR = 'data-opszstepper'

/** Per-element teardown record so destroy() can stop the observer and restore styles. */
interface Instance {
	/** Stop function returned by startOpszStepper — disconnects the observer and restores font-family. */
	stop: OpszStepperStop
}

/** Tracks live instances keyed by their element — WeakMap so removed nodes are GC'd. */
const INSTANCES = new WeakMap<HTMLElement, Instance>()

/**
 * Parse the compact opsz shorthand string into cut objects.
 * Each comma-separated segment is `min-max:opszValue`, where an empty bound means
 * 0 (min) or Infinity (max). All cuts share the single `family` and the optional
 * clamp bounds `opszMin` / `opszMax`.
 *
 * @example "0-13:9, 13-28:24, 28-:72"  →  three cuts on one variable font
 *
 * @param spec     - The raw data-os-opsz value
 * @param family   - Single variable-font family applied to every cut
 * @param opszMin  - Optional lower clamp for the opsz axis (fvar bound)
 * @param opszMax  - Optional upper clamp for the opsz axis (fvar bound)
 * @returns          Parsed cuts, or an empty array if nothing valid was found
 */
function parseOpszShorthand(spec: string, family: string, opszMin?: number, opszMax?: number): OpszStepperCut[] {
	const cuts: OpszStepperCut[] = []
	for (const raw of spec.split(',')) {
		const segment = raw.trim()
		if (!segment) continue
		const [range, valuePart] = segment.split(':')
		if (valuePart === undefined) continue
		const opszValue = parseFloat(valuePart.trim())
		if (isNaN(opszValue)) continue
		const [minPart, maxPart] = range.split('-')
		const min = parseFloat((minPart ?? '').trim())
		const max = parseFloat((maxPart ?? '').trim())
		const cut: OpszStepperCut = { family, opszValue }
		if (!isNaN(min)) cut.minSize = min
		if (!isNaN(max)) cut.maxSize = max
		if (opszMin !== undefined) cut.opszMin = opszMin
		if (opszMax !== undefined) cut.opszMax = opszMax
		cuts.push(cut)
	}
	return cuts
}

/**
 * Sanitise a parsed JSON cuts array into well-typed OpszStepperCut objects.
 * Drops entries without a string `family`; coerces the numeric bounds where present.
 *
 * @param input - The value parsed from data-os-cuts (expected to be an array)
 * @returns       Cleaned cuts, or an empty array if the input was not a usable array
 */
function sanitiseJsonCuts(input: unknown): OpszStepperCut[] {
	if (!Array.isArray(input)) return []
	const cuts: OpszStepperCut[] = []
	for (const entry of input) {
		if (!entry || typeof entry !== 'object') continue
		const e = entry as Record<string, unknown>
		if (typeof e.family !== 'string') continue
		const cut: OpszStepperCut = { family: e.family }
		if (typeof e.minSize === 'number') cut.minSize = e.minSize
		if (typeof e.maxSize === 'number') cut.maxSize = e.maxSize
		if (typeof e.opszValue === 'number') cut.opszValue = e.opszValue
		if (typeof e.opszMin === 'number') cut.opszMin = e.opszMin
		if (typeof e.opszMax === 'number') cut.opszMax = e.opszMax
		cuts.push(cut)
	}
	return cuts
}

/**
 * Read opszStepper options from an element's data-* attributes.
 * Cuts can be supplied either as a full JSON array or via the opsz shorthand.
 * Unset attributes fall through to the library defaults.
 *
 * Supported attributes:
 *   data-os-cuts        — JSON array of cut objects (full control):
 *                         [{ "family": "Fraunces, serif", "maxSize": 13, "opszValue": 9 }, …]
 *   data-os-family      — single variable-font family, used with data-os-opsz shorthand
 *   data-os-opsz        — shorthand cut list "min-max:opszValue, …" (needs data-os-family)
 *   data-os-opsz-min    — lower opsz clamp applied to every shorthand cut
 *   data-os-opsz-max    — upper opsz clamp applied to every shorthand cut
 *   data-os-hysteresis  — dead-zone in px to prevent oscillation at cut boundaries
 *
 * @param el - The opted-in element
 * @returns    Options with a resolved cuts array (possibly empty if none were valid)
 */
function readOptions(el: HTMLElement): OpszStepperOptions {
	const d = el.dataset
	let cuts: OpszStepperCut[] = []

	// Preferred: full JSON cut list.
	if (d.osCuts) {
		try {
			cuts = sanitiseJsonCuts(JSON.parse(d.osCuts))
		} catch {
			console.error('OpszStepper: data-os-cuts is not valid JSON — ignoring.')
		}
	}

	// Fallback: opsz shorthand on a single variable font.
	if (cuts.length === 0 && d.osFamily && d.osOpsz) {
		const opszMin = d.osOpszMin !== undefined ? parseFloat(d.osOpszMin) : undefined
		const opszMax = d.osOpszMax !== undefined ? parseFloat(d.osOpszMax) : undefined
		cuts = parseOpszShorthand(
			d.osOpsz,
			d.osFamily,
			opszMin !== undefined && !isNaN(opszMin) ? opszMin : undefined,
			opszMax !== undefined && !isNaN(opszMax) ? opszMax : undefined,
		)
	}

	const options: OpszStepperOptions = { cuts }

	if (d.osHysteresis !== undefined) {
		const n = parseFloat(d.osHysteresis)
		if (!isNaN(n)) options.hysteresis = n
	}

	return options
}

/**
 * Initialise a single element: read its cuts, apply the correct optical cut, and
 * attach the ResizeObserver that keeps it correct as the layout changes.
 * Idempotent — re-initialising an element tears down the previous instance first.
 *
 * @param el - Element to manage
 */
function initElement(el: HTMLElement): void {
	// Tear down any previous run so re-init doesn't stack observers.
	destroy(el)

	const options = readOptions(el)
	// No usable cuts means nothing to swap — leave the element untouched.
	if (options.cuts.length === 0) {
		console.warn('OpszStepper: no valid cuts found on element — skipping.')
		return
	}

	const stop = startOpszStepper(el, options)
	INSTANCES.set(el, { stop })
}

/**
 * Stop the observer and restore a single element if it has a live instance.
 *
 * @param el - Element previously initialised
 */
function destroy(el: HTMLElement): void {
	const inst = INSTANCES.get(el)
	if (!inst) {
		// Also cover elements touched by the core outside this WeakMap.
		removeOpszStepper(el)
		return
	}
	inst.stop()
	INSTANCES.delete(el)
}

/**
 * Scan a root for opted-in elements and initialise each one.
 *
 * @param root - Element or document to search (default: document)
 */
function init(root: ParentNode = document): void {
	root.querySelectorAll<HTMLElement>(`[${OPT_IN_ATTR}]`).forEach(initElement)
}

/**
 * Re-read attributes and re-initialise every opted-in element under a root.
 * Useful after dynamically editing data-os-* attributes at runtime.
 * initElement is idempotent, so this cleanly replaces any live instances.
 *
 * @param root - Element or document to search (default: document)
 */
function restart(root: ParentNode = document): void {
	init(root)
}

/**
 * Auto-initialise once the DOM is parsed and web fonts have loaded.
 * Fonts must settle first: the active cut is chosen from the element's computed
 * font-size, and swapping in a web font (or an opsz-carrying variable font)
 * changes final metrics — so we wait for document.fonts.ready before applying.
 */
function autoInit(): void {
	const run = () => {
		if (document.fonts?.ready) {
			document.fonts.ready.then(() => init()).catch(() => init())
		} else {
			init()
		}
	}
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', run, { once: true })
	} else {
		run()
	}
}

autoInit()

// Public browser API — assigned to window.OpszStepper via the IIFE global name.
export { init, destroy, restart }
