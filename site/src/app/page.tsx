import Demo from "@/components/Demo"
import CopyInstall from "@/components/CopyInstall"
import CodeBlock from "@/components/CodeBlock"
import ToolDirectory from "@/components/ToolDirectory"
import { version } from "../../../package.json"
import { version as siteVersion } from "../../package.json"
import SiteFooter from "../components/SiteFooter"
import { MagnetChar } from "@liiift-studio/magnettype"

export default function Home() {
	return (
		<main className="flex flex-col items-center px-6 py-20 gap-24">

			{/* Hero */}
			<section className="w-full max-w-2xl lg:max-w-5xl flex flex-col gap-6" aria-labelledby="hero-heading">
				<div className="flex flex-col gap-2">
					<p className="text-xs uppercase tracking-[0.18em] font-medium text-muted">opszstepper</p>
					<h1 id="hero-heading" className="text-4xl lg:text-8xl xl:text-9xl" style={{ fontFamily: "var(--font-cormorant-display), serif", fontVariationSettings: '"wght" 300', lineHeight: "1.05em" }}>
						<MagnetChar as="span" minWeight={300} maxWeight={800} spreadRadius={220} fixedAxes={{ opsz: 144 }}>Optical cuts,</MagnetChar><br />
						<MagnetChar as="span" minWeight={300} maxWeight={800} spreadRadius={220} fixedAxes={{ opsz: 144 }} style={{ color: "var(--foreground-subtle)", fontStyle: "italic" }}>on demand.</MagnetChar>
					</h1>
				</div>
				<div className="flex items-center gap-4">
					<CopyInstall />
					<a href="https://github.com/Liiift-Studio/OpszStepper" target="_blank" rel="noopener noreferrer" aria-label="OpszStepper on GitHub (opens in new tab)" className="text-sm text-muted hover:text-foreground transition-colors">GitHub ↗</a>
				</div>
				<div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted tracking-wide">
					<span>TypeScript</span><span aria-hidden="true">·</span><span>Zero dependencies</span><span aria-hidden="true">·</span><span>React + Vanilla JS</span>
				</div>
				<p className="text-base leading-relaxed max-w-lg">
					Type designers create separate optical-size cuts for the same reason optometrists prescribe different lenses for reading and driving — the geometry that works at 12px becomes wrong at 72px. Opsz Stepper detects the current font-size and hot-swaps to the correct cut, automatically.
				</p>
			</section>

			{/* Demo */}
			<section className="w-full max-w-2xl lg:max-w-5xl flex flex-col gap-4" aria-label="Live demo">
				<h2 className="text-xs uppercase tracking-[0.18em] font-medium text-muted">Live demo — drag the sliders</h2>
				<div className="rounded-xl -mx-8 px-8 py-8" style={{ background: "var(--panel)", overflow: 'hidden' }}>
					<Demo />
				</div>
			</section>

			{/* Explanation */}
			<section className="w-full max-w-2xl lg:max-w-5xl flex flex-col gap-6" aria-labelledby="how-it-works-heading">
				<h2 id="how-it-works-heading" className="text-xs uppercase tracking-[0.18em] font-medium text-muted">How it works</h2>
				<div className="prose-grid grid grid-cols-1 sm:grid-cols-2 gap-12 text-sm leading-relaxed">
					<div className="flex flex-col gap-3">
						<p className="font-semibold text-base">Optical sizes are different drawings</p>
						<p>Micro, Text, and Display variants of the same typeface aren&rsquo;t simply scaled versions of each other. They have different stroke widths, apertures, x-heights, and spacing — each redrawn from scratch to be optically correct at its intended size range.</p>
					</div>
					<div className="flex flex-col gap-3">
						<p className="font-semibold text-base">ResizeObserver watches the element</p>
						<p>When the element&rsquo;s computed font-size changes — because of responsive CSS, viewport units, or user zoom — the ResizeObserver fires. Opsz Stepper re-reads the font-size and re-evaluates which cut to apply, keeping the typeface optically correct at every size.</p>
					</div>
					<div className="flex flex-col gap-3">
						<p className="font-semibold text-base">Hysteresis prevents oscillation</p>
						<p>If font-size sits exactly at a cut boundary — say, precisely 16px — the element would flip between cuts on every resize event. The hysteresis dead zone prevents this: font-size must pass the boundary by N pixels before the cut switches, so the boundary feels stable rather than jittery.</p>
					</div>
					<div className="flex flex-col gap-3">
						<p className="font-semibold text-base">Works with any font family</p>
						<p>Cuts are just CSS font-family strings. Google Fonts, locally hosted <code className="text-xs font-mono">@font-face</code> declarations, cloud fonts, Adobe Fonts — anything you can name in CSS works as a cut. The tool makes no assumptions about the fonts themselves.</p>
					</div>
				</div>
			</section>

			{/* Usage */}
			<section className="w-full max-w-2xl lg:max-w-5xl flex flex-col gap-6" aria-labelledby="usage-heading">
				<div className="flex items-baseline gap-4">
					<h2 id="usage-heading" className="text-xs uppercase tracking-[0.18em] font-medium text-muted">Usage</h2>
					<p className="text-xs text-muted tracking-wide">TypeScript + React · Vanilla JS</p>
				</div>
				<div className="flex flex-col gap-8 text-sm">
					<div className="flex flex-col gap-3">
						<p className="text-muted">Drop-in component</p>
						<CodeBlock code={`import { OpszStepperText } from '@liiift-studio/opszstepper'

<OpszStepperText cuts={[
  { family: 'Halyard Micro, sans-serif', maxSize: 13 },
  { family: 'Halyard Text, sans-serif', minSize: 13, maxSize: 28 },
  { family: 'Halyard Display, sans-serif', minSize: 28 },
]}>
  Your text here
</OpszStepperText>`} />
					</div>
					<div className="flex flex-col gap-3">
						<p className="text-muted">Hook — attach to any element</p>
						<CodeBlock code={`import { useOpszStepper } from '@liiift-studio/opszstepper'

const ref = useOpszStepper({ cuts, hysteresis: 2, onCutChange: (cut) => console.log(cut) })
<p ref={ref}>Your text</p>`} />
					</div>
					<div className="flex flex-col gap-3">
						<p className="text-muted">Vanilla JS</p>
						<CodeBlock code={`import { startOpszStepper, applyOpszStepper, removeOpszStepper } from '@liiift-studio/opszstepper'

const el = document.querySelector('h1')

// Live — ResizeObserver watches the element and re-evaluates on every font-size change
const stop = startOpszStepper(el, { cuts })
stop() // disconnects observer and restores original fontFamily (same as removeOpszStepper)

// One-shot — apply the correct cut for the current font-size and return
applyOpszStepper(el, { cuts })
removeOpszStepper(el) // restore original fontFamily`} />
					</div>
					<div className="flex flex-col gap-3">
						<p className="text-muted">Variable font — single opsz axis</p>
						<CodeBlock code={`// For variable fonts with an opsz axis (e.g. Fraunces, Amstelvar), set opszValue per cut.
// The tool writes font-variation-settings: "opsz" <value> instead of swapping font-family.
import { OpszStepperText } from '@liiift-studio/opszstepper'

<OpszStepperText cuts={[
  { family: 'Fraunces, serif', maxSize: 13,            opszValue: 9,  opszMin: 9, opszMax: 144 },
  { family: 'Fraunces, serif', minSize: 13, maxSize: 28, opszValue: 24, opszMin: 9, opszMax: 144 },
  { family: 'Fraunces, serif', minSize: 28,            opszValue: 72, opszMin: 9, opszMax: 144 },
]}>
  Your text here
</OpszStepperText>`} />
					</div>
					<div className="flex flex-col gap-3">
						<p className="text-muted">Options</p>
						<table className="w-full text-xs" aria-label="OpszStepper options reference">
							<thead><tr className="text-subtle text-left"><th className="pb-2 pr-6 font-normal">Option</th><th className="pb-2 pr-6 font-normal">Default</th><th className="pb-2 font-normal">Description</th></tr></thead>
							<tbody className="text-muted">
								<tr className="border-t border-foreground/10 hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">cuts</td><td className="py-2 pr-6">required</td><td className="py-2">Array of <code className="font-mono">OpszStepperCut</code> objects, each with a <code className="font-mono">family</code> string and optional <code className="font-mono">minSize</code>/<code className="font-mono">maxSize</code> in px.</td></tr>
								<tr className="border-t border-foreground/10 hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">cuts[n].opszValue</td><td className="py-2 pr-6">—</td><td className="py-2">Optional <code className="font-mono">opsz</code> axis value to write as <code className="font-mono">font-variation-settings</code>. Use for variable fonts instead of swapping <code className="font-mono">font-family</code>.</td></tr>
								<tr className="border-t border-foreground/10 hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">cuts[n].opszMin / opszMax</td><td className="py-2 pr-6">—</td><td className="py-2">Clamp bounds for the <code className="font-mono">opsz</code> axis value, matching the font&apos;s <code className="font-mono">fvar</code> range.</td></tr>
								<tr className="border-t border-foreground/10 hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">hysteresis</td><td className="py-2 pr-6">1</td><td className="py-2">Dead zone in px at each cut boundary. Prevents oscillation when font-size sits exactly at a threshold.</td></tr>
								<tr className="border-t border-foreground/10 hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">onCutChange</td><td className="py-2 pr-6">—</td><td className="py-2">Callback fired each time the active cut changes. Receives the new <code className="font-mono">OpszStepperCut</code> object.</td></tr>
								<tr className="border-t border-foreground/10 hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">as</td><td className="py-2 pr-6">&apos;p&apos;</td><td className="py-2">HTML element to render. Accepts any valid React element type. (<code className="font-mono">OpszStepperText</code> only)</td></tr>
							</tbody>
						</table>
					</div>
				</div>
			</section>

			<SiteFooter current="opszStepper" npmVersion={version} siteVersion={siteVersion} />

		</main>
	)
}
