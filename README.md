# SmartHome — Gas Safety Dashboard

React 19 + Vite 8 single-page dashboard for the `ESP32-GAS-01` gas-safety device. It subscribes to live MQTT telemetry and events from the Wokwi firmware and renders system status, valve/purge state, gas history, a live gauge, and a searchable event log.

The dashboard is **read-only**. The firmware exposes no command topic, so the UI never opens the valve, resets the interlock, or changes thresholds.

## Quick start

Requires Node `^20.19.0 || >=22.12.0`.

```bash
npm install
npm run dev
```

Open the printed URL (default `http://localhost:5173`). Without a publisher the UI shows **Waiting for data** / **Device offline** states with `—` values; it never seeds fake readings.

## MQTT

Defaults are set in `src/config.js`:

| Setting | Default |
| --- | --- |
| Browser URL | `wss://broker.hivemq.com:8884/mqtt` |
| Topic prefix | `sic8/smarthome88` |
| Device | `ESP32-GAS-01` |

Override with `.env` variables:

```bash
VITE_MQTT_URL=wss://your-broker:8884/mqtt
VITE_MQTT_TOPIC_PREFIX=your/prefix
```

Topics:

- `<prefix>/telemetry` — retained? no, published about once per second.
- `<prefix>/event` — `ACTIVE` / `RESOLVED` event pairs with a stable `id` per boot.
- `<prefix>/availability` — retained `online` / `offline` last-will message.

The browser client subscribes to all three with QoS 1. The firmware publishes over plain TCP `1883`; browsers must use the broker's secure WebSocket endpoint (HiveMQ public broker: `8884/mqtt`).

### Telemetry payload

```json
{
  "device": "ESP32-GAS-01",
  "boot": "a1b2",
  "ts": 1730000000,
  "up": 42,
  "gas": 18,
  "status": "NORMAL",
  "interlock": false,
  "purge": false,
  "valve": "CLOSED",
  "valve_on": false,
  "servo_angle": 0,
  "relay_purge": false,
  "relay_blower": false
}
```

`gas` is an index from the analog MQ-2 reading (0–100), not ppm. If `ts` is `0` or missing, the dashboard uses the browser receive time.

### Event payload

```json
{
  "id": "EVT-0001",
  "boot": "a1b2",
  "ts": 1730000000,
  "device": "ESP32-GAS-01",
  "type": "GAS_ABOVE_50",
  "category": "Warning",
  "source": "MQ-2 sensor",
  "title": "Gas above 50%",
  "detail": "Warning threshold reached",
  "gas": 55,
  "state": "ACTIVE"
}
```

The event key is `device|boot|id`. An `ACTIVE` event is updated in place when its `RESOLVED` message arrives. If a new boot publishes while an event from the previous boot is still `ACTIVE`, the old event is marked `Interrupted`.

## Status and thresholds

- `0–20%` — Safe / Normal
- `50–59%` — Warning
- `60–100%` — Danger
- `21–49%` — Elevated (used by the gauge mini cards)

The hero status also follows the interlock:

- Interlock on and gas above `20%` → **Purge**
- Interlock on and gas at or below `20%` → **Lockout**
- Otherwise gas thresholds win.

MQTT connection health is separate from device health: telemetry newer than 3 s is live, 3–10 s is waiting, and more than 10 s (or a retained `offline` availability with no fresh telemetry) is offline.

## Pages

- `/` — Dashboard: status hero, four KPI cards, gas history chart, live gauge, five recent events.
- `/analytics` — Gas history chart, live gauge, and session peak/average mini cards.
- `/event-log` — Full session event table with search, category/state/source filters, sort, pagination (10 rows), row selection, and CSV export.

Charts use 12 CSS bar bins and a hand-built 16-segment SVG gauge; there is no chart library. Range, sort, and filter controls use a shared portal-based dropdown with arrow-key, Home/End, Enter/Space, and Escape support.

Motion is CSS-only: restrained page/card entrances, hover feedback, chart/gauge transitions, and live-status accents. `prefers-reduced-motion` disables animations and transitions. Live readings update directly without animated numeric counters.

## Simulator

`scripts/simulate.mjs` publishes the firmware-compatible state cycle so you can exercise every UI state without Wokwi:

```bash
npm run simulate
```

It publishes to the same prefix/device over TCP `1883` (`MQTT_URL` env var overrides the broker) and cycles Normal → Warning → Danger → Purge → Lockout → Reset. It also publishes the matching `ACTIVE`/`RESOLVED` events and retained availability. The dashboard does not consume the simulator directly; it only sees MQTT messages.

Stop Wokwi before running the simulator so two publishers do not share the same device/topics.

## Tests and verification

```bash
npm test      # Node built-in test runner: status logic, event upsert, buckets, filters
npm run lint  # ESLint flat config over .js/.jsx
npm run build # production build to dist/
```

There is no typecheck, CI, or pre-commit hook.

## Session-only data

Telemetry history and events live in React state only. Reloading the page clears them. Events are not retained by the firmware, so a dashboard opened during an incident may show the current gas status without the earlier event rows. The UI labels this scope in the Event Log; the dashboard's event counts are likewise session-scoped.

## Structure

```text
src/
  assets/                   original logo_brand.png and cropped logo-mark.png
  components/
    charts/                 GasChart, GasGauge, RangeSelect
    events/                 EventsTable, EventFilter
    ui/                     CustomSelect, Icon, PageHeader
  config.js                 MQTT URL, topics, thresholds, limits
  context/                  IotProvider and shared context; session state and derived data
  hooks/useIot.js            context hook
  layouts/DashboardLayout.jsx  shell, brand, nav, connection pill
  pages/
    dashboard/              index.jsx and page-local components (KPIs, banners)
    analytics/index.jsx     Analytics route
    event-log/index.jsx     Event Log route
  services/mqtt.js          MQTT transport, subscriptions, lifecycle cleanup
  styles/index.css          Tailwind theme and motion
  utils/iot.js              status/threshold logic, event upsert, minute buckets, formatting
  utils/csv.js              event/history CSV export
public/                    favicon.png and apple-touch-icon.png
scripts/simulate.mjs        firmware-compatible MQTT publisher
tests/iot.test.js           core logic tests
```

`@/` resolves to `src/` through Vite and `jsconfig.json`. Node-imported utilities keep relative imports so the tests and simulator do not need an alias loader.

Styling is Tailwind v4 via `@tailwindcss/vite` with CSS-first theme tokens in `src/styles/index.css`. The JSX runtime is automatic; do not `import React` in `.jsx` files. Branding and both public icons are cropped from the supplied logo; the original asset remains unchanged.

The public HiveMQ broker is a shared demo service. For production, use a private broker with TLS and credentials, and set `VITE_MQTT_URL` / `VITE_MQTT_TOPIC_PREFIX` accordingly.
