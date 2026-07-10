// opszStepper/src/framer/OpszStepper.tsx — Framer code component wrapping the opszStepper core.
//
// Distribution: paste this file into Framer (Insert → Code → New Component), or host it as an
// ES module and add it by URL. It imports the framework-agnostic core straight from the CDN, so
// it needs no build step — the core functions take a DOM element, not React, so there is no
// React version/externalisation issue.
//
// The rendering logic mirrors the already-proven `useOpszStepper` hook: startOpszStepper attaches
// a ResizeObserver (font-size can change with responsive layout) and returns a stop fn; the
// one-shot applyOpszStepper is used for the static export frame. Unlike wave tools, opszStepper
// mutates el.style.fontFamily / fontVariationSettings directly — it does NOT rewrite innerHTML,
// so there is no getCleanHTML / originalHTML snapshot. The only Framer-specific additions are the
// property controls, RenderTarget gating, and layout annotations.
import { useEffect, useRef } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
// Pin to a published version so shared instances stay stable. Bump when the core changes.
// The core is framework-agnostic (operates on a DOM element), so no React externalisation is needed.
import { startOpszStepper, applyOpszStepper, removeOpszStepper } from "https://esm.sh/@liiift-studio/opszstepper@1.0.17"

/** A single optical-size cut, declared explicitly so the component needs no type import over HTTP.
 *  Numeric "unset" sentinels: maxSize/opszValue/opszMin/opszMax of 0 mean "not set" and are mapped
 *  to undefined before reaching the core (0 is never a meaningful bound for these axes). */
interface OpszStepperCutProp {
	/** CSS font-family string for this cut. For opsz-axis mode, use the same family in every cut. */
	family: string
	/** Min font-size in px (inclusive) for this cut to apply. */
	minSize: number
	/** Max font-size in px (exclusive). 0 = no upper bound (Infinity). */
	maxSize: number
	/** opsz axis value to write as font-variation-settings. 0 = family hot-swap mode (no axis write). */
	opszValue: number
	/** Lower clamp for the opsz axis (from the font's fvar table). 0 = no clamp. */
	opszMin: number
	/** Upper clamp for the opsz axis (from the font's fvar table). 0 = no clamp. */
	opszMax: number
}

/** Props surfaced to the Framer UI via addPropertyControls, plus base text styling.
 *  Option fields are declared explicitly so the component needs no type import over HTTP. */
interface OpszStepperFramerProps {
	/** The text to display. */
	text: string
	/** CSS font-family — for opsz-axis cuts this MUST be the variable font (e.g. Fraunces). */
	fontFamily: string
	/** Font size in px — this is the value opszStepper reads to pick the active cut. */
	fontSize: number
	/** Text colour. */
	color: string
	/** Horizontal text alignment. */
	textAlign: "left" | "center" | "right"
	/** Optical-size cuts, ordered smallest to largest; ranges should be contiguous and non-overlapping. */
	cuts: OpszStepperCutProp[]
	/** Hysteresis dead zone in px per threshold — prevents oscillation at cut boundaries. */
	hysteresis: number
}

/**
 * Font-size-driven optical-cut hot-swap, as a Framer code component.
 *
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight auto
 */
