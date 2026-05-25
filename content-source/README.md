# content-source/

Materiale sorgente per popolare le 12 stazioni del sito.

Questi file **non vengono pubblicati** (sono fuori da `public/` e `src/`). Servono come riferimento per scrivere i contenuti markdown in `src/content/stations/`.

## File

| File | Contenuto |
|------|-----------|
| `podcast-intero.docx` | Trascrizione completa del podcast — tutte e 12 le tappe |
| `podcast-tappe-01-04.docx` | Trascrizione + descrizioni dettagliate tappe 1–4 (storia, capitoli, descrizione luogo) |
| `percorso-tappe-04-12.docx` | Indicazioni stradali (auto + bus) da tappa a tappa, dalla 4 alla 12 |
| `accessibilita.docx` | Note su accessibilità del percorso — lavori in corso, deviazioni, semafori mobili lungo l'itinerario |

## Audio importati

I file audio del podcast sono stati estratti in `public/audio/` e rinominati in formato `tappa-NN.{mp3,mp4}`:

- `tappa-01.mp3` … `tappa-09.mp3` (audio)
- `tappa-10.mp4` … `tappa-12.mp4` (video, le ultime tre tappe sono in formato mp4)

Sorgente: zip WeTransfer ricevuto, originariamente con nomi `1 tappa.mp3` … `12 tappa.mp4`.

## Note importanti

- **Discrepanza con i placeholder esistenti**: la stazione 1 in `src/content/stations/stazione-01.md` è etichettata "La Bottega di Geppetto", ma la prima tappa del podcast reale è **"La Bottega di Maestro Ciliegia"** (Antonio Segoni, Via della Pietraia). Da correggere quando si scrivono i contenuti veri.
- **Tappe 10–12 in mp4**: il player attuale (`PodcastPlayer.astro`) gestisce mp3 — verificare/estendere il componente per supportare anche video, oppure estrarre la traccia audio dei tre mp4.
- **Frontmatter `mp3File`**: aggiornare in ogni `stazione-NN.md` con il path corretto `/audio/tappa-NN.mp3` (o `.mp4`).

## Prossimi passi suggeriti

1. Estrarre testo strutturato dai docx (capitolo "DESCRIZIONE", "INDICAZIONI", "TRASCRIZIONE" per ogni tappa) e popolare i 12 file markdown
2. Decidere come gestire i tre episodi video (10, 11, 12)
3. Aggiungere immagini reali al posto dei placeholder `picsum.photos`
4. Verificare l'allineamento del titolo della stazione 1
