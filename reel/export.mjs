// Renders index.html frame by frame (1080×1920) and encodes it with ffmpeg: npm run export
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";

const page_url = new URL("./index.html?export", import.meta.url).href;
const out = process.argv[2] || "out/reel.mp4";
mkdirSync(new URL("./out/", import.meta.url), { recursive: true });

const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
});
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await page.goto(page_url);
await page.evaluate(() => document.fonts.ready);
const { DURATION, FPS } = await page.evaluate(() => window.REEL);
const total = Math.round(DURATION * FPS);

const ffmpeg = spawn("ffmpeg", [
    "-y", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "png", "-i", "-",
    "-f", "lavfi", "-t", String(DURATION), "-i", "anullsrc=r=48000:cl=stereo",
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-shortest", "-movflags", "+faststart", out,
], { stdio: ["pipe", "inherit", "inherit"] });

const stage = page.locator("#stage");
for (let f = 0; f < total; f++) {
    await page.evaluate(t => window.renderAt(t), f / FPS);
    const png = await stage.screenshot({ type: "png" });
    if (!ffmpeg.stdin.write(png)) await new Promise(r => ffmpeg.stdin.once("drain", r));
    if (f % FPS === 0) process.stdout.write(`\rframe ${f}/${total}`);
}
ffmpeg.stdin.end();
await browser.close();
await new Promise((resolve, reject) => ffmpeg.on("close", c => c === 0 ? resolve() : reject(new Error("ffmpeg exit " + c))));
console.log(`\nSaved ${out}`);
