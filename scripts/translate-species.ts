/**
 * Translate plant species data into high-quality Russian using Claude Haiku.
 *
 * Usage:
 *   npx tsx scripts/translate-species.ts [--limit=N] [--force] [--dry-run]
 *
 * Reads: perenual-state.json (cached Perenual data)
 * Writes: translation-state.json (translations, resumable)
 *
 * For species with full Perenual details: rich translation using all data.
 * For premium species (list-only): translation from scientific + common name.
 */

import * as fs from "fs";
import * as path from "path";
import { ProxyAgent } from "undici";

const API_KEY = process.env.ANTHROPIC_API_KEY || "";
const MODEL = "claude-haiku-4-5-20251001";
const API_URL = "https://api.anthropic.com/v1/messages";
const PROXY_URL = process.env.HTTPS_PROXY || "";
const dispatcher = PROXY_URL ? new ProxyAgent(PROXY_URL) : undefined;

const STATE_FILE = path.join(__dirname, "translation-state.json");
const PERENUAL_FILE = path.join(__dirname, "perenual-state.json");

// ─── Types ──────────────────────────────────────────────────────────────────

interface Translation {
  commonNameRu: string;
  descriptionRu: string;
  propagationRu: string[];
  cycleRu: string | null;
  careLevelRu: string | null;
  maintenanceRu: string | null;
  plantTypeRu: string | null;
  timestamp: string;
}

interface TranslationState {
  translations: Record<string, Translation>;
  errors: Record<string, string>;
  requestCount: number;
}

interface PerenualDetail {
  id: number;
  common_name: string;
  scientific_name: string[];
  family: string | null;
  type: string | null;
  cycle: string | null;
  watering: string | null;
  sunlight: string[] | null;
  tropical: boolean;
  growth_rate: string | null;
  care_level: string | null;
  maintenance: string | null;
  poisonous_to_humans: boolean;
  poisonous_to_pets: boolean;
  description: string | null;
  origin: string[] | null;
  drought_tolerant: boolean;
  flowers: boolean;
  flower_color: string | null;
  leaf_color: string[] | null;
  medicinal: boolean;
  propagation: string[] | null;
}

interface PerenualListItem {
  id: number;
  common_name: string;
  scientific_name: string[];
  family: string | null;
}

interface PerenualState {
  listPages: Record<number, PerenualListItem[]>;
  details: Record<number, PerenualDetail>;
}

// ─── System prompt ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a professional botanical translator and writer specializing in Russian horticultural texts for a houseplant care app.

Rules for Russian plant names:
1. Use established Russian botanical names, NOT transliterations. Example: "Snake Plant" → "Сансевиерия", NOT "Снейк плант".
2. For cultivars: Russian genus name + cultivar name in quotes. Example: Begonia 'Gryphon' → "Бегония Грифон".
3. For species with well-known Russian names, use them. Example: Ficus elastica → "Фикус каучуконосный".
4. If a species has NO established Russian name, use the Russian genus name.

Rules for descriptions:
1. Write 2-3 informative paragraphs (150-250 words total) in natural Russian.
2. Include: origin/family context, distinctive visual features, care highlights, interesting facts.
3. Write as ORIGINAL Russian botanical text — NOT a translation. It should read naturally as if written by a Russian botanist.
4. Use professional but accessible language. Mention the Latin name once.
5. End with a practical care tip or interesting fact.

Rules for other fields:
- propagationRu: Use standard Russian botanical terms (e.g., "Стеблевые черенки", "Деление куста", "Семена", "Воздушные отводки", "Листовые черенки")
- cycleRu: "Многолетнее", "Однолетнее", or "Двулетнее"
- careLevelRu: "Лёгкий", "Средний", or "Сложный"
- maintenanceRu: "Низкий", "Средний", or "Высокий"
- plantTypeRu: Translate to Russian (e.g., "Вечнозелёный кустарник", "Суккулент", "Травянистый многолетник")

Respond ONLY with valid JSON. No markdown fences, no comments.`;

// ─── API call ───────────────────────────────────────────────────────────────

async function callClaude(userPrompt: string): Promise<string> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    }),
    // @ts-expect-error undici dispatcher for proxy
    dispatcher,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as {
    content: { type: string; text: string }[];
  };
  return data.content[0]?.text || "";
}

// ─── Build prompt ───────────────────────────────────────────────────────────

function buildPromptForDetailed(scientificName: string, detail: PerenualDetail): string {
  const lines = [
    `Translate this plant information into Russian:`,
    ``,
    `Scientific name: ${scientificName}`,
    `Common name (English): ${detail.common_name}`,
    `Family: ${detail.family || "unknown"}`,
  ];

  if (detail.description) lines.push(`Description: ${detail.description}`);
  if (detail.type) lines.push(`Plant type: ${detail.type}`);
  if (detail.cycle) lines.push(`Life cycle: ${detail.cycle}`);
  if (detail.care_level) lines.push(`Care level: ${detail.care_level}`);
  if (detail.maintenance) lines.push(`Maintenance: ${detail.maintenance}`);
  if (detail.origin?.length) lines.push(`Origin: ${detail.origin.join(", ")}`);
  if (detail.propagation?.length) lines.push(`Propagation: ${detail.propagation.join(", ")}`);
  if (detail.watering) lines.push(`Watering: ${detail.watering}`);
  if (detail.sunlight?.length) lines.push(`Sunlight: ${detail.sunlight.join(", ")}`);
  if (detail.flowers) lines.push(`Flowers: yes${detail.flower_color ? `, color: ${detail.flower_color}` : ""}`);
  if (detail.drought_tolerant) lines.push(`Drought tolerant: yes`);
  if (detail.medicinal) lines.push(`Medicinal: yes`);
  if (detail.poisonous_to_pets) lines.push(`Toxic to pets: yes`);
  if (detail.poisonous_to_humans) lines.push(`Toxic to humans: yes`);
  if (detail.tropical) lines.push(`Tropical: yes`);
  if (detail.growth_rate) lines.push(`Growth rate: ${detail.growth_rate}`);

  lines.push(``);
  lines.push(`Respond as JSON:`);
  lines.push(`{"commonNameRu":"...","descriptionRu":"...","propagationRu":["..."],"cycleRu":"...","careLevelRu":"...","maintenanceRu":"...","plantTypeRu":"..."}`);

  return lines.join("\n");
}

function buildPromptForListOnly(scientificName: string, commonName: string, family: string | null): string {
  return `Translate this plant information into Russian. Use your botanical knowledge to write a description since detailed data is not available.

