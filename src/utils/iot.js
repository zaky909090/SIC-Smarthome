import { MAX_MINUTES, THRESHOLDS } from "../config.js";

export const RANGES = {
  "1h": {
    label: "Last 1 hour",
    short: "1 h",
    spanMinutes: 60,
    binMinutes: 5,
  },
  "6h": {
    label: "Last 6 hours",
    short: "6 h",
    spanMinutes: 360,
    binMinutes: 30,
  },
  "24h": {
    label: "Last 24 hours",
    short: "24 h",
    spanMinutes: 1440,
    binMinutes: 120,
  },
};

export const STATUS_META = {
  NORMAL: {
    label: "Normal",
    rank: 0,
    gradient: "linear-gradient(160deg, #2B87BE 0%, #18537A 100%)",
    darkText: false,
    dot: "#12B76A",
    softClass: "bg-brand-50 text-primary",
  },
  WARNING: {
    label: "Warning",
    rank: 1,
    gradient: "linear-gradient(160deg, #FDB022 0%, #F79009 100%)",
    darkText: true,
    dot: "#7A2E0E",
    softClass: "bg-status-warning/15 text-status-warning-strong",
  },
  PURGE: {
    label: "Purge",
    rank: 2,
    gradient: "linear-gradient(160deg, #9B8AFB 0%, #6938EF 100%)",
    darkText: false,
    dot: "#D9D6FE",
    softClass: "bg-status-purge/10 text-status-purge-strong",
  },
  DANGER: {
    label: "Danger",
    rank: 3,
    gradient: "linear-gradient(160deg, #F97066 0%, #D92D20 100%)",
    darkText: false,
    dot: "#FECDCA",
    softClass: "bg-status-danger/10 text-status-danger-strong",
  },
  LOCKOUT: {
    label: "Lockout",
    rank: 4,
    gradient: "linear-gradient(160deg, #475467 0%, #1D2939 100%)",
    darkText: false,
    dot: "#F97066",
    softClass: "bg-status-lockout/10 text-status-lockout",
  },
};

export const STATUS_BANNER = {
  WARNING:
    "Gas is above 50%. Keep ignition sources away and ventilate the area.",
  DANGER:
    "Gas is above 60%. Move away from the source and keep ignition off.",
  PURGE:
    "Interlock active. The valve is closed while purge and blower are running.",
  LOCKOUT:
    "Gas is back below 20%. Press the physical button to reset the system.",
};

export const CATEGORY_STYLES = {
  Warning: "bg-status-warning/15 text-status-warning-strong",
  Danger: "bg-status-danger/10 text-status-danger-strong",
  Interlock: "bg-status-purge/10 text-status-purge-strong",
  Reset: "bg-brand-100 text-primary",
  Info: "bg-bg-subtle text-text-secondary",
};

