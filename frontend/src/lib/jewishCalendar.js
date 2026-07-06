// Jewish calendar utilities — Yiddish names, parshiyos, yomim tovim
// Trimmed from the original app and adapted to the rebuild.

export const STANDARD_ALIYOS = [
  { id: "hotzaah", label: "הוצאה והכנסה" },
  { id: "kohen", label: "כהן" },
  { id: "levi", label: "לוי" },
  { id: "shlishi", label: "שלישי" },
  { id: "revii", label: "רביעי" },
  { id: "chamishi", label: "חמישי" },
  { id: "shishi", label: "שישי" },
  { id: "shvii", label: "שביעי" },
  { id: "acharon", label: "אחרון" },
  { id: "maftir", label: "מפטיר" },
  { id: "hagbah", label: "הגבה" },
  { id: "glilah", label: "גלילה" },
  { id: "mincha", label: "מנחה" },
  { id: "bentsh", label: "בענטשען" },
  { id: "geshnadt1", label: "געשנאדערט א׳" },
  { id: "geshnadt2", label: "געשנאדערט ב׳" },
  { id: "geshnadt3", label: "געשנאדערט ג׳" },
];

export const ALIYAH_SHORT = Object.fromEntries(STANDARD_ALIYOS.map((a) => [a.id, a.label]));

