# Kaleidoscope

A static, bilingual website for Multicultural Center Kaleidoscope and its
flagship Folk Dance Club in Brighton Beach, Brooklyn. The center is a nonprofit;
the dance club is a separately registered business. They share a team and address.

## Run locally

```sh
python3 -m http.server 8765
```

Open http://localhost:8765. Serve over HTTP because the site uses JavaScript
modules. No build step is required. Alternatively, run `npm install` and
`npm run dev`.

## Site structure

- `index.html` — authored English content, two main entrances, nested project
  windows, and photo gallery. The articles also remain readable without JavaScript.
- `navigation.js` — direct, shareable hash routes, nested navigation, keyboard
  controls and browser history. Works independently of WebGL. Both entry points
  resolve it through the `site-navigation` import-map key in `index.html`, so
  cached modules cannot initialize competing navigation instances. Update its
  version in that one place.
- `i18n.js` and `translations-ru.js` — English/Russian toggle, including titles,
  navigation, image descriptions and registration. The chosen language persists
  between pages; `?lang=en` or `?lang=ru` selects a language explicitly.
- `palace.js` and `palace.css` — optional voxel palace tour, two interactive
  windows and secular stepped roofs. Camera stops follow those two windows and
  end at the second entrance, without touring empty floors. The fixed navigation opens content without
  scrolling or waiting for the scene.
- `registration.html`, `thank-you.html`, `pages.css` — existing registration
  prototype and confirmation page. No registration backend is connected.
- `images/` — local photographs and other assets.
- `info/` — background notes and historical copy.
- `vendor/` — pinned Three.js files.

The Folk Dance Club path contains the welcome, story, teaching approach, classes,
schedule, team, contact details and gallery. The Multicultural Center path contains
Dance Under The Sky, Summer Camp, Dance in Schools and community work. The club’s
relationship to the center is described in both entrances and on registration.

## Edit content or add photographs

English copy lives in `index.html`; `data-i18n` keys point to Russian copy in
`translations-ru.js`. Update both together. Use `data-i18n-alt` for translated
image descriptions. Do not put translation markers on elements containing form
inputs: translate the label text so entered values remain intact.

Each `.room` article has a unique ID. `data-parent` names its parent entrance;
`data-entry` marks either of the two top-level entrances. Navigation and child
links are derived from this structure. Existing room links such as `#room-04`
continue to open the relevant window directly. Each entrance shows its labeled
project grid first, with photo thumbnails; opening a child window preserves a
visible link back to that entrance.

To extend the gallery, place approved photos in `images/`, then add a linked
`figure` to the `#gallery` article and its `gallery.body` Russian translation.
Include a meaningful caption and alt text in both languages. The current gallery
uses nine existing photographs. Nastya’s Google Drive gallery has not yet been
imported; its link is still needed.

## Scene preview

- `?p=0.5` — jump to a point on the optional camera journey, from 0 to 1.
- `?t=1140` — freeze the clock at minutes past midnight.
- `?stats=1` — log the voxel count.
- `?dev=1` — expose `window.__kal` for inspecting and stepping the scene.

To update Three.js, change its pinned version in `package.json`, then run:

```sh
npm install
npm run vendor
```

## Verify changes

Check both languages on desktop and mobile, including nested windows, the fixed
navigation, browser back/forward, direct links and page reloads. Language changes
on the registration page must preserve typed fields and selected consent boxes.
Content navigation must also work when WebGL is unavailable.

## Hosting

Vercel serves the repository root as a static site: framework **Other**, empty
build command, root output directory. `vercel.json` supplies clean URLs, cache
rules and security headers. Pushes to the configured production branch deploy;
this local editing workflow does not publish automatically.
