import test from "node:test";
import assert from "node:assert/strict";
import { exportEvents, exportHistory } from "../src/utils/csv.js";
import {
  addMinute,
  buildHistory,
  countActiveFilters,
  deriveStatus,
  eventDuration,
  formatAgo,
  formatDateTime,
  formatDuration,
  getEventDisplay,
  getSummary,
  markOldBootEvents,
  matchesEventFilter,
  matchesEventSearch,
  normalizeEvent,
  normalizeTelemetry,
  thresholdStatus,
  upsertEvent,
} from "../src/utils/iot.js";

test("deriveStatus follows gas thresholds and interlock state", () => {
  assert.equal(deriveStatus({ gas: 12, status: "NORMAL" }), "NORMAL");
  assert.equal(deriveStatus({ gas: 55, status: "NORMAL" }), "WARNING");
  assert.equal(deriveStatus({ gas: 65, status: "WARNING" }), "DANGER");
  assert.equal(
    deriveStatus({ gas: 55, status: "WARNING", interlock: true }),
    "PURGE",
  );
  assert.equal(
    deriveStatus({ gas: 15, status: "PURGE", interlock: true }),
    "LOCKOUT",
  );
});

test("normalizeTelemetry clamps values and falls back to receive time", () => {
  const telemetry = normalizeTelemetry(
    {
      gas: 63.4,
      ts: 0,
      status: "WARNING",
      interlock: false,
      valve: "OPEN",
      servo_angle: 91,
      relay_purge: false,
    },
    1_700_000_000_000,
  );

  assert.equal(telemetry.gas, 63);
  assert.equal(telemetry.status, "DANGER");
  assert.equal(telemetry.time, 1_700_000_000_000);
  assert.equal(telemetry.valve, "OPEN");
  assert.equal(telemetry.servoAngle, 91);

  assert.equal(normalizeTelemetry({ gas: null }, 1), null);
  assert.equal(normalizeTelemetry(null, 1), null);
});

test("an ACTIVE event is updated by its RESOLVED message", () => {
  const payload = {
    id: "EVT-0001",
    boot: "a1b2",
    ts: 1_000,
    device: "ESP32-GAS-01",
    type: "GAS_ABOVE_50",
    category: "Warning",
    source: "MQ-2 sensor",
    title: "Gas above 50%",
    detail: "Warning threshold reached",
    gas: 55,
    state: "ACTIVE",
  };

  const active = normalizeEvent(payload, 5_000);
  let events = upsertEvent([], active, 5_000);
  assert.equal(events.length, 1);
  assert.equal(events[0].state, "ACTIVE");
  assert.equal(events[0].startedAt, 1_000_000);

  const resolved = normalizeEvent(
    { ...payload, ts: 1_060, state: "RESOLVED" },
    61_000,
  );
  events = upsertEvent(events, resolved, 61_000);

  assert.equal(events.length, 1);
  assert.equal(events[0].state, "RESOLVED");
  assert.equal(events[0].endedAt, 1_060_000);
  assert.equal(eventDuration(events[0], 61_000), 60_000);
});

test("event keys include boot so IDs can repeat after a reboot", () => {
  const base = {
    id: "EVT-0001",
    ts: 1_000,
    device: "ESP32-GAS-01",
    type: "SYSTEM_START",
    state: "RESOLVED",
  };
  const first = normalizeEvent({ ...base, boot: "aaaa" }, 5_000);
  const second = normalizeEvent({ ...base, boot: "bbbb" }, 6_000);

  assert.notEqual(first.key, second.key);
});

test("ACTIVE events from an old boot become interrupted", () => {
  const event = {
    key: "ESP32-GAS-01|aaaa|EVT-0001",
    boot: "aaaa",
    state: "ACTIVE",
    startedAt: 1_000_000,
    endedAt: null,
  };

  const events = markOldBootEvents([event], "bbbb", 2_000_000);
  assert.equal(events[0].state, "INTERRUPTED");
  assert.equal(events[0].endedAt, 2_000_000);
});

test("minute buckets and 12-bin history keep weighted peak and average", () => {
  const t0 = new Date(2026, 9, 25, 10, 29, 10).getTime();
  let minutes = [];
  minutes = addMinute(minutes, { gas: 30, status: "NORMAL", time: t0 });
  minutes = addMinute(minutes, {
    gas: 40,
    status: "WARNING",
    time: t0 + 20_000,
  });
  minutes = addMinute(minutes, {
    gas: 70,
    status: "DANGER",
    time: t0 + 80_000,
  });

  assert.equal(minutes.length, 2);
  assert.equal(minutes[0].count, 2);
  assert.equal(minutes[0].peak, 40);
  assert.equal(minutes[0].status, "WARNING");

  const now = new Date(2026, 9, 25, 10, 30, 30).getTime();
  const bins = buildHistory(minutes, "1h", now);

  assert.equal(bins.length, 12);
  assert.equal(
    bins.reduce((total, bin) => total + bin.samples, 0),
    3,
  );

  const withData = bins.filter((bin) => bin.samples > 0);
  assert.equal(withData.length, 2);
  assert.equal(withData[0].peak, 40);
  assert.equal(withData[0].average, 35);
  assert.equal(withData[1].peak, 70);
  assert.equal(withData[1].status, "DANGER");

  const summary = getSummary(minutes, [], now);
  assert.equal(summary.peakToday, 70);
  assert.equal(summary.average1h, 47);
});