export const PARSHIYOS = [
  // Bereishis
  { id: "bereishis", name: "בְּרֵאשִׁית", yiddish: "בראשית", book: "בראשית" },
  { id: "noach", name: "נֹחַ", yiddish: "נח", book: "בראשית" },
  { id: "lech-lecha", name: "לֶךְ לְךָ", yiddish: "לך לך", book: "בראשית" },
  { id: "vayera", name: "וַיֵּרָא", yiddish: "וירא", book: "בראשית" },
  { id: "chayei-sara", name: "חַיֵּי שָׂרָה", yiddish: "חיי שרה", book: "בראשית" },
  { id: "toldos", name: "תּוֹלְדוֹת", yiddish: "תולדות", book: "בראשית" },
  { id: "vayetzei", name: "וַיֵּצֵא", yiddish: "ויצא", book: "בראשית" },
  { id: "vayishlach", name: "וַיִּשְׁלַח", yiddish: "וישלח", book: "בראשית" },
  { id: "vayeshev", name: "וַיֵּשֶׁב", yiddish: "וישב", book: "בראשית" },
  { id: "miketz", name: "מִקֵּץ", yiddish: "מקץ", book: "בראשית" },
  { id: "vayigash", name: "וַיִּגַּשׁ", yiddish: "ויגש", book: "בראשית" },
  { id: "vayechi", name: "וַיְחִי", yiddish: "ויחי", book: "בראשית" },
  // Shmos
  { id: "shmos", name: "שְׁמוֹת", yiddish: "שמות", book: "שמות" },
  { id: "vaera", name: "וָאֵרָא", yiddish: "וארא", book: "שמות" },
  { id: "bo", name: "בֹּא", yiddish: "בא", book: "שמות" },
  { id: "beshalach", name: "בְּשַׁלַּח", yiddish: "בשלח", book: "שמות", note: "שבת שירה" },
  { id: "yisro", name: "יִתְרוֹ", yiddish: "יתרו", book: "שמות" },
  { id: "mishpatim", name: "מִשְׁפָּטִים", yiddish: "משפטים", book: "שמות" },
  { id: "teruma", name: "תְּרוּמָה", yiddish: "תרומה", book: "שמות" },
  { id: "tetzaveh", name: "תְּצַוֶּה", yiddish: "תצוה", book: "שמות" },
  { id: "ki-sisa", name: "כִּי תִשָּׂא", yiddish: "כי תשא", book: "שמות" },
  { id: "vayakhel-pikudei", name: "וַיַּקְהֵל–פְּקוּדֵי", yiddish: "ויקהל-פקודי", book: "שמות", combined: true },
  // Vayikra
  { id: "vayikra", name: "וַיִּקְרָא", yiddish: "ויקרא", book: "ויקרא" },
  { id: "tzav", name: "צַו", yiddish: "צו", book: "ויקרא" },
  { id: "shmini", name: "שְׁמִינִי", yiddish: "שמיני", book: "ויקרא" },
  { id: "tazria-metzora", name: "תַזְרִיעַ–מְצֹרָע", yiddish: "תזריע-מצורע", book: "ויקרא", combined: true },
  { id: "acharei-kedoshim", name: "אַחֲרֵי–קְדֹשִׁים", yiddish: "אחרי-קדושים", book: "ויקרא", combined: true },
  { id: "emor", name: "אֱמֹר", yiddish: "אמור", book: "ויקרא" },
  { id: "behar-bechukosai", name: "בְּהַר–בְּחֻקֹּתַי", yiddish: "בהר-בחוקותי", book: "ויקרא", combined: true },
  // Bamidbar
  { id: "bamidbar", name: "בְּמִדְבַּר", yiddish: "במדבר", book: "במדבר" },
  { id: "nasso", name: "נָשֹׂא", yiddish: "נשא", book: "במדבר" },
  { id: "behaaloscha", name: "בְּהַעֲלֹתְךָ", yiddish: "בהעלותך", book: "במדבר" },
  { id: "shelach", name: "שְׁלַח לְךָ", yiddish: "שלח", book: "במדבר" },
  { id: "korach", name: "קֹרַח", yiddish: "קרח", book: "במדבר" },
  { id: "chukas-balak", name: "חֻקַּת–בָּלָק", yiddish: "חוקת-בלק", book: "במדבר", combined: true },
  { id: "pinchas", name: "פִּינְחָס", yiddish: "פינחס", book: "במדבר" },
  { id: "matos-masei", name: "מַטּוֹת–מַסְעֵי", yiddish: "מטות-מסעי", book: "במדבר", combined: true },
  // Devarim
  { id: "devarim", name: "דְּבָרִים", yiddish: "דברים", book: "דברים", note: "שבת חזון" },
  { id: "vaeschanan", name: "וָאֶתְחַנַּן", yiddish: "ואתחנן", book: "דברים", note: "שבת נחמו" },
  { id: "ekev", name: "עֵקֶב", yiddish: "עקב", book: "דברים" },
  { id: "reeh", name: "רְאֵה", yiddish: "ראה", book: "דברים" },
  { id: "shoftim", name: "שֹׁפְטִים", yiddish: "שופטים", book: "דברים" },
  { id: "ki-seitzei", name: "כִּי תֵצֵא", yiddish: "כי תצא", book: "דברים" },
  { id: "ki-savo", name: "כִּי תָבוֹא", yiddish: "כי תבוא", book: "דברים" },
  { id: "nitzavim-vayeilech", name: "נִצָּבִים–וַיֵּלֶךְ", yiddish: "נצבים-וילך", book: "דברים", combined: true },
  { id: "haazinu", name: "הַאֲזִינוּ", yiddish: "האזינו", book: "דברים", note: "שבת שובה" },
  { id: "vzos-habracha", name: "וְזֹאת הַבְּרָכָה", yiddish: "וזאת הברכה", book: "דברים", note: "שמחת תורה" },
];

