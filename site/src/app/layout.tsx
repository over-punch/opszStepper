// Root layout for opszstepper.com: metadata, the demo's font families (next/font), header and JSON-LD.
import type { Metadata } from "next"
import "./globals.css"
import { Inter, Cormorant, Cormorant_Garamond, Cormorant_SC, PT_Serif, PT_Serif_Caption } from "next/font/google"
import SiteHeader from "../components/SiteHeader"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

// Three Cormorant sibling families — downloaded at build time, served locally. They are not optical sizes
// (Cormorant SC is small caps); the demo offers them as the "obvious swap" option and the hero title uses Cormorant.
// Weights 300 and 400 only — 600/700 are unused by the demo and copy
const cormorantDisplay = Cormorant({
	subsets: ["latin"],
	weight: ["300", "400"],
	style: ["normal", "italic"],
	variable: "--font-cormorant-display",
	display: "swap",
})

const cormorantGaramond = Cormorant_Garamond({
	subsets: ["latin"],
	weight: ["300", "400"],
	style: ["normal", "italic"],
	variable: "--font-cormorant-garamond",
	display: "swap",
})

const cormorantSC = Cormorant_SC({
	subsets: ["latin"],
	weight: ["300", "400"],
	variable: "--font-cormorant-sc",
	display: "swap",
})

// PT Serif and PT Serif Caption: one design drawn at two optical sizes and shipped as two families,
// which is the case opszStepper exists for. The demo's default pair.
const ptSerif = PT_Serif({
	subsets: ["latin"],
	weight: ["400"],
	variable: "--font-pt-serif",
	display: "swap",
})

const ptSerifCaption = PT_Serif_Caption({
	subsets: ["latin"],
	weight: ["400"],
	variable: "--font-pt-serif-caption",
	display: "swap",
})

// Stable module-level join — avoids per-request array allocation in RootLayout
const FONT_CLASSES = [
	inter.variable,
	cormorantDisplay.variable,
	cormorantGaramond.variable,
	cormorantSC.variable,
	ptSerif.variable,
	ptSerifCaption.variable,
].join(" ")

/** Shared description used across meta, OG, and Twitter cards */
const DESCRIPTION = "Automatically swap between a typeface’s optical-size families (Caption, Text, Display) as font-size changes. Fills the gap CSS font-optical-sizing can’t cover. React, vanilla JS, zero dependencies."

export const metadata: Metadata = {
	title: "Opsz Stepper — Optical font family hot-swap by font-size",
	icons: { icon: "/icon.svg", shortcut: "/icon.svg", apple: "/icon.svg" },
	description: DESCRIPTION,
	keywords: ["optical size", "font-size", "opsz", "optical cut", "font-family", "typography", "TypeScript", "npm", "react", "variable font"],
	openGraph: {
		title: "Opsz Stepper — Optical font family hot-swap by font-size",
		description: DESCRIPTION,
		url: "https://opszstepper.com",
		siteName: "Opsz Stepper",
		type: "website",
		images: [{ url: "https://opszstepper.com/opengraph-image.png", width: 1200, height: 630, alt: "Opsz Stepper — Optical font family hot-swap by font-size" }],
	},
	twitter: {
		card: "summary_large_image",
		title: "Opsz Stepper — Optical font family hot-swap by font-size",
		description: DESCRIPTION,
		images: ["https://opszstepper.com/opengraph-image.png"],
	},
	metadataBase: new URL("https://opszstepper.com"),
	alternates: { canonical: "https://opszstepper.com" },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en" className={`h-full antialiased ${FONT_CLASSES}`}>
			<body className="min-h-full flex flex-col">
				<SiteHeader current="opszStepper" githubUrl="https://github.com/over-punch/opszStepper" />
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{ __html: JSON.stringify({
						"@context": "https://schema.org",
						"@type": "SoftwareApplication",
						"name": "Opsz Stepper",
						"url": "https://opszstepper.com",
						"description": DESCRIPTION,
						"applicationCategory": "DeveloperApplication",
						"operatingSystem": "Any",
						"offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
						"license": "https://opensource.org/licenses/MIT",
					}) }}
				/>
				{children}
			</body>
		</html>
	)
}