test("filters and formatting helpers", () => {
  const event = {
    category: "Danger",
    state: "ACTIVE",
    source: "MQ-2 sensor",
  };

  assert.equal(matchesEventFilter(event, {}), true);
  assert.equal(
    matchesEventFilter(event, { category: "Danger", state: "All" }),
    true,
  );
  assert.equal(
    matchesEventFilter(event, { category: "Warning", state: "All" }),
    false,
  );
  assert.equal(
    countActiveFilters({ category: "Danger", state: "All", source: "Button" }),
    2,
  );

  assert.equal(thresholdStatus(20), "NORMAL");
  assert.equal(thresholdStatus(21), "ELEVATED");
  assert.equal(thresholdStatus(50), "WARNING");
  assert.equal(thresholdStatus(60), "DANGER");

  assert.equal(formatDuration(0), "00:00");
  assert.equal(formatDuration(65_000), "01:05");
  assert.equal(formatDuration(3_723_000), "1:02:03");
  assert.equal(formatDuration(null), "—");
});

test("Indonesian display and search preserve MQTT fields and unknown messages", () => {
  const event = Object.freeze(normalizeEvent({
    id: "EVT-0001",
    boot: "a1b2",
    device: "ESP32-GAS-01",
    type: "GAS_ABOVE_50",
    category: "Warning",
    source: "MQ-2 sensor",
    title: "Gas above 50%",
    detail: "Warning threshold reached",
    gas: 55,
    state: "ACTIVE",
  }, 1_000));

  assert.deepEqual(getEventDisplay(event), {
    title: "Gas di atas 50%",
    detail: "Ambang peringatan tercapai",
    type: "Gas di atas 50%",
    category: "Peringatan",
    source: "Sensor MQ-2",
    state: "Aktif",
  });
  for (const query of ["  PERINGATAN  ", "sensor mq-2", "ambang", "aktif", "GAS_ABOVE_50", ""]) {
    assert.equal(matchesEventSearch(event, query), true, query);
  }
  assert.equal(matchesEventSearch(event, "bahaya"), false);
  assert.equal(matchesEventFilter(event, { category: "Warning", state: "ACTIVE" }), true);
  assert.equal(event.category, "Warning");
  assert.equal(event.key, "ESP32-GAS-01|a1b2|EVT-0001");
  assert.equal(getEventDisplay({ ...event, state: "RESOLVED" }).state, "Selesai");
  assert.equal(getEventDisplay({ ...event, state: "INTERRUPTED" }).state, "Terhenti");

  const custom = { ...event, type: "toString", title: "constructor", detail: "Custom device detail", source: "__proto__", category: "constructor" };
  assert.deepEqual(getEventDisplay(custom), {
    title: custom.title,
    detail: custom.detail,
    type: custom.type,
    source: custom.source,
    category: custom.category,
    state: "Aktif",
  });
  assert.equal(matchesEventSearch(custom, "custom device"), true);
  assert.equal(getEventDisplay({ ...event, title: "GAS_ABOVE_50", detail: "" }).title, "Gas di atas 50%");
  assert.equal(getEventDisplay({ ...event, type: "SYSTEM_START", title: "System started", detail: "Device ESP32-GAS-01 is online" }).detail, "Perangkat ESP32-GAS-01 terhubung");

  const now = new Date(2026, 9, 25, 10, 30, 30).getTime();
  assert.match(formatDateTime(now), /Okt/);
  for (const [age, label] of [
    [0, "baru saja"],
    [6_000, "6 detik lalu"],
    [120_000, "2 menit lalu"],
    [7_200_000, "2 jam lalu"],
    [172_800_000, "2 hari lalu"],
  ]) {
    assert.equal(formatAgo(now - age, now), label);
  }
  assert.equal(formatAgo(null, now), "—");
});

test("CSV exports Indonesian labels and keeps device identifiers", async (t) => {
  const blobs = [];
  const links = [];
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  t.mock.method(URL, "createObjectURL", (blob) => {
    blobs.push(blob);
    return "blob:csv-test";
  });
  t.mock.method(URL, "revokeObjectURL", () => {});
  globalThis.document = {
    body: { appendChild() {} },
    createElement() {
      const link = { click() {}, remove() {} };
      links.push(link);
      return link;
    },
  };
  t.after(() => {
    if (previousDocument) Object.defineProperty(globalThis, "document", previousDocument);
    else delete globalThis.document;
  });

  const now = new Date(2026, 9, 25, 10, 30, 30).getTime();
  exportEvents([normalizeEvent({
    id: "EVT-0001", boot: "a1b2", device: "ESP32-GAS-01",
    type: "GAS_ABOVE_60", category: "Danger", source: "MQ-2 sensor",
    title: "Gas above 60%", detail: "Danger threshold reached",
    gas: 68, state: "RESOLVED",
  }, now)], now);
  exportHistory([{ start: now, end: now + 300_000, peak: 68, average: 55, samples: 2, status: "DANGER" }], "1h");

  const [eventsCsv, historyCsv] = await Promise.all(blobs.map((blob) => blob.text()));
  assert.match(links[0].download, /^kejadian-gas-/);
  assert.match(eventsCsv, /ID Kejadian,ID Sesi Perangkat,Perangkat/);
  assert.match(eventsCsv, /EVT-0001,a1b2,ESP32-GAS-01/);
  assert.match(eventsCsv, /GAS_ABOVE_60,Gas di atas 60%,Ambang bahaya tercapai,Sensor MQ-2,Bahaya,Selesai/);
  assert.match(links[1].download, /^riwayat-gas-1jam-/);
  assert.match(historyCsv, /Puncak gas \(%\),Rata-rata gas \(%\),Sampel,Status/);
  assert.match(historyCsv, /,68,55,2,Bahaya/);
});
