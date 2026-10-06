// opszStepper/src/react/useOpszStepper.ts — React hook for optical-cut hot-swap
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { startOpszStepper } from '../core/adjust'
import type { OpszStepperOptions } from '../core/types'

/**
 * React hook that starts an opszStepper observer on the returned ref'd element.
 * Calls startOpszStepper in useLayoutEffect and stores the returned stop function.
 *
 * Re-runs (stops and restarts the observer) whenever any cut's family, minSize, or
 * maxSize changes, or when cuts are added/removed, or when hysteresis changes.
 * A stable JSON serialisation of the cuts array is used as the dependency key so
 * that same-length arrays with different content also trigger a restart.
 *
 * onCutChange is read from the latest render each time it fires, so it doesn't need to be
 * stable across renders. The stepper follows the element if React replaces it.
 *
 * Cleans up on unmount.
 *
 * @param options - OpszStepperOptions
 * @returns         A ref to attach to the target element
 */
export function useOpszStepper(options: OpszStepperOptions) {
	// A ref that re-renders when React attaches a different element (a changed `as`, a conditional
	// mount after the first render), so the stepper moves to the element actually on the page.
	const [node, setNode] = useState<HTMLElement | null>(null)
	const ref = useMemo(() => {
		let current: HTMLElement | null = null
		return {
			get current() { return current },
			set current(el: HTMLElement | null) {
				if (el === current) return
				current = el
				setNode(el)
			},
		} as React.MutableRefObject<HTMLElement | null>
	}, [])
	const optionsRef = useRef(options)
	optionsRef.current = options

	// Serialize the cuts array to a string so that same-length arrays with different
	// content still trigger a restart. hysteresis is included directly.
	const cutsKey = JSON.stringify(options.cuts)
	const { hysteresis } = options

	useLayoutEffect(() => {
		if (!node) return
		// onCutChange is read from the latest render each time it fires, so a new callback
		// prop takes effect without restarting the stepper.
		const stop = startOpszStepper(node, {
			...optionsRef.current,
			onCutChange: (cut) => optionsRef.current.onCutChange?.(cut),
		})
		return stop
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [node, cutsKey, hysteresis])

	return ref
}
