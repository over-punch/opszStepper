import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const alt = 'Opsz Stepper — Optical font family hot-swap by font-size'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
// Mark as fully static — no runtime invocations after the initial build
export const revalidate = false

/** OG image for opszstepper.com — uses Satori with locally bundled inter-300.woff */
export default async function Image() {
	const interLight = await readFile(join(process.cwd(), 'public/fonts/inter-300.woff'))
	return new ImageResponse(
		(
			// Background matches --background: oklch(0.12 0.04 243) → #243b00
			<div style={{ background: '#243b00', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '72px 80px', fontFamily: 'Inter, sans-serif' }}>
				{/* Eyebrow label — muted (#b9c1b0) */}
				<span style={{ fontSize: 13, letterSpacing: '0.18em', color: '#b9c1b0', textTransform: 'uppercase' }}>opsz stepper</span>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
					{/* Decorative bar chart — accent colour stays, bar dim for inactive bars */}
					<div style={{ display: 'flex', gap: 12, marginBottom: 48, alignItems: 'flex-end' }}>
						{[
							{ h: 12, label: 'Micro', opacity: 0.35 },
							{ h: 28, label: 'Text', opacity: 0.6 },
							{ h: 52, label: 'Display', opacity: 0.9 },
						].map(({ h, opacity }, i) => (
							<div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
								{/* Accent colour matches hue 243 — #777c72 */}
								<div style={{ width: 60, height: h, background: `rgba(0,119,187,${opacity})`, borderRadius: 4 }} />
							</div>
						))}
					</div>
					{/* Main headline — full foreground (#f3f6f1) */}
					<div style={{ fontSize: 76, color: '#f3f6f1', lineHeight: 1.06, fontWeight: 300 }}>Opsz Stepper,</div>
					{/* Secondary headline — muted (#b9c1b0) */}
					<div style={{ fontSize: 76, color: '#b9c1b0', lineHeight: 1.06, fontWeight: 300 }}>right cut, right size.</div>
				</div>
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
					{/* Tech chips — muted (#b9c1b0) */}
					<div style={{ fontSize: 14, color: '#b9c1b0', letterSpacing: '0.04em', display: 'flex', gap: 20 }}>
						<span>TypeScript</span><span style={{ opacity: 0.4 }}>·</span>
						<span>Zero dependencies</span><span style={{ opacity: 0.4 }}>·</span>
						<span>React + Vanilla JS</span>
					</div>
					{/* Domain — subtle (#959b8e) */}
					<div style={{ fontSize: 13, color: '#959b8e', letterSpacing: '0.04em' }}>opszstepper.com</div>
				</div>
			</div>
		),
		// Cast to ArrayBuffer for explicit Satori data type compatibility
		{ ...size, fonts: [{ name: 'Inter', data: interLight.buffer as ArrayBuffer, style: 'normal', weight: 300 }] },
	)
}
