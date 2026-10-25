# AGENTS.md

React 19 + Vite 8 single-page app (JS/JSX, no TypeScript) for the `ESP32-GAS-01` gas-safety dashboard. Data arrives live over MQTT; there is no backend, API client, or persistence layer. The UI is read-only because the firmware exposes no command topic.

## Commands

- `npm run dev` — Vite dev server with HMR.
- `npm test` — Node's built-in test runner over `tests/iot.test.js`.
- `npm run lint` — ESLint flat config over all `.js`/`.jsx`.
- `npm run build` / `npm run preview` — production build to `dist/`, then serve it.
- `npm run simulate` — firmware-compatible MQTT publisher (`scripts/simulate.mjs`); requires network access to the broker.
- Requires Node `^20.19.0 || >=22.12.0` (Vite 8).

There is no typecheck, CI, or pre-commit hook. Verify changes with `npm test`, `npm run lint`, and `npm run build`.

## Structure and wiring

- `src/main.jsx` mounts `App` inside `IotProvider` and `BrowserRouter`.
- `src/App.jsx` owns the route table: `/`, `/analytics`, `/event-log`, all nested under `DashboardLayout`; unknown paths redirect to `/`.
- `src/layouts/DashboardLayout.jsx` renders the shell, brand, nav, connection pill, and `<Outlet />`.
- `src/pages/{dashboard,analytics,event-log}/index.jsx` contains the route pages. Dashboard-only KPIs and banners live in `src/pages/dashboard/components/`; shared components are grouped under `src/components/{charts,events,ui}/`.
- `src/services/mqtt.js` owns the MQTT transport and cleanup, including the 200 ms StrictMode delay. `src/context/IotProvider.jsx` owns the reducer, session state, normalization, stale/offline detection, and derived connection/summary. `src/hooks/useIot.js` is the context hook.
- `src/utils/iot.js` holds pure status/threshold, event upsert, minute-bucket/history, summary, filter, and formatting helpers. `src/utils/csv.js` handles event/history CSV downloads.
- `@/` aliases `src/` in Vite and `jsconfig.json`. Utilities imported by Node tests or the simulator must keep Node-compatible relative imports.
- `src/config.js` is the single source for the MQTT URL, topic prefix/topics, thresholds, and limits. Override with `VITE_MQTT_URL` / `VITE_MQTT_TOPIC_PREFIX`.
- `scripts/simulate.mjs` publishes telemetry, events, and retained availability to the same topics as the firmware. `tests/iot.test.js` covers the pure logic.

## Data and behavior

- Browser MQTT URL defaults to `wss://broker.hivemq.com:8884/mqtt`; topic prefix defaults to `sic8/smarthome88`. Topics are `<prefix>/telemetry`, `<prefix>/event`, `<prefix>/availability`.
- Telemetry/events/history are **session-only React state**. Reloading clears them; events are not retained by the firmware. Do not add localStorage or seeded demo data without being asked. Missing values render as `—`.
- Status: gas `0–20` safe, `50–59` warning, `60+` danger; interlock with gas `>20` is Purge, interlock with gas `<=20` is Lockout. See `deriveStatus` in `src/utils/iot.js`.
- Connection health: telemetry newer than 3 s is live, 3–10 s waiting, >10 s (or retained `offline` with no fresh telemetry) offline.
- Event key is `device|boot|id`; an `ACTIVE` event is updated by its `RESOLVED` message. Active events from an old boot become `Interrupted`.
- If firmware `ts` is `0`/missing, use the browser receive time.
- The MQTT connection is delayed 200 ms inside the effect so React StrictMode's first setup/cleanup pair does not open and abandon a WebSocket.

## Styling

- Tailwind v4 via `@tailwindcss/vite`, CSS-first theme tokens in `src/styles/index.css`; there is no `tailwind.config.js` and no CDN.
- Plus Jakarta Sans everywhere; Material Symbols via the `Icon` component. Primary navy is `#1E6593`, with the blue scale in the theme.
- Charts are CSS bars and a hand-built 16-segment SVG gauge; no chart library.
- Plain utility classes; `clsx` is available but not required.
- `CustomSelect` uses React portals for range, sort, and filter menus; preserve keyboard navigation and visible focus styling.
- Motion is CSS-only with a `prefers-reduced-motion` override. Do not animate numeric telemetry counters.
- `src/assets/logo_brand.png` is the unchanged supplied asset; branding uses its cropped `logo-mark.png`. Public icons are `favicon.png` and `apple-touch-icon.png`.

## Gotchas

- The JSX runtime is automatic; do **not** `import React` in `.jsx` files — ESLint's `no-unused-vars` fails the build.
- ESLint only lints `**/*.{js,jsx}` and ignores `dist`.
- `src/config.js` reads `import.meta.env` through a fallback so Node tests and the simulator can import it.
- The production build warns about a >500 kB JS chunk because of `mqtt`; this is expected, not a failure.
- The public HiveMQ broker is shared and can be slow or rate-limited. If the UI shows MQTT offline while the publisher is running, wait for a reconnect or check the broker.
- The dashboard must not publish MQTT commands. The simulator is the only publisher in this repo, and it is a dev tool.

## Reference docs

`README.md` documents setup, payloads, topics, routes, the simulator, tests, and the session-only scope.