export const PARSHA_SCHEDULE_5786 = {
  "2025-10-18": "bereishis", "2025-10-25": "noach", "2025-11-01": "lech-lecha",
  "2025-11-08": "vayera", "2025-11-15": "chayei-sara", "2025-11-22": "toldos",
  "2025-11-29": "vayetzei", "2025-12-06": "vayishlach", "2025-12-13": "vayeshev",
  "2025-12-20": "miketz", "2025-12-27": "vayigash", "2026-01-03": "vayechi",
  "2026-01-10": "shmos", "2026-01-17": "vaera", "2026-01-24": "bo",
  "2026-01-31": "beshalach", "2026-02-07": "yisro", "2026-02-14": "mishpatim",
  "2026-02-21": "teruma", "2026-02-28": "tetzaveh", "2026-03-07": "ki-sisa",
  "2026-03-14": "vayakhel-pikudei", "2026-03-21": "vayikra", "2026-03-28": "tzav",
  "2026-04-11": "shmini", "2026-04-18": "tazria-metzora", "2026-04-25": "acharei-kedoshim",
  "2026-05-02": "emor", "2026-05-09": "behar-bechukosai", "2026-05-16": "bamidbar",
  "2026-05-23": "nasso", "2026-05-30": "nasso", "2026-06-06": "behaaloscha",
  "2026-06-13": "shelach", "2026-06-20": "korach", "2026-06-27": "chukas-balak",
  "2026-07-04": "pinchas", "2026-07-11": "matos-masei", "2026-07-18": "devarim",
  "2026-07-25": "vaeschanan", "2026-08-01": "ekev", "2026-08-08": "reeh",
  "2026-08-15": "shoftim", "2026-08-22": "ki-seitzei", "2026-08-29": "ki-savo",
  "2026-09-05": "nitzavim-vayeilech", "2026-09-12": "haazinu", "2026-09-19": "vzos-habracha",
};

const ANNUAL_CYCLE = [
  "bereishis","noach","lech-lecha","vayera","chayei-sara","toldos",
  "vayetzei","vayishlach","vayeshev","miketz","vayigash","vayechi",
  "shmos","vaera","bo","beshalach","yisro","mishpatim",
  "teruma","tetzaveh","ki-sisa","vayakhel-pikudei",
  "vayikra","tzav","shmini","tazria-metzora","acharei-kedoshim","emor","behar-bechukosai",
  "bamidbar","nasso","behaaloscha","shelach","korach","chukas-balak","pinchas","matos-masei",
  "devarim","vaeschanan","ekev","reeh","shoftim","ki-seitzei","ki-savo","nitzavim-vayeilech","haazinu","vzos-habracha",
];

export function getParshaForWeek(shabbosDateStr) {
  if (!shabbosDateStr) return PARSHIYOS[0];
  if (PARSHA_SCHEDULE_5786[shabbosDateStr]) {
    const id = PARSHA_SCHEDULE_5786[shabbosDateStr];
    return PARSHIYOS.find((p) => p.id === id) || PARSHIYOS[0];
  }
  const BEREISHIS = new Date("2025-10-18T12:00:00");
  const sh = new Date(shabbosDateStr + "T12:00:00");
  const diffWeeks = Math.round((sh - BEREISHIS) / (7 * 24 * 60 * 60 * 1000));
  const idx = ((diffWeeks % ANNUAL_CYCLE.length) + ANNUAL_CYCLE.length) % ANNUAL_CYCLE.length;
  return PARSHIYOS.find((p) => p.id === ANNUAL_CYCLE[idx]) || PARSHIYOS[0];
}

export function getCurrentShabbos(d = new Date()) {
  const day = d.getDay(); // Sat=6
  const days = day === 6 ? 0 : 6 - day;
  const sh = new Date(d);
  sh.setDate(d.getDate() + days);
  return sh.toISOString().slice(0, 10);
}

export const JEWISH_DAYS = ["זונטיק", "מאָנטיק", "דינסטיק", "מיטוואָך", "דאַנערשטיק", "פֿרײַטיק", "שבת קודש"];

const YID_MONTHS = ["יאנואר","פעברואר","מאַרץ","אַפּריל","מאַי","יוני","יולי","אויגוסט","סעפּטעמבער","אָקטאָבער","נאָוועמבער","דעצעמבער"];

