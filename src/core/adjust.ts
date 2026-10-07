// opszStepper/src/core/adjust.ts — framework-agnostic optical-cut hot-swap algorithm
import type { OpszStepperCut, OpszStepperOptions, OpszStepperStop } from './types'

// ─── Defaults ─────────────────────────────────────────────────────────────────

/** Default hysteresis dead zone in px */
const DEFAULT_HYSTERESIS = 1

// ─── Cuts ─────────────────────────────────────────────────────────────────────

/** A cut with resolved [min, max) bounds in px, plus the cut the caller passed (for onCutChange). */
interface ResolvedCut {
	min: number
	max: number
	cut: OpszStepperCut
}

/**
 * Sort cuts by size and fill in missing bounds, so the order they're listed in doesn't matter
 * and a list given only as maxSize values ([{ maxSize: 13 }, { maxSize: 28 }, {}]) works:
 * a missing minSize starts where the previous cut ends, a missing maxSize ends where the next
 * begins (or at Infinity).
 */
function resolveCuts(cuts: OpszStepperCut[]): ResolvedCut[] {
	const valid = cuts.filter((c) => c && typeof c.family === 'string')
	const key = (c: OpszStepperCut) => (Number.isFinite(c.minSize) ? (c.minSize as number) : Number.isFinite(c.maxSize) ? (c.maxSize as number) - 1e-9 : Infinity)
	const sorted = [...valid].sort((a, b) => key(a) - key(b))
	const resolved: ResolvedCut[] = sorted.map((cut, i) => {
		const prev = sorted[i - 1]
		const min = Number.isFinite(cut.minSize) ? (cut.minSize as number) : prev && Number.isFinite(prev.maxSize) ? (prev.maxSize as number) : 0
		return { min, max: Number.isFinite(cut.maxSize) ? (cut.maxSize as number) : Infinity, cut }
	})
	// A missing maxSize ends where the next cut begins.
	for (let i = 0; i < resolved.length - 1; i++) {
		if (resolved[i].max === Infinity) resolved[i].max = resolved[i + 1].min
	}
	return resolved
}

/** Index of the cut whose [min, max) range contains fontSize, or -1. */
function findCutIndex(cuts: ResolvedCut[], fontSize: number): number {
	for (let i = 0; i < cuts.length; i++) {
		if (fontSize >= cuts[i].min && fontSize < cuts[i].max) return i
	}
	return -1
}

/**
 * Hysteresis: the current cut is kept until the font-size leaves it by more than the dead zone
 * (at or above its max + h, or below its min − h); then the cut for the new size is used. This
 * prevents oscillation at a boundary, and is the same at every boundary whatever the cut order.
 */
function resolveHysteresisCutIndex(cuts: ResolvedCut[], fontSize: number, currentIndex: number, hysteresis: number): number {
	const rawIndex = findCutIndex(cuts, fontSize)
	if (currentIndex === -1 || !cuts[currentIndex]) return rawIndex
	if (rawIndex === -1 || rawIndex === currentIndex) return currentIndex
	const cur = cuts[currentIndex]
	const left = fontSize >= cur.max + hysteresis || fontSize < cur.min - hysteresis
	return left ? rawIndex : currentIndex
}

/** Warnings already printed. */
const warned = new Set<string>()

/** Prints a console warning the first time it is seen. */
function warnOnce(message: string): void {
	if (warned.has(message)) return
	warned.add(message)
	console.warn(message)
}

/**
 * A usable hysteresis: finite and non-negative, and at most half the narrowest cut, so the dead
 * zone can't swallow a whole cut.
 */
function resolveHysteresis(raw: number | undefined, cuts: ResolvedCut[]): number {
	let h = raw ?? DEFAULT_HYSTERESIS
	if (!Number.isFinite(h) || h < 0) {
		warnOnce(`[opszStepper] hysteresis must be a non-negative number; got ${raw}, using ${DEFAULT_HYSTERESIS}`)
		h = DEFAULT_HYSTERESIS
	}
	const narrowest = Math.min(...cuts.map((c) => c.max - c.min).filter((w) => Number.isFinite(w) && w > 0))
	if (Number.isFinite(narrowest) && h > narrowest / 2) {
		warnOnce(`[opszStepper] hysteresis ${h}px is more than half the narrowest cut (${narrowest}px); using ${narrowest / 2}px`)
		h = narrowest / 2
	}
	return h
}

