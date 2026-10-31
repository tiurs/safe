# Safe — offline firearm, ammo & accessory inventory

A private, offline-first mobile app (iOS + Android) for keeping an inventory of firearms, ammunition, and accessories. Built with Expo / React Native.

**All data stays on your phone.** Nothing is sent to a server — there are no network calls, accounts, or analytics. The inventory lives in an on-device SQLite database and photos are stored in the app's private documents folder.

## Features

- **Firearms** — make, model, type, action, caliber, serial number, barrel length, finish, condition, round count, purchase date/price/source, current value, storage location, notes, photos.
- **Ammo** — caliber, brand, product line, grain, bullet type, round count, low-stock threshold, cost per round, lot number, location, notes, photos. Quick add/use buttons; "use" can add the rounds to a firearm's round count.
- **Accessories** — optics, magazines, lights, holsters, suppressors, etc. with brand/model/serial, quantity, value, and an optional link to the firearm it's mounted on.
- **Overview** — total estimated value, counts, rounds by caliber, and low-ammo alerts.
- **Search** across every list.
- **Backup / restore** — export the full inventory (optionally including photos) as a JSON file via the share sheet; restore it on the same or a new phone.
- **CSV export** for each category (opens in Excel / Numbers / Google Sheets).
- **App lock** — optional Face ID / Touch ID / fingerprint lock (re-locks after 1 minute in the background).

> Because data never leaves the device, **uninstalling the app or losing the phone loses the data** unless you've exported a backup. Export regularly and keep the file somewhere safe.

## Running it

Requirements: Node.js 20+.

```bash
npm install
npx expo start
```

### On your phone (quickest)

Install **Expo Go** from the App Store / Play Store, run `npx expo start`, and scan the QR code. All modules used are included in Expo Go.

### Installable build

Use [EAS Build](https://docs.expo.dev/build/introduction/) to produce an installable app (no Xcode/Android Studio needed):

```bash
npx eas-cli@latest build --platform android --profile preview   # APK you can sideload
npx eas-cli@latest build --platform ios                          # requires an Apple developer account
```

Or build locally with `npx expo run:android` / `npx expo run:ios` (Android SDK / Xcode required).

## Development

```bash
npm run typecheck   # tsc --noEmit
npx expo lint
```

Project layout:

- `src/app/` — screens (Expo Router). `(tabs)/` holds the tab screens; `item/[kind]/[id].tsx` is the detail view; `edit/[kind].tsx` is the add/edit form.
- `src/db/entities.ts` — field definitions for each category (add a field here + a migration in `schema.ts`).
- `src/db/schema.ts` — SQLite schema and migrations (`PRAGMA user_version`).
- `src/db/repo.ts` — queries.
- `src/lib/` — photos, backup/CSV, biometric lock, theme.
