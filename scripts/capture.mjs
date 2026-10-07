// README Studio web visual capture for opszStepper.
// Serves scripts/capture.html over HTTP, renders it in headless Chromium with PT Serif and
// PT Serif Caption loaded from Google Fonts and the built library (dist/core.js) choosing the
// family, then screenshots each `.scene` element to assets/<id>.png with transparent corners.
// With SITE_URL set to a LOCAL build of the site, it also captures assets/demo.png: the live
// demo at 12px with the one-cut comparison on.
//
// Run:   npm run build && node scripts/capture.mjs
//        SITE_URL=http://localhost:5969 node scripts/capture.mjs   (after: cd site && npx next build && npx next start -p 5969)
// Setup: npm i -D playwright && npx playwright install chromium
//
// Assets live in assets/ and are kept OUT of the npm tarball (package "files": ["dist"]).

import { createServer } from "node:http"
import { readFile } from "node:fs/promises"
import { extname, join } from "node:path"
import { chromium } from "playwright"

const ROOT = process.cwd()
const MIME = {
	".html": "text/html",
	".js": "application/javascript",
	".mjs": "application/javascript",
	".css": "text/css",
	".json": "application/json",
	".png": "image/png",
	".svg": "image/svg+xml",
	".woff2": "font/woff2",
}

// Tiny static server so ES modules and font requests have a real origin.
const server = createServer(async (req, res) => {
	try {
		const url = decodeURIComponent((req.url ?? "/").split("?")[0])
		const path = join(ROOT, url === "/" ? "/scripts/capture.html" : url)
		const data = await readFile(path)
		res.writeHead(200, { "Content-Type": MIME[extname(path)] ?? "application/octet-stream" })
		res.end(data)
	} catch {
		res.writeHead(404)
		res.end("not found")
	}
})

await new Promise((r) => server.listen(0, r))
const { port } = server.address()

const browser = await chromium.launch()
const page = await browser.newPage({ deviceScaleFactor: 2 })
await page.goto(`http://localhost:${port}/scripts/capture.html`, { waitUntil: "networkidle" })
await page.evaluate(() => window.__ready ?? document.fonts.ready)
await page.waitForTimeout(700) // let the optical-cut glyphs settle before shooting

// Refuse to shoot if the library didn't pick the families the captions claim.
const applied = await page.$$eval(".stepped", (els) => els.map((e) => `${getComputedStyle(e).fontSize} ${e.style.fontFamily}`))
console.log("applied:", applied.join(" | "))
if (!applied.every((a) => (parseFloat(a) < 16) === a.includes("Caption"))) throw new Error("Unexpected cut applied")

const ids = await page.$$eval(".scene", (els) => els.map((e) => e.id))
for (const id of ids) {
	const el = await page.$(`#${id}`)
	// omitBackground keeps the area outside each card's border-radius transparent.
	await el.screenshot({ path: `assets/${id}.png`, omitBackground: true })
	console.log("captured assets/%s.png", id)
}

/** Captures the live demo from a local site build: 12px, comparison panel on. */
async function captureDemo(siteUrl) {
	if (!/^https?:\/\/(localhost|127\.0\.0\.1)[:/]/.test(siteUrl)) throw new Error("SITE_URL must be a local build")
	const site = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 1180, height: 900 } })
	await site.goto(siteUrl, { waitUntil: "networkidle" })
	await site.evaluate(() => document.fonts.ready)
	const decline = site.getByRole("button", { name: "Decline" })
	if (await decline.isVisible().catch(() => false)) await decline.click()
	await site.getByRole("button", { name: /^Compare with/ }).click()
	const slider = site.getByRole("slider", { name: "Font Size" })
	await slider.focus()
	for (let i = 0; i < 20; i++) await site.keyboard.press("ArrowLeft") // 32px → 12px
	await site.locator("body").click({ position: { x: 5, y: 5 } }) // drop the slider's focus ring
	await site.waitForTimeout(600)
	const size = await slider.inputValue()
	if (size !== "12") throw new Error(`Expected the demo at 12px, got ${size}px`)
	const demo = site.locator('section[aria-label="Live demo"] > div')
	await demo.screenshot({ path: "assets/demo.png" })
	console.log("captured assets/demo.png")
	await site.close()
}

if (process.env.SITE_URL) await captureDemo(process.env.SITE_URL)

await browser.close()
server.close()
