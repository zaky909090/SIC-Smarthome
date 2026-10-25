import test from "node:test";
import assert from "node:assert/strict";
import {
  addMinute,
  buildHistory,
  countActiveFilters,
  deriveStatus,
  eventDuration,
  formatDuration,
  getSummary,
  markOldBootEvents,
  matchesEventFilter,
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
