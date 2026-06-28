"use client"

// Interactive demo: drag font-size slider, move cursor, tilt device, or simulate AR viewing distance to watch opszStepper hot-swap between Cormorant cuts
import { useState, useDeferredValue, useEffect, useCallback, useMemo } from "react"
import { OpszStepperText } from "@liiift-studio/opszstepper"
import type { OpszStepperCut } from "@liiift-studio/opszstepper"

/** Three Cormorant optical cuts loaded via next/font — keys must match CSS variable names */
const CUTS: OpszStepperCut[] = [
	{ family: 'var(--font-cormorant-sc), serif',       maxSize: 16 },
	{ family: 'var(--font-cormorant-garamond), serif', minSize: 16, maxSize: 36 },
	{ family: 'var(--font-cormorant-display), serif',  minSize: 36 },
]

/** Human-readable label for each cut, keyed by family string */
const CUT_LABELS: Record<string, { name: string; subtitle: string }> = {
	'var(--font-cormorant-sc), serif':       { name: 'Micro',   subtitle: 'Cormorant SC — small caps, designed for small sizes' },
	'var(--font-cormorant-garamond), serif': { name: 'Text',    subtitle: 'Cormorant Garamond — text optical size' },
	'var(--font-cormorant-display), serif':  { name: 'Display', subtitle: 'Cormorant Display — display optical size' },
}

const DEMO_TEXT = `The geometry that works at twelve points becomes wrong at seventy-two. Type designers know this — it’s why they draw separate optical-size cuts. Stroke widths, apertures, spacing: all redrawn for the intended size.`

/** Reference font size in px for the distance simulation */
const BASE_FONT_SIZE = 32
/** Reference distance in cm at which BASE_FONT_SIZE appears at nominal size */
const REFERENCE_DISTANCE = 80

/** Cursor icon SVG */
function CursorIcon() {
	return (
		<svg width="11" height="14" viewBox="0 0 11 14" fill="currentColor" aria-hidden>
			<path d="M0 0L0 11L3 8L5 13L6.8 12.3L4.8 7.3L8.5 7.3Z" />
		</svg>
	)
}

/** Distance/AR icon SVG — concentric arcs suggesting depth */
function DistanceIcon() {
	return (
		<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden>
			<circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none" />
			<path d="M4 7 A3 3 0 0 1 10 7" />
			<path d="M1.5 7 A5.5 5.5 0 0 1 12.5 7" />
		</svg>
	)
}

/** Gyroscope icon SVG */
function GyroIcon() {
	return (
		<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden>
			<circle cx="7" cy="7" r="5.5" />
			<circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none" />
			<path d="M7 1.5 A5.5 5.5 0 0 1 12.5 7" strokeWidth="1.4" />
			<path d="M11.5 5.5 L12.5 7 L13.8 6" strokeWidth="1.2" />
		</svg>
	)
}

