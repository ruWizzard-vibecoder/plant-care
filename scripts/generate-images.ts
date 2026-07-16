/**
 * Generate lifestyle photos for plant species using fal.ai Flux 2 Pro.
 *
 * Usage:
 *   FAL_KEY=xxx npx tsx scripts/generate-images.ts [--dry-run] [--limit=N]
 *
 * Flow:
 *   1. Query DB for species without good images (no imageUrl or Wikimedia/Perenual URLs)
 *   2. Generate lifestyle photo via fal.ai
 *   3. Download image → save to plant-care container uploads/species/
 *   4. Update DB imageUrl + thumbnailUrl
 *
 * Cost: ~$0.05 per image
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const FAL_KEY = process.env.FAL_KEY || "";
const FAL_URL = "https://fal.run/fal-ai/flux-2-pro";
const STATE_FILE = path.join(__dirname, "imagegen-state.json");
const IMAGES_DIR = path.join(__dirname, "generated-images");

// ─── Types ──────────────────────────────────────────────────────────────────

interface Species {
  id: string;
  scientificName: string;
  commonNameRu: string;
  commonNameEn: string | null;
  imageUrl: string | null;
  category: string | null;
}

interface GenState {
  generated: Record<string, { url: string; localFile: string; uploaded: boolean }>;
  errors: Record<string, string>;
}

// ─── Prompt templates ───────────────────────────────────────────────────────

function buildPrompt(species: Species): string {
  const name = species.commonNameEn || species.scientificName;
  const category = species.category;

  // Base prompt
  let prompt = `Beautiful ${name} (${species.scientificName}) houseplant`;

  // Category-specific setting
  switch (category) {
    case "SUCCULENTS":
      prompt += " in a minimalist ceramic pot on a wooden shelf, bright sunny windowsill";
      break;
    case "TROPICAL":
      prompt += " in a modern ceramic planter, lush green leaves, cozy living room with natural light";
      break;
    case "FERNS":
      prompt += " in a hanging macrame planter, bathroom or bright kitchen with soft filtered light";
      break;
    case "PALMS":
      prompt += " in a large floor planter in a spacious modern living room with high ceilings";
      break;
    case "CLIMBING":
      prompt += " trailing from a high shelf or hanging basket, cozy apartment interior";
      break;
    case "FLOWERING":
      prompt += " with blooming flowers in an elegant ceramic pot, bright windowsill, home interior";
      break;
    case "LARGE":
      prompt += " as a statement floor plant in a modern apartment with natural daylight";
      break;
    default:
      prompt += " in a stylish ceramic pot on a side table, cozy modern apartment";
  }

  prompt += ", professional interior photography, shallow depth of field, warm natural window light, bokeh background, lifestyle photo, 4k quality";

  return prompt;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function loadState(): GenState {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
  }
  return { generated: {}, errors: {} };
}

function saveState(state: GenState) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function generateImage(prompt: string): Promise<string> {
  const res = await fetch(FAL_URL, {
    method: "POST",
    headers: {
      Authorization: `Key ${FAL_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      image_size: "landscape_4_3",
      output_format: "jpeg",
      safety_tolerance: 5,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`fal.ai error ${res.status}: ${text}`);
  }

  const data = await res.json() as { images: { url: string }[] };
  if (!data.images?.[0]?.url) {
    throw new Error("No image URL in fal.ai response");
  }

  return data.images[0].url;
}

async function downloadImage(url: string, filepath: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(filepath, buffer);
}

function getSpeciesFromDB(): Species[] {
  const result = execSync(
    `ssh nas "docker exec plant-postgres psql -U plant -d plant_care -t -A -F'|' -c \\"SELECT id, \\\\\\\"scientificName\\\\\\\", \\\\\\\"commonNameRu\\\\\\\", COALESCE(\\\\\\\"commonNameEn\\\\\\\",''), COALESCE(\\\\\\\"imageUrl\\\\\\\",''), COALESCE(category::text,'') FROM plant_species ORDER BY \\\\\\\"scientificName\\\\\\\"\\""`,
    { encoding: "utf-8", timeout: 15000 }
  ).trim();

  return result.split("\n").filter(Boolean).map((line) => {
    const [id, scientificName, commonNameRu, commonNameEn, imageUrl, category] = line.split("|");
    return {
      id,
      scientificName,
      commonNameRu,
      commonNameEn: commonNameEn || null,
      imageUrl: imageUrl || null,
      category: category || null,
    };
  });
}

function needsImage(species: Species): boolean {
  if (!species.imageUrl) return true;
  // Perenual signed URLs expire
  if (species.imageUrl.includes("wasabisys.com/perenual")) return true;
  // Keep Wikimedia URLs (from original seed) — they're permanent
  if (species.imageUrl.includes("wikimedia.org")) return false;
  // Keep already-generated local URLs
  if (species.imageUrl.startsWith("/api/upload/species/")) return false;
  return true;
}

function uploadToContainer(localFile: string, filename: string): void {
  // Create species directory in plant-care container and copy file
  execSync(
    `ssh nas "docker exec plant-care mkdir -p /app/uploads/species"`,
    { timeout: 10000 }
  );
  // Copy via stdin pipe
  execSync(
    `cat "${localFile}" | ssh nas "docker exec -i plant-care sh -c 'cat > /app/uploads/species/${filename}'"`,
    { timeout: 30000 }
  );
}

function updateDBImageUrl(speciesId: string, filename: string): void {
  const imageUrl = `/api/upload/species/${filename}`;
  execSync(
    `ssh nas "docker exec plant-postgres psql -U plant -d plant_care -c \\"UPDATE plant_species SET \\\\\\\"imageUrl\\\\\\\" = '${imageUrl}', \\\\\\\"thumbnailUrl\\\\\\\" = '${imageUrl}' WHERE id = '${speciesId}'\\\""`,
    { timeout: 10000 }
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const limitArg = args.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1]) : Infinity;

  console.log("[fal.ai] Fetching species from DB...");
  const allSpecies = getSpeciesFromDB();
  console.log(`[fal.ai] Total species: ${allSpecies.length}`);

  const toGenerate = allSpecies.filter(needsImage);
  console.log(`[fal.ai] Need images: ${toGenerate.length}`);
  console.log(`[fal.ai] Already have good images: ${allSpecies.length - toGenerate.length}`);

  if (dryRun) {
    console.log("\n[DRY RUN] Would generate images for:");
    for (const s of toGenerate.slice(0, limit)) {
      console.log(`  ${s.scientificName} (${s.commonNameRu}) — ${s.category}`);
      console.log(`    Prompt: ${buildPrompt(s)}`);
    }
    console.log(`\nEstimated cost: ~$${(Math.min(toGenerate.length, limit) * 0.05).toFixed(2)}`);
    return;
  }

  // Ensure local dir exists
  if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

  const state = loadState();
  let generated = 0;
  let errors = 0;

  for (const species of toGenerate) {
    if (generated >= limit) {
      console.log(`\n[fal.ai] Reached limit of ${limit} images.`);
      break;
    }

    // Skip if already generated and uploaded
    if (state.generated[species.id]?.uploaded) {
      console.log(`  Skip ${species.scientificName}: already done`);
      continue;
    }

    const slug = slugify(species.scientificName);
    const filename = `${slug}.jpg`;
    const localFile = path.join(IMAGES_DIR, filename);

    console.log(`\n[${generated + 1}] ${species.scientificName} (${species.commonNameRu})`);

    try {
      // Step 1: Generate
      const prompt = buildPrompt(species);
      console.log(`  Prompt: ${prompt.slice(0, 80)}...`);

      let imageUrl: string;
      if (state.generated[species.id]?.url && !state.generated[species.id]?.uploaded) {
        imageUrl = state.generated[species.id].url;
        console.log("  Using cached fal.ai URL");
      } else {
        console.log("  Generating via fal.ai...");
        imageUrl = await generateImage(prompt);
        console.log(`  Generated: ${imageUrl.slice(0, 60)}...`);
      }

      // Step 2: Download locally
      if (!fs.existsSync(localFile)) {
        console.log("  Downloading...");
        await downloadImage(imageUrl, localFile);
        const sizeKB = Math.round(fs.statSync(localFile).size / 1024);
        console.log(`  Downloaded: ${sizeKB}KB`);
      }

      // Step 3: Upload to plant-care container
      console.log("  Uploading to container...");
      uploadToContainer(localFile, filename);

      // Step 4: Update DB
      console.log("  Updating DB...");
      updateDBImageUrl(species.id, filename);

      state.generated[species.id] = { url: imageUrl, localFile: filename, uploaded: true };
      delete state.errors[species.id];
      saveState(state);

      generated++;
      console.log(`  Done! (${generated}/${Math.min(toGenerate.length, limit)})`);

      // Small delay between generations
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ERROR: ${msg}`);
      state.errors[species.id] = msg;
      saveState(state);
      errors++;

      // If fal.ai error, wait a bit longer
      if (msg.includes("fal.ai")) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  console.log(`\n─── Summary ───`);
  console.log(`  Generated: ${generated}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Estimated cost: ~$${(generated * 0.05).toFixed(2)}`);
  saveState(state);
}

main().catch(console.error);
