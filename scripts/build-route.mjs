#!/usr/bin/env node
/**
 * build-route — turns the written "Come arrivare" directions into real map geometry.
 *
 * The trail on the map used to be straight lines between tappe, which is not
 * where anyone actually walks. A plain routing call doesn't fix it either: the
 * router picks its own shortest path, which for tappa 1 → 2 is less than half
 * the distance the text describes.
 *
 * So we use what the content already says. The `byBike` field of tappe 2–12 is
 * written tappa-to-tappa as a chain of street names separated by arrows:
 *
 *   Da Via Pietraia 2: Via delle Panche → Via Reginaldo Giuliani (verso nord)
 *   → direzione Castello / Sesto Fiorentino → Via della Querciola fino al n. 44
 *
 * Those streets become forced waypoints, so the drawn route follows the path
 * the association described rather than the one the router prefers.
 *
 * Output is committed to src/data/route-geometry.json and read at build time,
 * so the published site never calls these services. Re-run only when the tappe
 * coordinates or directions change:
 *
 *   npm run build:route          # uses the street cache
 *   npm run build:route -- --fresh   # ignores it
 *
 * Both services are keyless and public. Overpass in particular is slow and
 * flaky (504s and timeouts are routine), hence the mirrors, retries and the
 * on-disk street cache.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load as parseYaml } from 'js-yaml';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TAPPE_DIR = path.join(ROOT, 'src/content/tappe');
const OUT_FILE = path.join(ROOT, 'src/data/route-geometry.json');
const CACHE_FILE = path.join(ROOT, 'scripts/.cache/streets.json');

const UA = 'pinocchio-bicentenario/1.0 (build-route script)';
// overpass.osm.ch is deliberately absent: it answers 200 with an empty element
// list for queries the others resolve fine, which would read as "street not
// found" and quietly drop waypoints.
const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const VALHALLA_URL = 'https://valhalla1.openstreetmap.de/route';

const FRESH = process.argv.includes('--fresh');
/** Parse the directions and print what we'd send, without touching the network. */
const DRY = process.argv.includes('--dry');

/**
 * Matches a street name inside running prose: the type word, then capitalised
 * words joined by the usual lowercase Italian connectives. Because everything
 * else must start with a capital, the match stops on its own at the prose that
 * follows — "Via Pratese direzione Sesto" yields "Via Pratese", and
 * "Via Bechi fino al numero 2" yields "Via Bechi".
 */
const STREET_RE = new RegExp(
  String.raw`\b(?:Via|Viale|Piazza|Piazzale|Largo|Corso|Lungarno|Ponte|Borgo)` +
    String.raw`(?:\s+(?:degli|dei|del|della|delle|di|da|a|al|alla|e)\b|\s+[A-ZÀ-Ü][\wÀ-ÿ'’]*)+`,
  'g'
);

/** A name can't end on a connective — "Via Lucchese e" is really "Via Lucchese". */
const TRAILING_CONNECTIVE = /\s+(?:degli|dei|del|della|delle|di|da|a|al|alla|e)$/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- content

async function readTappe() {
  const { readdir } = await import('node:fs/promises');
  const files = (await readdir(TAPPE_DIR)).filter((f) => f.endsWith('.md')).sort();
  const tappe = [];

  for (const file of files) {
    const raw = await readFile(path.join(TAPPE_DIR, file), 'utf8');
    const match = raw.match(/^---\n([\s\S]*?)\n---/);
    if (!match) continue;

    const data = parseYaml(match[1]);
    const coords = data.directions?.coordinates;
    if (!coords) {
      console.warn(`  ! ${file}: nessuna coordinata, salto`);
      continue;
    }
    const [lat, lon] = coords.split(',').map((c) => parseFloat(c.trim()));

    tappe.push({
      file,
      order: data.order,
      title: data.title,
      lat,
      lon,
      // This is a walking trail, so the pedestrian directions are the right
      // source where they exist (tappe 2–4). byBike covers the rest: it's the
      // only other field written tappa-to-tappa, but it describes a bike
      // detour along the big roads, so it needs the backtrack guard below.
      directions: data.directions?.byFoot || data.directions?.byBike || '',
      mode: data.directions?.byFoot ? 'foot' : 'bike',
    });
  }

  return tappe.sort((a, b) => a.order - b.order);
}

