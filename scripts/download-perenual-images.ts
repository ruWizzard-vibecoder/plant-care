/**
 * Re-fetch Perenual details to get fresh signed image URLs, then download images locally.
 *
 * Usage:
 *   npx tsx scripts/download-perenual-images.ts [--dry-run]
 *
 * Downloads to scripts/images/ directory, then bulk uploads to container.
 * Budget: 100 API requests/day.
 */

import * as fs from "fs";
import * as path from "path";
import { pipeline } from "stream/promises";
import { Readable } from "stream";

const PERENUAL_KEY = process.env.PERENUAL_API_KEY || "";
const BASE_URL = "https://perenual.com/api/v2";
const STATE_FILE = path.join(__dirname, "perenual-state.json");
const IMG_STATE_FILE = path.join(__dirname, "image-download-state.json");
const IMG_DIR = path.join(__dirname, "images");

interface ImageState {
  lastRun: string;
  requestCount: number;
  downloaded: Record<string, { file: string; thumb?: string }>;
  failed: string[];
}

function loadState(): any {
  return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
}

function saveState(state: any) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function loadImageState(): ImageState {
  if (fs.existsSync(IMG_STATE_FILE)) {
    return JSON.parse(fs.readFileSync(IMG_STATE_FILE, "utf-8"));
  }
  return { lastRun: "", requestCount: 0, downloaded: {}, failed: [] };
}

function saveImageState(state: ImageState) {
  fs.writeFileSync(IMG_STATE_FILE, JSON.stringify(state, null, 2));
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[''""]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

async function downloadImage(url: string, destPath: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    if (!res.ok || !res.body) {
      console.error(`    Download failed: ${res.status} ${res.statusText}`);
      return false;
    }
    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const fileStream = fs.createWriteStream(destPath);
    await pipeline(Readable.fromWeb(res.body as any), fileStream);
    return true;
  } catch (err: any) {
    console.error(`    Download error: ${err.message}`);
    return false;
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const state = loadState();
  const imgState = loadImageState();

  // Reset API counter if new day
  const today = new Date().toISOString().slice(0, 10);
  if (state.lastRun !== today) {
    state.requestCount = 0;
    state.lastRun = today;
  }
  if (imgState.lastRun !== today) {
    imgState.requestCount = 0;
    imgState.lastRun = today;
  }

  if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR, { recursive: true });

  // Collect species IDs that need images
  const needsDownload: Array<{ id: number; sciName: string }> = [];
  for (const [idStr, detail] of Object.entries(state.details) as [string, any][]) {
    const sciName = detail.scientific_name?.[0];
    if (!sciName) continue;
    const slug = slugify(sciName);
    // Skip if already downloaded
    if (imgState.downloaded[idStr]) continue;
    // Skip if no image in API data
    if (!detail.default_image?.medium_url) continue;
    needsDownload.push({ id: parseInt(idStr), sciName });
  }

  console.log(`[Images] ${Object.keys(imgState.downloaded).length} already downloaded`);
  console.log(`[Images] ${needsDownload.length} need fresh URLs + download`);
  console.log(`[API] Requests used today: ${state.requestCount}/100\n`);

  if (dryRun) {
    console.log("[DRY RUN] Would fetch and download these species:");
    for (const { id, sciName } of needsDownload.slice(0, 20)) {
      console.log(`  ${sciName} (id=${id})`);
    }
    if (needsDownload.length > 20) console.log(`  ... and ${needsDownload.length - 20} more`);
    return;
  }

  let fetched = 0;
  let downloaded = 0;

  for (const { id, sciName } of needsDownload) {
    if (state.requestCount >= 100) {
      console.log(`\n[API] Rate limit reached (${fetched} fetched today). Run again tomorrow.`);
      break;
    }

    const slug = slugify(sciName);
    console.log(`[${fetched + 1}/${needsDownload.length}] ${sciName} (id=${id})`);

    // Re-fetch detail for fresh signed URL
    try {
      const url = `${BASE_URL}/species/details/${id}?key=${PERENUAL_KEY}`;
      const detail: any = await fetchJSON(url);
      state.requestCount++;
      fetched++;

      // Update cached details with fresh data
      state.details[id] = detail;

      const img = detail.default_image;
      if (!img?.medium_url) {
        console.log("  No image in API response, skipping");
        continue;
      }

      // Download medium image
      const ext = "jpg";
      const fileName = `${slug}.${ext}`;
      const filePath = path.join(IMG_DIR, fileName);

      console.log("  Downloading medium...");
      const ok = await downloadImage(img.medium_url, filePath);
      if (!ok) {
        imgState.failed.push(`${id}:${sciName}`);
        saveImageState(imgState);
        continue;
      }

      // Download thumbnail
      let thumbName: string | undefined;
      if (img.thumbnail || img.small_url) {
        thumbName = `${slug}_thumb.${ext}`;
        const thumbPath = path.join(IMG_DIR, thumbName);
        console.log("  Downloading thumbnail...");
        await downloadImage(img.thumbnail || img.small_url, thumbPath);
      }

      imgState.downloaded[id] = { file: fileName, thumb: thumbName };
      downloaded++;
      saveImageState(imgState);
      saveState(state); // Save fresh URLs

      // Polite delay (Perenual rate limits aggressively)
      await new Promise(r => setTimeout(r, 5000));
    } catch (err: any) {
      if (err.message.includes("429")) {
        console.log("  Rate limited — waiting 5min before retry...");
        await new Promise(r => setTimeout(r, 300000));
        // Don't mark as failed, will retry on next run
        continue;
      }
      console.error(`  API error: ${err.message}`);
      imgState.failed.push(`${id}:${sciName}`);
      saveImageState(imgState);
    }
  }

  console.log(`\n─── Summary ───`);
  console.log(`  Fetched: ${fetched}`);
  console.log(`  Downloaded: ${downloaded}`);
  console.log(`  Total downloaded: ${Object.keys(imgState.downloaded).length}`);
  console.log(`  Failed: ${imgState.failed.length}`);
  console.log(`  API requests used today: ${state.requestCount}/100`);
}

main().catch(console.error);
