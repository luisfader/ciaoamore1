# Ciao, amore! 1 · Italiano A1

Versione interattiva del manuale *Ciao, amore! 1 · Italiano per stranieri* di Roberto Fader.

- **Unità 1 e 2** complete: letture, dialoghi, fumetti ed esercizi con correzione automatica.
- **Progressione bloccata**: ogni sezione (A–G) si apre solo dopo aver superato tutti gli esercizi della precedente (minimo 70%; il ripasso finale dell’Unità 1 65%, quello dell’Unità 2 80%). L’Unità 2 si apre solo dopo aver completato tutta l’Unità 1.
- **Unità 3–10** visibili ma bloccate (copertina sfocata con lucchetto).
- I progressi sono salvati nel browser (`localStorage`).

## Struttura

```
index.html      pagina unica (routing con #/u1/a …)
css/style.css   stile
js/data.js      contenuti e soluzioni delle unità
js/app.js       logica: navigazione, esercizi, progressi, blocchi
img/            immagini esportate da Figma (WebP)
```

Per aggiungere un’unità: aggiungi un oggetto in `UNITS` dentro `js/data.js` e toglila da `LOCKED_UNITS`.

## Pubblicazione

Il sito è statico: funziona con GitHub Pages (branch `main`, cartella `/`).
Per provarlo in locale: `python3 -m http.server` e apri `http://localhost:8000`.