/**
 * Pulls the street names out of one tappa's directions, in the order they're
 * ridden. Scanning for names rather than splitting on the arrows means the
 * sentences mixed into the text — "Attenzione: Via Pratese ha traffico
 * pesante", "L'unico punto trafficato è Via Pistoiese" — don't turn into
 * waypoints of their own.
 */
function parseStreets(text) {
  if (!text) return [];

  const clean = text.replace(/\*/g, '');
  const found = [];

  for (const match of clean.matchAll(STREET_RE)) {
    const name = match[0].replace(TRAILING_CONNECTIVE, '').trim();

    // "Via Gramsci o Via Dante Alighieri" offers a choice, not two legs to
    // ride in sequence; forcing both would invent a detour. Keep the first.
    const gap = clean.slice(0, match.index).match(/\s+(?:o|oppure)\s+$/i);
    if (gap && found.length) continue;

    // A street named again later is commentary, not a second pass down it.
    if (found.some((s) => s.toLowerCase() === name.toLowerCase())) continue;

    found.push(name);
  }

  return found;
}

/** The distance the text claims, in metres, used as a sanity check. */
function parseDeclaredDistance(text) {
  if (!text) return null;
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*(?:–|-|a)\s*(\d+(?:[.,]\d+)?)\s*km/i);
  if (m) {
    return {
      min: parseFloat(m[1].replace(',', '.')) * 1000,
      max: parseFloat(m[2].replace(',', '.')) * 1000,
    };
  }
  const single = text.match(/(\d+(?:[.,]\d+)?)\s*km/i);
  if (single) {
    const v = parseFloat(single[1].replace(',', '.')) * 1000;
    return { min: v * 0.8, max: v * 1.2 };
  }
  const metres = text.match(/(\d{3,4})\s*m\b/i);
  if (metres) {
    const v = parseFloat(metres[1]);
    return { min: v * 0.8, max: v * 1.2 };
  }
  return null;
}

// ---------------------------------------------------------------- geometry

/** Metres between two lat/lon pairs (equirectangular is plenty at this scale). */
function haversine(a, b) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * How far along the a→b axis p falls, in metres: negative means behind a,
 * greater than the a–b distance means past b.
 */
function projectionAlong(p, a, b) {
  const mPerLat = 111320;
  const mPerLon = 111320 * Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180);
  const ax = 0;
  const ay = 0;
  const bx = (b.lon - a.lon) * mPerLon;
  const by = (b.lat - a.lat) * mPerLat;
  const px = (p.lon - a.lon) * mPerLon;
  const py = (p.lat - a.lat) * mPerLat;
  const len = Math.hypot(bx - ax, by - ay);
  if (len === 0) return 0;
  return (px * bx + py * by) / len;
}

/**
 * Of all the nodes of a street, the one that costs the least extra walking to
 * pass through: the minimum of |a→p| + |p→b|.
 *
 * Picking the node merely closest to the straight line looks equivalent but
 * isn't, on a long road: on tappa 2 → 3 it chose a point on Via Reginaldo
 * Giuliani past the destination, so the route overshot the tappa and doubled
 * back — 1158 m for 476 m of walking.
 */
function leastDetourNode(candidates, a, b) {
  let best = null;
  for (const [lat, lon] of candidates) {
    const p = { lat, lon };
    const cost = haversine(a, p) + haversine(p, b);
    if (!best || cost < best.cost) best = { cost, p };
  }
  return best?.p ?? null;
}

/** Valhalla returns an encoded polyline at precision 6. */
function decodeShape(encoded, precision = 6) {
  const factor = 10 ** precision;
  const coords = [];
  let index = 0;
  let lat = 0;
  let lon = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lon += result & 1 ? ~(result >> 1) : result >> 1;

    coords.push([lat / factor, lon / factor]);
  }

  return coords;
}