// ─── Per-element state ────────────────────────────────────────────────────────

/** An inline property value with its priority, so `!important` survives a restore. */
interface InlineValue { value: string; priority: string }

/** Everything opszStepper knows about an element it manages. */
interface ElementState {
	cuts: ResolvedCut[]
	hysteresis: number
	onCutChange?: (cut: OpszStepperCut) => void
	activeIndex: number
	/** Original inline font-family and font-variation-settings, and the whole style attribute. */
	origFamily: InlineValue
	origFVS: InlineValue
	origStyleAttr: string | null
	/** Computed font-variation-settings without opszStepper's own value: opsz is merged into this. */
	baseFVS: string
	/** Values opszStepper last wrote, to tell its own writes from the author's later changes. */
	writtenFVS: string | null
	writtenStyleAttr: string | null
	/**
	 * True once something other than opszStepper has changed the style attribute since the first
	 * write (the author set a new inline font-size, React re-rendered a style prop). From then on
	 * origStyleAttr is out of date, so a restore undoes only opszStepper's own properties.
	 */
	styleAttrChanged: boolean
	/** Whether a live watcher (startOpszStepper) is attached. */
	live: boolean
	stop?: OpszStepperStop
	/** The ResizeObserver watching this element and its parent (the shared one when it started). */
	ro?: ResizeObserver
	/** The parent observed for this element (for container-query and fixed-size parents). */
	observedParent?: HTMLElement | null
}

/** State for every element opszStepper has touched. */
const states = new Map<HTMLElement, ElementState>()

/** Reads an inline property with its priority. */
function readInline(el: HTMLElement, prop: string): InlineValue {
	return { value: el.style.getPropertyValue(prop), priority: el.style.getPropertyPriority(prop) }
}

/** Writes (or removes) an inline property with its priority. */
function writeInline(el: HTMLElement, prop: string, v: InlineValue): void {
	if (v.value) el.style.setProperty(prop, v.value, v.priority)
	else el.style.removeProperty(prop)
}

/** Creates the state for an element on first touch (reads only, before any write). */
function ensureState(el: HTMLElement, options: OpszStepperOptions): ElementState {
	const cuts = resolveCuts(options.cuts)
	const hysteresis = resolveHysteresis(options.hysteresis, cuts)
	let s = states.get(el)
	if (!s) {
		s = {
			cuts, hysteresis, onCutChange: options.onCutChange, activeIndex: -1,
			origFamily: readInline(el, 'font-family'),
			origFVS: readInline(el, 'font-variation-settings'),
			origStyleAttr: el.getAttribute('style'),
			baseFVS: computedFVS(el),
			writtenFVS: null, writtenStyleAttr: null, styleAttrChanged: false, live: false,
		}
		states.set(el, s)
	} else {
		s.cuts = cuts
		s.hysteresis = hysteresis
		s.onCutChange = options.onCutChange
	}
	return s
}

/** The element's computed font-variation-settings ('normal' when unset or unavailable). */
function computedFVS(el: HTMLElement): string {
	const cs = getComputedStyle(el) as Partial<CSSStyleDeclaration>
	return (typeof cs.getPropertyValue === 'function' ? cs.getPropertyValue('font-variation-settings') : cs.fontVariationSettings) || 'normal'
}

