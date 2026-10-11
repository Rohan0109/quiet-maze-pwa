# The Quiet Maze

A gentle 30-day dopamine-detox companion with an urge timer, journal, body-basics tracker, and accountability-partner mode. The app is a lightweight Progressive Web App (PWA) that works offline after its first visit.

## Use the app

Open the hosted site on your phone:

- **Android:** Open in Chrome, then choose **Install app** from the browser menu.
- **iPhone:** Open in Safari, tap **Share**, then **Add to Home Screen**.

The app requires HTTPS (or `localhost`) for installation and offline support. Opening `index.html` directly still works as a regular web page, but PWA features will be unavailable.

## Data and reminders

Your data is stored in the browser on that device. To move or back up your data, use **Trail → Export JSON**. A newly installed copy on another device starts fresh until you import a backup.

Reminders can appear while the app is open. For reminders when it is closed, use **Trail → Gentle reminders → Add to calendar (.ics)**.

For partner mode, share the hosted site link. Your partner can choose **I'm someone's accountability partner**, or open the link with `#partner` at the end.

## Run locally

From this folder, start a local static server:

```sh
python3 -m http.server 8080
```

Then open <http://localhost:8080>.

## Deploy with GitHub Pages

The site is static and needs no build step. GitHub Actions publishes it to Pages whenever changes are pushed to the `main` branch.

**Live app:** <https://rohan0109.github.io/quiet-maze-pwa/>

In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**. The live URL will be available after the first successful workflow run.

Keep `index.html`, `manifest.webmanifest`, `sw.js`, and the `icons/` directory together at the site root. When releasing an update, change the `VERSION` value in `sw.js` so installed copies refresh their cached app shell.