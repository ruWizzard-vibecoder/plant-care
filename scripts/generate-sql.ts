/**
 * Generate SQL from cached Perenual data for inserting into plant-postgres.
 * Output: scripts/perenual-species.sql
 *
 * Usage: npx tsx scripts/generate-sql.ts
 * Then:  ssh nas "docker exec -i plant-postgres psql -U plant -d plant_care" < scripts/perenual-species.sql
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

function createId(): string {
  return crypto.randomBytes(12).toString("base64url").slice(0, 24);
}

const STATE_FILE = path.join(__dirname, "perenual-state.json");
const OUTPUT_FILE = path.join(__dirname, "perenual-species.sql");

// ─── Russian name mapping ───────────────────────────────────────────────────

const RUSSIAN_NAMES: Record<string, { ru: string; category?: string }> = {
  "Abutilon hybridum": { ru: "Абутилон", category: "FLOWERING" },
  "Abutilon 'Moonchimes'": { ru: "Абутилон Мунчаймс", category: "FLOWERING" },
  "Abutilon pictum 'Gold Dust'": { ru: "Абутилон расписной", category: "FLOWERING" },
  "Acalypha wilkesiana": { ru: "Акалифа Вилкса", category: "FOLIAGE" },
  "Achimenes (group)": { ru: "Ахименес", category: "FLOWERING" },
  "Adenium obesum": { ru: "Адениум", category: "SUCCULENTS" },
  "Adiantum capillus-veneris": { ru: "Адиантум венерин волос", category: "FERNS" },
  "Adiantum raddianum": { ru: "Адиантум Радди", category: "FERNS" },
  "Aechmea fasciata": { ru: "Эхмея полосатая", category: "TROPICAL" },
  "Aeonium undulatum": { ru: "Эониум волнистый", category: "SUCCULENTS" },
  "Aeschynanthus radicans": { ru: "Эсхинантус", category: "CLIMBING" },
  "Aglaonema commutatum": { ru: "Аглаонема", category: "FOLIAGE" },
  "Aglaonema 'Cutlass'": { ru: "Аглаонема Катласс", category: "FOLIAGE" },
  "Aglaonema 'Red Gold'": { ru: "Аглаонема Ред Голд", category: "FOLIAGE" },
  "Aglaonema 'Silver Queen'": { ru: "Аглаонема Сильвер Квин", category: "FOLIAGE" },
  "Alocasia amazonica": { ru: "Алоказия амазонская", category: "TROPICAL" },
  "Alocasia amazonica 'Polly'": { ru: "Алоказия Полли", category: "TROPICAL" },
  "Alocasia macrorrhizos": { ru: "Алоказия крупнокорневая", category: "TROPICAL" },
  "Aloe vera": { ru: "Алоэ вера", category: "SUCCULENTS" },
  "Aloe harlana": { ru: "Алоэ Харлана", category: "SUCCULENTS" },
  "Aloe suzannae": { ru: "Алоэ Сюзанны", category: "SUCCULENTS" },
  "Alternanthera ficoidea": { ru: "Альтернантера", category: "FOLIAGE" },
  "Ananas comosus": { ru: "Ананас", category: "TROPICAL" },
  "Anthurium andraeanum": { ru: "Антуриум Андре", category: "FLOWERING" },
  "Anthurium scherzerianum": { ru: "Антуриум Шерцера", category: "FLOWERING" },
  "Aphelandra squarrosa": { ru: "Афеландра", category: "FLOWERING" },
  "Araucaria heterophylla": { ru: "Араукария", category: "LARGE" },
  "Asparagus densiflorus": { ru: "Аспарагус Шпренгера", category: "FOLIAGE" },
  "Asparagus setaceus": { ru: "Аспарагус перистый", category: "FOLIAGE" },
  "Aspidistra elatior": { ru: "Аспидистра", category: "FOLIAGE" },
  "Asplenium nidus": { ru: "Асплениум гнездовой", category: "FERNS" },
  "Begonia rex": { ru: "Бегония королевская", category: "FOLIAGE" },
  "Begonia maculata": { ru: "Бегония пятнистая", category: "FOLIAGE" },
  "Begonia x hiemalis": { ru: "Бегония Элатиор", category: "FLOWERING" },
  "Billbergia nutans": { ru: "Бильбергия поникающая", category: "TROPICAL" },
  "Bougainvillea glabra": { ru: "Бугенвиллея", category: "FLOWERING" },
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
  "Codiaeum variegatum": { ru: "Кротон", category: "FOLIAGE" },
  "Coffea arabica": { ru: "Кофейное дерево", category: "LARGE" },
  "Coleus scutellarioides": { ru: "Колеус", category: "FOLIAGE" },
  "Columnea gloriosa": { ru: "Колумнея", category: "CLIMBING" },
  "Cordyline fruticosa": { ru: "Кордилина", category: "FOLIAGE" },
  "Crassula ovata": { ru: "Крассула", category: "SUCCULENTS" },
  "Crassula arborescens": { ru: "Крассула древовидная", category: "SUCCULENTS" },
  "Crassula perforata": { ru: "Крассула пронзённая", category: "SUCCULENTS" },
  "Crossandra infundibuliformis": { ru: "Кроссандра", category: "FLOWERING" },
  "Cryptanthus bivittatus": { ru: "Криптантус", category: "TROPICAL" },
  "Ctenanthe oppenheimiana": { ru: "Ктенанта", category: "TROPICAL" },
  "Curcuma longa": { ru: "Куркума", category: "FLOWERING" },
  "Cycas revoluta": { ru: "Цикас", category: "PALMS" },
  "Cyclamen persicum": { ru: "Цикламен", category: "FLOWERING" },
  "Cymbidium (group)": { ru: "Цимбидиум", category: "FLOWERING" },
  "Davallia fejeensis": { ru: "Даваллия", category: "FERNS" },
  "Dendrobium (group)": { ru: "Дендробиум", category: "FLOWERING" },
  "Dieffenbachia seguine": { ru: "Диффенбахия", category: "FOLIAGE" },
  "Dionaea muscipula": { ru: "Венерина мухоловка", category: "TROPICAL" },
  "Dracaena fragrans": { ru: "Драцена душистая", category: "FOLIAGE" },
  "Dracaena marginata": { ru: "Драцена окаймлённая", category: "FOLIAGE" },
  "Dracaena reflexa": { ru: "Драцена отогнутая", category: "FOLIAGE" },
  "Dracaena sanderiana": { ru: "Бамбук счастья", category: "FOLIAGE" },
  "Dracaena trifasciata": { ru: "Сансевиерия трёхполосная", category: "SUCCULENTS" },
  "Echeveria elegans": { ru: "Эхеверия изящная", category: "SUCCULENTS" },
  "Echeveria (group)": { ru: "Эхеверия", category: "SUCCULENTS" },
  "Epipremnum aureum": { ru: "Эпипремнум золотистый", category: "CLIMBING" },
  "Episcia cupreata": { ru: "Эписция", category: "CLIMBING" },
  "Euphorbia milii": { ru: "Молочай Миля", category: "SUCCULENTS" },
  "Euphorbia pulcherrima": { ru: "Пуансеттия", category: "FLOWERING" },
  "Euphorbia tirucalli": { ru: "Молочай тирукалли", category: "SUCCULENTS" },
  "Exacum affine": { ru: "Экзакум", category: "FLOWERING" },
  "Fatsia japonica": { ru: "Фатсия японская", category: "FOLIAGE" },
  "Ficus benjamina": { ru: "Фикус Бенджамина", category: "LARGE" },
  "Ficus elastica": { ru: "Фикус каучуконосный", category: "LARGE" },
  "Ficus lyrata": { ru: "Фикус лировидный", category: "LARGE" },
  "Ficus pumila": { ru: "Фикус карликовый", category: "CLIMBING" },
  "Fittonia albivenis": { ru: "Фиттония", category: "FOLIAGE" },
  "Fuchsia hybrida": { ru: "Фуксия", category: "FLOWERING" },
  "Gardenia jasminoides": { ru: "Гардения жасминовидная", category: "FLOWERING" },
  "Gerbera jamesonii": { ru: "Гербера", category: "FLOWERING" },
  "Guzmania lingulata": { ru: "Гузмания язычковая", category: "TROPICAL" },
  "Gynura aurantiaca": { ru: "Гинура оранжевая", category: "FOLIAGE" },
  "Haworthia fasciata": { ru: "Хавортия полосатая", category: "SUCCULENTS" },
  "Haworthia attenuata": { ru: "Хавортия оттянутая", category: "SUCCULENTS" },
  "Hedera helix": { ru: "Плющ обыкновенный", category: "CLIMBING" },
  "Hibiscus rosa-sinensis": { ru: "Гибискус", category: "FLOWERING" },
  "Hippeastrum (group)": { ru: "Гиппеаструм", category: "FLOWERING" },
  "Howea forsteriana": { ru: "Ховея Форстера", category: "PALMS" },
  "Hoya carnosa": { ru: "Хойя мясистая", category: "CLIMBING" },
  "Hoya kerrii": { ru: "Хойя Керри", category: "CLIMBING" },
  "Hyacinthus orientalis": { ru: "Гиацинт", category: "FLOWERING" },
  "Hydrangea macrophylla": { ru: "Гортензия", category: "FLOWERING" },
  "Hypoestes phyllostachya": { ru: "Гипоэстес", category: "FOLIAGE" },
  "Impatiens walleriana": { ru: "Бальзамин", category: "FLOWERING" },
  "Jasminum polyanthum": { ru: "Жасмин многоцветковый", category: "CLIMBING" },
  "Kalanchoe blossfeldiana": { ru: "Каланхоэ Блоссфельда", category: "SUCCULENTS" },
  "Kalanchoe daigremontiana": { ru: "Каланхоэ Дегремона", category: "SUCCULENTS" },
  "Lithops (group)": { ru: "Литопс", category: "SUCCULENTS" },
  "Livistona chinensis": { ru: "Ливистона китайская", category: "PALMS" },
  "Mammillaria (group)": { ru: "Маммиллярия", category: "SUCCULENTS" },
  "Maranta leuconeura": { ru: "Маранта", category: "TROPICAL" },
  "Medinilla magnifica": { ru: "Мединилла", category: "TROPICAL" },
  "Monstera adansonii": { ru: "Монстера Адансона", category: "CLIMBING" },
  "Monstera deliciosa": { ru: "Монстера деликатесная", category: "TROPICAL" },
  "Musa acuminata": { ru: "Банан комнатный", category: "TROPICAL" },
  "Nematanthus gregarius": { ru: "Нематантус", category: "CLIMBING" },
  "Nephrolepis exaltata": { ru: "Нефролепис", category: "FERNS" },
  "Nerium oleander": { ru: "Олеандр", category: "FLOWERING" },
  "Nolina recurvata": { ru: "Нолина", category: "SUCCULENTS" },
  "Beaucarnea recurvata": { ru: "Нолина (Бокарнея)", category: "SUCCULENTS" },
  "Opuntia microdasys": { ru: "Опунция", category: "SUCCULENTS" },
  "Oxalis triangularis": { ru: "Кислица треугольная", category: "FOLIAGE" },
  "Pachira aquatica": { ru: "Пахира водная", category: "LARGE" },
  "Paphiopedilum (group)": { ru: "Пафиопедилум", category: "FLOWERING" },
  "Passiflora caerulea": { ru: "Пассифлора", category: "CLIMBING" },
  "Pelargonium (group)": { ru: "Пеларгония", category: "FLOWERING" },
  "Pelargonium graveolens": { ru: "Пеларгония душистая", category: "FLOWERING" },
  "Peperomia argyreia": { ru: "Пеперомия арбузная", category: "FOLIAGE" },
  "Peperomia caperata": { ru: "Пеперомия морщинистая", category: "FOLIAGE" },
  "Peperomia obtusifolia": { ru: "Пеперомия туполистная", category: "FOLIAGE" },
  "Phalaenopsis (group)": { ru: "Фаленопсис", category: "FLOWERING" },
  "Philodendron bipinnatifidum": { ru: "Филодендрон двоякоперистый", category: "TROPICAL" },
  "Philodendron hederaceum": { ru: "Филодендрон плющелистный", category: "CLIMBING" },
  "Phoenix roebelenii": { ru: "Финик Робелена", category: "PALMS" },
  "Pilea peperomioides": { ru: "Пилея пеперомиевидная", category: "FOLIAGE" },
  "Pilea cadierei": { ru: "Пилея Кадье", category: "FOLIAGE" },
  "Platycerium bifurcatum": { ru: "Платицериум", category: "FERNS" },
  "Plectranthus scutellarioides": { ru: "Колеус", category: "FOLIAGE" },
  "Plumeria rubra": { ru: "Плюмерия", category: "FLOWERING" },
  "Polyscias fruticosa": { ru: "Полисциас", category: "FOLIAGE" },
  "Primula obconica": { ru: "Примула", category: "FLOWERING" },
  "Pteris cretica": { ru: "Птерис критский", category: "FERNS" },
  "Radermachera sinica": { ru: "Радермахера", category: "FOLIAGE" },
  "Rhapis excelsa": { ru: "Рапис высокий", category: "PALMS" },
  "Rhipsalis baccifera": { ru: "Рипсалис", category: "SUCCULENTS" },
  "Rosa chinensis": { ru: "Роза комнатная", category: "FLOWERING" },
  "Saintpaulia ionantha": { ru: "Фиалка узамбарская", category: "FLOWERING" },
  "Sansevieria trifasciata": { ru: "Сансевиерия", category: "SUCCULENTS" },
  "Schefflera arboricola": { ru: "Шеффлера", category: "FOLIAGE" },
  "Schlumbergera truncata": { ru: "Шлюмбергера (Декабрист)", category: "SUCCULENTS" },
  "Scindapsus pictus": { ru: "Сциндапсус", category: "CLIMBING" },
  "Sedum morganianum": { ru: "Очиток Моргана", category: "SUCCULENTS" },
  "Selaginella martensii": { ru: "Селагинелла", category: "FERNS" },
  "Senecio rowleyanus": { ru: "Крестовник Роули", category: "SUCCULENTS" },
  "Sinningia speciosa": { ru: "Глоксиния", category: "FLOWERING" },
  "Soleirolia soleirolii": { ru: "Солейролия", category: "FOLIAGE" },
  "Spathiphyllum wallisii": { ru: "Спатифиллум", category: "TROPICAL" },
  "Stephanotis floribunda": { ru: "Стефанотис", category: "CLIMBING" },
  "Strelitzia reginae": { ru: "Стрелиция", category: "TROPICAL" },
  "Streptocarpus (group)": { ru: "Стрептокарпус", category: "FLOWERING" },
  "Stromanthe sanguinea": { ru: "Строманта", category: "TROPICAL" },
  "Syngonium podophyllum": { ru: "Сингониум", category: "CLIMBING" },
  "Tillandsia usneoides": { ru: "Тилландсия уснеевидная", category: "TROPICAL" },
  "Tillandsia ionantha": { ru: "Тилландсия ионанта", category: "TROPICAL" },
  "Tradescantia zebrina": { ru: "Традесканция зебровидная", category: "CLIMBING" },
  "Tradescantia pallida": { ru: "Традесканция бледная", category: "CLIMBING" },
  "Vriesea splendens": { ru: "Вриезия блестящая", category: "TROPICAL" },
  "Yucca elephantipes": { ru: "Юкка слоновая", category: "LARGE" },
  "Zamioculcas zamiifolia": { ru: "Замиокулькас", category: "FOLIAGE" },
  "Zantedeschia aethiopica": { ru: "Калла", category: "FLOWERING" },
  // Additional species from Perenual that might not have exact matches
  "Allium cepa": { ru: "Лук репчатый", category: "FOLIAGE" },
  "Chlorophytum 'Bonnie'": { ru: "Хлорофитум Бонни", category: "FOLIAGE" },
  "Chlorophytum laxum": { ru: "Хлорофитум рыхлый", category: "FOLIAGE" },
  "Cissus discolor": { ru: "Циссус разноцветный", category: "CLIMBING" },
  "Asparagus aethiopicus": { ru: "Аспарагус эфиопский", category: "FOLIAGE" },
  "Begonia (group)": { ru: "Бегония", category: "FLOWERING" },
  "Begonia boliviensis": { ru: "Бегония боливийская", category: "FLOWERING" },
  "Calathea (group)": { ru: "Калатея", category: "TROPICAL" },
  "Ceropegia linearis": { ru: "Церопегия линейная", category: "CLIMBING" },
  "Cordyline australis": { ru: "Кордилина южная", category: "FOLIAGE" },
  "Cuphea ignea": { ru: "Куфея огненно-красная", category: "FLOWERING" },
  "Dieffenbachia (group)": { ru: "Диффенбахия", category: "FOLIAGE" },
  "Dracaena (group)": { ru: "Драцена", category: "FOLIAGE" },
  "Dracaena draco": { ru: "Драцена драконовая", category: "LARGE" },
  "Dypsis lutescens": { ru: "Хризалидокарпус (Арека)", category: "PALMS" },
  "Euphorbia (group)": { ru: "Молочай", category: "SUCCULENTS" },
  "Ficus (group)": { ru: "Фикус", category: "LARGE" },
  "Hoya (group)": { ru: "Хойя", category: "CLIMBING" },
  "Peperomia (group)": { ru: "Пеперомия", category: "FOLIAGE" },
  "Philodendron (group)": { ru: "Филодендрон", category: "TROPICAL" },
  "Pilea (group)": { ru: "Пилея", category: "FOLIAGE" },
  "Syngonium (group)": { ru: "Сингониум", category: "CLIMBING" },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

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
    if (parts.length === 2) return Math.round((parseInt(parts[0]) + parseInt(parts[1])) / 2);
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
  if (primary.includes("sun-part") || primary.includes("sun/part") || primary.includes("part sun")) return 4;
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

function findRussianName(scientificName: string): { ru: string; category?: string } | null {
  if (RUSSIAN_NAMES[scientificName]) return RUSSIAN_NAMES[scientificName];
  const genus = scientificName.split(" ")[0];
  for (const [key, val] of Object.entries(RUSSIAN_NAMES)) {
    if (key.startsWith(genus + " ") || key === genus || key.startsWith(genus + " (")) return val;
  }
  return null;
}

function transliterate(name: string): string {
  const map: Record<string, string> = {
    a: "а", b: "б", c: "к", d: "д", e: "е", f: "ф", g: "г", h: "х",
    i: "и", j: "дж", k: "к", l: "л", m: "м", n: "н", o: "о", p: "п",
    q: "кв", r: "р", s: "с", t: "т", u: "у", v: "в", w: "в", x: "кс",
    y: "й", z: "з", ph: "ф", th: "т", ch: "х", sh: "ш",
  };
  let result = "";
  const lower = name.toLowerCase();
  let i = 0;
  while (i < lower.length) {
    if (i + 1 < lower.length) {
      const digraph = lower.slice(i, i + 2);
      if (map[digraph]) { result += map[digraph]; i += 2; continue; }
    }
    result += map[lower[i]] || lower[i];
    i++;
  }
  return result.charAt(0).toUpperCase() + result.slice(1);
}

function guessCategory(detail: any, scientificName: string): string | null {
  const mapped = findRussianName(scientificName);
  if (mapped?.category) return mapped.category;

  const name = scientificName.toLowerCase();
  const type = (detail.type || "").toLowerCase();

  if (name.includes("palm") || type.includes("palm")) return "PALMS";
  if (name.includes("fern") || type.includes("fern")) return "FERNS";
  if (detail.tropical) return "TROPICAL";
  if (detail.drought_tolerant) return "SUCCULENTS";
  if (detail.flowers && detail.flowering_season) return "FLOWERING";
  if (type === "vine" || type === "climber") return "CLIMBING";
  return "FOLIAGE";
}

function esc(s: string | null): string {
  if (!s) return "NULL";
  return "'" + s.replace(/'/g, "''") + "'";
}

// ─── Main ───────────────────────────────────────────────────────────────────

const state = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
const details = state.details as Record<string, any>;

const lines: string[] = [];
lines.push("-- Auto-generated from Perenual API data");
lines.push("-- Generated: " + new Date().toISOString());
lines.push("BEGIN;");
lines.push("");

let count = 0;

for (const [, detail] of Object.entries(details)) {
  const sciName = detail.scientific_name?.[0];
  if (!sciName) continue;

  // Skip species that conflict with existing seed data (by scientific name)
  // The ON CONFLICT clause handles this, but let's also skip known duplicates
  // where we have better data in the seed

  const russianInfo = findRussianName(sciName);
  const commonNameRu = russianInfo?.ru ?? transliterate(sciName.split(" ")[0]);
  const category = guessCategory(detail, sciName);

  const waterNeed = mapWateringToNeed(detail.watering);
  const lightNeed = mapSunlightToNeed(detail.sunlight);
  const wateringFreqDays = mapWateringToFreqDays(detail.watering, detail.watering_general_benchmark);

  let humidityNeed = 3;
  if (detail.tropical) humidityNeed = 4;
  if (detail.drought_tolerant) humidityNeed = Math.min(humidityNeed, 2);
  if (category === "FERNS" || category === "TROPICAL") humidityNeed = Math.max(humidityNeed, 4);
  if (category === "SUCCULENTS") humidityNeed = Math.min(humidityNeed, 2);

  const imageUrl = detail.default_image?.medium_url || detail.default_image?.regular_url || null;
  const thumbnailUrl = detail.default_image?.small_url || detail.default_image?.thumbnail || null;

  let tempMin: number | null = null;
  const tempMax: number | null = 35;
  if (detail.hardiness) {
    const zoneMinC: Record<string, number> = {
      "1": -46, "2": -40, "3": -34, "4": -29, "5": -23,
      "6": -18, "7": -12, "8": -7, "9": -1, "10": 4,
      "11": 10, "12": 16, "13": 21,
    };
    tempMin = zoneMinC[detail.hardiness.min] ?? null;
  }

  const soil = detail.soil?.join(", ") || null;
  const growthRate = mapGrowthRate(detail.growth_rate);
  const toxicToPets = detail.poisonous_to_pets || false;
  const toxicToHumans = detail.poisonous_to_humans || false;

  // Build description parts
  const descParts: string[] = [];
  descParts.push(
    `${commonNameRu} (лат. ${sciName})` +
    (detail.family ? ` — растение семейства ${detail.family}` : "") +
    (detail.origin?.length ? `, родом из ${detail.origin.slice(0, 3).join(", ")}` : "") +
    "."
  );

  if (detail.description) {
    const sentences = detail.description.split(/\.\s+/).slice(0, 2);
    if (sentences.length > 0) {
      descParts.push(sentences.join(". ").replace(/\.+$/, "") + ".");
    }
  }

  const careNotes: string[] = [];
  if (detail.watering) careNotes.push(`полив: ${detail.watering.toLowerCase()}`);
  if (detail.sunlight?.length) careNotes.push(`освещение: ${detail.sunlight.join(", ").toLowerCase()}`);
  if (detail.maintenance) careNotes.push(`уход: ${detail.maintenance.toLowerCase()}`);
  if (growthRate) careNotes.push(`рост: ${growthRate.toLowerCase()}`);
  if (careNotes.length > 0) descParts.push(`Основные требования: ${careNotes.join("; ")}.`);

  if (toxicToPets || toxicToHumans) {
    const who = [];
    if (toxicToPets) who.push("домашних животных");
    if (toxicToHumans) who.push("людей");
    descParts.push(`Внимание: токсично для ${who.join(" и ")}.`);
  }

  const description = descParts.join("\n\n");
  const id = createId();

  const fertFreq = category === "SUCCULENTS" ? 60 : 30;
  const fertOrgFreq = 90;
  const repotFreq = category === "SUCCULENTS" ? 730 : 365;

  lines.push(`INSERT INTO plant_species (id, "scientificName", "commonNameRu", "commonNameEn", family, description, "imageUrl", "thumbnailUrl", "waterNeed", "lightNeed", "humidityNeed", "tempMin", "tempMax", "soilType", "growthRate", "toxicToPets", "toxicToHumans", "wateringFreqDays", "fertilizingFreqDays", "fertilizingOrganicFreqDays", "repottingFreqDays", category, tags, "plantNetId")`);
  lines.push(`VALUES (${esc(id)}, ${esc(sciName)}, ${esc(commonNameRu)}, ${esc(detail.common_name)}, ${esc(detail.family)}, ${esc(description)}, ${esc(imageUrl)}, ${esc(thumbnailUrl)}, ${waterNeed}, ${lightNeed}, ${humidityNeed}, ${tempMin ?? "NULL"}, ${tempMax ?? "NULL"}, ${esc(soil)}, ${esc(growthRate)}, ${toxicToPets}, ${toxicToHumans}, ${wateringFreqDays}, ${fertFreq}, ${fertOrgFreq}, ${repotFreq}, ${category ? esc(category) : "NULL"}, '[]', NULL)`);
  lines.push(`ON CONFLICT ("scientificName") DO UPDATE SET`);
  lines.push(`  "commonNameEn" = COALESCE(NULLIF(plant_species."commonNameEn", ''), EXCLUDED."commonNameEn"),`);
  lines.push(`  family = COALESCE(NULLIF(plant_species.family, ''), EXCLUDED.family),`);
  lines.push(`  "imageUrl" = COALESCE(plant_species."imageUrl", EXCLUDED."imageUrl"),`);
  lines.push(`  "thumbnailUrl" = COALESCE(plant_species."thumbnailUrl", EXCLUDED."thumbnailUrl"),`);
  lines.push(`  "growthRate" = COALESCE(NULLIF(plant_species."growthRate", ''), EXCLUDED."growthRate"),`);
  lines.push(`  "tempMin" = COALESCE(plant_species."tempMin", EXCLUDED."tempMin"),`);
  lines.push(`  "tempMax" = COALESCE(plant_species."tempMax", EXCLUDED."tempMax"),`);
  lines.push(`  "soilType" = COALESCE(NULLIF(plant_species."soilType", ''), EXCLUDED."soilType"),`);
  lines.push(`  category = COALESCE(plant_species.category, EXCLUDED.category);`);
  lines.push("");
  count++;
}

lines.push("COMMIT;");
lines.push(`-- Total: ${count} species`);

fs.writeFileSync(OUTPUT_FILE, lines.join("\n"));
console.log(`Generated ${OUTPUT_FILE} with ${count} species`);