/** Replaces or adds the opsz axis in a font-variation-settings string, keeping every other axis. */
function withOpsz(base: string, value: number): string {
	const entry = `"opsz" ${value}`
	if (!base || base === 'normal') return entry
	const re = /(["'])opsz\1\s+-?[\d.eE+-]+/
	return re.test(base) ? base.replace(re, entry) : `${base}, ${entry}`
}

/**
 * Writes a cut. Family mode sets font-family only (and puts back the author's own axes if an
 * earlier opsz cut replaced them). Opsz mode merges `"opsz" N` into the element's axes.
 */
function writeCut(el: HTMLElement, s: ElementState, index: number): void {
	const cut = s.cuts[index].cut
	// The style attribute isn't what opszStepper last left there: someone else changed an inline
	// style (often the font-size that triggered this write), so the saved attribute is out of date.
	if (el.getAttribute('style') !== (s.writtenStyleAttr === null ? s.origStyleAttr : s.writtenStyleAttr)) s.styleAttrChanged = true
	// The author changed font-variation-settings since the last write: that's the new base.
	if (s.writtenFVS !== null && el.style.getPropertyValue('font-variation-settings') !== s.writtenFVS) {
		s.origFVS = readInline(el, 'font-variation-settings')
		s.baseFVS = computedFVS(el)
		s.writtenFVS = null
	}
	el.style.setProperty('font-family', cut.family, s.origFamily.priority)

	if (typeof cut.opszValue === 'number' && Number.isFinite(cut.opszValue)) {
		const min = Number.isFinite(cut.opszMin) ? (cut.opszMin as number) : -Infinity
		const max = Number.isFinite(cut.opszMax) ? (cut.opszMax as number) : Infinity
		const clamped = min <= max ? Math.min(max, Math.max(min, cut.opszValue)) : cut.opszValue
		const fvs = withOpsz(s.baseFVS, clamped)
		el.style.setProperty('font-variation-settings', fvs, s.origFVS.priority)
		s.writtenFVS = el.style.getPropertyValue('font-variation-settings')
	} else if (s.writtenFVS !== null) {
		writeInline(el, 'font-variation-settings', s.origFVS)
		s.writtenFVS = null
	}
	s.activeIndex = index
	s.writtenStyleAttr = el.getAttribute('style')
}

/** Restores an element's original inline styles and forgets it. */
function restore(el: HTMLElement): void {
	const s = states.get(el)
	if (!s) return
	if (s.writtenStyleAttr !== null && !s.styleAttrChanged && el.getAttribute('style') === s.writtenStyleAttr) {
		// Nothing else has changed the style attribute since the first write: put back exactly what was there.
		if (s.origStyleAttr === null) el.removeAttribute('style')
		else el.setAttribute('style', s.origStyleAttr)
	} else {
		// Other inline styles changed while opszStepper ran: undo only its own properties and keep the rest.
		writeInline(el, 'font-family', s.origFamily)
		if (s.writtenFVS !== null) writeInline(el, 'font-variation-settings', s.origFVS)
		if (s.origStyleAttr === null && !el.getAttribute('style')) el.removeAttribute('style')
	}
	states.delete(el)
}

// ─── Watching ─────────────────────────────────────────────────────────────────

/** Elements with a live watcher. */
const live = new Set<HTMLElement>()
/**
 * One ResizeObserver for every element: a frame's resizes arrive in a single callback, so they
 * cost a single check. (With one observer per element, each callback ran its own check — 3,000
 * elements meant 3,000 checks of 3,000 elements.) It is recreated if the global constructor
 * changes (test stubs).
 */
let resizeObserver: ResizeObserver | null = null
let resizeObserverCtor: unknown = null
/** How many live elements observe each parent, so a shared parent is unobserved only by the last. */
const parentCounts = new Map<HTMLElement, number>()
let mutationObserver: MutationObserver | null = null
let flushQueued = false

/**
 * Re-evaluates every live element: all font-sizes are read first, then the changed cuts are
 * written, so a resize with thousands of elements costs one style recalculation, not thousands.
 */
function flush(): void {
	flushQueued = false
	const updates: [HTMLElement, ElementState, number][] = []
	live.forEach((el) => {
		const s = states.get(el)
		if (!s || !el.isConnected) return
		const size = parseFloat(getComputedStyle(el).fontSize)
		if (!Number.isFinite(size)) return
		const next = resolveHysteresisCutIndex(s.cuts, size, s.activeIndex, s.hysteresis)
		if (next !== -1 && next !== s.activeIndex) updates.push([el, s, next])
	})
	for (const [el, s, next] of updates) {
		writeCut(el, s, next)
		s.onCutChange?.(s.cuts[next].cut)
	}
}

/** Queues one flush for this task (a microtask, so it lands before the next paint). */
function scheduleFlush(): void {
	if (flushQueued) return
	flushQueued = true
	queueMicrotask(flush)
}

/**
 * Starts the shared watchers. A font-size can change without the element's box changing size
 * (a fixed line-height, an inline span, a fixed-size box), so a ResizeObserver alone misses it:
 * class and style changes anywhere, and window resizes (vw units, media queries), trigger a check too.
 */
function ensureWatchers(): void {
	if (typeof MutationObserver !== 'undefined' && !mutationObserver && document.documentElement) {
		mutationObserver = new MutationObserver(scheduleFlush)
		mutationObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'lang', 'dir'], subtree: true })
		window.addEventListener('resize', scheduleFlush)
	}
}

