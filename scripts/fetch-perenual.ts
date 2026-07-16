/**
 * Fetch indoor plant species from Perenual API and upsert into our DB.
 *
 * Usage:
 *   npx tsx scripts/fetch-perenual.ts [--list-only] [--details-only] [--insert-only]
 *
 * Stages (resumable — saves state to scripts/perenual-state.json):
 *   1. Fetch all indoor species list pages (13 pages × 30 = 381 species)
 *   2. Fetch details for each unique base species
 *   3. Map + translate → upsert into DB
 *
 * Rate limit: 100 requests/day on free tier.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as fs from "fs";
import * as path from "path";

const PERENUAL_KEY = process.env.PERENUAL_API_KEY || "";
const BASE_URL = "https://perenual.com/api/v2";
const STATE_FILE = path.join(__dirname, "perenual-state.json");

const DB_URL =
  process.env.DATABASE_URL ||
  "postgresql://plant:plant_secret@localhost:5433/plant_care";

// ─── Russian name mapping for common houseplants ────────────────────────────

const RUSSIAN_NAMES: Record<string, { ru: string; category?: string }> = {
  // A
  "Abutilon hybridum": { ru: "Абутилон", category: "FLOWERING" },
  "Acalypha wilkesiana": { ru: "Акалифа", category: "FOLIAGE" },
  "Achimenes (group)": { ru: "Ахименес", category: "FLOWERING" },
  "Adenium obesum": { ru: "Адениум", category: "SUCCULENTS" },
  "Adiantum capillus-veneris": { ru: "Адиантум венерин волос", category: "FERNS" },
  "Adiantum raddianum": { ru: "Адиантум Радди", category: "FERNS" },
  "Aechmea fasciata": { ru: "Эхмея полосатая", category: "TROPICAL" },
  "Aeonium undulatum": { ru: "Эониум волнистый", category: "SUCCULENTS" },
  "Aeschynanthus radicans": { ru: "Эсхинантус", category: "CLIMBING" },
  "Aglaonema commutatum": { ru: "Аглаонема", category: "FOLIAGE" },
  "Aglaonema 'Silver Queen'": { ru: "Аглаонема Сильвер Квин", category: "FOLIAGE" },
  "Alocasia amazonica": { ru: "Алоказия амазонская", category: "TROPICAL" },
  "Alocasia macrorrhizos": { ru: "Алоказия крупнокорневая", category: "TROPICAL" },
  "Aloe vera": { ru: "Алоэ вера", category: "SUCCULENTS" },
  "Ananas comosus": { ru: "Ананас", category: "TROPICAL" },
  "Anthurium andraeanum": { ru: "Антуриум", category: "FLOWERING" },
  "Aphelandra squarrosa": { ru: "Афеландра", category: "FLOWERING" },
  "Araucaria heterophylla": { ru: "Араукария", category: "LARGE" },
  "Asparagus densiflorus": { ru: "Аспарагус Шпренгера", category: "FOLIAGE" },
  "Asparagus setaceus": { ru: "Аспарагус перистый", category: "FOLIAGE" },
  "Aspidistra elatior": { ru: "Аспидистра", category: "FOLIAGE" },
  "Asplenium nidus": { ru: "Асплениум гнездовой", category: "FERNS" },
  // B
  "Begonia rex": { ru: "Бегония королевская", category: "FOLIAGE" },
  "Begonia maculata": { ru: "Бегония пятнистая", category: "FOLIAGE" },
  "Begonia x hiemalis": { ru: "Бегония Элатиор", category: "FLOWERING" },
  "Billbergia nutans": { ru: "Бильбергия поникающая", category: "TROPICAL" },
  "Bougainvillea glabra": { ru: "Бугенвиллея", category: "FLOWERING" },
  "Bromeliaceae": { ru: "Бромелия", category: "TROPICAL" },
  // C
  "Caladium bicolor": { ru: "Каладиум", category: "FOLIAGE" },
  "Calathea lancifolia": { ru: "Калатея ланцетолистная", category: "TROPICAL" },
  "Calathea makoyana": { ru: "Калатея Макоя", category: "TROPICAL" },
  "Calathea orbifolia": { ru: "Калатея орбифолия", category: "TROPICAL" },
  "Calathea ornata": { ru: "Калатея украшенная", category: "TROPICAL" },
  "Calathea roseopicta": { ru: "Калатея розовоокрашенная", category: "TROPICAL" },
  "Capsicum annuum": { ru: "Декоративный перец", category: "FLOWERING" },
  "Ceropegia woodii": { ru: "Церопегия Вуда", category: "CLIMBING" },
  "Chamaedorea elegans": { ru: "Хамедорея изящная", category: "PALMS" },
  "Chlorophytum comosum": { ru: "Хлорофитум хохлатый", category: "FOLIAGE" },
  "Chrysanthemum morifolium": { ru: "Хризантема", category: "FLOWERING" },
  "Cissus rhombifolia": { ru: "Циссус ромболистный", category: "CLIMBING" },
  "Citrus limon": { ru: "Лимон комнатный", category: "LARGE" },
  "Clivia miniata": { ru: "Кливия", category: "FLOWERING" },
  "Codiaeum variegatum": { ru: "Кротон (Кодиеум)", category: "FOLIAGE" },
  "Coffea arabica": { ru: "Кофейное дерево", category: "LARGE" },
  "Coleus scutellarioides": { ru: "Колеус", category: "FOLIAGE" },
  "Columnea gloriosa": { ru: "Колумнея", category: "CLIMBING" },
  "Cordyline fruticosa": { ru: "Кордилина", category: "FOLIAGE" },
  "Crassula ovata": { ru: "Крассула (Денежное дерево)", category: "SUCCULENTS" },
  "Crassula arborescens": { ru: "Крассула древовидная", category: "SUCCULENTS" },
  "Crassula perforata": { ru: "Крассула пронзённая", category: "SUCCULENTS" },
  "Crossandra infundibuliformis": { ru: "Кроссандра", category: "FLOWERING" },
  "Cryptanthus bivittatus": { ru: "Криптантус", category: "TROPICAL" },
  "Ctenanthe oppenheimiana": { ru: "Ктенанта", category: "TROPICAL" },
  "Curcuma longa": { ru: "Куркума", category: "FLOWERING" },
  "Cycas revoluta": { ru: "Цикас поникающий", category: "PALMS" },
  "Cyclamen persicum": { ru: "Цикламен персидский", category: "FLOWERING" },
  "Cymbidium (group)": { ru: "Цимбидиум", category: "FLOWERING" },
  // D
  "Davallia fejeensis": { ru: "Даваллия", category: "FERNS" },
  "Dendrobium (group)": { ru: "Дендробиум", category: "FLOWERING" },
  "Dieffenbachia seguine": { ru: "Диффенбахия", category: "FOLIAGE" },
  "Dionaea muscipula": { ru: "Венерина мухоловка", category: "TROPICAL" },
  "Dizygotheca elegantissima": { ru: "Дизиготека", category: "FOLIAGE" },
  "Dracaena fragrans": { ru: "Драцена душистая", category: "FOLIAGE" },
  "Dracaena marginata": { ru: "Драцена окаймлённая", category: "FOLIAGE" },
  "Dracaena reflexa": { ru: "Драцена отогнутая", category: "FOLIAGE" },
  "Dracaena sanderiana": { ru: "Бамбук счастья", category: "FOLIAGE" },
  "Dracaena trifasciata": { ru: "Сансевиерия", category: "SUCCULENTS" },
  // E
  "Echeveria elegans": { ru: "Эхеверия изящная", category: "SUCCULENTS" },
  "Echeveria (group)": { ru: "Эхеверия", category: "SUCCULENTS" },
  "Epipremnum aureum": { ru: "Эпипремнум золотистый (Потос)", category: "CLIMBING" },
  "Epipremnum pinnatum": { ru: "Эпипремнум перистый", category: "CLIMBING" },
  "Episcia cupreata": { ru: "Эписция", category: "CLIMBING" },
  "Euphorbia milii": { ru: "Молочай Миля", category: "SUCCULENTS" },
  "Euphorbia pulcherrima": { ru: "Пуансеттия", category: "FLOWERING" },
  "Euphorbia tirucalli": { ru: "Молочай тирукалли", category: "SUCCULENTS" },
  "Exacum affine": { ru: "Экзакум", category: "FLOWERING" },
  // F
  "Fatsia japonica": { ru: "Фатсия японская", category: "FOLIAGE" },
  "Ficus benjamina": { ru: "Фикус Бенджамина", category: "LARGE" },
  "Ficus elastica": { ru: "Фикус каучуконосный", category: "LARGE" },
  "Ficus lyrata": { ru: "Фикус лировидный", category: "LARGE" },
  "Ficus pumila": { ru: "Фикус карликовый", category: "CLIMBING" },
  "Fittonia albivenis": { ru: "Фиттония", category: "FOLIAGE" },
  "Fuchsia hybrida": { ru: "Фуксия", category: "FLOWERING" },
  // G
  "Gardenia jasminoides": { ru: "Гардения жасминовидная", category: "FLOWERING" },
  "Gerbera jamesonii": { ru: "Гербера", category: "FLOWERING" },
  "Guzmania lingulata": { ru: "Гузмания язычковая", category: "TROPICAL" },
  "Gynura aurantiaca": { ru: "Гинура оранжевая", category: "FOLIAGE" },
  // H
  "Haworthia fasciata": { ru: "Хавортия полосатая", category: "SUCCULENTS" },
  "Haworthia attenuata": { ru: "Хавортия оттянутая", category: "SUCCULENTS" },
  "Hedera helix": { ru: "Плющ обыкновенный", category: "CLIMBING" },
  "Hibiscus rosa-sinensis": { ru: "Гибискус (Китайская роза)", category: "FLOWERING" },
  "Hippeastrum (group)": { ru: "Гиппеаструм", category: "FLOWERING" },
  "Howea forsteriana": { ru: "Ховея Форстера", category: "PALMS" },
  "Hoya carnosa": { ru: "Хойя мясистая", category: "CLIMBING" },
  "Hoya kerrii": { ru: "Хойя Керри", category: "CLIMBING" },
  "Hyacinthus orientalis": { ru: "Гиацинт", category: "FLOWERING" },
  "Hydrangea macrophylla": { ru: "Гортензия крупнолистная", category: "FLOWERING" },
  "Hypoestes phyllostachya": { ru: "Гипоэстес", category: "FOLIAGE" },
  // I-J
  "Impatiens walleriana": { ru: "Бальзамин", category: "FLOWERING" },
  "Jasminum polyanthum": { ru: "Жасмин многоцветковый", category: "CLIMBING" },
  "Jatropha podagrica": { ru: "Ятрофа", category: "SUCCULENTS" },
  "Kalanchoe blossfeldiana": { ru: "Каланхоэ Блоссфельда", category: "SUCCULENTS" },
  "Kalanchoe daigremontiana": { ru: "Каланхоэ Дегремона", category: "SUCCULENTS" },
  // L
  "Lithops (group)": { ru: "Литопс (Живые камни)", category: "SUCCULENTS" },
  "Livistona chinensis": { ru: "Ливистона китайская", category: "PALMS" },
  // M
  "Mammillaria (group)": { ru: "Маммиллярия", category: "SUCCULENTS" },
  "Maranta leuconeura": { ru: "Маранта беложильчатая", category: "TROPICAL" },
  "Medinilla magnifica": { ru: "Мединилла великолепная", category: "TROPICAL" },
  "Miltoniopsis (group)": { ru: "Мильтониопсис", category: "FLOWERING" },
  "Monstera adansonii": { ru: "Монстера Адансона", category: "CLIMBING" },
  "Monstera deliciosa": { ru: "Монстера деликатесная", category: "TROPICAL" },
  "Musa acuminata": { ru: "Банан комнатный", category: "TROPICAL" },
  // N
  "Nematanthus gregarius": { ru: "Нематантус", category: "CLIMBING" },
  "Nephrolepis exaltata": { ru: "Нефролепис возвышенный", category: "FERNS" },
  "Nerium oleander": { ru: "Олеандр", category: "FLOWERING" },
  "Nolina recurvata": { ru: "Нолина (Бокарнея)", category: "SUCCULENTS" },
  "Beaucarnea recurvata": { ru: "Нолина (Бокарнея)", category: "SUCCULENTS" },
  // O
  "Oncidium (group)": { ru: "Онцидиум", category: "FLOWERING" },
  "Opuntia microdasys": { ru: "Опунция мелковолосистая", category: "SUCCULENTS" },
  "Oxalis triangularis": { ru: "Кислица треугольная", category: "FOLIAGE" },
  // P
  "Pachira aquatica": { ru: "Пахира водная", category: "LARGE" },
  "Pachypodium lamerei": { ru: "Пахиподиум", category: "SUCCULENTS" },
  "Paphiopedilum (group)": { ru: "Пафиопедилум", category: "FLOWERING" },
  "Passiflora caerulea": { ru: "Пассифлора голубая", category: "CLIMBING" },
  "Pelargonium (group)": { ru: "Пеларгония (Герань)", category: "FLOWERING" },
  "Pelargonium graveolens": { ru: "Пеларгония душистая", category: "FLOWERING" },
  "Peperomia argyreia": { ru: "Пеперомия арбузная", category: "FOLIAGE" },
  "Peperomia caperata": { ru: "Пеперомия морщинистая", category: "FOLIAGE" },
  "Peperomia obtusifolia": { ru: "Пеперомия туполистная", category: "FOLIAGE" },
  "Phalaenopsis (group)": { ru: "Фаленопсис (Орхидея)", category: "FLOWERING" },
  "Philodendron bipinnatifidum": { ru: "Филодендрон двоякоперистый", category: "TROPICAL" },
  "Philodendron hederaceum": { ru: "Филодендрон плющелистный", category: "CLIMBING" },
  "Philodendron scandens": { ru: "Филодендрон лазящий", category: "CLIMBING" },
  "Phoenix roebelenii": { ru: "Финик Робелена", category: "PALMS" },
  "Pilea peperomioides": { ru: "Пилея пеперомиевидная", category: "FOLIAGE" },
  "Pilea cadierei": { ru: "Пилея Кадье", category: "FOLIAGE" },
  "Platycerium bifurcatum": { ru: "Платицериум (Олений рог)", category: "FERNS" },
  "Plectranthus scutellarioides": { ru: "Колеус", category: "FOLIAGE" },
  "Plumeria rubra": { ru: "Плюмерия", category: "FLOWERING" },
  "Polyscias fruticosa": { ru: "Полисциас кустарниковый", category: "FOLIAGE" },
  "Primula obconica": { ru: "Примула обконика", category: "FLOWERING" },
  "Pteris cretica": { ru: "Птерис критский", category: "FERNS" },
  // R
  "Radermachera sinica": { ru: "Радермахера", category: "FOLIAGE" },
  "Rhapis excelsa": { ru: "Рапис высокий", category: "PALMS" },
  "Rhipsalis baccifera": { ru: "Рипсалис ягодный", category: "SUCCULENTS" },
  "Rosa chinensis": { ru: "Роза комнатная", category: "FLOWERING" },
  // S
  "Saintpaulia ionantha": { ru: "Фиалка узамбарская", category: "FLOWERING" },
  "Sansevieria trifasciata": { ru: "Сансевиерия", category: "SUCCULENTS" },
  "Saxifraga stolonifera": { ru: "Камнеломка", category: "FOLIAGE" },
  "Schefflera arboricola": { ru: "Шеффлера", category: "FOLIAGE" },
  "Schlumbergera truncata": { ru: "Шлюмбергера (Декабрист)", category: "SUCCULENTS" },
  "Scindapsus pictus": { ru: "Сциндапсус расписной", category: "CLIMBING" },
  "Sedum morganianum": { ru: "Очиток Моргана", category: "SUCCULENTS" },
  "Selaginella martensii": { ru: "Селагинелла", category: "FERNS" },
  "Senecio rowleyanus": { ru: "Крестовник Роули", category: "SUCCULENTS" },
  "Siderasis fuscata": { ru: "Сидеразис", category: "FOLIAGE" },
  "Sinningia speciosa": { ru: "Глоксиния", category: "FLOWERING" },
  "Soleirolia soleirolii": { ru: "Солейролия", category: "FOLIAGE" },
  "Spathiphyllum wallisii": { ru: "Спатифиллум", category: "TROPICAL" },
  "Stephanotis floribunda": { ru: "Стефанотис", category: "CLIMBING" },
  "Strelitzia reginae": { ru: "Стрелиция", category: "TROPICAL" },
  "Streptocarpus (group)": { ru: "Стрептокарпус", category: "FLOWERING" },
  "Stromanthe sanguinea": { ru: "Строманта кроваво-красная", category: "TROPICAL" },
  "Syngonium podophyllum": { ru: "Сингониум", category: "CLIMBING" },
  // T
  "Tillandsia usneoides": { ru: "Тилландсия уснеевидная", category: "TROPICAL" },
  "Tillandsia ionantha": { ru: "Тилландсия ионанта", category: "TROPICAL" },
  "Tolmiea menziesii": { ru: "Толмия", category: "FOLIAGE" },
  "Tradescantia zebrina": { ru: "Традесканция зебровидная", category: "CLIMBING" },
  "Tradescantia pallida": { ru: "Традесканция бледная", category: "CLIMBING" },
  "Tradescantia fluminensis": { ru: "Традесканция приречная", category: "CLIMBING" },
  // U-V
  "Vriesea splendens": { ru: "Вриезия блестящая", category: "TROPICAL" },
  // W-Z
  "Yucca elephantipes": { ru: "Юкка слоновая", category: "LARGE" },
  "Zamioculcas zamiifolia": { ru: "Замиокулькас", category: "FOLIAGE" },
  "Zantedeschia aethiopica": { ru: "Калла (Зантедеския)", category: "FLOWERING" },
  "Zebrina pendula": { ru: "Зебрина висячая", category: "CLIMBING" },
};

// ─── Perenual → our schema mapping ──────────────────────────────────────────

function mapWateringToNeed(watering: string | null): number {
  switch (watering?.toLowerCase()) {
    case "frequent": return 5;
    case "average": return 3;
    case "minimum": return 2;
    case "none": return 1;
    default: return 3;
  }
}

function mapWateringToFreqDays(watering: string | null, benchmark: { value: string; unit: string } | null): number {
  if (benchmark?.value && benchmark?.unit === "days") {
    const cleaned = benchmark.value.replace(/"/g, "");
    const parts = cleaned.split("-");
    if (parts.length === 2) {
      return Math.round((parseInt(parts[0]) + parseInt(parts[1])) / 2);
    }
    const n = parseInt(cleaned);
    if (!isNaN(n)) return n;
  }
  switch (watering?.toLowerCase()) {
    case "frequent": return 3;
    case "average": return 7;
    case "minimum": return 14;
    case "none": return 30;
    default: return 7;
  }
}

function mapSunlightToNeed(sunlight: string[] | null): number {
  if (!sunlight || sunlight.length === 0) return 3;
  const primary = sunlight[0].toLowerCase();
  if (primary.includes("full_sun") || primary === "full sun") return 5;
  if (primary.includes("sun-part") || primary.includes("sun/part")) return 4;
  if (primary.includes("part shade") || primary.includes("part_shade")) return 3;
  if (primary.includes("full shade") || primary.includes("full_shade")) return 1;
  if (primary.includes("filtered")) return 2;
  return 3;
}

function mapGrowthRate(rate: string | null): string {
  switch (rate?.toLowerCase()) {
    case "high": return "Быстрый";
    case "moderate": return "Умеренный";
    case "low": return "Медленный";
    default: return "Умеренный";
  }
}

function guessCategory(
  detail: PerenualDetail,
  scientificName: string
): string | null {
  // Check hardcoded first
  const mapped = findRussianName(scientificName);
  if (mapped?.category) return mapped.category;

  // Heuristics based on Perenual data
  const name = scientificName.toLowerCase();
  const type = (detail.type || "").toLowerCase();
  const desc = (detail.description || "").toLowerCase();

  if (name.includes("palm") || type.includes("palm")) return "PALMS";
  if (name.includes("fern") || type.includes("fern") || desc.includes("fern")) return "FERNS";
  if (detail.tropical) return "TROPICAL";
  if (detail.drought_tolerant && (name.includes("cactus") || name.includes("succulent") || type === "succulent"))
    return "SUCCULENTS";
  if (detail.flowers && detail.flowering_season) return "FLOWERING";
  if (type === "vine" || type === "climber") return "CLIMBING";

  return "FOLIAGE"; // default
}

function findRussianName(scientificName: string): { ru: string; category?: string } | null {
  // Exact match
  if (RUSSIAN_NAMES[scientificName]) return RUSSIAN_NAMES[scientificName];

  // Try without cultivar — e.g. "Aglaonema 'Silver Queen'" → "Aglaonema 'Silver Queen'"
  // Try base genus match
  const genus = scientificName.split(" ")[0];
  for (const [key, val] of Object.entries(RUSSIAN_NAMES)) {
    if (key.startsWith(genus + " ") || key === genus) return val;
  }
  return null;
}

// Transliteration fallback for unknown species
function transliterate(name: string): string {
  const map: Record<string, string> = {
    a: "а", b: "б", c: "к", d: "д", e: "е", f: "ф", g: "г", h: "х",
    i: "и", j: "дж", k: "к", l: "л", m: "м", n: "н", o: "о", p: "п",
    q: "кв", r: "р", s: "с", t: "т", u: "у", v: "в", w: "в", x: "кс",
    y: "й", z: "з",
    ph: "ф", th: "т", ch: "х", sh: "ш",
  };

  let result = "";
  const lower = name.toLowerCase();
  let i = 0;
  while (i < lower.length) {
    // Try digraph first
    if (i + 1 < lower.length) {
      const digraph = lower.slice(i, i + 2);
      if (map[digraph]) {
        result += map[digraph];
        i += 2;
        continue;
      }
    }
    const ch = lower[i];
    result += map[ch] || ch;
    i++;
  }

  return result.charAt(0).toUpperCase() + result.slice(1);
}

function generateDescription(
  detail: PerenualDetail,
  russianName: string,
  scientificName: string
): string {
  const parts: string[] = [];

  parts.push(
    `${russianName} (лат. ${scientificName}) — ` +
    (detail.type ? `${detail.type.toLowerCase()} из семейства ${detail.family || "неизвестно"}` : `растение семейства ${detail.family || "неизвестно"}`) +
    (detail.origin?.length ? `, родом из ${detail.origin.slice(0, 3).join(", ")}` : "") +
    "."
  );

  if (detail.description) {
    // Take first 2 sentences from English description as base
    const sentences = detail.description.split(/\.\s+/).slice(0, 2);
    if (sentences.length > 0) {
      parts.push(sentences.join(". ") + ".");
    }
  }

  // Care summary
  const careNotes: string[] = [];
  if (detail.watering) careNotes.push(`полив: ${detail.watering.toLowerCase()}`);
  if (detail.sunlight?.length) careNotes.push(`освещение: ${detail.sunlight.join(", ").toLowerCase()}`);
  if (detail.maintenance) careNotes.push(`уход: ${detail.maintenance.toLowerCase()}`);
  if (detail.growth_rate) careNotes.push(`рост: ${mapGrowthRate(detail.growth_rate).toLowerCase()}`);
  if (careNotes.length > 0) {
    parts.push(`Основные требования: ${careNotes.join("; ")}.`);
  }

  if (detail.poisonous_to_pets || detail.poisonous_to_humans) {
    const who = [];
    if (detail.poisonous_to_pets) who.push("домашних животных");
    if (detail.poisonous_to_humans) who.push("людей");
    parts.push(`Внимание: токсично для ${who.join(" и ")}.`);
  }

  return parts.join("\n\n");
}

// ─── Perenual API types ─────────────────────────────────────────────────────

interface PerenualListItem {
  id: number;
  common_name: string;
  scientific_name: string[];
  other_name: string[] | null;
  family: string | null;
  watering: string | null;
  sunlight: string[] | null;
  default_image: {
    original_url?: string;
    regular_url?: string;
    medium_url?: string;
    small_url?: string;
    thumbnail?: string;
  } | null;
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
  indoor: boolean;
  tropical: boolean;
  growth_rate: string | null;
  care_level: string | null;
  maintenance: string | null;
  poisonous_to_humans: boolean;
  poisonous_to_pets: boolean;
  description: string | null;
  origin: string[] | null;
  soil: string[] | null;
  drought_tolerant: boolean;
  flowers: boolean;
  flowering_season: string | null;
  pruning_month: string[] | null;
  hardiness: { min: string; max: string } | null;
  watering_general_benchmark: { value: string; unit: string } | null;
  default_image: {
    original_url?: string;
    regular_url?: string;
    medium_url?: string;
    small_url?: string;
    thumbnail?: string;
  } | null;
}

interface State {
  listPages: Record<number, PerenualListItem[]>;
  details: Record<number, PerenualDetail>;
  requestCount: number;
  lastRun: string;
}

// ─── API helpers ────────────────────────────────────────────────────────────

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

function loadState(): State {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
  }
  return { listPages: {}, details: {}, requestCount: 0, lastRun: "" };
}

function saveState(state: State) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const listOnly = args.includes("--list-only");
  const detailsOnly = args.includes("--details-only");
  const insertOnly = args.includes("--insert-only");

  const state = loadState();

  // Reset counter if new day
  const today = new Date().toISOString().slice(0, 10);
  if (state.lastRun !== today) {
    state.requestCount = 0;
    state.lastRun = today;
  }

  const budget = 100 - state.requestCount;
  console.log(`[Perenual] Day: ${today}, Requests used: ${state.requestCount}, Budget: ${budget}`);

  if (!insertOnly) {
    // Stage 1: Fetch list pages
    if (!detailsOnly) {
      console.log("\n─── Stage 1: Fetching indoor species list ───");
      for (let page = 1; page <= 13; page++) {
        if (state.listPages[page]) {
          console.log(`  Page ${page}: cached (${state.listPages[page].length} items)`);
          continue;
        }
        if (state.requestCount >= 100) {
          console.log(`  Rate limit reached. Run again tomorrow.`);
          break;
        }

        const url = `${BASE_URL}/species-list?key=${PERENUAL_KEY}&indoor=1&page=${page}`;
        console.log(`  Fetching page ${page}...`);
        try {
          const data = await fetchJSON<{ data: PerenualListItem[]; last_page: number }>(url);
          state.listPages[page] = data.data;
          state.requestCount++;
          console.log(`  Page ${page}: ${data.data.length} items (total pages: ${data.last_page})`);
          saveState(state);
          // Small delay to be polite
          await new Promise((r) => setTimeout(r, 300));
        } catch (err) {
          console.error(`  Error fetching page ${page}:`, err);
          break;
        }
      }
    }

    if (listOnly) {
      saveState(state);
      console.log("\n[Done] List-only mode. State saved.");
      return;
    }

    // Compile unique species from list
    const allListItems: PerenualListItem[] = [];
    for (const items of Object.values(state.listPages)) {
      allListItems.push(...items);
    }

    // Deduplicate: prefer base species over cultivars
    const uniqueSpecies = new Map<string, PerenualListItem>();
    for (const item of allListItems) {
      const sciName = item.scientific_name[0];
      if (!sciName) continue;
      // Skip cultivars (names with quotes) if we already have the base species
      const isCultivar = sciName.includes("'") || sciName.includes('"');
      const baseName = sciName.split("'")[0].split('"')[0].trim();

      if (isCultivar && uniqueSpecies.has(baseName)) continue;
      if (!isCultivar) {
        // Remove any cultivar entry that was added before the base species
        for (const [key] of uniqueSpecies) {
          if (key.startsWith(baseName + " '") || key.startsWith(baseName + ' "')) {
            uniqueSpecies.delete(key);
          }
        }
      }
      uniqueSpecies.set(sciName, item);
    }

    console.log(`\n─── Unique species: ${uniqueSpecies.size} (from ${allListItems.length} total) ───`);

    // Stage 2: Fetch details
    console.log("\n─── Stage 2: Fetching species details ───");
    let fetched = 0;
    for (const [sciName, item] of uniqueSpecies) {
      if (state.details[item.id]) {
        continue; // Already have details
      }
      if (state.requestCount >= 100) {
        console.log(`  Rate limit reached after ${fetched} detail fetches. Run again tomorrow.`);
        break;
      }
      // Only fetch details for species within free tier range (IDs 1-3000)
      if (item.id > 3000) {
        console.log(`  Skipping ${sciName} (id=${item.id}, outside free tier)`);
        continue;
      }

      const url = `${BASE_URL}/species/details/${item.id}?key=${PERENUAL_KEY}`;
      try {
        const detail = await fetchJSON<PerenualDetail>(url);
        state.details[item.id] = detail;
        state.requestCount++;
        fetched++;
        console.log(`  [${fetched}] ${sciName} (id=${item.id}): ${detail.watering ?? "?"} water, ${detail.sunlight?.join(",") ?? "?"} sun`);
        saveState(state);
        await new Promise((r) => setTimeout(r, 300));
      } catch (err) {
        console.error(`  Error fetching details for ${sciName} (id=${item.id}):`, err);
      }
    }
  }

  // Stage 3: Insert into DB
  if (args.includes("--no-db")) {
    saveState(state);
    console.log("\n[Done] --no-db mode. Skipping DB insert. State saved.");
    console.log(`  Details cached: ${Object.keys(state.details).length}`);
    return;
  }
  console.log("\n─── Stage 3: Upserting into database ───");
  const adapter = new PrismaPg({ connectionString: DB_URL });
  const prisma = new PrismaClient({ adapter });

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const [, detail] of Object.entries(state.details)) {
    const sciName = detail.scientific_name[0];
    if (!sciName) continue;

    const russianInfo = findRussianName(sciName);
    const commonNameRu = russianInfo?.ru ?? transliterate(sciName.split(" ")[0]);
    const category = guessCategory(detail, sciName);

    const waterNeed = mapWateringToNeed(detail.watering);
    const lightNeed = mapSunlightToNeed(detail.sunlight);
    const wateringFreqDays = mapWateringToFreqDays(detail.watering, detail.watering_general_benchmark);

    // Humidity heuristic based on tropical/drought
    let humidityNeed = 3;
    if (detail.tropical) humidityNeed = 4;
    if (detail.drought_tolerant) humidityNeed = Math.min(humidityNeed, 2);
    if (category === "FERNS" || category === "TROPICAL") humidityNeed = Math.max(humidityNeed, 4);
    if (category === "SUCCULENTS") humidityNeed = Math.min(humidityNeed, 2);

    const description = generateDescription(detail, commonNameRu, sciName);
    const imageUrl = detail.default_image?.medium_url || detail.default_image?.regular_url || null;
    const thumbnailUrl = detail.default_image?.small_url || detail.default_image?.thumbnail || null;

    // Hardiness → temp range
    let tempMin: number | null = null;
    let tempMax: number | null = null;
    if (detail.hardiness) {
      // USDA zones to approximate Celsius min
      const zoneMinC: Record<string, number> = {
        "1": -46, "2": -40, "3": -34, "4": -29, "5": -23,
        "6": -18, "7": -12, "8": -7, "9": -1, "10": 4,
        "11": 10, "12": 16, "13": 21,
      };
      tempMin = zoneMinC[detail.hardiness.min] ?? null;
      tempMax = 35; // General indoor max
    }

    const soil = detail.soil?.join(", ") || null;

    try {
      const existing = await prisma.plantSpecies.findUnique({
        where: { scientificName: sciName },
      });

      if (existing) {
        // Only update fields that are empty/default in existing record
        const updates: Record<string, unknown> = {};
        if (!existing.commonNameEn && detail.common_name) updates.commonNameEn = detail.common_name;
        if (!existing.family && detail.family) updates.family = detail.family;
        if (!existing.imageUrl && imageUrl) updates.imageUrl = imageUrl;
        if (!existing.thumbnailUrl && thumbnailUrl) updates.thumbnailUrl = thumbnailUrl;
        if (!existing.growthRate && detail.growth_rate) updates.growthRate = mapGrowthRate(detail.growth_rate);
        if (existing.tempMin == null && tempMin != null) updates.tempMin = tempMin;
        if (existing.tempMax == null && tempMax != null) updates.tempMax = tempMax;
        if (!existing.soilType && soil) updates.soilType = soil;
        if (!existing.category && category) updates.category = category;

        if (Object.keys(updates).length > 0) {
          await prisma.plantSpecies.update({
            where: { scientificName: sciName },
            data: updates,
          });
          updated++;
          console.log(`  Updated: ${sciName} (${Object.keys(updates).join(", ")})`);
        } else {
          skipped++;
        }
      } else {
        await prisma.plantSpecies.create({
          data: {
            scientificName: sciName,
            commonNameRu,
            commonNameEn: detail.common_name || null,
            family: detail.family || null,
            description,
            imageUrl,
            thumbnailUrl,
            waterNeed,
            lightNeed,
            humidityNeed,
            tempMin,
            tempMax,
            soilType: soil,
            growthRate: mapGrowthRate(detail.growth_rate),
            toxicToPets: detail.poisonous_to_pets || false,
            toxicToHumans: detail.poisonous_to_humans || false,
            wateringFreqDays,
            fertilizingFreqDays: 30,
            fertilizingOrganicFreqDays: 90,
            repottingFreqDays: category === "SUCCULENTS" ? 730 : 365,
            category: category as "SUCCULENTS" | "FOLIAGE" | "TROPICAL" | "FLOWERING" | "FERNS" | "PALMS" | "CLIMBING" | "LARGE" | undefined,
          },
        });
        inserted++;
        console.log(`  Created: ${sciName} → ${commonNameRu}`);
      }
    } catch (err) {
      console.error(`  Error upserting ${sciName}:`, err);
    }
  }

  await prisma.$disconnect();

  console.log(`\n─── Summary ───`);
  console.log(`  Created: ${inserted}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  API requests used today: ${state.requestCount}/100`);
  console.log(`  Details cached: ${Object.keys(state.details).length}`);
  saveState(state);
}

main().catch(console.error);