export default function OpszStepper(props: Partial<OpszStepperFramerProps>) {
	const {
		text = "Optical sizing",
		fontFamily = "Fraunces",
		fontSize = 96,
		color = "#111111",
		textAlign = "left",
		cuts = [
			{ family: "Fraunces", minSize: 0, maxSize: 24, opszValue: 9, opszMin: 9, opszMax: 144 },
			{ family: "Fraunces", minSize: 24, maxSize: 48, opszValue: 40, opszMin: 9, opszMax: 144 },
			{ family: "Fraunces", minSize: 48, maxSize: 0, opszValue: 120, opszMin: 9, opszMax: 144 },
		],
		hysteresis = 1,
	} = props

	const ref = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const el = ref.current
		if (!el) return

		// Map the flat Framer prop cuts to core cuts, converting 0 sentinels back to "unset"
		// (0 is never a meaningful bound for maxSize/opsz — undefined lets the core default it).
		const resolvedCuts = (cuts ?? []).map((c) => ({
			family: c.family,
			minSize: c.minSize > 0 ? c.minSize : 0,
			maxSize: c.maxSize > 0 ? c.maxSize : undefined,
			opszValue: c.opszValue > 0 ? c.opszValue : undefined,
			opszMin: c.opszMin > 0 ? c.opszMin : undefined,
			opszMax: c.opszMax > 0 ? c.opszMax : undefined,
		}))

		const options = { cuts: resolvedCuts, hysteresis }

		// Observe on the live site and on the editing canvas (so the designer sees cuts swap as
		// they resize / rescale); render a single static frame on export / thumbnails.
		const target = RenderTarget.current()
		const animate = target === RenderTarget.preview || target === RenderTarget.canvas

		if (animate) {
			const stop = startOpszStepper(el, options)
			return () => {
				stop()
			}
		}

		applyOpszStepper(el, options)
		return () => {
			removeOpszStepper(el)
		}
	}, [text, fontFamily, fontSize, JSON.stringify(cuts), hysteresis])

	return (
		<div
			ref={ref}
			style={{
				fontFamily,
				fontSize,
				color,
				textAlign,
				lineHeight: 1.1,
				width: "100%",
			}}
		>
			{text}
		</div>
	)
}

// Map every meaningful OpszStepperOptions field to a Framer control.
// Omitted: onCutChange (a callback — not representable as a property control).
addPropertyControls(OpszStepper, {
	text: {
		type: ControlType.String,
		title: "Text",
		defaultValue: "Optical sizing",
		displayTextArea: true,
	},
	fontFamily: {
		type: ControlType.String,
		title: "Font",
		defaultValue: "Fraunces",
		description: "For opsz-axis cuts, use the variable font here and in every cut's family.",
	},
	fontSize: { type: ControlType.Number, title: "Size", defaultValue: 96, min: 8, max: 400, unit: "px" },
	color: { type: ControlType.Color, title: "Colour", defaultValue: "#111111" },
	textAlign: {
		type: ControlType.Enum,
		title: "Align",
		options: ["left", "center", "right"],
		optionTitles: ["Left", "Center", "Right"],
		defaultValue: "left",
		displaySegmentedControl: true,
	},
	cuts: {
		type: ControlType.Array,
		title: "Cuts",
		control: {
			type: ControlType.Object,
			controls: {
				family: { type: ControlType.String, title: "Family", defaultValue: "Fraunces" },
				minSize: { type: ControlType.Number, title: "Min size", defaultValue: 0, min: 0, max: 1000, unit: "px" },
				maxSize: {
					type: ControlType.Number,
					title: "Max size",
					defaultValue: 0,
					min: 0,
					max: 1000,
					unit: "px",
					description: "0 = no upper bound",
				},
				opszValue: {
					type: ControlType.Number,
					title: "opsz",
					defaultValue: 0,
					min: 0,
					max: 200,
					description: "0 = family hot-swap (no axis write)",
				},
				opszMin: { type: ControlType.Number, title: "opsz min", defaultValue: 0, min: 0, max: 200 },
				opszMax: { type: ControlType.Number, title: "opsz max", defaultValue: 0, min: 0, max: 200 },
			},
		},
		defaultValue: [
			{ family: "Fraunces", minSize: 0, maxSize: 24, opszValue: 9, opszMin: 9, opszMax: 144 },
			{ family: "Fraunces", minSize: 24, maxSize: 48, opszValue: 40, opszMin: 9, opszMax: 144 },
			{ family: "Fraunces", minSize: 48, maxSize: 0, opszValue: 120, opszMin: 9, opszMax: 144 },
		],
	},
	hysteresis: { type: ControlType.Number, title: "Hysteresis", defaultValue: 1, min: 0, max: 20, step: 0.5, unit: "px" },
})
