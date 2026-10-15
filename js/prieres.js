// Heures de prière chiites, calculées dans le téléphone (aucune donnée envoyée, rien de stocké).
// Méthode Jafari (Shia Ithna-Ashari, institut Leva de Qom) : Fajr à 16°, Maghrib à 4°, Isha à 14°,
// Asr à une ombre, minuit = milieu entre le coucher du soleil et Fajr. D'après l'algorithme de PrayTimes.org.
// Le même calcul est recopié dans supabase/functions/notify/index.ts pour les notifications.

const rad = (d) => (d * Math.PI) / 180, deg = (r) => (r * 180) / Math.PI;
const dsin = (d) => Math.sin(rad(d)), dcos = (d) => Math.cos(rad(d)), dtan = (d) => Math.tan(rad(d));
const darcsin = (x) => deg(Math.asin(x)), darccos = (x) => deg(Math.acos(x));
const darctan2 = (y, x) => deg(Math.atan2(y, x)), darccot = (x) => deg(Math.atan(1 / x));
const fix = (a, b) => { a -= b * Math.floor(a / b); return a < 0 ? a + b : a; };
const diff = (a, b) => fix(b - a, 24);

function julian(y, m, d) {
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
}
function sun(jd) {
  const D = jd - 2451545.0;
  const g = fix(357.529 + 0.98560028 * D, 360), q = fix(280.459 + 0.98564736 * D, 360);
  const L = fix(q + 1.915 * dsin(g) + 0.02 * dsin(2 * g), 360), e = 23.439 - 0.00000036 * D;
  const RA = darctan2(dcos(e) * dsin(L), dcos(L)) / 15;
  return { decl: darcsin(dsin(e) * dsin(L)), eqt: q / 15 - fix(RA, 24) };
}

export const PRAYERS = [
  ['imsak', 'Imsak'], ['fajr', 'Fajr'], ['sunrise', 'Lever du soleil'], ['dhuhr', 'Dhuhr'], ['asr', 'Asr'],
  ['maghrib', 'Maghrib'], ['isha', 'Isha'], ['midnight', 'Minuit']
];
// Les trois moments de prière de la pratique chiite (Dhuhr et Asr, Maghrib et Isha peuvent être regroupées)
export const MAIN = ['fajr', 'dhuhr', 'maghrib'];

// Horaires du jour (y, m, d) au lieu (lat, lng) : objets Date (heure exacte, affichée ensuite à l'heure du téléphone)
export function prayerTimes(y, m, d, lat, lng) {
  const jDate = julian(y, m, d) - lng / (15 * 24);
  const midDay = (t) => fix(12 - sun(jDate + t).eqt, 24);
  const angleTime = (a, t, ccw) => {
    const decl = sun(jDate + t).decl;
    const v = (1 / 15) * darccos((-dsin(a) - dsin(decl) * dsin(lat)) / (dcos(decl) * dcos(lat)));
    return midDay(t) + (ccw ? -v : v);
  };
  const asrTime = (f, t) => { const decl = sun(jDate + t).decl; return angleTime(-darccot(f + dtan(Math.abs(lat - decl))), t); };
  let h = { fajr: 5, sunrise: 6, dhuhr: 12, asr: 13, sunset: 18, maghrib: 18, isha: 18 };
  for (let i = 0; i < 2; i++) {
    const t = (k) => h[k] / 24;
    h = {
      fajr: angleTime(16, t('fajr'), true), sunrise: angleTime(0.833, t('sunrise'), true), dhuhr: midDay(t('dhuhr')),
      asr: asrTime(1, t('asr')), sunset: angleTime(0.833, t('sunset')), maghrib: angleTime(4, t('maghrib')), isha: angleTime(14, t('isha'))
    };
  }
  for (const k in h) h[k] -= lng / 15; // heures en temps universel
  // Nuits courtes (été en France) : correction « angle » habituelle, la même que les applis de prière courantes
  const night = diff(h.sunset, h.sunrise);
  const cap = (k, a, ccw) => {
    const max = (a / 60) * night, base = ccw ? h.sunrise : h.sunset;
    if (isNaN(h[k]) || (ccw ? diff(h[k], base) : diff(base, h[k])) > max) h[k] = base + (ccw ? -max : max);
  };
  cap('fajr', 16, true); cap('isha', 14, false); cap('maghrib', 4, false);
  h.imsak = h.fajr - 10 / 60;
  h.midnight = h.sunset + diff(h.sunset, h.fajr) / 2;
  const base = Date.UTC(y, m - 1, d), out = {};
  for (const [k] of PRAYERS) out[k] = new Date(base + Math.round(h[k] * 60) * 60000);
  return out;
}