/** Stops the shared watchers once nothing is watched. */
function releaseWatchers(): void {
	if (live.size) return
	resizeObserver?.disconnect()
	resizeObserver = null
	parentCounts.clear()
	mutationObserver?.disconnect()
	mutationObserver = null
	if (typeof window !== 'undefined') window.removeEventListener('resize', scheduleFlush)
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * One-shot application of the correct optical cut for the element's current computed font-size.
 * No watching — use when you want manual control. Hysteresis is not applied here.
 * onCutChange fires only when the cut actually changes.
 *
 * @param el      - Target element
 * @param options - OpszStepperOptions
 */
export function applyOpszStepper(el: HTMLElement, options: OpszStepperOptions): void {
	if (typeof window === 'undefined' || !el) return
	if (!options?.cuts || options.cuts.length === 0) return

	const rawSize = parseFloat(getComputedStyle(el).fontSize)
	// NaN guard: skip if element is detached or returns a non-px value
	if (isNaN(rawSize)) return

	const s = ensureState(el, options)
	const index = findCutIndex(s.cuts, rawSize)
	if (index === -1) return
	if (index === s.activeIndex) return
	writeCut(el, s, index)
	s.onCutChange?.(s.cuts[index].cut)
}

/**
 * Start watching an element: applies the correct cut now and again whenever its font-size
 * changes — from a resize, a class or style change anywhere on the page, or a viewport change.
 * Calling it again on the same element replaces the earlier watcher.
 *
 * @param el      - Target element
 * @param options - OpszStepperOptions
 * @returns         A stop function that stops watching and restores the element's original styles
 */
export function startOpszStepper(el: HTMLElement, options: OpszStepperOptions): OpszStepperStop {
	if (typeof window === 'undefined' || !el) return () => {}
	if (!options?.cuts || options.cuts.length === 0) return () => {}

	// Replace an earlier watcher on this element (its styles are restored first).
	states.get(el)?.stop?.()

	const s = ensureState(el, options)
	const rawSize = parseFloat(getComputedStyle(el).fontSize)
	if (Number.isFinite(rawSize)) {
		const index = findCutIndex(s.cuts, rawSize)
		if (index !== -1 && index !== s.activeIndex) {
			writeCut(el, s, index)
			s.onCutChange?.(s.cuts[index].cut)
		}
	}

	ensureWatchers()
	live.add(el)
	s.live = true
	if (typeof ResizeObserver !== 'undefined') {
		if (!resizeObserver || resizeObserverCtor !== ResizeObserver) {
			resizeObserver = new ResizeObserver(scheduleFlush)
			resizeObserverCtor = ResizeObserver
			parentCounts.clear()
		}
		s.ro = resizeObserver
		s.ro.observe(el)
		// A container-query or fixed-size parent changes the font-size without resizing the element.
		s.observedParent = el.parentElement
		if (s.observedParent) {
			const n = parentCounts.get(s.observedParent) ?? 0
			if (n === 0) s.ro.observe(s.observedParent)
			parentCounts.set(s.observedParent, n + 1)
		}
	}

	const stop: OpszStepperStop = () => {
		// A stale handle (the element was restarted since) does nothing.
		if (states.get(el)?.stop !== stop) return
		live.delete(el)
		const st = states.get(el)
		if (st?.ro && st.ro === resizeObserver) {
			st.ro.unobserve?.(el)
			const parent = st.observedParent
			if (parent) {
				const n = (parentCounts.get(parent) ?? 1) - 1
				if (n <= 0) { parentCounts.delete(parent); st.ro.unobserve?.(parent) }
				else parentCounts.set(parent, n)
			}
		}
		restore(el)
		releaseWatchers()
	}
	s.stop = stop
	return stop
}

/**
 * Restore the element's original styles and stop watching it. No-op if never applied.
 *
 * @param el - Element previously passed to startOpszStepper or applyOpszStepper
 */
export function removeOpszStepper(el: HTMLElement): void {
	const s = states.get(el)
	if (!s) return
	if (s.stop) s.stop()
	else restore(el)
}
