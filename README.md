# 🎉 Community Bingo — Fun Facts

A tiny shared web app for a community bingo: colleagues add **fun facts about
each other**, everyone sees the wall update live. Static site (no build) hosted
on **GitHub Pages**, data in **Firebase Firestore**.

Live: https://juanjecilla.github.io/hack-the-swag/

## How it works
- `index.html` / `styles.css` — the UI (mobile-first form + live list).
- `app.js` — Firestore via CDN ESM modules: `addDoc` to submit,
  `onSnapshot` for the realtime shared list.
- `firebase-config.js` — your project's public web config.
- `firestore.rules` — security rules (anyone read + create; no edit/delete).

## Data model
Collection `entries`, one doc per submission:
```js
{
  fact: string,            // the fun fact text
  person: string,          // who it's about
  submittedBy: string|null,
  exactMatch: boolean,     // true = written verbatim as on the bingo card
  createdAt: timestamp
}
```

## Setup (Firebase CLI)
```bash
npm i -g firebase-tools          # install CLI
firebase login                   # browser OAuth (one time)

# create project + web app
firebase projects:create <id> --display-name "Hack the Swag"
firebase apps:create web "bingo" --project <id>
firebase apps:sdkconfig web <appId> --project <id>   # paste into firebase-config.js

# create Firestore + deploy rules
firebase firestore:databases:create "(default)" --location=eur3 --project <id>
firebase deploy --only firestore:rules --project <id>
```

## Run locally
ESM modules need http(s), not `file://`:
```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy (GitHub Pages)
```bash
git add -A && git commit -m "Community bingo app" && git push -u origin main
# Repo → Settings → Pages → Source: main / root
```

## Security note
The Firebase web config keys are **public by design** — access is controlled by
`firestore.rules`, not by hiding the config. For a short event this is fine.
To curb spam later, enable Firebase **anonymous auth** and tighten the rules.
