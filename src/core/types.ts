// opszStepper/src/core/types.ts — types for the optical-cut hot-swap tool

/**
 * A single optical size cut definition: a font-family string and the font-size
 * range in px over which it should be active.
 *
 * Two usage modes:
 * 1. Multi-family hot-swap (e.g. Halyard Micro / Text / Display):
 *    set `family` to the CSS font-family string for each cut. Leave `opszValue` unset.
 * 2. Single variable-font opsz axis (e.g. Fraunces, Source Serif 4, Amstelvar):
 *    set `family` to the single variable font family, and set `opszValue` to the
 *    `opsz` axis value to apply at this cut. The tool sets the `opsz` axis in the element's
 *    `font-variation-settings`, keeping its other axes.
 *    Optionally provide `opszMin` and `opszMax` to clamp the value against the
 *    font's fvar axis range.
 */
export interface OpszStepperCut {
	/**
	 * The CSS font-family string for this optical cut.
	 * e.g. 'Halyard Display, sans-serif' or '"Tiempos Display", serif'
	 * For variable-font opsz mode, use the same family string in all cuts.
	 */
	family: string
	/** Min font-size in px (inclusive) for this cut to apply. Default: 0 */
	minSize?: number
	/** Max font-size in px (exclusive) for this cut to apply. Default: Infinity */
	maxSize?: number
	/**
	 * Optional `opsz` axis value to write as `font-variation-settings: "opsz" <value>`.
	 * Use this when all cuts share one variable font and you want to drive the opsz axis
	 * directly rather than hot-swapping font families.
	 * The `opsz` value is merged into the element's computed `font-variation-settings`,
	 * so other axes (such as `wght`) are kept.
	 * Clamped between `opszMin` and `opszMax` when those are supplied.
	 */
	opszValue?: number
	/**
	 * Minimum allowed value for the `opsz` axis (from the font's fvar table).
	 * Only used when `opszValue` is set. Clamps the written value from below.
	 */
	opszMin?: number
	/**
	 * Maximum allowed value for the `opsz` axis (from the font's fvar table).
	 * Only used when `opszValue` is set. Clamps the written value from above.
	 */
	opszMax?: number
}

/** A stop function returned by startOpszStepper. Call it to disconnect the observer and restore the element. */
export type OpszStepperStop = () => void

/** Options controlling the opszStepper effect */
export interface OpszStepperOptions {
	/**
	 * The optical size cuts, in any order (they are sorted by size).
	 * Each cut defines a font-family string and the font-size range it applies to.
	 * Ranges should be contiguous and non-overlapping.
	 *
	 * @example Multi-family hot-swap
	 * cuts: [
	 *   { family: 'Halyard Micro, sans-serif', maxSize: 13 },
	 *   { family: 'Halyard Text, sans-serif', minSize: 13, maxSize: 28 },
	 *   { family: 'Halyard Display, sans-serif', minSize: 28 },
	 * ]
	 *
	 * @example Single variable font opsz axis
	 * cuts: [
	 *   { family: 'Fraunces, serif', maxSize: 13, opszValue: 9, opszMin: 9, opszMax: 144 },
	 *   { family: 'Fraunces, serif', minSize: 13, maxSize: 28, opszValue: 24, opszMin: 9, opszMax: 144 },
	 *   { family: 'Fraunces, serif', minSize: 28, opszValue: 72, opszMin: 9, opszMax: 144 },
	 * ]
	 */
	cuts: OpszStepperCut[]

	/**
	 * Hysteresis dead zone in px per threshold. Prevents oscillation when
	 * font-size sits exactly at a cut boundary. Only used by startOpszStepper;
	 * applyOpszStepper always does a direct cut lookup without hysteresis.
	 * Default: 1
	 */
	hysteresis?: number

	/**
	 * Callback fired each time the active cut changes.
	 * Receives the new cut that was applied.
	 */
	onCutChange?: (cut: OpszStepperCut) => void
}

