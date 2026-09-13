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
const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.osm.ch/api/interpreter',
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
      // byBike is the only field written tappa-to-tappa for the whole route;
      // byFoot exists for tappe 2–4 only, so it can't drive the geometry alone.
      directions: data.directions?.byBike ?? '',
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

/** Distance from p to the segment a–b, so we can pick the right stretch of a long street. */
function distanceToSegment(p, a, b) {
  const x = p.lon - a.lon;
  const y = p.lat - a.lat;
  const dx = b.lon - a.lon;
  const dy = b.lat - a.lat;
  const len = dx * dx + dy * dy;
  const t = len === 0 ? 0 : Math.max(0, Math.min(1, (x * dx + y * dy) / len));
  return haversine(p, { lat: a.lat + t * dy, lon: a.lon + t * dx });
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
 * Finds the point on `name` closest to the a–b corridor.
 *
 * Plain geocoding is not good enough here: asking Nominatim for
 * "Via della Querciola" returns a same-named street about 4 km away, which as
 * a waypoint would send the route right across town. Searching OSM ways near
 * the corridor and taking the nearest node avoids that.
 */
async function findStreet(name, a, b, cache) {
  const radius = Math.max(1500, Math.ceil(haversine(a, b) * 1.5));
  const mid = { lat: (a.lat + b.lat) / 2, lon: (a.lon + b.lon) / 2 };
  const key = `${name}|${mid.lat.toFixed(4)},${mid.lon.toFixed(4)}|${radius}`;
  if (cache[key] !== undefined) return cache[key];

  const escaped = name.replace(/"/g, '\\"');
  const query = `[out:json][timeout:60];
    way(around:${radius},${mid.lat},${mid.lon})["name"="${escaped}"]["highway"];
    out geom;`;

  for (const mirror of OVERPASS_MIRRORS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(mirror, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
          body: new URLSearchParams({ data: query }),
          signal: AbortSignal.timeout(90000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        let best = null;
        for (const el of json.elements ?? []) {
          for (const node of el.geometry ?? []) {
            const p = { lat: node.lat, lon: node.lon };
            const d = distanceToSegment(p, a, b);
            if (!best || d < best.d) best = { d, p };
          }
        }

        const value = best ? best.p : null;
        cache[key] = value;
        await saveCache(cache);
        await sleep(1500); // Overpass asks for gentle use
        return value;
      } catch (err) {
        process.stdout.write(` [${err.name ?? 'err'}]`);
        await sleep(4000);
      }
    }
  }

  // Cache the miss too — retrying a street OSM doesn't have just burns time.
  cache[key] = null;
  await saveCache(cache);
  return null;
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

    process.stdout.write(`Tappa ${from.order} → ${to.order}: ${streets.length} vie`);

    const waypoints = [];
    const resolved = [];
    const missing = [];
    for (const name of streets) {
      const point = await findStreet(name, from, to, cache);
      if (point) {
        waypoints.push(point);
        resolved.push(name);
      } else {
        missing.push(name);
      }
    }
    process.stdout.write(` → ${resolved.length} risolte`);

    let result;
    try {
      result = await route([from, ...waypoints, to]);
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

    console.log(`  ${result.distance} m${status}`);

    segments.push({
      from: from.order,
      to: to.order,
      distance: result.distance,
      via: resolved,
      missing,
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