// ---------------------------------------------------------------- services

async function loadCache() {
  if (FRESH || !existsSync(CACHE_FILE)) return {};
  try {
    return JSON.parse(await readFile(CACHE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

async function saveCache(cache) {
  await mkdir(path.dirname(CACHE_FILE), { recursive: true });
  await writeFile(CACHE_FILE, JSON.stringify(cache, null, 2) + '\n');
}

/**
 * Resolves every street of one leg to the point on it closest to the a–b
 * corridor, in a single Overpass call.
 *
 * Plain geocoding is not good enough here: asking Nominatim for
 * "Via della Querciola" returns a same-named street about 4 km away, which as
 * a waypoint would send the route right across town. Searching OSM ways near
 * the corridor and taking the nearest node avoids that.
 *
 * One query per leg rather than per street keeps us to 11 requests for the
 * whole trail — Overpass is a shared free service and rate-limits accordingly.
 */
async function findStreets(names, a, b, cache) {
  // Search box: the two tappe plus a margin, so a street that swings wide of
  // the direct line is still found. A global [bbox:] beats a per-clause
  // `around:` by a wide margin on the public servers — same results, measured
  // at 7.8s against 49.8s for the leg below.
  const margin = Math.max(2000, Math.ceil(haversine(a, b) * 0.8));
  const dLat = margin / 111320;
  const dLon = margin / (111320 * Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180));
  const bbox = [
    (Math.min(a.lat, b.lat) - dLat).toFixed(4),
    (Math.min(a.lon, b.lon) - dLon).toFixed(4),
    (Math.max(a.lat, b.lat) + dLat).toFixed(4),
    (Math.max(a.lon, b.lon) + dLon).toFixed(4),
  ].join(',');
  const at = bbox;

  // v5: versioned so that changing the search strategy re-tries the names an
  // earlier run cached as misses, instead of trusting a stale null. The cache
  // holds every candidate node of the street, not the chosen one, so the
  // selection rule below can change without re-querying Overpass.
  const keyFor = (name) => `v5|${name}|${at}`;
  const result = new Map();
  const todo = names.filter((name) => {
    if (cache[keyFor(name)] !== undefined) {
      result.set(name, cache[keyFor(name)]);
      return false;
    }
    return true;
  });
  if (todo.length === 0) return result;

  const clauses = todo
    .map((name) => {
      const escaped = name.replace(/"/g, '\\"');
      // The text writes street names shorter than OSM does: it drops articles
      // ("Via Pietraia" for Via della Petraia) and forenames ("Via Gramsci"
      // for Via Antonio Gramsci, "Piazza Garibaldi" for Piazza Giuseppe
      // Garibaldi). Allow anything between the type word and the rest of the
      // name, then confirm the match properly in JS below.
      // Plain spaces, not \s: Overpass QL reads a backslash in a quoted string
      // as an escape, so the shorthand wouldn't survive the trip.
      const [type, ...rest] = escaped.split(/\s+/);
      const loose = `${type} (.* )?${rest.join(' ')}`;
      return (
        `way["name"="${escaped}"]["highway"];` +
        `way["name"~"^${loose}$",i]["highway"];`
      );
    })
    .join('');

  const query = `[out:json][timeout:90][bbox:${bbox}];(${clauses});out geom;`;

  let elements = null;
  for (const mirror of OVERPASS_MIRRORS) {
    for (let attempt = 0; attempt < 2 && elements === null; attempt++) {
      try {
        const res = await fetch(mirror, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
          body: new URLSearchParams({ data: query }),
          signal: AbortSignal.timeout(120000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        // An empty answer is more often a tired mirror than a genuinely absent
        // street, so treat it as a failure and let another mirror weigh in.
        if (!json.elements?.length) throw new Error('nessun elemento');
        elements = json.elements;
      } catch (err) {
        process.stdout.write(` [${err.message}]`);
        await sleep(5000);
      }
    }
    if (elements) break;
  }

  /** Significant words of a street name: no articles, no punctuation. */
  const keywords = (value) =>
    value
      .toLowerCase()
      .replace(/[^a-zà-ÿ0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w && !/^(della|dello|del|dei|degli|delle|di|da|d|a|al|alla|e|il|la|lo)$/.test(w));

  for (const name of todo) {
    const candidates = [];
    const wanted = keywords(name);
    for (const el of elements ?? []) {
      const osmWords = keywords(el.tags?.name ?? '');
      // One name may be shorter than the other — "Via Gramsci" against
      // "Via Antonio Gramsci" — so accept when either side's words are all
      // present in the other. The nearest-to-corridor pick below then decides
      // between several streets that qualify.
      const subset = (small, big) => small.every((w) => big.includes(w));
      if (!osmWords.length || !(subset(wanted, osmWords) || subset(osmWords, wanted))) continue;
      for (const node of el.geometry ?? []) candidates.push([node.lat, node.lon]);
    }

    const value = candidates.length ? candidates : null;
    result.set(name, value);
    // Only remember a miss once a mirror actually answered; caching a network
    // failure would make the gap permanent.
    if (elements) cache[keyFor(name)] = value;
  }

  await saveCache(cache);
  await sleep(2000); // Overpass asks for gentle use
  return result;
}

/**
 * Pedestrian route through the given waypoints.
 *
 * Valhalla, not OSRM: the public OSRM demo server only runs the car profile —
 * its `foot` and `bike` endpoints answer, but return the identical car route.
 */
async function route(points) {
  const locations = points.map((p, i) => ({
    lat: p.lat,
    lon: p.lon,
    // `through` forces the route across the point without splitting the leg
    // or allowing a stop there; only the endpoints are real stops.
    type: i === 0 || i === points.length - 1 ? 'break' : 'through',
  }));

  const res = await fetch(VALHALLA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
    body: JSON.stringify({
      locations,
      costing: 'pedestrian',
      directions_options: { units: 'kilometers', language: 'it-IT' },
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`Valhalla HTTP ${res.status}`);

  const json = await res.json();
  const legs = json.trip?.legs ?? [];
  const coordinates = legs.flatMap((leg) => decodeShape(leg.shape));
  return { coordinates, distance: Math.round((json.trip?.summary?.length ?? 0) * 1000) };
}

// ---------------------------------------------------------------- main

async function main() {
  const tappe = await readTappe();
  console.log(`Tappe con coordinate: ${tappe.length}\n`);

  if (DRY) {
    for (let i = 0; i < tappe.length - 1; i++) {
      const to = tappe[i + 1];
      const declared = parseDeclaredDistance(to.directions);
      console.log(`Tappa ${tappe[i].order} → ${to.order}`);
      console.log(`  vie:        ${parseStreets(to.directions).join(' → ') || '(nessuna)'}`);
      console.log(
        `  dichiarato: ${declared ? `${Math.round(declared.min)}–${Math.round(declared.max)} m` : '(non indicato)'}`
      );
    }
    return;
  }

  const cache = await loadCache();
  const segments = [];
  const warnings = [];

  for (let i = 0; i < tappe.length - 1; i++) {
    const from = tappe[i];
    const to = tappe[i + 1];
    // The directions live on the *arrival* tappa: they describe how to get there.
    const streets = parseStreets(to.directions);
    const declared = parseDeclaredDistance(to.directions);

    process.stdout.write(
      `Tappa ${from.order} → ${to.order} [${to.mode === 'foot' ? 'a piedi' : 'bici'}]: ${streets.length} vie`
    );

    const located = await findStreets(streets, from, to, cache);
    const waypoints = [];
    const resolved = [];
    const missing = [];
    const backtracks = [];

    // A street that projects behind the start or past the destination is being
    // named for orientation, not as somewhere to walk through. Forcing it makes
    // the route go out and come back: on tappa 1 → 2 "Via delle Panche" turned
    // 476 m of walking into 1286 m, passing the start a second time.
    const legLength = haversine(from, to);
    const SLACK = 250;

    for (const name of streets) {
      const candidates = located.get(name);
      if (!candidates?.length) {
        missing.push(name);
        continue;
      }
      const point = leastDetourNode(candidates, from, to);
      const along = projectionAlong(point, from, to);
      if (along < -SLACK || along > legLength + SLACK) {
        backtracks.push(name);
        continue;
      }
      waypoints.push(point);
      resolved.push(name);
    }
    process.stdout.write(` → ${resolved.length} risolte`);

    let result;
    let dropped = [];
    try {
      // Follow the description, but not past the point of absurdity. Forcing
      // every named street can send the route on a loop the router would never
      // choose and nobody would walk: on tappa 2 → 3 the "Via di Castello"
      // waypoint looked cheap as the crow flies but cost 1158 m of walking
      // against 640 m for the free route. So measure the free route first and
      // give up waypoints — dearest first — until the forced one fits.
      const free = await route([from, to]);
      result = waypoints.length ? await route([from, ...waypoints, to]) : free;

      let budget = Math.max(free.distance * 1.6, free.distance + 300);
      // A leg whose text states a longer distance is *meant* to go the long way.
      if (declared) budget = Math.max(budget, declared.max * 1.2);

      const costs = waypoints.map((p) => haversine(from, p) + haversine(p, to));
      while (result.distance > budget && waypoints.length) {
        const worst = costs.indexOf(Math.max(...costs));
        dropped.push(resolved[worst]);
        waypoints.splice(worst, 1);
        costs.splice(worst, 1);
        resolved.splice(worst, 1);
        result = waypoints.length ? await route([from, ...waypoints, to]) : free;
        await sleep(500);
      }
    } catch (err) {
      warnings.push(`Tappa ${from.order}→${to.order}: routing fallito (${err.message}), linea dritta`);
      console.log('  ✗ routing fallito');
      segments.push({
        from: from.order,
        to: to.order,
        distance: Math.round(haversine(from, to)),
        straightLine: true,
        via: resolved,
        coordinates: [
          [from.lat, from.lon],
          [to.lat, to.lon],
        ],
      });
      continue;
    }

    // The text states its own distance; a big gap means a waypoint landed on
    // the wrong street and the geometry needs a human eye.
    let status = '';
    if (declared) {
      const off =
        result.distance < declared.min * 0.6 || result.distance > declared.max * 1.6;
      status = ` (dichiarato ${Math.round(declared.min)}–${Math.round(declared.max)} m)`;
      if (off) {
        warnings.push(
          `Tappa ${from.order}→${to.order}: calcolati ${result.distance} m contro ` +
            `${Math.round(declared.min)}–${Math.round(declared.max)} m dichiarati`
        );
        status += ' ⚠';
      }
    }
    if (missing.length) {
      warnings.push(`Tappa ${from.order}→${to.order}: vie non trovate — ${missing.join(', ')}`);
    }
    if (backtracks.length) {
      warnings.push(
        `Tappa ${from.order}→${to.order}: scartate perché fuori direzione — ${backtracks.join(', ')}`
      );
    }
    if (dropped.length) {
      warnings.push(
        `Tappa ${from.order}→${to.order}: scartate perché allungavano troppo — ${dropped.join(', ')}`
      );
    }

    console.log(`  ${result.distance} m${status}`);

    segments.push({
      from: from.order,
      to: to.order,
      distance: result.distance,
      mode: to.mode,
      via: resolved,
      missing,
      backtracks,
      dropped,
      coordinates: result.coordinates,
    });

    await sleep(1000);
  }

  await mkdir(path.dirname(OUT_FILE), { recursive: true });
  await writeFile(
    OUT_FILE,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString().slice(0, 10),
        source: 'directions byBike + Overpass + Valhalla pedestrian',
        segments,
      },
      null,
      2
    ) + '\n'
  );

  const total = segments.reduce((sum, s) => sum + s.distance, 0);
  console.log(`\nScritto ${path.relative(ROOT, OUT_FILE)}`);
  console.log(`${segments.length} tratte, ${(total / 1000).toFixed(1)} km totali`);

  if (warnings.length) {
    console.log(`\nDa controllare a mano (${warnings.length}):`);
    for (const w of warnings) console.log(`  - ${w}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
