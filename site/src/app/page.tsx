// Landing page for opszstepper.com: hero, live demo, how it works, usage and options, no-code ports.
import Demo from "@/components/Demo"
import Hero from "@/components/Hero"
import CodeBlock from "@/components/CodeBlock"
import { version } from "../../../package.json"
import { version as siteVersion } from "../../package.json"
import SiteFooter from "../components/SiteFooter"
import PortsSection from "../components/PortsSection"

export default function Home() {
	return (
		<main className="flex flex-col items-center px-6 py-20 gap-24">

			{/* Hero */}
			<Hero
				eyebrow="optical-size stepping"
				title={[{ text: "Optical cuts," }, { text: "on demand.", italic: true, subtle: true }]}
				titleFontFamily="var(--font-cormorant-display), serif"
				titleOpsz={null}
				install="@overpunch/opszstepper"
				github="https://github.com/over-punch/opszStepper"
				tech={["TypeScript", "Zero dependencies", "React + Vanilla JS"]}
			>
				<p className="text-base leading-relaxed max-w-lg">
					Type designers create separate optical-size cuts for the same reason optometrists prescribe different lenses for reading and driving — the geometry that works at 12px becomes wrong at 72px. When those cuts ship as separate families rather than an <code className="text-sm font-mono">opsz</code> axis, the browser can&rsquo;t pick between them. Opsz Stepper reads the current font-size and swaps to the correct family, automatically.
				</p>
			</Hero>

			{/* Demo */}
			<section className="w-full max-w-2xl lg:max-w-5xl flex flex-col gap-4" aria-label="Live demo">
				<h2 className="text-xs uppercase tracking-[0.18em] font-medium text-muted">Live demo — drag the sliders</h2>
				<div className="rounded-xl -mx-6 px-6 md:-mx-8 md:px-8 py-8" style={{ background: "var(--panel)", overflow: 'hidden' }}>
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
						<p className="font-semibold text-base">It re-checks when the size can change</p>
						<p>A font-size can change without the element&rsquo;s box changing, so a ResizeObserver alone isn&rsquo;t enough. Opsz Stepper re-reads the computed font-size when the element or its parent resizes, when a <code className="text-xs font-mono">class</code> or <code className="text-xs font-mono">style</code> attribute changes anywhere on the page, and when the window resizes — which covers <code className="text-xs font-mono">clamp()</code>, viewport and container units, and media queries. CSS <code className="text-xs font-mono">zoom</code> and transforms don&rsquo;t change the computed size, so they don&rsquo;t change the cut.</p>
					</div>
					<div className="flex flex-col gap-3">
						<p className="font-semibold text-base">Hysteresis prevents oscillation</p>
						<p>A fluid font-size that hovers around a boundary — say, 16px — would flip between cuts as the layout shifts by a fraction of a pixel. The hysteresis dead zone prevents this: with the default of 1px, a cut that ends at 16px is kept until the size reaches 17px, and the next cut is kept until it drops below 15px.</p>
					</div>
					<div className="flex flex-col gap-3">
						<p className="font-semibold text-base">Works with any font family</p>
						<p>Cuts are just CSS font-family strings. Google Fonts, locally hosted <code className="text-xs font-mono">@font-face</code> declarations, cloud fonts, Adobe Fonts — anything you can name in CSS works as a cut, including a <code className="text-xs font-mono">var(--font-…)</code> from next/font, which is how this page loads PT Serif and PT Serif Caption. Loading the fonts is left to you.</p>
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
						<CodeBlock code={`import { OpszStepperText } from '@overpunch/opszstepper'

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
						<CodeBlock code={`import { useOpszStepper } from '@overpunch/opszstepper'

const ref = useOpszStepper({ cuts, hysteresis: 2, onCutChange: (cut) => console.log(cut) })
<p ref={ref}>Your text</p>`} />
					</div>
					<div className="flex flex-col gap-3">
						<p className="text-muted">Vanilla JS</p>
						<CodeBlock code={`// The /core entry has no React import
import { startOpszStepper, applyOpszStepper, removeOpszStepper } from '@overpunch/opszstepper/core'

const el = document.querySelector('h1')
const cuts = [
  { family: '"PT Serif Caption", serif', maxSize: 16 },
  { family: '"PT Serif", serif', minSize: 16 },
]

// Live — applies the right cut now and again whenever the font-size may have changed
const stop = startOpszStepper(el, { cuts })
stop() // stops watching and restores the original styles (same as removeOpszStepper)

// One-shot — apply the cut for the current font-size and return (no hysteresis)
applyOpszStepper(el, { cuts })
removeOpszStepper(el) // restore the original styles`} />
					</div>
					<div className="flex flex-col gap-3">
						<p className="text-muted">Variable font — single opsz axis</p>
						<CodeBlock code={`// For variable fonts with an opsz axis (e.g. Fraunces, Amstelvar), set opszValue per cut.
// The tool writes font-variation-settings: "opsz" <value> instead of swapping font-family.
import { OpszStepperText } from '@overpunch/opszstepper'

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
						<div className="overflow-x-auto">
						<table className="w-full text-xs" aria-label="OpszStepper options reference">
							<thead><tr className="text-subtle text-left"><th className="pb-2 pr-6 font-normal">Option</th><th className="pb-2 pr-6 font-normal">Default</th><th className="pb-2 font-normal">Description</th></tr></thead>
							<tbody className="text-muted zebra">
								<tr className="hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">cuts</td><td className="py-2 pr-6">required</td><td className="py-2">Array of <code className="font-mono">OpszStepperCut</code> objects, each with a <code className="font-mono">family</code> string and optional <code className="font-mono">minSize</code> (inclusive) / <code className="font-mono">maxSize</code> (exclusive) in px. Any order.</td></tr>
								<tr className="hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">cuts[n].opszValue</td><td className="py-2 pr-6">—</td><td className="py-2">Optional <code className="font-mono">opsz</code> axis value to write as <code className="font-mono">font-variation-settings</code>. Use for variable fonts instead of swapping <code className="font-mono">font-family</code>.</td></tr>
								<tr className="hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">cuts[n].opszMin / opszMax</td><td className="py-2 pr-6">—</td><td className="py-2">Clamp bounds for the <code className="font-mono">opsz</code> axis value, matching the font&apos;s <code className="font-mono">fvar</code> range.</td></tr>
								<tr className="hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">hysteresis</td><td className="py-2 pr-6">1</td><td className="py-2">Dead zone in px at each cut boundary. Prevents oscillation when font-size hovers at a threshold. Live watching only; the one-shot <code className="font-mono">applyOpszStepper</code> ignores it.</td></tr>
								<tr className="hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">onCutChange</td><td className="py-2 pr-6">—</td><td className="py-2">Callback fired each time the active cut changes. Receives the new <code className="font-mono">OpszStepperCut</code> object.</td></tr>
								<tr className="hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">as</td><td className="py-2 pr-6">&apos;p&apos;</td><td className="py-2">HTML element to render. Accepts any valid React element type. Other props (<code className="font-mono">className</code>, <code className="font-mono">style</code>, ARIA) are passed through. (<code className="font-mono">OpszStepperText</code> only)</td></tr>
							</tbody>
						</table>
						</div>
					</div>
				</div>
			</section>

			<PortsSection
				npm="@overpunch/opszstepper"
				bundle="opszstepper"
				attr="data-opszstepper" figma="full"
				framerComponent="OpszStepper"
				repo="over-punch/OpszStepper"
			/>

			<SiteFooter current="opszStepper" npmVersion={version} siteVersion={siteVersion} />

		</main>
	)
}
