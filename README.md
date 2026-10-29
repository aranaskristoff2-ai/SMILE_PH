# SMILE: See More of Islands' Landmarks and Events

**Every postcard is a quest. Every mailbox is a finish line.**

SMILE turns travel in Western Visayas and the Negros Island Region (Philippines) into a postal
adventure. Tourists pick a province, plan the day with Isidro (an AI guide they can talk to), scan
a one-use QR postcard at each landmark to collect stamps and rank up from E to SSS, and mail the
postcard to a surprise destination where someone else adopts it and starts playing. They keep a
spoken travel journal and share it on the SMILE Hub. Local shops and nano entrepreneurs sell
postcards and pasalubong, with product photos and promo videos checked by Meta's SAM 3.1.

- **Live app:** https://aranaskristoff2-ai.github.io/SMILE_PH/
- **Hackathon:** Meta Global AI Developer Hackathon 2026, Indie Developer track, theme *Build for Your World*
- **Builder:** Kristoffer P. Aranas (solo), Iloilo City, Philippines
- **Contact:** codesphereph@gmail.com

## Why SMILE

Western Visayas and the Negros Island Region welcome millions of tourists a year, but small merchants
are hard to find, and the post office has no part in most trips. SMILE gives tourists a reason to buy
official postcards and stamps, puts every province's landmarks, festivals, food and shops in one
place, and gives merchants and nano entrepreneurs a simple way to be seen.

## Meta models in SMILE

Every AI feature runs on Meta's Model API with one key from dev.meta.ai. There are no other AI providers.

| Model | Endpoint | What it does in SMILE |
|---|---|---|
| **Muse Spark** `muse-spark-1.3` (falls back to 1.2, 1.1) | `POST /v1/chat/completions` | Isidro's chat and trip plans, check-in photo check, photobooth safety check, journal polish and translation, captions, merchant listings and selling tips, LGU insights, safety check of public posts |
| **Muse Image** `muse-image-1.0` | `POST /v1/images/edits` | Photobooth: dresses the tourist's selfie in the outfit they describe, for a "CONQUERED" postcard |
| **SAM 3.1** `sam-3.1` | `POST /v1/responses` | Finds the product in merchants' photos (close-up crop) and counts the seconds it is on screen in their promo video |
| **Muse Voice Transcribe** `muse-voice-transcribe-1.0` | `POST /v1/asr/transcribe` | Speech to text: talk to Isidro, and speak your travel journal |

The `-contributor` Muse models are never used, so prompts and tourists' photos are not offered for
model training.

## Features

### For tourists

| Feature | Meta model |
|---|---|
| **Pick a province.** 8 provinces (Aklan with Boracay, Antique, Capiz, Guimaras, Iloilo, Negros Occidental, Negros Oriental, Siquijor) and 73 places. The chosen province's landmarks, festivals, food and shops show first; every other province stays listed below. | |
| **Landing poster.** A poster of the region with tappable pins for 12 places. | |
| **Isidro, the AI travel buddy.** A chat that remembers the conversation and answers follow-ups in Hiligaynon, English or Tagalog. It suggests only real places from SMILE, knows the festival calendar and today's date, and shows its picks as place cards with photos and video. | Muse Spark |
| **Talk to Isidro.** Tap Speak, ask, tap Stop: your words are written down and Isidro answers. | Muse Voice Transcribe |
| **One-use QR postcards.** Scan the postcard at the landmark (camera QR scanner) with a proof photo to collect its stamp and points. The photo check flags mismatches for human review; it never rejects on its own. | Muse Spark (vision) |
| **Mail it.** Paste a ₱20 PhilPost stamp and mail the postcard; SMILE sends it to a surprise destination where someone adopts it. "Find a post office near me". | |
| **AI photobooth.** A selfie, an outfit of your choice (safety-checked), and a "CONQUERED" postcard to save and share. | Muse Spark + Muse Image |
| **Stamp album and ranks.** One album page per province with progress bars, ranks from E to SSS, and a leaderboard. | |
| **Festival calendar.** Ati-Atihan, Dinagyang, Paraw Regatta, Panaad sa Negros, the Siquijor Healing Festival, Manggahan, MassKara, Buglasan, Sinadya sa Halaran and Binirayan by month, with the next date and a "Remind me" calendar file. | |
| **Account.** Sign up / sign in from the header on every page; the profile shows rank, points, bio, stamp album and journal history. | |
| **Travel journal.** Say or type your story, let Muse Spark polish it or translate it to English, Tagalog or Hiligaynon, add a selfie or photo and a 15-second clip, generate a caption, and keep it private or share it. | Muse Voice Transcribe + Muse Spark |
| **SMILE Hub.** Everyone's public journal posts with the traveler's rank badge and points, and likes, to inspire more travel. Public posts pass a safety check first. | Muse Spark |

### For merchants and nano entrepreneurs

