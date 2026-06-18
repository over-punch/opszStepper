// README Studio web visual capture for opszStepper.
// Serves scripts/capture.html over HTTP, renders it in headless Chromium with
// the three real Cormorant optical cuts loaded from Google Fonts, then
// screenshots each `.scene` element to assets/<id>.png with transparent corners.
//
// Run:   node scripts/capture.mjs
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

const ids = await page.$$eval(".scene", (els) => els.map((e) => e.id))
for (const id of ids) {
	const el = await page.$(`#${id}`)
	// omitBackground keeps the area outside each card's border-radius transparent.
	await el.screenshot({ path: `assets/${id}.png`, omitBackground: true })
	console.log("captured assets/%s.png", id)
}

await browser.close()
server.close()