Scientific name: ${scientificName}
Common name (English): ${commonName}
Family: ${family || "unknown"}

Respond as JSON:
{"commonNameRu":"...","descriptionRu":"...","propagationRu":["..."],"cycleRu":"...","careLevelRu":"...","maintenanceRu":"...","plantTypeRu":"..."}`;
}

// ─── State management ───────────────────────────────────────────────────────

function loadState(): TranslationState {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
  }
  return { translations: {}, errors: {}, requestCount: 0 };
}

function saveState(state: TranslationState) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1]) : Infinity;
  const force = args.includes("--force");
  const dryRun = args.includes("--dry-run");

  const perenual: PerenualState = JSON.parse(fs.readFileSync(PERENUAL_FILE, "utf-8"));
  const state = loadState();

  // Build list of all species to translate
  const allSpecies = Object.values(perenual.listPages).flat();
  const uniqueMap = new Map<string, { id: number; commonName: string; family: string | null; hasDetail: boolean }>();

  for (const sp of allSpecies) {
    const sciName = sp.scientific_name?.[0];
    if (!sciName) continue;
    if (uniqueMap.has(sciName)) continue;
    const hasDetail = !!perenual.details[sp.id];
    uniqueMap.set(sciName, { id: sp.id, commonName: sp.common_name, family: sp.family, hasDetail });
  }

  const speciesList = Array.from(uniqueMap.entries());
  console.log(`Total unique species: ${speciesList.length}`);
  console.log(`With details: ${speciesList.filter(([, v]) => v.hasDetail).length}`);
  console.log(`List-only: ${speciesList.filter(([, v]) => !v.hasDetail).length}`);
  console.log(`Already translated: ${Object.keys(state.translations).length}`);
  console.log(`Force mode: ${force}`);
  console.log(`Dry run: ${dryRun}`);
  console.log();

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const [scientificName, info] of speciesList) {
    if (processed >= limit) {
      console.log(`Limit of ${limit} reached.`);
      break;
    }

    // Skip if already translated (unless --force)
    if (state.translations[scientificName] && !force) {
      skipped++;
      continue;
    }

    const detail = perenual.details[info.id];
    const prompt = detail
      ? buildPromptForDetailed(scientificName, detail)
      : buildPromptForListOnly(scientificName, info.commonName, info.family);

    if (dryRun) {
      console.log(`[DRY] Would translate: ${scientificName} (${detail ? "detailed" : "list-only"})`);
      processed++;
      continue;
    }

    try {
      console.log(`[${processed + 1}] Translating: ${scientificName} (${detail ? "detailed" : "list-only"})...`);
      const raw = await callClaude(prompt);

      // Parse JSON response (Claude sometimes wraps in markdown)
      let jsonStr = raw.trim();
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/^```\w*\n?/, "").replace(/\n?```$/, "").trim();
      }

      const parsed = JSON.parse(jsonStr) as {
        commonNameRu: string;
        descriptionRu: string;
        propagationRu: string[];
        cycleRu: string | null;
        careLevelRu: string | null;
        maintenanceRu: string | null;
        plantTypeRu: string | null;
      };

      // Validate required fields
      if (!parsed.commonNameRu || !parsed.descriptionRu) {
        throw new Error("Missing required fields: commonNameRu or descriptionRu");
      }

      state.translations[scientificName] = {
        ...parsed,
        timestamp: new Date().toISOString(),
      };
      state.requestCount++;

      // Log a preview
      console.log(`  → ${parsed.commonNameRu} (${parsed.descriptionRu.substring(0, 60)}...)`);

      // Save after each successful translation
      saveState(state);
      processed++;

      // Small delay to avoid burst rate limits
      await new Promise((r) => setTimeout(r, 200));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ERROR: ${msg}`);
      state.errors[scientificName] = msg;
      saveState(state);
      errors++;
      processed++;

      // If API error, wait a bit longer
      if (msg.includes("API error")) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  console.log(`\n─── Summary ───`);
  console.log(`Processed: ${processed}`);
  console.log(`Skipped (already done): ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total translated: ${Object.keys(state.translations).length}`);
  console.log(`Total API requests: ${state.requestCount}`);
}

main().catch(console.error);
