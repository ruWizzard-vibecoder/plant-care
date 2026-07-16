import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://plant:plant_secret@localhost:5433/plant_care",
});
const prisma = new PrismaClient({ adapter });

/* Wikimedia Commons thumbnail helper */
const wmc = (path: string) =>
  `https://upload.wikimedia.org/wikipedia/commons/${path}`;
const thumb = (path: string, w = 800) => {
  const file = path.split("/").pop();
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${path}/${w}px-${file}`;
};

const SPECIES = [
  {
    scientificName: "Sansevieria trifasciata",
    commonNameRu: "Сансевиерия",
    commonNameEn: "Snake Plant",
    family: "Asparagaceae",
    imageUrl: thumb("5/51/Sansevieria_trifasciata_Colombia.jpg"),
    thumbnailUrl: thumb("5/51/Sansevieria_trifasciata_Colombia.jpg", 400),
    description:
      "Сансевиерия (лат. Sansevieria) — род бесстеблевых вечнозелёных многолетников семейства Спаржевые, родом из сухих каменистых регионов тропической Африки, Мадагаскара и Южной Азии. Жёсткие мечевидные листья вырастают до 1,2 м в высоту прямо из корневища, украшены характерными поперечными полосами тёмно- и светло-зелёного цвета.\n\nОдно из самых неприхотливых комнатных растений: переносит засуху, сухой воздух, слабое освещение и редкий полив. По данным NASA, входит в число лучших очистителей воздуха — поглощает формальдегид, бензол и трихлорэтилен. Уникальная особенность — CAM-фотосинтез: сансевиерия поглощает CO₂ ночью, что делает её идеальной для спальни.\n\nПолив зимой сокращают до 1 раза в месяц. Главная опасность — переувлажнение и застой воды в розетке, вызывающий гниль. В Африке из волокон листьев традиционно изготавливают верёвки, канаты и грубые ткани.",
    waterNeed: 1,
    lightNeed: 2,
    humidityNeed: 1,
    tempMin: 10,
    tempMax: 35,
    soilType: "Для суккулентов, рыхлый",
    growthRate: "Медленный",
    toxicToPets: true,
    toxicToHumans: false,
    wateringFreqDays: 14,
    fertilizingFreqDays: 60,
    repottingFreqDays: 730,
  },
  {
    scientificName: "Spathiphyllum wallisii",
    commonNameRu: "Спатифиллум",
    commonNameEn: "Peace Lily",
    family: "Araceae",
    imageUrl: thumb(
      "3/32/Spathiphyllum_wallisii_%28Family_Araceae%29_-_spadix_and_spathe_I.jpg"
    ),
    thumbnailUrl: thumb(
      "3/32/Spathiphyllum_wallisii_%28Family_Araceae%29_-_spadix_and_spathe_I.jpg",
      400
    ),
    description:
      'Спатифиллум (лат. Spathiphyllum) — род вечнозелёных многолетников семейства Ароидные, объединяющий около 60 видов, родом из тропических лесов Америки и Юго-Восточной Азии. Крупные тёмно-зелёные ланцетные листья длиной 12–65 см растут прямо от корневища. Знаменит элегантным белым покрывалом-соцветием (спата), окружающим кремовый початок.\n\nОдно из лучших растений для очистки воздуха в помещении — поглощает аммиак, бензол, формальдегид и ксилол. Не требует много света и выдерживает условия офисов с искусственным освещением. Главный индикатор полива — поникшие листья: достаточно обильно полить, и через час растение полностью восстановится.\n\nЛюбит повышенную влажность — регулярное опрыскивание или поддон с керамзитом. Цветёт весной и летом, при хорошем уходе — повторно осенью. В народе называют "женское счастье".',
    waterNeed: 4,
    lightNeed: 2,
    humidityNeed: 4,
    tempMin: 16,
    tempMax: 27,
    soilType: "Влагоёмкий, рыхлый",
    growthRate: "Средний",
    toxicToPets: true,
    toxicToHumans: true,
    wateringFreqDays: 5,
    fertilizingFreqDays: 14,
    repottingFreqDays: 365,
  },
  {
    scientificName: "Crassula ovata 'Hobbit'",
    commonNameRu: "Крассула хоббит",
    commonNameEn: "Hobbit Jade",
    family: "Crassulaceae",
    imageUrl: thumb("a/ac/Crassula_ovata_fleurs_FR_2013.jpg"),
    thumbnailUrl: thumb("a/ac/Crassula_ovata_fleurs_FR_2013.jpg", 400),
    description:
      "Крассула хоббит — культивар толстянки яйцевидной (Crassula ovata), выведенный в 1970-х годах. Отличается необычными трубчатыми листьями, свёрнутыми внутрь и напоминающими ушки Шрека или курительные трубки хоббитов. Листья сочные, тёмно-зелёные, на ярком солнце кончики краснеют.\n\nРодоначальный вид — одно из самых популярных суккулентных растений в мире, родом из Южной Африки (Квазулу-Натал и Восточная Капская провинция). В природе вырастает до 2,5 м, в комнатных условиях формирует компактное деревце 30–60 см с одревесневшим стволом.\n\nКрайне неприхотлива: требует минимального полива (земля должна полностью просохнуть между поливами), хорошо переносит сухой воздух. При избыточном поливе подвержена корневой гнили. Предпочитает яркий свет, на южном окне может зацвести мелкими розовато-белыми звёздчатыми цветками. В народе известна как «денежное дерево».",
    waterNeed: 1,
    lightNeed: 4,
    humidityNeed: 1,
    tempMin: 10,
    tempMax: 30,
    soilType: "Для суккулентов",
    growthRate: "Медленный",
    toxicToPets: true,
    toxicToHumans: false,
    wateringFreqDays: 14,
    fertilizingFreqDays: 60,
    repottingFreqDays: 730,
  },
  {
    scientificName: "Crassula arborescens 'Curly'",
    commonNameRu: "Крассула древовидная кудрявая",
    commonNameEn: "Curly Jade",
    family: "Crassulaceae",
    imageUrl: thumb(
      "3/3f/Crassula_arborescens%2C_Jard%C3%ADn_Bot%C3%A1nico%2C_M%C3%BAnich%2C_Alemania_2012-04-21%2C_DD_01.JPG"
    ),
    thumbnailUrl: thumb(
      "3/3f/Crassula_arborescens%2C_Jard%C3%ADn_Bot%C3%A1nico%2C_M%C3%BAnich%2C_Alemania_2012-04-21%2C_DD_01.JPG",
      400
    ),
    description:
      "Крассула древовидная кудрявая — декоративная форма толстянки древовидной (Crassula arborescens) с волнистыми, закрученными листьями серебристо-зелёного цвета, часто с тонкой красной каймой по краю. Природный вид происходит из Капской провинции ЮАР, где растёт на каменистых склонах холмов.\n\nВ отличие от большинства толстянок, C. arborescens выделяется приземистым сочным стволом и сизо-голубой листвой, контрастирующей с зеленью окружающих растений. Культивар 'Curly' добавляет к этому эффектную волнистость листовой пластины.\n\nСодержание аналогично другим крассулам: редкий полив после полного просыхания грунта, яркое освещение (не менее 4–6 часов прямого солнца), температура зимой не ниже 10°C. Грунт — специальная смесь для суккулентов с хорошим дренажом. Медленнорастущее, компактное деревце, удобное для подоконников.",
    waterNeed: 1,
    lightNeed: 4,
    humidityNeed: 1,
    tempMin: 10,
    tempMax: 30,
    soilType: "Для суккулентов",
    growthRate: "Медленный",
    toxicToPets: true,
    toxicToHumans: false,
    wateringFreqDays: 14,
    fertilizingFreqDays: 60,
    repottingFreqDays: 730,
  },
  {
    scientificName: "Schlumbergera truncata",
    commonNameRu: "Шлюмбергера",
    commonNameEn: "Christmas Cactus",
    family: "Cactaceae",
    imageUrl: thumb("f/fd/Schlumbergera_Truncata.jpg"),
    thumbnailUrl: thumb("f/fd/Schlumbergera_Truncata.jpg", 400),
    description:
      "Шлюмбергера (лат. Schlumbergera) — род эпифитных кактусов из прибрежных гор юго-восточной Бразилии. В отличие от пустынных родственников, растёт на деревьях и скалах в тенистых влажных лесах. Стебли состоят из плоских сегментов с зубчатыми краями, цветки появляются на концах побегов.\n\nЦветёт зимой — отсюда народные названия «декабрист», «рождественский кактус», «рождественник». Цветки бывают белыми, розовыми, красными, оранжевыми, жёлтыми и пурпурными. Для обильного цветения необходим период покоя: с октября — сокращение полива и светового дня (12–14 часов темноты), температура 12–15°C в течение 6 недель.\n\nНе переносит прямого солнца (ожоги сегментов) и пересушки — земляной ком должен оставаться слегка влажным. Любит повышенную влажность и рассеянный свет. Долгожитель: при хорошем уходе живёт 20–30 лет и более.",
    waterNeed: 3,
    lightNeed: 2,
    humidityNeed: 3,
    tempMin: 10,
    tempMax: 27,
    soilType: "Рыхлый, слабокислый",
    growthRate: "Средний",
    toxicToPets: false,
    toxicToHumans: false,
    wateringFreqDays: 7,
    fertilizingFreqDays: 14,
    repottingFreqDays: 365,
  },
  {
    scientificName: "Yucca elephantipes",
    commonNameRu: "Юкка",
    commonNameEn: "Spineless Yucca",
    family: "Asparagaceae",
    imageUrl: thumb("d/d1/Yucca_elephantipes_HRM2.JPG"),
    thumbnailUrl: thumb("d/d1/Yucca_elephantipes_HRM2.JPG", 400),
    description:
      "Юкка слоновая (лат. Yucca elephantipes, syn. Y. gigantea) — однодольное древесное растение семейства Спаржевые, родом из Мексики и Центральной Америки. Является национальным цветком Сальвадора. В природе вырастает до 9 м, в комнатных условиях обычно 1–2 м.\n\nФормирует толстый одревесневший ствол (напоминающий ногу слона — отсюда видовое название) с розетками жёстких мечевидных листьев на верхушке. В отличие от многих других юкк, листья Y. elephantipes не колючие на концах, за что её называют «бесколючковая юкка».\n\nОдно из самых выносливых комнатных растений: прекрасно переносит сухой воздух квартир, яркое солнце и умеренный полив. Зимой полив сокращают до минимума. Предпочитает яркий свет, но мирится с лёгкой полутенью. Легко размножается отрезками ствола. Практически не подвержена болезням и вредителям при правильном уходе.",
    waterNeed: 2,
    lightNeed: 4,
    humidityNeed: 1,
    tempMin: 7,
    tempMax: 35,
    soilType: "Дренированный, универсальный",
    growthRate: "Средний",
    toxicToPets: true,
    toxicToHumans: false,
    wateringFreqDays: 10,
    fertilizingFreqDays: 30,
    repottingFreqDays: 730,
  },
  {
    scientificName: "Chlorophytum comosum 'Variegatum'",
    commonNameRu: "Хлорофитум вариегатный",
    commonNameEn: "Variegated Spider Plant",
    family: "Asparagaceae",
    imageUrl: thumb("0/05/Chlorophytum_comosum%2C_flores.jpg"),
    thumbnailUrl: thumb("0/05/Chlorophytum_comosum%2C_flores.jpg", 400),
    description:
      "Хлорофитум хохлатый (лат. Chlorophytum comosum) — вечнозелёный травянистый многолетник семейства Спаржевые, родом из тропической и Южной Африки. Форма 'Variegatum' отличается декоративными листьями с белыми или кремовыми полосами по краям зелёной центральной части.\n\nОдно из самых популярных ампельных растений: длинные дуговидные листья (до 45 см) образуют пышный каскад, а на свисающих столонах развиваются миниатюрные дочерние розетки («детки»), напоминающие маленьких паучков — отсюда английское название Spider Plant.\n\nПо исследованиям NASA, хлорофитум входит в тройку лучших очистителей воздуха: эффективно поглощает формальдегид, ксилол и угарный газ. Практически неубиваемое растение — прощает пересушку (толстые мясистые корни запасают воду), слабое освещение и нерегулярный уход. Для сохранения яркой вариегатности нуждается в рассеянном свете — в тени белые полосы бледнеют.",
    waterNeed: 3,
    lightNeed: 3,
    humidityNeed: 2,
    tempMin: 10,
    tempMax: 30,
    soilType: "Универсальный",
    growthRate: "Быстрый",
    toxicToPets: false,
    toxicToHumans: false,
    wateringFreqDays: 7,
    fertilizingFreqDays: 14,
    repottingFreqDays: 365,
  },
  {
    scientificName: "Chlorophytum comosum",
    commonNameRu: "Хлорофитум зелёный",
    commonNameEn: "Green Spider Plant",
    family: "Asparagaceae",
    imageUrl: thumb("0/05/Chlorophytum_comosum%2C_flores.jpg"),
    thumbnailUrl: thumb("0/05/Chlorophytum_comosum%2C_flores.jpg", 400),
    description:
      "Зелёная (исходная) форма хлорофитума хохлатого — полностью зелёные однотонные листья без полос. Более теневыносливая, чем вариегатные формы, поскольку вся площадь листа участвует в фотосинтезе.\n\nМноголетнее травянистое растение с мясистыми клубневидными корнями, запасающими воду. Листья линейные, дуговидно изогнутые, длиной до 60 см. На длинных свисающих цветоносах образует мелкие белые цветки и дочерние розетки.\n\nБезопасен для домашних животных (нетоксичен), что делает его идеальным выбором для семей с кошками — хотя кошки часто грызут его листья (привлекает лёгкий опьяняющий эффект, схожий с кошачьей мятой). Легко размножается детками, которые можно укоренить в воде или грунте. Один из рекордсменов по скорости роста среди комнатных растений.",
    waterNeed: 3,
    lightNeed: 2,
    humidityNeed: 2,
    tempMin: 10,
    tempMax: 30,
    soilType: "Универсальный",
    growthRate: "Быстрый",
    toxicToPets: false,
    toxicToHumans: false,
    wateringFreqDays: 7,
    fertilizingFreqDays: 14,
    repottingFreqDays: 365,
  },
  {
    scientificName: "Peperomia obtusifolia",
    commonNameRu: "Пеперомия туполистная",
    commonNameEn: "Baby Rubber Plant",
    family: "Piperaceae",
    imageUrl: thumb(
      "a/ab/Peperomia_obtusifolia%2C_Conservatorio_bot%C3%A1nico%2C_Fort_Wayne%2C_Indiana%2C_Estados_Unidos%2C_2012-11-12%2C_DD_01.jpg"
    ),
    thumbnailUrl: thumb(
      "a/ab/Peperomia_obtusifolia%2C_Conservatorio_bot%C3%A1nico%2C_Fort_Wayne%2C_Indiana%2C_Estados_Unidos%2C_2012-11-12%2C_DD_01.jpg",
      400
    ),
    description:
      "Пеперомия туполистная (лат. Peperomia obtusifolia) — компактное вечнозелёное многолетнее растение семейства Перечные (Piperaceae), родом из тропических лесов Южной и Центральной Америки. Род Peperomia насчитывает более 1000 видов, многие из которых — эпифиты или литофиты.\n\nОтличается толстыми, мясистыми, глянцевыми овальными листьями тёмно-зелёного цвета на коротких мясистых стеблях. Листья напоминают каучуконосный фикус в миниатюре — отсюда английское название Baby Rubber Plant. Вырастает до 25–30 см.\n\nМинималистичная корневая система (тонкие, волосоподобные корешки) делает растение уязвимым к переливу — грунт должен просыхать между поливами. Хорошо растёт при комнатной температуре и сухом воздухе квартир. Предпочитает рассеянный свет, но переносит и полутень. Нетоксична для домашних животных.",
    waterNeed: 2,
    lightNeed: 3,
    humidityNeed: 2,
    tempMin: 15,
    tempMax: 29,
    soilType: "Рыхлый, дренированный",
    growthRate: "Медленный",
    toxicToPets: false,
    toxicToHumans: false,
    wateringFreqDays: 10,
    fertilizingFreqDays: 21,
    repottingFreqDays: 365,
  },
  {
    scientificName: "Hoya sp. 'Chuk'",
    commonNameRu: "Хойя Чук",
    commonNameEn: "Hoya Chuk",
    family: "Apocynaceae",
    imageUrl: thumb(
      "f/f4/Hoya_carnosa_-_umbel_with_nectar_droplets.jpg"
    ),
    thumbnailUrl: thumb(
      "f/f4/Hoya_carnosa_-_umbel_with_nectar_droplets.jpg",
      400
    ),
    description:
      "Хойя (лат. Hoya) — род вечнозелёных тропических лиан и кустарников подсемейства Ластовневые семейства Кутровые. Естественный ареал охватывает Южную и Юго-Восточную Азию, Австралию и Полинезию. Род назван в честь английского садовника Томаса Хоя (1750–1822), работавшего в оранжереях герцога Нортумберлендского.\n\nСорт 'Chuk' — компактная восковая лиана с плотными мясистыми листьями овальной формы. При достаточном освещении образует зонтиковидные соцветия из мелких звёздчатых восковых цветков с сильным сладким ароматом и каплями нектара.\n\nЭпифит по природе — нуждается в рыхлом воздухопроницаемом субстрате (кора, перлит, мох). Полив умеренный, между поливами грунт должен просыхать. Не любит пересадок — тесный горшок стимулирует цветение. Цветоносы (шпоры) нельзя обрезать после цветения — на них повторно формируются бутоны.",
    waterNeed: 2,
    lightNeed: 3,
    humidityNeed: 2,
    tempMin: 15,
    tempMax: 30,
    soilType: "Для эпифитов, рыхлый",
    growthRate: "Медленный",
    toxicToPets: false,
    toxicToHumans: false,
    wateringFreqDays: 10,
    fertilizingFreqDays: 21,
    repottingFreqDays: 730,
  },
  {
    scientificName: "Syngonium podophyllum 'Red Arrow'",
    commonNameRu: "Сингониум Рэд Эрроу",
    commonNameEn: "Red Arrow Syngonium",
    family: "Araceae",
    imageUrl: thumb(
      "4/40/Syngonium_podophyllum_%28_Arrowhead_plant%29.jpg"
    ),
    thumbnailUrl: thumb(
      "4/40/Syngonium_podophyllum_%28_Arrowhead_plant%29.jpg",
      400
    ),
    description:
      "Сингониум ножколистный (лат. Syngonium podophyllum) — вид цветковых растений семейства Ароидные, родом из тропических дождевых лесов Мексики, Центральной и Южной Америки. Название рода от греческого syn (вместе) и gone (семя) — по сросшимся завязям женских цветков.\n\nСорт 'Red Arrow' отличается стреловидными листьями с выраженным розовато-красным оттенком, особенно на молодых побегах. По мере роста листья меняют форму: у молодых растений — простые стреловидные, у взрослых — пальчато-рассечённые на 5–11 долей.\n\nВьющаяся лиана, в природе взбирается на деревья с помощью воздушных корней на высоту 10–20 м. В комнатных условиях компактна, хорошо смотрится на опоре или в подвесном кашпо. Быстрорастущее растение, легко размножается стеблевыми черенками. Предпочитает яркий рассеянный свет, умеренный полив и повышенную влажность.",
    waterNeed: 3,
    lightNeed: 3,
    humidityNeed: 3,
    tempMin: 15,
    tempMax: 30,
    soilType: "Рыхлый, дренированный",
    growthRate: "Быстрый",
    toxicToPets: true,
    toxicToHumans: true,
    wateringFreqDays: 7,
    fertilizingFreqDays: 14,
    repottingFreqDays: 365,
  },
  {
    scientificName: "Monstera adansonii",
    commonNameRu: "Монстера Манки Маск",
    commonNameEn: "Monkey Mask Monstera",
    family: "Araceae",
    imageUrl: thumb("8/8f/Monstera_adansonii_46016108.jpg"),
    thumbnailUrl: thumb("8/8f/Monstera_adansonii_46016108.jpg", 400),
    description:
      "Монстера Адансона (лат. Monstera adansonii) — вид цветковых растений семейства Ароидные, широко распространённый в тропических лесах Южной и Центральной Америки. Классифицируется как полуэпифитная лиана, обитающая в жарких влажных условиях тропического леса.\n\nОтличается от знаменитой M. deliciosa более мелкими (10–25 см) овальными листьями с многочисленными отверстиями (фенестрациями), которые не доходят до края листа. За узор из «окошек» получила народные названия «швейцарский сыр» и «маска обезьяны» (Monkey Mask).\n\nБыстрорастущая лиана — на опоре (моховой столб) за год может вырасти на 30–60 см. Воздушные корни активно цепляются за опору и впитывают влагу. Любит яркий рассеянный свет и повышенную влажность (от 60%). Регулярный полив после просыхания верхнего слоя грунта. Легко размножается черенками с воздушным корнем.",
    waterNeed: 3,
    lightNeed: 3,
    humidityNeed: 4,
    tempMin: 16,
    tempMax: 30,
    soilType: "Рыхлый, дренированный",
    growthRate: "Быстрый",
    toxicToPets: true,
    toxicToHumans: true,
    wateringFreqDays: 7,
    fertilizingFreqDays: 14,
    repottingFreqDays: 365,
  },
  {
    scientificName: "Ficus elastica 'Tineke'",
    commonNameRu: "Фикус эластика Тинеке",
    commonNameEn: "Tineke Rubber Plant",
    family: "Moraceae",
    imageUrl: thumb(
      "0/0e/Catania%2C_Villa_Bellini_2024f%2C_Ficus_elastica.jpg"
    ),
    thumbnailUrl: thumb(
      "0/0e/Catania%2C_Villa_Bellini_2024f%2C_Ficus_elastica.jpg",
      400
    ),
    description:
      "Фикус каучуконосный (лат. Ficus elastica) — вид цветковых растений семейства Тутовые, родом из восточных частей Южной и Юго-Восточной Азии (Индия, Непал, Мьянма, Малайзия). В природе — мощное дерево до 30 м высотой с воздушными корнями. Исторически использовался как источник натурального каучука в местах произрастания.\n\nСорт 'Tineke' — декоративная вариегатная форма с крупными (до 30 см) кожистыми листьями: зелёная центральная часть, кремово-белые края и розоватые молодые побеги, защищённые ярко-розовым прилистником.\n\nДля сохранения пестролистности необходим яркий рассеянный свет — в тени вариегатность бледнеет. Полив умеренный, между поливами верхний слой должен просохнуть. Не любит сквозняков и резких перепадов температуры — может сбросить листья. Млечный сок вызывает раздражение кожи — пересаживать в перчатках. Листья полезно протирать от пыли для улучшения фотосинтеза.",
    waterNeed: 3,
    lightNeed: 4,
    humidityNeed: 3,
    tempMin: 15,
    tempMax: 29,
    soilType: "Дренированный, питательный",
    growthRate: "Средний",
    toxicToPets: true,
    toxicToHumans: false,
    wateringFreqDays: 7,
    fertilizingFreqDays: 21,
    repottingFreqDays: 730,
  },
  {
    scientificName: "Epipremnum aureum",
    commonNameRu: "Эпипремнум золотистый",
    commonNameEn: "Golden Pothos",
    family: "Araceae",
    imageUrl: thumb("9/9d/Epipremnum_aureum_31082012.jpg"),
    thumbnailUrl: thumb("9/9d/Epipremnum_aureum_31082012.jpg", 400),
    description:
      "Эпипремнум золотистый (лат. Epipremnum aureum) — вид лиан семейства Ароидные, родом с острова Муреа (Французская Полинезия). Натурализовался в тропиках по всему миру. Одно из самых распространённых комнатных растений, известное под множеством названий: потос, дьявольский плющ, золотой потос, денежное растение.\n\nСердцевидные глянцевые листья на длинных вьющихся стеблях. У исходной формы — зелёные с золотистыми пятнами и штрихами. Получил награду Королевского садоводческого общества (AGM). В природе цветёт крайне редко — последнее задокументированное цветение в культуре датируется 1964 годом.\n\nПоистине неубиваемое растение: растёт как в воде, так и в грунте; переносит слабое освещение, нерегулярный полив и сухой воздух. Эффективно очищает воздух от формальдегида. Чувствителен к фтору в водопроводной воде — лучше поливать отстоянной. Легко размножается черенками в воде.",
    waterNeed: 2,
    lightNeed: 2,
    humidityNeed: 2,
    tempMin: 15,
    tempMax: 30,
    soilType: "Универсальный",
    growthRate: "Быстрый",
    toxicToPets: true,
    toxicToHumans: false,
    wateringFreqDays: 7,
    fertilizingFreqDays: 30,
    repottingFreqDays: 365,
  },
  {
    scientificName: "Epipremnum aureum 'Neon'",
    commonNameRu: "Эпипремнум Неон",
    commonNameEn: "Neon Pothos",
    family: "Araceae",
    imageUrl: thumb("9/9d/Epipremnum_aureum_31082012.jpg"),
    thumbnailUrl: thumb("9/9d/Epipremnum_aureum_31082012.jpg", 400),
    description:
      "Эпипремнум Неон — яркий культивар E. aureum с однотонными неоново-зелёными, почти лаймовыми листьями без пятен и штрихов. Молодые листья имеют более насыщенный, почти жёлтый оттенок, с возрастом темнеющий до салатового.\n\nСохраняет все достоинства видового растения: неприхотливость, быстрый рост, устойчивость к ошибкам в уходе. Однако для поддержания яркой неоновой окраски нуждается в более ярком освещении, чем зелёная форма — при недостатке света листья тускнеют.\n\nОтлично смотрится в композициях с тёмнолистными растениями, создавая контраст. Как и все эпипремнумы, содержит оксалат кальция — токсичен для кошек и собак при поедании. Уход стандартный: полив после просыхания верхнего слоя грунта, рассеянный свет, обычная комнатная температура.",
    waterNeed: 2,
    lightNeed: 3,
    humidityNeed: 2,
    tempMin: 15,
    tempMax: 30,
    soilType: "Универсальный",
    growthRate: "Быстрый",
    toxicToPets: true,
    toxicToHumans: false,
    wateringFreqDays: 7,
    fertilizingFreqDays: 30,
    repottingFreqDays: 365,
  },
  {
    scientificName: "Epipremnum aureum 'Marble Planet'",
    commonNameRu: "Эпипремнум Марбл Эппл",
    commonNameEn: "Marble Planet Pothos",
    family: "Araceae",
    imageUrl: thumb("9/9d/Epipremnum_aureum_31082012.jpg"),
    thumbnailUrl: thumb("9/9d/Epipremnum_aureum_31082012.jpg", 400),
    description:
      "Эпипремнум Марбл Эппл (Marble Planet) — декоративный культивар с мраморным рисунком на листьях: хаотичные зелёные и кремово-белые пятна различной формы и размера. Каждый лист уникален, как отпечаток пальца.\n\nОтличается от Marble Queen более выраженным зелёным фоном и контрастными белыми пятнами (у Queen — почти равномерное соотношение белого и зелёного). Благодаря большему количеству хлорофилла растёт быстрее полностью вариегатных форм.\n\nДля яркого рисунка необходим рассеянный свет — на северном окне белые пятна будут менее выражены. Полив стандартный для эпипремнумов: после просыхания верхних 2–3 см грунта. Универсальное ампельное или вьющееся растение для интерьера.",
    waterNeed: 2,
    lightNeed: 3,
    humidityNeed: 2,
    tempMin: 15,
    tempMax: 30,
    soilType: "Универсальный",
    growthRate: "Средний",
    toxicToPets: true,
    toxicToHumans: false,
    wateringFreqDays: 7,
    fertilizingFreqDays: 30,
    repottingFreqDays: 365,
  },
  {
    scientificName: "Epipremnum pinnatum 'Cebu Blue'",
    commonNameRu: "Эпипремнум Себу Блю",
    commonNameEn: "Cebu Blue Pothos",
    family: "Araceae",
    imageUrl: thumb(
      "b/b2/Dragon-Tail_Plant_%28Epipremnum_pinnatum%29.jpg"
    ),
    thumbnailUrl: thumb(
      "b/b2/Dragon-Tail_Plant_%28Epipremnum_pinnatum%29.jpg",
      400
    ),
    description:
      "Эпипремнум перистый (лат. Epipremnum pinnatum) — вид вечнозелёных лиан семейства Ароидные, распространённый от Китая и Гималаев до Австралии. В природе может достигать высоты 40 м, а листья — 3 м в длину. Все части растения токсичны из-за трихосклереид и рафид.\n\nФорма 'Cebu Blue' родом с острова Себу (Филиппины). Отличается необычными серебристо-голубыми узкими листьями с металлическим отливом. Молодые листья — цельные, но с возрастом на опоре развивают фенестрации (перфорации), характерные для рода.\n\nРастёт умеренно, для ускорения роста и появления «взрослых» перфорированных листьев рекомендуется моховой столб. Предпочитает яркий рассеянный свет и повышенную влажность (50–70%). Полив после просыхания верхнего слоя грунта. Рыхлый субстрат с корой и перлитом для хорошей аэрации корней.",
    waterNeed: 2,
    lightNeed: 3,
    humidityNeed: 3,
    tempMin: 15,
    tempMax: 30,
    soilType: "Рыхлый, дренированный",
    growthRate: "Средний",
    toxicToPets: true,
    toxicToHumans: false,
    wateringFreqDays: 7,
    fertilizingFreqDays: 21,
    repottingFreqDays: 365,
  },
  {
    scientificName: "Epipremnum pinnatum 'Albo Variegata'",
    commonNameRu: "Эпипремнум пиннатум Вайт",
    commonNameEn: "White Variegated Epipremnum",
    family: "Araceae",
    imageUrl: thumb(
      "b/b2/Dragon-Tail_Plant_%28Epipremnum_pinnatum%29.jpg"
    ),
    thumbnailUrl: thumb(
      "b/b2/Dragon-Tail_Plant_%28Epipremnum_pinnatum%29.jpg",
      400
    ),
    description:
      "Эпипремнум пиннатум Альбо Вариегата — редкая и высоко ценимая коллекционная форма E. pinnatum с крупными белыми секторами на листьях. Белые участки лишены хлорофилла, поэтому растение фотосинтезирует менее эффективно и растёт существенно медленнее зелёных форм.\n\nТребует внимательного ухода: яркий рассеянный свет обязателен (но без прямых лучей — белые участки легко обгорают). Полив осторожный — из-за медленного роста потребляет меньше воды, а переувлажнение быстро приводит к загниванию.\n\nНа моховой опоре развивает более крупные листья с характерными перфорациями и выраженной вариегатностью. Субстрат — рыхлый, для ароидных: кора, перлит, мох сфагнум, кокосовое волокно. Размножается только вегетативно — черенками с узлом и воздушным корнем.",
    waterNeed: 2,
    lightNeed: 4,
    humidityNeed: 3,
    tempMin: 16,
    tempMax: 29,
    soilType: "Рыхлый, для ароидных",
    growthRate: "Медленный",
    toxicToPets: true,
    toxicToHumans: false,
    wateringFreqDays: 7,
    fertilizingFreqDays: 21,
    repottingFreqDays: 365,
  },
  {
    scientificName: "Epipremnum aureum 'Marble Queen'",
    commonNameRu: "Эпипремнум Марбл Квин",
    commonNameEn: "Marble Queen Pothos",
    family: "Araceae",
    imageUrl: thumb("9/9d/Epipremnum_aureum_31082012.jpg"),
    thumbnailUrl: thumb("9/9d/Epipremnum_aureum_31082012.jpg", 400),
    description:
      "Эпипремнум Марбл Квин — один из старейших и самых популярных вариегатных культиваров E. aureum с обильной бело-зелёной мраморностью. Соотношение белого и зелёного примерно 50/50, что придаёт растению светлый, воздушный вид.\n\nИз-за высокой доли белого цвета (меньше хлорофилла) растёт значительно медленнее зелёной формы и более требовательна к освещению. Яркий рассеянный свет усиливает белую окраску, недостаток света — вызывает «позеленение» (реверсию к зелёной форме).\n\nПолив реже, чем у зелёных форм — медленный метаболизм означает меньшее потребление воды. Обрезка полностью зелёных побегов помогает сохранить вариегатность. Одно из самых доступных вариегатных ароидных — отличный выбор для начинающих коллекционеров.",
    waterNeed: 2,
    lightNeed: 3,
    humidityNeed: 2,
    tempMin: 15,
    tempMax: 30,
    soilType: "Универсальный, дренированный",
    growthRate: "Средний",
    toxicToPets: true,
    toxicToHumans: false,
    wateringFreqDays: 7,
    fertilizingFreqDays: 30,
    repottingFreqDays: 365,
  },
  {
    scientificName: "Epipremnum aureum 'N'Joy'",
    commonNameRu: "Эпипремнум Энджой",
    commonNameEn: "N'Joy Pothos",
    family: "Araceae",
    imageUrl: thumb("9/9d/Epipremnum_aureum_31082012.jpg"),
    thumbnailUrl: thumb("9/9d/Epipremnum_aureum_31082012.jpg", 400),
    description:
      "Эпипремнум Энджой (N'Joy) — компактный культивар E. aureum, запатентованный в 2002 году. Отличается от других вариегатных потосов небольшими округлыми листьями с чёткими, чистыми белыми и зелёными секторами (не мраморными, а блочными).\n\nРастёт медленнее и компактнее классического потоса — побеги короче, междоузлия теснее. Это делает его идеальным для небольших пространств, полок, террариумов и настольных композиций.\n\nТребования к уходу стандартные для эпипремнумов с поправкой на вариегатность: чуть больше света для сохранения контрастного рисунка, чуть осторожнее с поливом из-за медленного роста. Хорошо кустится при прищипке верхушки.",
    waterNeed: 2,
    lightNeed: 3,
    humidityNeed: 2,
    tempMin: 15,
    tempMax: 30,
    soilType: "Универсальный, дренированный",
    growthRate: "Средний",
    toxicToPets: true,
    toxicToHumans: false,
    wateringFreqDays: 7,
    fertilizingFreqDays: 30,
    repottingFreqDays: 365,
  },
  {
    scientificName: "Hoya australis 'Lisa'",
    commonNameRu: "Хойя аустралис Лиза",
    commonNameEn: "Hoya Lisa",
    family: "Apocynaceae",
    imageUrl: thumb("2/2f/Hoya-australis-SF22215-02.jpg"),
    thumbnailUrl: thumb("2/2f/Hoya-australis-SF22215-02.jpg", 400),
    description:
      "Хойя южная (лат. Hoya australis) — вид цветковых растений семейства Кутровые, родом из северной и восточной Австралии, Папуазии и Меланезии. Суккулентная лиана или полукустарник с мясистыми или кожистыми эллиптическими листьями и зонтиковидными кистями ароматных кремово-белых цветков с красной серединкой.\n\nКультивар 'Lisa' — вариегатная форма с эффектной окраской: зелёные края листа и жёлто-кремовая центральная часть, иногда с розоватыми оттенками на новых приростах.\n\nМедленнорастущая и компактная. При хорошем освещении и правильном уходе образует те же ароматные восковые соцветия, что и видовое растение. Субстрат — рыхлый, для эпифитов (кора + перлит). Полив после просыхания грунта. Как и все хойи, предпочитает тесный горшок — пересадка раз в 2–3 года. Нетоксична для домашних животных.",
    waterNeed: 2,
    lightNeed: 3,
    humidityNeed: 2,
    tempMin: 15,
    tempMax: 30,
    soilType: "Для эпифитов, рыхлый",
    growthRate: "Медленный",
    toxicToPets: false,
    toxicToHumans: false,
    wateringFreqDays: 10,
    fertilizingFreqDays: 21,
    repottingFreqDays: 730,
  },
  {
    scientificName: "Philodendron hederaceum 'Brasil'",
    commonNameRu: "Филодендрон Бразил",
    commonNameEn: "Brasil Philodendron",
    family: "Araceae",
    imageUrl: thumb("7/7f/Philodendron_hederaceum_kz01.jpg"),
    thumbnailUrl: thumb("7/7f/Philodendron_hederaceum_kz01.jpg", 400),
    description:
      "Филодендрон плющевидный (лат. Philodendron hederaceum) — вид вьющихся растений семейства Ароидные, родом из тропических лесов Центральной и Южной Америки. Род Philodendron — второй по величине в семействе (после Anthurium), название от греческого philo (любовь) и dendron (дерево).\n\nКультивар 'Brasil' — пестролистная форма с сердцевидными листьями: тёмно-зелёные края и широкая жёлто-зелёная (лаймовая) полоса по центру. По данным Книги рекордов Гиннесса, домашний филодендрон этого вида достигал длины 167 м!\n\nБыстрорастущая и неприхотливая лиана — идеальна для начинающих. Прекрасно смотрится в подвесном кашпо или на полке, откуда свисают длинные плети. Легко размножается черенками в воде. Предпочитает рассеянный свет и умеренный полив. Токсична при поедании — содержит оксалат кальция.",
    waterNeed: 3,
    lightNeed: 3,
    humidityNeed: 3,
    tempMin: 15,
    tempMax: 30,
    soilType: "Рыхлый, дренированный",
    growthRate: "Быстрый",
    toxicToPets: true,
    toxicToHumans: true,
    wateringFreqDays: 7,
    fertilizingFreqDays: 14,
    repottingFreqDays: 365,
  },
  {
    scientificName: "Tradescantia fluminensis",
    commonNameRu: "Традесканция белоцветковая",
    commonNameEn: "Wandering Jew",
    family: "Commelinaceae",
    imageUrl: thumb("1/1a/Tradescantia_fluminensis_kz05.jpg"),
    thumbnailUrl: thumb("1/1a/Tradescantia_fluminensis_kz05.jpg", 400),
    description:
      "Традесканция (лат. Tradescantia) — род из 85 видов травянистых многолетников семейства Коммелиновые, родом из Америки (от южной Канады до северной Аргентины). T. fluminensis — один из самых распространённых видов, привезённый в Европу как декоративное растение ещё в XVII веке.\n\nСтелющееся ампельное растение с мясистыми стеблями и нежными овальными листьями. Мелкие белые трёхлепестковые цветки появляются на кончиках побегов. Высота 30–60 см, побеги могут свисать на метр и более.\n\nОдно из самых быстрорастущих комнатных растений — за сезон легко удваивает объём. Абсолютно неприхотлива: растёт в любом грунте, при любом освещении, легко укореняется черенками в воде или грунте. Интересный факт: род Tradescantia используется в биологических исследованиях как биоиндикатор экологических мутагенов благодаря чувствительности хромосом к внешним воздействиям.",
    waterNeed: 3,
    lightNeed: 2,
    humidityNeed: 2,
    tempMin: 10,
    tempMax: 30,
    soilType: "Универсальный",
    growthRate: "Быстрый",
    toxicToPets: true,
    toxicToHumans: false,
    wateringFreqDays: 5,
    fertilizingFreqDays: 14,
    repottingFreqDays: 365,
  },
  {
    scientificName: "Tradescantia spathacea",
    commonNameRu: "Традесканция Рео",
    commonNameEn: "Moses in the Cradle",
    family: "Commelinaceae",
    imageUrl: thumb(
      "3/32/Moses_in_the_cradle_%28Tradescantia_spathacea%29.jpg"
    ),
    thumbnailUrl: thumb(
      "3/32/Moses_in_the_cradle_%28Tradescantia_spathacea%29.jpg",
      400
    ),
    description:
      "Традесканция покрывальчатая, или Рео (лат. Tradescantia spathacea, syn. Rhoeo discolor) — вид травянистых растений рода Традесканция, ранее выделявшийся в отдельный род Rhoeo. Родом из Центральной Америки (Мексика, Белиз, Гватемала).\n\nОтличается от типичных традесканций розеточной формой роста (не вьётся): длинные мечевидные листья до 30 см, тёмно-зелёные сверху и ярко-пурпурные снизу. Мелкие белые цветки прячутся в лодочкообразных фиолетовых прицветниках — отсюда английское название «Моисей в колыбели».\n\nКомпактное и неприхотливое растение. Для насыщенной окраски (особенно фиолетовой изнанки листьев) нуждается в ярком рассеянном свете. При недостатке света пурпурная окраска бледнеет. Полив умеренный, переносит кратковременную засуху. Размножается боковыми розетками.",
    waterNeed: 3,
    lightNeed: 3,
    humidityNeed: 2,
    tempMin: 12,
    tempMax: 30,
    soilType: "Универсальный",
    growthRate: "Средний",
    toxicToPets: true,
    toxicToHumans: true,
    wateringFreqDays: 7,
    fertilizingFreqDays: 14,
    repottingFreqDays: 365,
  },
  {
    scientificName: "Ceropegia woodii",
    commonNameRu: "Церопегия Вуда",
    commonNameEn: "String of Hearts",
    family: "Apocynaceae",
    imageUrl: thumb(
      "1/19/Ceropegia_woodii_Ceropegia_Wooda_2024-04-26_01.jpg"
    ),
    thumbnailUrl: thumb(
      "1/19/Ceropegia_woodii_Ceropegia_Wooda_2024-04-26_01.jpg",
      400
    ),
    description:
      "Церопегия Вуда (лат. Ceropegia woodii) — вид суккулентных лиан семейства Кутровые, родом из Южной Африки (Свазиленд, Зимбабве). Род Ceropegia назван Линнеем от греческого keropegion (канделябр) — по форме цветков. Многочисленные народные названия: «цепочка сердец», «нитка жемчуга», «розарий».\n\nИзящная ампельная суккулентная лиана с тонкими нитевидными пурпурными стеблями длиной до 2–4 м. Мелкие (1–2 см) сердцевидные листья с серебристым мраморным рисунком сверху и пурпурной изнанкой. На стеблях формируются воздушные клубеньки, из которых при контакте с грунтом вырастают новые побеги.\n\nЦветки необычной трубчатой формы, розово-пурпурные, напоминающие миниатюрные фонарики. Предпочитает яркий свет и очень редкий полив — как суккулент, запасает воду в клубне и листьях. Перелив — главная причина гибели. Нетоксична, безопасна для домашних животных.",
    waterNeed: 1,
    lightNeed: 4,
    humidityNeed: 1,
    tempMin: 12,
    tempMax: 30,
    soilType: "Для суккулентов, рыхлый",
    growthRate: "Средний",
    toxicToPets: false,
    toxicToHumans: false,
    wateringFreqDays: 12,
    fertilizingFreqDays: 30,
    repottingFreqDays: 730,
  },
  {
    scientificName: "Adenium obesum",
    commonNameRu: "Адениум",
    commonNameEn: "Desert Rose",
    family: "Apocynaceae",
    imageUrl: thumb(
      "4/4a/Adenium_Obesum_Flower_Side_Macro_Mar22_D72_23052-58_ZS_P.jpg"
    ),
    thumbnailUrl: thumb(
      "4/4a/Adenium_Obesum_Flower_Side_Macro_Mar22_D72_23052-58_ZS_P.jpg",
      400
    ),
    description:
      'Адениум тучный (лат. Adenium obesum) — вид невысоких полукустарников или небольших деревьев подсемейства Кутровые с характерным утолщённым стволом-каудексом. Произрастает в регионе Сахель к югу от Сахары, тропиках и субтропиках Восточной и Южной Африки, а также на Аравийском полуострове.\n\nИзвестен под множеством названий: «роза пустыни», «звезда Саби», «импальская лилия», «ложная азалия». Каудекс (бутылкообразное утолщение ствола) запасает воду и придаёт растению скульптурный вид. Яркие цветки — от белых и розовых до красных и бордовых, часто двухцветные, напоминают цветки олеандра.\n\nЛюбит жару и яркое прямое солнце — одно из немногих комнатных растений, нуждающихся в максимальном освещении. Зимой впадает в состояние покоя: сбрасывает листья, полив практически прекращают. Популярен как растение для бонсай благодаря фактурному каудексу. Сок ядовит — работать в перчатках, не допускать контакта с детьми и животными.',
    waterNeed: 1,
    lightNeed: 5,
    humidityNeed: 1,
    tempMin: 12,
    tempMax: 38,
    soilType: "Для суккулентов, дренированный",
    growthRate: "Медленный",
    toxicToPets: true,
    toxicToHumans: true,
    wateringFreqDays: 10,
    fertilizingFreqDays: 30,
    repottingFreqDays: 730,
  },
];

async function main() {
  console.log("Seeding species catalog...");

  for (const species of SPECIES) {
    await prisma.plantSpecies.upsert({
      where: { scientificName: species.scientificName },
      update: species,
      create: species,
    });
    console.log(`  \u2713 ${species.commonNameRu} (${species.scientificName})`);
  }

  console.log(`\nDone! Seeded ${SPECIES.length} species.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