export function formatGregorianYiddish(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T12:00:00");
  return `${d.getDate()} ${YID_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export const YOMIM_TOVIM = [
  { id: "rh1", date: "2025-09-22", yiddish: "ראש-השנה (א׳)", type: "yomtov" },
  { id: "rh2", date: "2025-09-23", yiddish: "ראש-השנה (ב׳)", type: "yomtov" },
  { id: "yk", date: "2025-10-01", yiddish: "יום הכיפורים", type: "yomkippur" },
  { id: "sukkos1", date: "2025-10-06", yiddish: "סוכות א׳", type: "yomtov" },
  { id: "sukkos2", date: "2025-10-07", yiddish: "סוכות ב׳", type: "yomtov" },
  { id: "hoshana", date: "2025-10-12", yiddish: "הושענא רבה", type: "special" },
  { id: "shmini-atzeres", date: "2025-10-13", yiddish: "שמיני עצרת", type: "yomtov" },
  { id: "simchas-torah", date: "2025-10-14", yiddish: "שמחת תורה", type: "yomtov" },
  { id: "chanuka", date: "2025-12-14", yiddish: "חנוכה (כ״ה כסלו)", type: "chanuka" },
  { id: "asara-bteves", date: "2025-12-30", yiddish: "עשרה בטבת", type: "fast" },
  { id: "tu-bishvat", date: "2026-02-01", yiddish: "ט״ו בשבט", type: "special" },
  { id: "taanit-esther", date: "2026-03-02", yiddish: "תענית אסתר", type: "fast" },
  { id: "purim", date: "2026-03-03", yiddish: "פורים", type: "yomtov" },
  { id: "pesach1", date: "2026-04-02", yiddish: "פסח א׳", type: "yomtov" },
  { id: "pesach2", date: "2026-04-03", yiddish: "פסח ב׳", type: "yomtov" },
  { id: "pesach7", date: "2026-04-08", yiddish: "שביעי של פסח", type: "yomtov" },
  { id: "pesach8", date: "2026-04-09", yiddish: "אחרון של פסח", type: "yomtov" },
  { id: "lag-baomer", date: "2026-05-05", yiddish: "ל״ג בעומר", type: "special" },
  { id: "shavuos1", date: "2026-05-22", yiddish: "שבועות א׳", type: "yomtov" },
  { id: "shavuos2", date: "2026-05-23", yiddish: "שבועות ב׳", type: "yomtov" },
  { id: "tisha-beav", date: "2026-07-23", yiddish: "תשעה באב", type: "tishav" },
];

export const YOM_TOV_COLORS = {
  yomtov: "bg-tekheles/10 text-tekheles border-tekheles/30",
  yomkippur: "bg-parchment-200 text-ink-900 border-ink-300",
  fast: "bg-ink-300/15 text-ink-700 border-ink-300/40",
  chanuka: "bg-gold/15 text-gold-dark border-gold/40",
  cholmoed: "bg-paid/10 text-paid border-paid/30",
  special: "bg-burgundy/10 text-burgundy border-burgundy/30",
  tishav: "bg-ink-700/15 text-ink-900 border-ink-700/40",
};

export const YT_BY_DATE = {};
YOMIM_TOVIM.forEach((y) => { if (y.date) YT_BY_DATE[y.date] = y; });

export function getYomTovForDate(dateStr) {
  return YT_BY_DATE[dateStr] || null;
}

export function isYomTov(dateStr) {
  return !!YT_BY_DATE[dateStr];
}

export function getNextSaleableDate(d = new Date()) {
  const nextShabbos = getCurrentShabbos(d);
  const today = d.toISOString().slice(0, 10);
  const futureYomTov = YOMIM_TOVIM
    .filter((yt) => yt.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (futureYomTov.length > 0 && futureYomTov[0].date < nextShabbos) {
    return futureYomTov[0].date;
  }
  return nextShabbos;
}

export function fullName(c) {
  if (!c) return "";
  return [c.first_name, c.last_name].filter(Boolean).join(" ") || c.name || "";
}

export function classNames(...args) {
  return args.filter(Boolean).join(" ");
}

// Generate options for week selector — list of Shabbos dates within ±N weeks
export function listShabbosOptions(span = 30) {
  const out = [];
  const today = new Date();
  const day = today.getDay();
  const shThis = new Date(today);
  shThis.setDate(today.getDate() + (day === 6 ? 0 : 6 - day));
  for (let i = -8; i < span; i++) {
    const d = new Date(shThis);
    d.setDate(shThis.getDate() + i * 7);
    const iso = d.toISOString().slice(0, 10);
    out.push({ iso, parsha: getParshaForWeek(iso), date: d });
  }
  return out;
}