/** Slider with accessible label, optional subtitle, optional annotation, and aria-valuetext for AT */
function Slider({ label, value, min, max, step, unit, onChange, subtitle, annotation, title, ariaValueText }: {
	label: string
	value: number
	min: number
	max: number
	step: number
	unit: string
	onChange: (v: number) => void
	subtitle?: string
	annotation?: string
	title?: string
	/** Human-readable value for screen readers, e.g. "32px" or "80cm (effective: 32px)" */
	ariaValueText?: string
}) {
	const subtitleId = subtitle ? `slider-subtitle-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined
	return (
		<div className="flex flex-col gap-1">
			<div className="flex justify-between items-baseline">
				<span className="text-xs uppercase tracking-[0.18em] font-medium text-muted">{label}</span>
				<span className="tabular-nums text-xs text-muted">
					{value}{unit}{annotation ? <span className="ml-1 text-subtle">{annotation}</span> : null}
				</span>
			</div>
			{/* touchAction: pan-y lets the page scroll vertically while still allowing horizontal thumb drags */}
			<input
				type="range"
				min={min}
				max={max}
				step={step}
				value={value}
				aria-label={label}
				aria-valuetext={ariaValueText ?? `${value}${unit}`}
				aria-describedby={subtitleId}
				title={title}
				onChange={e => onChange(Number(e.target.value))}
				style={{ touchAction: 'pan-y' }}
			/>
			{subtitle && <span id={subtitleId} className="text-xs text-subtle italic">{subtitle}</span>}
		</div>
	)
}

/** Chip showing Micro / Text / Display — active one is fully opaque */
function CutChips({ activeName }: { activeName: string }) {
	const names = ['Micro', 'Text', 'Display']
	return (
		<div className="flex gap-2" role="group" aria-label="Active optical cut">
			{names.map(name => (
				<span
					key={name}
					role="status"
					aria-current={name === activeName ? 'true' : undefined}
					className="text-xs px-3 py-1 rounded-full border transition-opacity"
					style={{
						borderColor: 'currentColor',
						opacity: name === activeName ? 1 : 0.25,
						background: name === activeName ? 'var(--btn-bg)' : 'transparent',
					}}
				>
					{name}
				</span>
			))}
		</div>
	)
}

/** Interactive demo component for opszStepper */
export default function Demo() {
	const [fontSize, setFontSize] = useState(32)
	const [hysteresis, setHysteresis] = useState(1)
	// Use CUTS[1] ?? CUTS[0] to guard against a future CUTS array with only one entry
	const [activeCut, setActiveCut] = useState<OpszStepperCut>(CUTS[1] ?? CUTS[0])

	// Interaction modes — mutually exclusive
	const [cursorMode, setCursorMode] = useState(false)
	const [gyroMode, setGyroMode] = useState(false)
	const [distanceMode, setDistanceMode] = useState(false)

	// Gyro-driven value — separate from slider state to prevent mobile scroll
	const [gyroFontSize, setGyroFontSize] = useState(32)

	// Distance simulation — physical cm from viewer to AR-anchored text
	const [distance, setDistance] = useState(80)

	// Gyro permission denied feedback — shown briefly when iOS denies sensor access
	const [gyroDenied, setGyroDenied] = useState(false)

	/** Font-size derived from viewing distance — memoised to avoid recomputing on unrelated renders */
	const distanceFontSize = useMemo(
		() => Math.max(8, Math.min(96, Math.round(BASE_FONT_SIZE * (REFERENCE_DISTANCE / distance)))),
		[distance],
	)

	// Detected capabilities — resolved client-side after mount
	const [showCursor, setShowCursor] = useState(false)
	const [showGyro, setShowGyro] = useState(false)

	useEffect(() => {
		const isHover = window.matchMedia('(hover: hover)').matches
		const isTouch = window.matchMedia('(hover: none)').matches
		setShowCursor(isHover)
		setShowGyro(isTouch && 'DeviceOrientationEvent' in window)
	}, [])

	// Effective font-size: distance-driven, gyro-driven, or slider-driven
	const effectiveFontSize = distanceMode ? distanceFontSize : gyroMode ? gyroFontSize : fontSize

	// useDeferredValue throttles rapid cursor/slider updates; gyro is already rAF-throttled so the
	// deferral overhead is negligible but harmless — both code paths use the same value
	const dFontSize = useDeferredValue(effectiveFontSize)
	const dHysteresis = useDeferredValue(hysteresis)

	// Cursor mode — Y controls font-size (top = large, bottom = small); ArrowUp/Down step ±1px
	useEffect(() => {
		if (!cursorMode) return
		const handleMove = (e: MouseEvent) => {
			setFontSize(Math.round(8 + (1 - e.clientY / window.innerHeight) * 88))
		}
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') { setCursorMode(false); return }
			if (e.key === 'ArrowUp')   { e.preventDefault(); setFontSize(v => Math.min(96, v + 1)); return }
			if (e.key === 'ArrowDown') { e.preventDefault(); setFontSize(v => Math.max(8,  v - 1)); return }
		}
		window.addEventListener('mousemove', handleMove)
		window.addEventListener('keydown', handleKey)
		return () => {
			window.removeEventListener('mousemove', handleMove)
			window.removeEventListener('keydown', handleKey)
		}
	}, [cursorMode])

	// Gyro mode — beta (front/back tilt) controls font-size (upright = large, tilted back = small)
	useEffect(() => {
		if (!gyroMode) return
		let rafId: number | null = null
		const handleOrientation = (e: DeviceOrientationEvent) => {
			if (rafId !== null) return
			rafId = requestAnimationFrame(() => {
				rafId = null
				if (e.beta !== null) {
					// beta ~90 (upright portrait) = large; tilted back toward you = smaller
					const clamped = Math.max(15, Math.min(90, e.beta))
					setGyroFontSize(Math.round(8 + ((clamped - 15) / 75) * 88))
				}
			})
		}
		window.addEventListener('deviceorientation', handleOrientation)
		return () => {
			window.removeEventListener('deviceorientation', handleOrientation)
			if (rafId !== null) cancelAnimationFrame(rafId)
		}
	}, [gyroMode])

	// Toggle cursor mode — turns off gyro and distance if active
	const toggleCursor = useCallback(() => {
		setGyroMode(false)
		setDistanceMode(false)
		setCursorMode(v => !v)
	}, [])

	// Toggle gyro mode — requests iOS permission if needed, turns off cursor and distance if active
	const toggleGyro = useCallback(async () => {
		if (gyroMode) { setGyroMode(false); return }
		setCursorMode(false)
		setDistanceMode(false)
		const DOE = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
			requestPermission?: () => Promise<PermissionState>
		}
		if (typeof DOE.requestPermission === 'function') {
			const permission = await DOE.requestPermission()
			if (permission === 'granted') {
				setGyroMode(true)
			} else {
				// Show denied indicator for 3 s so user knows why tilt did not activate
				setGyroDenied(true)
				setTimeout(() => setGyroDenied(false), 3000)
			}
		} else {
			setGyroMode(true)
		}
	}, [gyroMode])

	// Toggle distance mode — resets fontSize to BASE_FONT_SIZE on exit to avoid stale-value jump
	const toggleDistance = useCallback(() => {
		setCursorMode(false)
		setGyroMode(false)
		setDistanceMode(v => {
			if (v) setFontSize(BASE_FONT_SIZE) // reset slider when exiting so there is no jump
			return !v
		})
	}, [])

	const activeMode = cursorMode || gyroMode || distanceMode
	// Fall back to the cut whose family matches CUTS[1] to avoid a misleading 'Text' default on mount
	const cutInfo = CUT_LABELS[activeCut.family] ?? CUT_LABELS[CUTS[1]?.family ?? ''] ?? { name: 'Text', subtitle: '' }

	return (
		<div className="w-full flex flex-col gap-8">
			{/* Controls */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
				{!distanceMode && (
					<Slider label="Font Size" value={fontSize} min={8} max={96} step={1} unit="px" onChange={setFontSize} title="Drag to change the rendered font size — opszStepper automatically switches to the appropriate optical cut at each threshold (16px and 36px)" />
				)}
				{distanceMode && (
					<Slider
						label="Distance"
						value={distance}
						min={20}
						max={500}
						step={5}
						unit="cm"
						onChange={setDistance}
						annotation={`(effective: ${distanceFontSize}px)`}
						ariaValueText={`${distance}cm, effective font size ${distanceFontSize}px`}
						subtitle="physical distance to AR-anchored text"
						title="Drag to simulate viewing distance in AR — closer text appears larger (larger effective size, coarser optical cut), farther text appears smaller (finer optical cut)"
					/>
				)}
				<Slider label="Hysteresis" value={hysteresis} min={0} max={4} step={0.5} unit="px" onChange={setHysteresis} subtitle="dead zone — size must overshoot the cut boundary by this much before switching" title="Set the dead zone around each cut boundary — font-size must overshoot by this many pixels before the optical cut switches, preventing rapid oscillation when size hovers near a threshold" />
			</div>

			{/* Mode toggles */}
			<div className="flex flex-wrap items-center gap-3" role="group" aria-label="Interaction mode">
				{showCursor && (
					<button
						onClick={toggleCursor}
						aria-label={cursorMode ? 'Disable cursor mode (Arrow Up/Down to step, Escape to exit)' : 'Enable cursor mode — move cursor up/down or use Arrow Up/Down to control font size'}
						aria-pressed={cursorMode}
						className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border transition-all"
						style={{
							borderColor: 'currentColor',
							opacity: cursorMode ? 1 : 0.5,
							background: cursorMode ? 'var(--btn-bg)' : 'transparent',
						}}
					>
						<CursorIcon />
						<span>{cursorMode ? 'Esc to exit' : 'Cursor'}</span>
					</button>
				)}
				{showGyro && (
					<button
						onClick={toggleGyro}
						aria-label={gyroMode ? 'Disable tilt mode' : 'Enable tilt mode — tilt device front/back to control font size'}
						aria-pressed={gyroMode}
						className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border transition-all"
						style={{
							borderColor: 'currentColor',
							opacity: gyroMode ? 1 : 0.5,
							background: gyroMode ? 'var(--btn-bg)' : 'transparent',
						}}
					>
						<GyroIcon />
						<span>{gyroMode ? 'Tilt active' : 'Tilt'}</span>
					</button>
				)}
				{gyroDenied && (
					<span className="text-xs text-subtle italic" role="alert">Motion access denied — reload to try again</span>
				)}
				<button
					onClick={toggleDistance}
					aria-label={distanceMode ? 'Disable distance mode' : 'Enable distance mode — simulate AR viewing distance to control font size'}
					aria-pressed={distanceMode}
					className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border transition-all"
					style={{
						borderColor: 'currentColor',
						opacity: distanceMode ? 1 : 0.5,
						background: distanceMode ? 'var(--btn-bg)' : 'transparent',
					}}
				>
					<DistanceIcon />
					<span>{distanceMode ? 'Distance active' : 'Distance'}</span>
				</button>
			</div>

			{/* Active cut indicator — aria-live announces cut transitions to screen readers */}
			<div className="flex flex-col gap-2" aria-live="polite" aria-atomic="true">
				<div className="flex items-center gap-4 flex-wrap">
					<CutChips activeName={cutInfo.name} />
					<span className="text-xs text-muted">{cutInfo.subtitle}</span>
				</div>
			</div>

			{/* Demo text — font-size controlled by slider or cursor or gyro */}
			<div className="rounded-lg p-6" style={{ background: 'color-mix(in oklch, var(--foreground) 20%, transparent)' }}>
				<OpszStepperText
					cuts={CUTS}
					hysteresis={dHysteresis}
					onCutChange={setActiveCut}
					style={{
						fontSize: `${dFontSize}px`,
						lineHeight: 1.3,
						margin: 0,
					}}
				>
					{DEMO_TEXT}
				</OpszStepperText>
			</div>

			{/* Cut reference legend */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-muted">
				{CUTS.map((cut) => {
					const info = CUT_LABELS[cut.family]
					const range = cut.minSize !== undefined && cut.maxSize !== undefined
						? `${cut.minSize}px – ${cut.maxSize}px`
						: cut.maxSize !== undefined
						? `< ${cut.maxSize}px`
						: `≥ ${cut.minSize}px`
					return (
						<div key={cut.family} className="flex flex-col gap-0.5">
							<span className="font-semibold">{info?.name} cut</span>
							<span>{info?.subtitle.split(' — ')[0]}</span>
							<span className="text-subtle">{range}</span>
						</div>
					)
				})}
			</div>

			<p className="text-xs text-subtle italic" style={{ lineHeight: 1.8 }}>
				{activeMode
					? cursorMode
						? 'Move cursor up for large sizes, down for small. Use Arrow Up / Arrow Down to step ±1px. Press Esc to exit.'
						: gyroMode
						? 'Tilt device toward you for smaller sizes, upright for larger.'
						: 'On smart glasses, AR-anchored text at 20 cm appears huge — at 2 m it appears tiny. The Distance slider simulates how far away the text is: as distance grows, the apparent size shrinks and opszStepper swaps to a finer optical cut.'
					: 'Drag the font-size slider to cross the 16px and 36px thresholds — watch the typeface change. The hysteresis slider sets the dead zone: font-size must overshoot the boundary by that many pixels before the cut switches, preventing oscillation at the edge. On smartwatches and micro-displays, optical cut selection is non-negotiable — the difference between a text cut and a display cut at 14px is the difference between legible and illegible.'}
			</p>
		</div>
	)
}
