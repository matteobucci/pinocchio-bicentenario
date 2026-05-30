# INTEGRATION — come i materiali sono integrati nel sito

Mappa di come i materiali consegnati (4 docx + 12 file audio) sono stati distribuiti nel sito, e di cosa è stato aggiunto tramite ricerca online.

## Modifiche allo schema (`src/content/config.ts`)

- `podcast.videoFile` — path al video mp4 (tappe 10-12)
- `transcript` — campo top-level con la trascrizione dell'episodio

## Modifiche al player (`src/pages/tappe/[slug].astro`)

- Se la tappa ha `videoFile` → `<video controls playsinline>`
- Altrimenti, se ha `mp3File` → `<audio controls>`

## TourMap (`src/components/TourMap.astro`)

Aggiunto fallback per quando non ci sono coordinate: mostra placeholder + lista testuale invece di crashare.

## Pagina `/accessibilita`

Creata `src/pages/accessibilita.astro` con il contenuto di `accessibilita.docx` (lavori in corso lungo l'itinerario, bagni pubblici, fontanelli, accessibilità del sito web).

## Dati integrati nelle 12 tappe

Tutte e 12 le tappe hanno ora:

| Campo | Fonte |
|---|---|
| `title` | `podcast-intero.docx` |
| `description` | sintesi manuale dai docx |
| `heroImage` | Wikimedia Commons (vedi sotto) |
| `podcast.episodeTitle` | generato come "Episodio NN — <titolo>" |
| `podcast.mp3File` / `videoFile` | file audio importati in `public/audio/` |
| `directions.address` | docx (tappe 1-4) o dedotti dalle indicazioni inter-tappa (tappe 5-12) |
| `directions.coordinates` | OpenStreetMap Nominatim (agent online) |
| `directions.mapsUrl` | generato dall'indirizzo |
| `directions.instructions` | docx (treno+bici+macchina+parcheggi per 1-4, inter-tappa per 5-12) |
| `transcript` | `podcast-intero.docx` (tutte e 12) |
| corpo markdown | docx per 1-4, ricerca online per 5-12 |

## Indirizzi e coordinate (verificati)

| # | Tappa | Indirizzo | Coordinate (lat, lng) |
|---|---|---|---|
| 1 | Bottega di Maestro Ciliegia | Via della Pietraia 2, Castello (Firenze) | 43.81423, 11.23009 |
| 2 | La Quercia Grande | Via della Querciola 44, Castello (Firenze) | 43.81766, 11.23165 |
| 3 | La Strada del Paese | Via Reginaldo Giuliani (n. 364–372), Firenze | 43.81342, 11.23110 |
| 4 | La Scuola | Via Giulio Bechi 2/D, Firenze | 43.81684, 11.22590 |
| 5 | Il Mare | Via San Biagio a Petriolo, Firenze | 43.79577, 11.19228 |
| 6 | Teatrino di Mangiafoco | Piazza Garibaldi, Peretola (Firenze) | 43.79711, 11.19683 |
| 7 | Volpe e Gatto | Via del Motrone, Osmannoro (Sesto Fiorentino) | 43.79934, 11.19983 |
| 8 | Api Industriose | Via Lucchese, Santa Croce all'Osmannoro | 43.80364, 11.18426 |
| 9 | Paese dei Balocchi | Piazza Vittorio Veneto, Sesto Fiorentino | 43.83186, 11.19918 |
| 10 | Teatro dei Ciuchini | Piazza Ginori, Sesto Fiorentino | 43.83339, 11.20190 |
| 11 | Osteria Gambero Rosso | Via delle Porcellane, Sesto Fiorentino | 43.83717, 11.21374 |
| 12 | Campo dei Miracoli | Villa Gerini, Colonnata (Sesto Fiorentino) | 43.83720, 11.21340 |

**Nota tappe 11/12:** le coordinate coincidono perché secondo OpenStreetMap Villa Gerini è situata lungo Via delle Porcellane. Da verificare con la fonte ufficiale.

## Immagini hero (Wikimedia Commons)

Tutte CC BY 3.0 / CC BY-SA 3.0. Autore prevalente: **Sailko**. Crediti pubblicati in `/chi-siamo`.

| # | Soggetto | URL Wikimedia |
|---|---|---|
| 1 | Via della Petraia, Castello | [Castello, via della petraia.JPG](https://commons.wikimedia.org/wiki/File:Castello,_via_della_petraia.JPG) |
| 2 | Villa il Bel Riposo | [Villa il Bel Riposo.JPG](https://commons.wikimedia.org/wiki/File:Villa_il_Bel_Riposo.JPG) |
| 3 | Tabernacolo dell'Olmo (Via Reginaldo Giuliani 489-491) | [Tabernacolo dell'olmo.JPG](https://commons.wikimedia.org/wiki/File:Tabernacolo_dell%27olmo.JPG) |
| 4 | Villa Medicea della Petraia (fallback zona) | [La petraia, veduta 02.JPG](https://commons.wikimedia.org/wiki/File:La_petraia,_veduta_02.JPG) |
| 5 | Chiesa di San Biagio a Petriolo | [Chiesa di San Biagio a Petriolo 02.JPG](https://commons.wikimedia.org/wiki/File:Chiesa_di_San_Biagio_a_Petriolo_02.JPG) |
| 6 | Chiesa di Santa Maria a Peretola | [Chiesa di Santa Maria a Peretola 02.JPG](https://commons.wikimedia.org/wiki/File:Chiesa_di_Santa_Maria_a_Peretola_02.JPG) |
| 7 | Osmannoro (paesaggio industriale, Ikea) | [Sesto fiorentino, ikea (osmannoro).JPG](https://commons.wikimedia.org/wiki/File:Sesto_fiorentino,_ikea_(osmannoro).JPG) |
| 8 | (riusa la foto Osmannoro di tappa 7) | stessa di tappa 7 |
| 9 | Palazzo Comunale Piazza Vittorio Veneto | [Sesto, comune in piazza vittorio veneto 01.JPG](https://commons.wikimedia.org/wiki/File:Sesto,_comune_in_piazza_vittorio_veneto_01.JPG) |
| 10 | Palazzo Pretorio in Piazza Ginori | [Sesto, palazzo pretorio 01.JPG](https://commons.wikimedia.org/wiki/File:Sesto,_palazzo_pretorio_01.JPG) |
| 11 | Manifattura Ginori (Museo Doccia) | [Museo della Porcellana di Doccia.JPG](https://commons.wikimedia.org/wiki/File:Museo_della_Porcellana_di_Doccia,_sesto_fiorentino,_Richard-Ginori.JPG) |
| 12 | Villa Gerini (Colonnata) | [Villa colonnata facade 2018.jpg](https://commons.wikimedia.org/wiki/File:Villa_colonnata_facade_2018.jpg) |

## Ricerca online che NON ha trovato risultati

- **Spotify / Apple Podcasts**: il podcast non è pubblicato su queste piattaforme. Un progetto correlato esiste su [erbacanta.it/pinocchio/](https://erbacanta.it/pinocchio/) (audioguide della Fondazione CR Firenze, struttura diversa). Per il sito attuale, i link rotti `href="#"` in `index.astro` e `BaseLayout.astro` sono stati **rimossi** e sostituiti con un CTA che porta alla lista tappe.
- **Durata episodi**: non pubblicata. Si può ricavare dai file audio in fase successiva (richiede ffprobe o lib audio).
- **Foto Via Giulio Bechi (tappa 4)** e **Via Lucchese (tappa 8)**: nessuna foto libera trovata. Usati fallback (Villa Medicea della Petraia per la 4, Osmannoro per la 8).

## File `accessibilita.docx` — integrazione

Il contenuto è interamente nella nuova pagina `/accessibilita` (3 sezioni: lavori in corso lungo l'itinerario, bagni pubblici, fontanelli, e accessibilità del sito web). Il link nel footer punta a questa pagina.

## Aggiornamento 2026-05-30 — Foto reali e loghi

Ricevuti due materiali nuovi: **`Foto Tappe.zip`** (53 foto, organizzate per nome tappa) e **3 loghi**. I 4 `.docx` e lo zip audio ri-scaricati erano identici a quelli già integrati → nessuna azione.

### Foto integrate (`public/images/tappe/`, campo `gallery`)

Rinominate in `tappa-NN-<descrizione>.<ext>`. Foto disponibili **solo per le tappe 5–12** (per nome cartella); per le **tappe 1–4 nessuna foto** → restano gli hero Wikimedia.

| Tappa | Hero (1ª foto gallery) | N. foto in gallery |
|---|---|---|
| 6 — Teatrino di Mangiafoco | `tappa-06-chiesa-peretola.jpg` | 7 (chiesa, statua Garibaldi ×3, tabernacolo ×3) |
| 7 — Volpe e Gatto | `tappa-07-1.jpg` | 3 (borgo Osmannoro) |
| 9 — Paese dei Balocchi | `tappa-09-comune.jpg` | 12 (Palazzo Comunale, monumento ai Caduti, murales Pinocchio ×7) |
| 10 — Teatro del Ciuchino | `tappa-10-piazza-ginori.jpg` | 5 (Piazza Ginori, ex Teatro Niccolini, foto storica, Palazzo Pretorio) |
| 11 — Osteria Gambero Rosso | `tappa-11-via-porcellane.jpg` | 4 (via Porcellane, cartelli, ingresso osteria) |
| 12 — Campo dei Miracoli | `tappa-12-1.jpg` | 12 (Villa Gerini, prati, parco, Tumulo Etrusco) |

Le foto "Curiosità"/"Parchetto" sono confluite nella gallery con caption prefissata "Curiosità —" (decisione: tutto in gallery, niente campo schema dedicato). **Tutti gli `alt` sono stati scritti a mano osservando ogni foto.**

### Foto NON pubblicate

- **Tappa 5 (Il Mare)** e **tappa 8 (Isola delle Api)**: le cartelle contenevano **solo screenshot di Google Maps** (no foto reali) → spostate in `content-source/foto-escluse/`, NON pubblicate (anche per copyright). Hero Wikimedia invariato.
- **Cartella `DUBBI`** (4 foto non assegnate dal cliente): lasciate fuori, da chiarire. Vedi `OPEN-QUESTIONS.md`.

### Loghi (`public/images/`)

| File | Soggetto | Uso |
|---|---|---|
| `logo-associazione.png` | AIdel22 — Associazione Italiana delezione del Cromosoma 22 APS | footer "Promosso da" + `site.json` |
| `partner-radio-aid.svg` | Radio AIdel22 | footer "Promosso da" |
| `partner-terranova.png` | Terranova (software for sustainable cities) | footer "Promosso da" |

Aggiunta sezione `.footer-partners` in `BaseLayout.astro` (lista loghi su placca bianca per leggibilità sul footer scuro). `site.json` `logo` corretto (puntava a `/images/logo.svg` inesistente).

## Strategia di sincronizzazione

I `.docx` in `content-source/` sono la **fonte editoriale**, i `.md` in `src/content/tappe/` sono la **forma renderizzata**. Se arrivano revisioni, aggiorna il `.docx` corrispondente e riapplica manualmente le modifiche al `.md`.

## Cosa resta da fare

| Cosa | Priorità | Note |
|---|---|---|
| URL ufficiali Spotify/Apple | Bassa | Solo se decidono di pubblicare il podcast |
| Foto originali Via Bechi e Via Lucchese | Media | Da scattare in loco e rilasciare in CC0/CC BY |
| Verifica coordinate tappa 11/12 | Media | Coincidenti, da confermare |
| Durata episodi | Bassa | Funzionalità non bloccante |
| Foto reali tappe 5–12 | ✅ Fatto (2026-05-30) | Gallery integrate. Tappe 5 e 8 escluse (solo mappe) |
| Foto reali tappe 1–4 | Media | Nessuna foto consegnata → restano hero Wikimedia |
| Foto reali tappe 5 e 8 | Media | Consegnate solo mappe Google; servono foto dei luoghi |
| Cartella DUBBI + foto ruotate tappa 6 | Media | Vedi `OPEN-QUESTIONS.md` |
| Contatti reali dell'associazione | Alta | Sono stati rimossi i finti per non essere fuorvianti |
| Nomi del team | Media | Idem |