| Feature | Meta model |
|---|---|
| **Sell on SMILE.** Sign up a shop with products; the team approves it. Featured merchants are listed first in their province. | |
| **Product photos and promo video.** Up to 5 photos and one 15-second video, saved in Google Drive. SAM 3.1 finds the product in each photo for a close-up and reports how long it shows in the video. | SAM 3.1 |
| **Write with AI.** Product listings in English and Hiligaynon from a few words. | Muse Spark |
| **Shop dashboard.** Opened with the shop code: 30-day views, photo and video opens, directions, contact taps and shares, SMILE postcard sales, uploads, and three selling tips. | Muse Spark |

### For PhilPost, LGUs and the SMILE team

| Feature | Meta model |
|---|---|
| **Insights.** Plain-language answers about visitor check-ins, postcard journeys and photobooth use. | Muse Spark |
| **Media manager** (`#/media`, passcode). Add photos and videos to any place or shop. | SAM 3.1 |
| **Approvals in Google Sheets.** Shops, products, merchant media and flagged Hub posts are approved by changing a status cell. | |

## Pages

| Page | What is there |
|---|---|
| `#/` | Poster with pins, province picker, festivals coming up, stamp album, how the postal adventure works |
| `#/explore` | Places by province and category, shops, my challenges |
| `#/isidro` | Chat with Isidro, by voice or text |
| `#/checkin` | Scan the QR postcard, proof photo, collect the stamp, mail the postcard |
| `#/postcards` | Adopt a found postcard, track a postcard's journey |
| `#/events` | Festival calendar |
| `#/hub` | SMILE Hub |
| `#/journal` | New travel journal entry (signed in) |
| `#/me` | Profile and journal history (signed in) |
| `#/ranks` | Ranks and leaderboard |
| `#/shop` | Pasalubong and souvenirs, Sell on SMILE |
| `#/dashboard` | Shop dashboard (shop code) |
| `#/tools` | Merchant and LGU AI tools |
| `#/media` | Media manager for the SMILE team (passcode) |

## Architecture

```
Phone (GitHub Pages PWA: index.html, app.js, api.js, sw.js)
   │  records voice (16 kHz WAV), shrinks photos and videos, scans QR codes in the browser
   │  text/plain POST (no CORS preflight)
   ▼
Google Apps Script web app (backend/Code.gs)
   ├──► Meta Model API: Muse Spark, Muse Image, SAM 3.1, Muse Voice Transcribe
   ├──► Google Sheets: Places, Users, Accounts, Sessions, Checkins, Postcards, Batches, Merchants,
   │                   Journey, Challenges, Photobooth, Shops, ShopItems, ShopStats, Media, Journal, Products
   └──► Google Drive: "SMILE Media" (shop and place photos and videos), "SMILE Journal" (journal photos and clips)
```

- **Frontend:** vanilla JavaScript, no build step. All server and AI text is inserted as plain text
  (no `innerHTML`). The service worker caches the app shell only; it never caches POST requests or other sites.
- **Backend:** Apps Script, with locks for every write. API keys live only in Script Properties.

## Privacy and safety

- Passwords are stored only as salted SHA-256 hashes; session tokens are stored only as hashes.
- Shop statistics are anonymous counts per shop per day; nothing about the visitor is stored.
- Public Hub posts pass a Muse Spark safety check; anything flagged waits for a person to review it.
- Merchant shops, products and media appear only after approval.
- Journal photos and clips are shared from Drive by link only; the link is not listed anywhere for private posts.

## Run it yourself

1. Create a Google Sheet and an Apps Script project. Paste `backend/Code.gs` and set `SS_ID` to your sheet's ID.
2. Add Script Properties:

   | Property | Needed | Purpose |
   |---|---|---|
   | `META_API_KEY` | Yes | Key from dev.meta.ai for all four Meta models |
   | `ADMIN_CODE` | For `#/media` | Passcode for the team's media manager |
   | `MUSE_TEXT_MODEL`, `MUSE_VISION_MODEL`, `MUSE_IMAGE_MODEL`, `SAM_MODEL`, `VOICE_MODEL` | No | Override the default model versions |

3. Run `setup` (creates every sheet and the built-in places and shops), then check each model:
   `diagnoseAI` (Muse Spark text and vision), `testPhotoboothAI` (Muse Image), `testSAM` (SAM 3.1),
   `testVoice` (Muse Voice Transcribe).
4. Deploy as a web app (Execute as: Me, Who has access: Anyone) and put the `/exec` URL in `config.js`.
5. Publish this repository with GitHub Pages (branch `main`, root folder).

## Known limits

- Muse Voice Transcribe lists English and Tagalog but not Hiligaynon; Hiligaynon speech is transcribed
  roughly and then polished or translated by Muse Spark.
- SMILE uses the boxes SAM 3.1 returns, so the product close-up is a crop, not a cut-out.
- Festival dates are set by each city or province every year; the calendar shows the usual schedule.
- Place descriptions and map pins are written by the team and should be checked locally before launch.

## Credits and licenses

- Poster, logo and app code: Kristoffer P. Aranas.
- jsQR (`assets/vendor/jsQR.min.js`): Apache License 2.0, by Cosmo Wolfe (see `assets/vendor/jsQR.LICENSE.txt`).
- Fonts: Baloo 2 and Nunito from Google Fonts (SIL Open Font License).
- Directions open Google Maps searches.