export const EMPTY_FILTER = {
  category: "All",
  state: "All",
  source: "All",
};

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const clockFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function toBool(value) {
  return value === true || value === 1 || value === "true";
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function clampGas(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return clamp(Math.round(number), 0, 100);
}

export function normalizeStatus(value) {
  const status = String(value || "").toUpperCase();
  return STATUS_META[status] ? status : null;
}

export function deriveStatus({ gas = 0, status, interlock = false }) {
  const raw = normalizeStatus(status);

  if (interlock) {
    return gas <= THRESHOLDS.safe ? "LOCKOUT" : "PURGE";
  }

  if (raw === "PURGE" || raw === "LOCKOUT") return raw;
  if (gas >= THRESHOLDS.danger) return "DANGER";
  if (gas >= THRESHOLDS.warning) return "WARNING";
  return "NORMAL";
}

export function thresholdStatus(gas) {
  if (gas == null) return null;
  if (gas >= THRESHOLDS.danger) return "DANGER";
  if (gas >= THRESHOLDS.warning) return "WARNING";
  if (gas <= THRESHOLDS.safe) return "NORMAL";
  return "ELEVATED";
}

export function normalizeTelemetry(payload, receivedAt = 0) {
  if (!payload || typeof payload !== "object") return null;

  const gas = clampGas(payload.gas);
  if (gas == null) return null;

  const ts = Number(payload.ts);
  const time = Number.isFinite(ts) && ts > 0 ? ts * 1000 : receivedAt;
  const interlock = toBool(payload.interlock);
  const status = deriveStatus({ gas, status: payload.status, interlock });
  const servoAngle = Number(payload.servo_angle);

  return {
    device: payload.device ? String(payload.device) : "",
    boot: payload.boot != null ? String(payload.boot) : "",
    ts: Number.isFinite(ts) && ts > 0 ? ts : 0,
    time,
    receivedAt,
    up: Number.isFinite(Number(payload.up)) ? Number(payload.up) : null,
    gas,
    status,
    rawStatus: normalizeStatus(payload.status),
    interlock,
    purge: toBool(payload.purge),
    valve: String(payload.valve || "").toUpperCase() === "OPEN" ? "OPEN" : "CLOSED",
    valveOn: toBool(payload.valve_on),
    servoAngle: Number.isFinite(servoAngle)
      ? clamp(Math.round(servoAngle), 0, 180)
      : 0,
    relayPurge: toBool(payload.relay_purge),
    relayBlower: toBool(payload.relay_blower),
  };
}

export function eventKey(event) {
  return `${event.device || "unknown"}|${event.boot || "noboot"}|${event.id}`;
}

export function normalizeEvent(payload, receivedAt = 0) {
  if (!payload || typeof payload !== "object") return null;
  if (payload.id == null || !payload.type) return null;

  const ts = Number(payload.ts);
  const time = Number.isFinite(ts) && ts > 0 ? ts * 1000 : receivedAt;
  const gas = clampGas(payload.gas);
  const gasKnown = gas != null;
  const state = String(payload.state || "").toUpperCase() === "ACTIVE"
    ? "ACTIVE"
    : "RESOLVED";

  const event = {
    id: String(payload.id),
    device: payload.device ? String(payload.device) : "",
    boot: payload.boot != null ? String(payload.boot) : "",
    ts: Number.isFinite(ts) && ts > 0 ? ts : 0,
    time,
    receivedAt,
    type: String(payload.type),
    category: payload.category ? String(payload.category) : "Info",
    source: payload.source ? String(payload.source) : "System",
    title: payload.title ? String(payload.title) : String(payload.type),
    detail: payload.detail ? String(payload.detail) : "",
    gas: gasKnown ? gas : null,
    state,
  };

  event.key = eventKey(event);
  return event;
}

function sortEvents(events) {
  return events
    .slice()
    .sort((a, b) => b.time - a.time || String(b.key).localeCompare(String(a.key)));
}

export function upsertEvent(events, incoming, receivedAt = incoming.time) {
  const index = events.findIndex((event) => event.key === incoming.key);

  if (index === -1) {
    return sortEvents([
      {
        ...incoming,
        startedAt: incoming.state === "ACTIVE" ? incoming.time : null,
        endedAt: incoming.state === "RESOLVED" ? incoming.time : null,
        lastSeenAt: receivedAt,
      },
      ...events,
    ]);
  }

  const previous = events[index];
  const resolved = incoming.state === "RESOLVED";
  const updated = {
    ...previous,
    ...incoming,
    startedAt:
      previous.startedAt ??
      (incoming.state === "ACTIVE" ? incoming.time : null),
    endedAt: resolved ? incoming.time : previous.endedAt ?? null,
    lastSeenAt: receivedAt,
  };

  const next = events.slice();
  next[index] = updated;
  return sortEvents(next);
}

export function markOldBootEvents(events, boot, at) {
  if (!boot) return events;

  let changed = false;
  const next = events.map((event) => {
    if (event.state !== "ACTIVE" || !event.boot || event.boot === boot) {
      return event;
    }
    changed = true;
    return { ...event, state: "INTERRUPTED", endedAt: at };
  });

  return changed ? next : events;
}

export function addMinute(minutes, telemetry) {
  const minuteKey = Math.floor(telemetry.time / 60_000) * 60_000;
  const status = telemetry.status;
  const rank = STATUS_META[status]?.rank ?? 0;
  const last = minutes[minutes.length - 1];

  const merge = (minute) => ({
    ...minute,
    sum: minute.sum + telemetry.gas,
    count: minute.count + 1,
    peak: Math.max(minute.peak, telemetry.gas),
    statusRank: Math.max(minute.statusRank, rank),
    status: rank >= minute.statusRank ? status : minute.status,
  });

  if (last && last.t === minuteKey) {
    const next = minutes.slice();
    next[next.length - 1] = merge(last);
    return next;
  }

  if (!last || minuteKey > last.t) {
    const next = [
      ...minutes,
      {
        t: minuteKey,
        sum: telemetry.gas,
        count: 1,
        peak: telemetry.gas,
        statusRank: rank,
        status,
      },
    ];
    return next.length > MAX_MINUTES ? next.slice(next.length - MAX_MINUTES) : next;
  }

  const index = minutes.findIndex((minute) => minute.t === minuteKey);
  if (index === -1) return minutes;

  const next = minutes.slice();
  next[index] = merge(next[index]);
  return next;
}

export function buildHistory(minutes, rangeKey, now) {
  const range = RANGES[rangeKey] || RANGES["1h"];
  const binMs = range.binMinutes * 60_000;
  const anchor = Math.floor(now / binMs) * binMs;
  const start = anchor - 11 * binMs;

  const bins = Array.from({ length: 12 }, (_, index) => ({
    index,
    start: start + index * binMs,
    end: start + (index + 1) * binMs,
    peak: 0,
    average: 0,
    samples: 0,
    sum: 0,
    statusRank: -1,
    status: null,
  }));

  for (const minute of minutes) {
    if (minute.t < start || minute.t > now) continue;
    const index = Math.floor((minute.t - start) / binMs);
    const bin = bins[index];
    if (!bin) continue;

    bin.sum += minute.sum;
    bin.samples += minute.count;
    bin.peak = Math.max(bin.peak, minute.peak);
    if (minute.statusRank > bin.statusRank) {
      bin.statusRank = minute.statusRank;
      bin.status = minute.status;
    }
  }

  return bins.map((bin) => ({
    index: bin.index,
    start: bin.start,
    end: bin.end,
    peak: bin.peak,
    average: bin.samples ? Math.round(bin.sum / bin.samples) : 0,
    samples: bin.samples,
    status: bin.status,
  }));
}

export function startOfLocalDay(now) {
  if (!now) return 0;
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function getSummary(minutes, events, now) {
  const dayStart = startOfLocalDay(now);
  const hourAgo = now - 60 * 60_000;
  let peakToday = null;
  let hourSum = 0;
  let hourCount = 0;

  for (const minute of minutes) {
    if (!now) break;
    if (minute.t >= dayStart) {
      peakToday =
        peakToday == null ? minute.peak : Math.max(peakToday, minute.peak);
    }
    if (minute.t >= hourAgo && minute.t <= now) {
      hourSum += minute.sum;
      hourCount += minute.count;
    }
  }

  const todayEvents = now
    ? events.filter((event) => event.time >= dayStart && event.time <= now)
    : [];
  const hazardCategories = new Set(["Warning", "Danger", "Interlock"]);

  return {
    peakToday,
    average1h: hourCount ? Math.round(hourSum / hourCount) : null,
    alertsToday: todayEvents.filter((event) =>
      hazardCategories.has(event.category),
    ).length,
    activeAlerts: events.filter((event) => event.state === "ACTIVE").length,
    resolvedToday: todayEvents.filter((event) => event.state === "RESOLVED")
      .length,
    totalToday: todayEvents.length,
  };
}

export function countActiveFilters(filter = EMPTY_FILTER) {
  return ["category", "state", "source"].filter(
    (key) => filter[key] && filter[key] !== "All",
  ).length;
}

export function matchesEventFilter(event, filter = EMPTY_FILTER) {
  return (
    (!filter.category ||
      filter.category === "All" ||
      event.category === filter.category) &&
    (!filter.state ||
      filter.state === "All" ||
      event.state === filter.state) &&
    (!filter.source || filter.source === "All" || event.source === filter.source)
  );
}

export function formatTime(value) {
  if (!value) return "—";
  return timeFormatter.format(value);
}

export function formatClock(value) {
  if (!value) return "—";
  return clockFormatter.format(value);
}

export function formatDateTime(value) {
  if (!value) return "—";
  return dateTimeFormatter.format(value);
}

export function formatInterval(start, end) {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

export function formatAgo(value, now) {
  if (!value || !now) return "—";
  const seconds = Math.max(0, Math.round((now - value) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.floor(hours / 24)} d ago`;
}

export function formatDuration(ms) {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return "—";
  const total = Math.round(ms / 1000);
  const seconds = total % 60;
  const minutes = Math.floor(total / 60) % 60;
  const hours = Math.floor(total / 3600);
  const pad = (value) => String(value).padStart(2, "0");
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

export function eventDuration(event, now) {
  if (event.state === "ACTIVE") {
    return event.startedAt ? Math.max(0, now - event.startedAt) : null;
  }
  if (!event.startedAt) return null;
  return Math.max(0, (event.endedAt || now) - event.startedAt);
}
