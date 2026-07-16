/**
 * Generate SQL to enrich plant_species with Perenual data + Claude translations.
 *
 * Usage:
 *   npx tsx scripts/generate-enrichment-sql.ts
 *
 * Reads: perenual-state.json, translation-state.json
 * Writes: enrichment.sql
 *
 * Apply: cat scripts/enrichment.sql | ssh nas "docker exec -i plant-postgres psql -U plant -d plant_care"
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

const PERENUAL_FILE = path.join(__dirname, "perenual-state.json");
const TRANSLATION_FILE = path.join(__dirname, "translation-state.json");
const OUTPUT_FILE = path.join(__dirname, "enrichment.sql");

function esc(s: string | null | undefined): string {
  if (!s) return "NULL";
  return "'" + s.replace(/'/g, "''") + "'";
}

function escJson(arr: unknown[]): string {
  return "'" + JSON.stringify(arr).replace(/'/g, "''") + "'::jsonb";
}

function mapWatering(w: string | null): number {
  switch (w?.toLowerCase()) {
    case "frequent": return 5;
    case "average": return 3;
    case "minimum": return 2;
    case "none": return 1;
    default: return 3;
  }
}

function mapSunlight(s: string[] | null): number {
  if (!s || !s.length) return 3;
  const p = s[0].toLowerCase();
  if (p.includes("full_sun") || p === "full sun") return 5;
  if (p.includes("sun-part") || p.includes("sun/part")) return 4;
  if (p.includes("part shade") || p.includes("part_shade")) return 3;
  if (p.includes("full shade") || p.includes("full_shade")) return 1;
  if (p.includes("filtered")) return 2;
  return 3;
}

function mapFreqDays(w: string | null, bench: { value: string; unit: string } | null): number {
  if (bench?.value && bench?.unit === "days") {
    const cleaned = bench.value.replace(/"/g, "");
    const parts = cleaned.split("-");
    if (parts.length === 2) return Math.round((parseInt(parts[0]) + parseInt(parts[1])) / 2);
    const n = parseInt(cleaned);
    if (!isNaN(n)) return n;
  }
  switch (w?.toLowerCase()) {
    case "frequent": return 3;
    case "average": return 7;
    case "minimum": return 14;
    case "none": return 30;
    default: return 7;
  }
}

function mapGrowthRate(r: string | null): string {
  switch (r?.toLowerCase()) {
    case "high": return "Быстрый";
    case "moderate": return "Умеренный";
    case "low": return "Медленный";
    default: return "Умеренный";
  }
}

function guessCategory(detail: any, name: string): string {
  const n = name.toLowerCase();
  const t = (detail?.type || "").toLowerCase();
  const d = (detail?.description || "").toLowerCase();
  if (n.includes("palm") || t.includes("palm")) return "PALMS";
  if (n.includes("fern") || t.includes("fern") || d.includes("fern")) return "FERNS";
  if (detail?.tropical) return "TROPICAL";
  if (detail?.drought_tolerant && (n.includes("cactus") || n.includes("succulent") || t === "succulent")) return "SUCCULENTS";
  if (detail?.flowers && detail?.flowering_season) return "FLOWERING";
  if (t === "vine" || t === "climber") return "CLIMBING";
  return "FOLIAGE";
}

function monthNameToNumber(m: string): number | null {
  const map: Record<string, number> = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  };
  return map[m.toLowerCase()] ?? null;
}

function genId(): string {
  return crypto.randomBytes(12).toString("base64url").slice(0, 24);
}

function main() {
  const perenual = JSON.parse(fs.readFileSync(PERENUAL_FILE, "utf-8"));
  const translations = JSON.parse(fs.readFileSync(TRANSLATION_FILE, "utf-8")).translations as Record<string, any>;

  const allSpecies = Object.values(perenual.listPages).flat() as any[];
  const uniqueMap = new Map<string, any>();
  for (const sp of allSpecies) {
    const sciName = sp.scientific_name?.[0];
    if (!sciName || uniqueMap.has(sciName)) continue;
    uniqueMap.set(sciName, sp);
  }

  const lines: string[] = [
    "-- Enrichment SQL: Perenual data + Claude translations",
    "-- Generated: " + new Date().toISOString(),
    "-- Apply: cat scripts/enrichment.sql | ssh nas \"docker exec -i plant-postgres psql -U plant -d plant_care\"",
    "",
    "BEGIN;",
    "",
  ];

  let insertCount = 0;
  let updateCount = 0;

  for (const [scientificName, listItem] of uniqueMap.entries()) {
    const detail = perenual.details[listItem.id];
    const trans = translations[scientificName];

    if (!trans) continue; // Skip if no translation

    const id = genId();
    const commonNameRu = trans.commonNameRu;
    const commonNameEn = listItem.common_name || detail?.common_name || null;
    const family = detail?.family || listItem.family || null;
    const descriptionRu = trans.descriptionRu;
    const descriptionEn = detail?.description || null;

    // Care data from Perenual details (if available)
    const waterNeed = detail ? mapWatering(detail.watering) : 3;
    const lightNeed = detail ? mapSunlight(detail.sunlight) : 3;
    const humidityNeed = detail?.tropical ? 4 : (detail?.drought_tolerant ? 2 : 3);
    const wateringFreqDays = detail ? mapFreqDays(detail.watering, detail.watering_general_benchmark) : 7;
    const growthRate = detail ? mapGrowthRate(detail.growth_rate) : null;
    const toxicToPets = detail?.poisonous_to_pets ?? false;
    const toxicToHumans = detail?.poisonous_to_humans ?? false;
    const category = detail ? guessCategory(detail, scientificName) : "FOLIAGE";

    // New enriched fields
    const plantTypeRu = trans.plantTypeRu || null;
    const cycleRu = trans.cycleRu || null;
    const careLevelRu = trans.careLevelRu || null;
    const maintenanceRu = trans.maintenanceRu || null;
    const propagationRu = trans.propagationRu || [];
    const pruningMonths = detail?.pruning_month
      ? [...new Set(detail.pruning_month.map(monthNameToNumber).filter(Boolean))]
      : [];
    const origin = detail?.origin || [];
    const flowerColor = detail?.flower_color ? [detail.flower_color] : [];
    const leafColor = detail?.leaf_color || [];
    const droughtTolerant = detail?.drought_tolerant ?? false;
    const medicinal = detail?.medicinal ?? false;
    const perenualId = listItem.id;

    // Image URL from Perenual (may be expired — Phase 5 replaces these)
    const imageUrl = detail?.default_image?.medium_url || listItem.default_image?.medium_url || null;
    const thumbnailUrl = detail?.default_image?.small_url || listItem.default_image?.small_url || null;

    // UPSERT: INSERT with ON CONFLICT UPDATE
    // For existing species: preserve hand-crafted data with COALESCE
    lines.push(`-- ${scientificName} (Perenual #${perenualId})`);
    lines.push(`INSERT INTO plant_species (`);
    lines.push(`  id, "scientificName", "commonNameRu", "commonNameEn", family, description, "descriptionEn",`);
    lines.push(`  "imageUrl", "thumbnailUrl", "waterNeed", "lightNeed", "humidityNeed",`);
    lines.push(`  "wateringFreqDays", "growthRate", "toxicToPets", "toxicToHumans", category,`);
    lines.push(`  "plantType", cycle, "careLevel", maintenance, propagation, "pruningMonths",`);
    lines.push(`  origin, "flowerColor", "leafColor", "droughtTolerant", medicinal, "perenualId"`);
    lines.push(`) VALUES (`);
    lines.push(`  ${esc(id)}, ${esc(scientificName)}, ${esc(commonNameRu)}, ${esc(commonNameEn)}, ${esc(family)},`);
    lines.push(`  ${esc(descriptionRu)}, ${esc(descriptionEn)},`);
    lines.push(`  ${esc(imageUrl)}, ${esc(thumbnailUrl)}, ${waterNeed}, ${lightNeed}, ${humidityNeed},`);
    lines.push(`  ${wateringFreqDays}, ${esc(growthRate)}, ${toxicToPets}, ${toxicToHumans}, ${esc(category)},`);
    lines.push(`  ${esc(plantTypeRu)}, ${esc(cycleRu)}, ${esc(careLevelRu)}, ${esc(maintenanceRu)},`);
    lines.push(`  ${escJson(propagationRu)}, ${escJson(pruningMonths)},`);
    lines.push(`  ${escJson(origin)}, ${escJson(flowerColor)}, ${escJson(leafColor)},`);
    lines.push(`  ${droughtTolerant}, ${medicinal}, ${perenualId}`);
    lines.push(`) ON CONFLICT ("scientificName") DO UPDATE SET`);
    // Only update fields that add new data; preserve existing hand-crafted values
    lines.push(`  "commonNameEn" = COALESCE(NULLIF(plant_species."commonNameEn", ''), EXCLUDED."commonNameEn"),`);
    lines.push(`  family = COALESCE(plant_species.family, EXCLUDED.family),`);
    // Description: only overwrite if current matches auto-generated pattern (starts with name + "(лат.")
    lines.push(`  description = CASE`);
    lines.push(`    WHEN plant_species.description IS NULL THEN EXCLUDED.description`);
    lines.push(`    WHEN plant_species.description LIKE '%' || plant_species."commonNameRu" || ' (лат.%' THEN EXCLUDED.description`);
    lines.push(`    ELSE plant_species.description`);
    lines.push(`  END,`);
    lines.push(`  "descriptionEn" = COALESCE(plant_species."descriptionEn", EXCLUDED."descriptionEn"),`);
    // Image: only update if current is NULL or expired Perenual URL
    lines.push(`  "imageUrl" = CASE`);
    lines.push(`    WHEN plant_species."imageUrl" IS NULL THEN EXCLUDED."imageUrl"`);
    lines.push(`    WHEN plant_species."imageUrl" LIKE '%wasabisys.com/perenual%' THEN EXCLUDED."imageUrl"`);
    lines.push(`    ELSE plant_species."imageUrl"`);
    lines.push(`  END,`);
    lines.push(`  "thumbnailUrl" = CASE`);
    lines.push(`    WHEN plant_species."thumbnailUrl" IS NULL THEN EXCLUDED."thumbnailUrl"`);
    lines.push(`    WHEN plant_species."thumbnailUrl" LIKE '%wasabisys.com/perenual%' THEN EXCLUDED."thumbnailUrl"`);
    lines.push(`    ELSE plant_species."thumbnailUrl"`);
    lines.push(`  END,`);
    // Care data: only update if defaults
    lines.push(`  "waterNeed" = CASE WHEN plant_species."waterNeed" = 3 THEN EXCLUDED."waterNeed" ELSE plant_species."waterNeed" END,`);
    lines.push(`  "lightNeed" = CASE WHEN plant_species."lightNeed" = 3 THEN EXCLUDED."lightNeed" ELSE plant_species."lightNeed" END,`);
    lines.push(`  "humidityNeed" = CASE WHEN plant_species."humidityNeed" = 3 THEN EXCLUDED."humidityNeed" ELSE plant_species."humidityNeed" END,`);
    lines.push(`  "wateringFreqDays" = CASE WHEN plant_species."wateringFreqDays" = 7 THEN EXCLUDED."wateringFreqDays" ELSE plant_species."wateringFreqDays" END,`);
    lines.push(`  "growthRate" = COALESCE(plant_species."growthRate", EXCLUDED."growthRate"),`);
    lines.push(`  "toxicToPets" = EXCLUDED."toxicToPets" OR plant_species."toxicToPets",`);
    lines.push(`  "toxicToHumans" = EXCLUDED."toxicToHumans" OR plant_species."toxicToHumans",`);
    lines.push(`  category = COALESCE(plant_species.category, EXCLUDED.category),`);
    // New fields: always set (they don't exist in old data)
    lines.push(`  "plantType" = COALESCE(plant_species."plantType", EXCLUDED."plantType"),`);
    lines.push(`  cycle = COALESCE(plant_species.cycle, EXCLUDED.cycle),`);
    lines.push(`  "careLevel" = COALESCE(plant_species."careLevel", EXCLUDED."careLevel"),`);
    lines.push(`  maintenance = COALESCE(plant_species.maintenance, EXCLUDED.maintenance),`);
    lines.push(`  propagation = CASE WHEN plant_species.propagation = '[]'::jsonb THEN EXCLUDED.propagation ELSE plant_species.propagation END,`);
    lines.push(`  "pruningMonths" = CASE WHEN plant_species."pruningMonths" = '[]'::jsonb THEN EXCLUDED."pruningMonths" ELSE plant_species."pruningMonths" END,`);
    lines.push(`  origin = CASE WHEN plant_species.origin = '[]'::jsonb THEN EXCLUDED.origin ELSE plant_species.origin END,`);
    lines.push(`  "flowerColor" = CASE WHEN plant_species."flowerColor" = '[]'::jsonb THEN EXCLUDED."flowerColor" ELSE plant_species."flowerColor" END,`);
    lines.push(`  "leafColor" = CASE WHEN plant_species."leafColor" = '[]'::jsonb THEN EXCLUDED."leafColor" ELSE plant_species."leafColor" END,`);
    lines.push(`  "droughtTolerant" = EXCLUDED."droughtTolerant" OR plant_species."droughtTolerant",`);
    lines.push(`  medicinal = EXCLUDED.medicinal OR plant_species.medicinal,`);
    lines.push(`  "perenualId" = COALESCE(plant_species."perenualId", EXCLUDED."perenualId");`);
    lines.push("");

    insertCount++;
  }

  lines.push("COMMIT;");
  lines.push("");
  lines.push(`-- Total: ${insertCount} species upserted`);

  fs.writeFileSync(OUTPUT_FILE, lines.join("\n"), "utf-8");
  console.log(`Generated ${OUTPUT_FILE}: ${insertCount} species`);
  console.log(`File size: ${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(1)} KB`);
}

main();
