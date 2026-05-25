# content-source/

Materiale sorgente per popolare le 12 tappe del sito.

Questi file **non vengono pubblicati** (sono fuori da `public/` e `src/`). Servono come riferimento per i contenuti markdown in `src/content/tappe/`.

## File

| File | Contenuto |
|------|-----------|
| `podcast-intero.docx` | Trascrizione completa del podcast — tutte e 12 le tappe |
| `podcast-tappe-01-04.docx` | Trascrizione + descrizioni dettagliate tappe 1–4 (storia, capitoli, descrizione luogo) |
| `percorso-tappe-04-12.docx` | Indicazioni stradali (auto + bus) da tappa a tappa, dalla 4 alla 12 |
| `accessibilita.docx` | Note su accessibilità del percorso — lavori in corso, deviazioni, semafori mobili lungo l'itinerario |

## Audio importati

I file audio del podcast sono in `public/audio/` in formato `tappa-NN.{mp3,mp4}`:

- `tappa-01.mp3` … `tappa-09.mp3` (audio)
- `tappa-10.mp4` … `tappa-12.mp4` (video — le ultime tre tappe sono video)

Sorgente: zip WeTransfer ricevuto, originariamente con nomi `1 tappa.mp3` … `12 tappa.mp4`.

## Strategia di sincronizzazione

I `.docx` qui dentro sono la **fonte editoriale**, i `.md` in `src/content/tappe/` sono la **forma renderizzata**. Se arrivano revisioni, aggiorna il `.docx` corrispondente e riapplica manualmente al `.md`.

Vedi `INTEGRATION.md` per la mappa completa di come ogni docx alimenta i campi del frontmatter Astro.
