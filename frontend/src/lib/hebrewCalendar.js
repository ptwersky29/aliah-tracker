// Full Hebrew calendar conversion (Gregorian <-> Hebrew). Adapted from
// the original app, trimmed for readability.

const HEBREW_NUMERALS = { 1:"א",2:"ב",3:"ג",4:"ד",5:"ה",6:"ו",7:"ז",8:"ח",9:"ט",10:"י",20:"כ",30:"ל" };

export function toHebrewNumeral(n) {
  if (n <= 0 || n > 30) return String(n);
  if (n === 15) return 'ט"ו';
  if (n === 16) return 'ט"ז';
  const tens = Math.floor(n / 10) * 10;
  const ones = n % 10;
  let s = "";
  if (tens) s += HEBREW_NUMERALS[tens];
  if (ones) s += HEBREW_NUMERALS[ones];
  if (s.length > 1) s = s.slice(0, -1) + '"' + s.slice(-1);
  return s;
}

function isLeapYear(year) { return ((7 * year) + 1) % 19 < 7; }
function monthsInYear(year) { return isLeapYear(year) ? 13 : 12; }

function daysInHebrewMonth(month, year) {
  if ([1,3,5,7,11].includes(month)) return 30;
  if ([4,6,10].includes(month)) return 29;
  if (month === 13) return 29;
  if (month === 12) return isLeapYear(year) ? 30 : 29;
  if (month === 8) return daysInCheshvan(year);
  if (month === 9) return daysInKislev(year);
  return 29;
}

function daysInHebrewYear(year) { return hebrewToJD(year + 1, 7, 1) - hebrewToJD(year, 7, 1); }
function daysInCheshvan(year) { return daysInHebrewYear(year) % 10 === 5 ? 30 : 29; }
function daysInKislev(year) { return daysInHebrewYear(year) % 10 !== 3 ? 30 : 29; }

function hebrewEpoch() { return 347995.5; }

function hebrewDelay1(year) {
  const months = Math.floor((235 * year - 234) / 19);
  const parts = 12084 + 13753 * months;
  let day = months * 29 + Math.floor(parts / 25920);
  if ((3 * (day + 1)) % 7 < 3) day++;
  return day;
}
function hebrewDelay2(year) {
  const last = hebrewDelay1(year - 1);
  const present = hebrewDelay1(year);
  const next = hebrewDelay1(year + 1);
  if (next - present === 356) return 2;
  if (present - last === 382) return 1;
  return 0;
}

function hebrewToJD(year, month, day) {
  const months = monthsInYear(year);
  let jd = hebrewEpoch() + hebrewDelay1(year) + hebrewDelay2(year) + day + 1;
  if (month < 7) {
    for (let m = 7; m <= months; m++) jd += daysInHebrewMonth(m, year);
    for (let m = 1; m < month; m++) jd += daysInHebrewMonth(m, year);
  } else {
    for (let m = 7; m < month; m++) jd += daysInHebrewMonth(m, year);
  }
  return jd;
}

function gregorianToJD(year, month, day) {
  return 367 * year - Math.floor(7 * (year + Math.floor((month + 9) / 12)) / 4)
    + Math.floor(275 * month / 9) + day + 1721013.5;
}

function jdToHebrew(jd) {
  const jd0 = Math.floor(jd) + 0.5;
  let year = Math.floor((jd0 - hebrewEpoch()) * 98496 / 35975351) + 1;
  while (hebrewToJD(year, 7, 1) > jd0) year--;
  let month = jd0 < hebrewToJD(year, 1, 1) ? 7 : 1;
  while (jd0 > hebrewToJD(year, month, daysInHebrewMonth(month, year))) month++;
  const day = Math.floor(jd0 - hebrewToJD(year, month, 1)) + 1;
  return { year, month, day };
}

export function gregorianToHebrew(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  const jd = gregorianToJD(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return jdToHebrew(jd);
}

export function getHebrewMonthName(month, year) {
  const leap = isLeapYear(year);
  const names = ["ניסן","אייר","סיון","תמוז","אב","אלול","תשרי","חשון","כסלו","טבת","שבט", leap?"אדר א׳":"אדר","אדר ב׳"];
  return names[month - 1] || "";
}

export function formatHebrewYear(year) {
  const y = year - 5000;
  const hundreds = Math.floor(y / 100);
  const remainder = y % 100;
  const hMap = { 1:"ק",2:"ר",3:"ש",4:"ת",5:"תק",6:"תר",7:"תש",8:"תת" };
  let s = hMap[hundreds] || "";
  if (remainder > 0) {
    const tens = Math.floor(remainder / 10) * 10;
    const ones = remainder % 10;
    const tMap = {10:"י",20:"כ",30:"ל",40:"מ",50:"נ",60:"ס",70:"ע",80:"פ",90:"צ"};
    const oMap = {1:"א",2:"ב",3:"ג",4:"ד",5:"ה",6:"ו",7:"ז",8:"ח",9:"ט"};
    if (tens) s += tMap[tens] || "";
    if (ones) s += oMap[ones] || "";
  }
  if (s.length > 1) s = s.slice(0, -1) + '"' + s.slice(-1);
  return s;
}

export function formatHebrewDate(hd) {
  return `${toHebrewNumeral(hd.day)} ${getHebrewMonthName(hd.month, hd.year)} ${formatHebrewYear(hd.year)}`;
}

export function getMonthWithHebrew(year, month) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    days.push({ date: ds, day: d, hebrew: gregorianToHebrew(ds), weekday: new Date(ds + "T12:00:00").getDay() });
  }
  return days;
}
