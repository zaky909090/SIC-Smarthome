import mqtt from "mqtt";
import { DEFAULT_DEVICE_ID, TOPICS } from "../src/config.js";

const BROKER_URL = process.env.MQTT_URL || "mqtt://broker.hivemq.com:1883";
const DEVICE_ID = process.env.SIM_DEVICE_ID || DEFAULT_DEVICE_ID;
const BOOT_ID = Math.random().toString(16).slice(2, 6).padEnd(4, "0");

const PHASES = [
  { id: "normal", label: "Normal", status: "NORMAL", duration: 8, gas: [12, 19] },
  { id: "warning", label: "Warning", status: "WARNING", duration: 10, gas: [51, 58] },
  { id: "recover", label: "Normal", status: "NORMAL", duration: 4, gas: [14, 20] },
  { id: "danger", label: "Danger", status: "DANGER", duration: 10, gas: [62, 72] },
  { id: "recover", label: "Normal", status: "NORMAL", duration: 4, gas: [14, 20] },
  { id: "valve", label: "Valve open", status: "NORMAL", duration: 5, gas: [18, 28], valveOn: true },
  { id: "purge", label: "Purge", status: "PURGE", duration: 12, gas: [56, 26], interlock: true, purge: true },
  { id: "lockout", label: "Lockout", status: "LOCKOUT", duration: 5, gas: [12, 19], interlock: true },
  { id: "reset", label: "Reset", status: "NORMAL", duration: 5, gas: [14, 19] },
];

const client = mqtt.connect(BROKER_URL, {
  clientId: `esp32-gas-sim-${BOOT_ID}`,
  clean: true,
  keepalive: 30,
  reconnectPeriod: 0,
  will: {
    topic: TOPICS.availability,
    payload: Buffer.from("offline"),
    qos: 0,
    retain: true,
  },
});

let eventNo = 0;
let phaseIndex = 0;
let phaseElapsed = 0;
let gas = 14;
let status = "NORMAL";
let interlock = false;
let purgeActive = false;
let valveOn = false;
let stopping = false;
const startedAt = Date.now();
const activeEvents = new Map();

function publish(topic, payload, options = {}) {
  return new Promise((resolve) => {
    client.publish(topic, payload, options, () => resolve());
  });
}

function publishJson(topic, data, options = {}) {
  return publish(topic, JSON.stringify(data), options);
}

function nextEventId() {
  eventNo += 1;
  return `EVT-${String(eventNo).padStart(4, "0")}`;
}

function eventPayload(id, event, state) {
  return {
    id,
    boot: BOOT_ID,
    ts: Math.floor(Date.now() / 1000),
    device: DEVICE_ID,
    type: event.type,
    category: event.category,
    source: event.source,
    title: event.title,
    detail: event.detail,
    gas,
    state,
  };
}

function eventOpen(key, event) {
  if (activeEvents.has(key)) return;
  const id = nextEventId();
  activeEvents.set(key, { id, event });
  publishJson(TOPICS.event, eventPayload(id, event, "ACTIVE"));
  console.log(`[event] ${id} ACTIVE  ${event.title}`);
}

function eventClose(key) {
  const active = activeEvents.get(key);
  if (!active) return;
  activeEvents.delete(key);
  publishJson(TOPICS.event, eventPayload(active.id, active.event, "RESOLVED"));
  console.log(`[event] ${active.id} RESOLVED ${active.event.title}`);
}

function eventOnce(event) {
  const id = nextEventId();
  publishJson(TOPICS.event, eventPayload(id, event, "RESOLVED"));
  console.log(`[event] ${id} RESOLVED ${event.title}`);
}

const EVENTS = {
  warning: {
    type: "GAS_ABOVE_50",
    category: "Warning",
    source: "MQ-2 sensor",
    title: "Gas above 50%",
    detail: "Warning threshold reached",
  },
  danger: {
    type: "GAS_ABOVE_60",
    category: "Danger",
    source: "MQ-2 sensor",
    title: "Gas above 60%",
    detail: "Danger threshold reached",
  },
  interlock: {
    type: "AUTO_INTERLOCK",
    category: "Interlock",
    source: "System",
    title: "Interlock on, valve closed",
    detail: "Gas above 50% with valve on. Purge and blower started",
  },
  lockout: {
    type: "LOCKOUT",
    category: "Info",
    source: "System",
    title: "Lockout",
    detail: "Gas back below 20%. Press the button to reset",
  },
  reset: {
    type: "RESET_ACCEPTED",
    category: "Reset",
    source: "Button",
    title: "Reset accepted",
    detail: "Gas back below 20%. Valve stays off",
  },
  valveOn: {
    type: "VALVE_ON",
    category: "Info",
    source: "Button",
    title: "Valve on",
    detail: "Servo opened",
  },
};

function syncThresholdEvents() {
  if (status === "WARNING" || status === "DANGER") {
    eventOpen("warning", EVENTS.warning);
  } else {
    eventClose("warning");
  }

  if (status === "DANGER") {
    eventOpen("danger", EVENTS.danger);
  } else {
    eventClose("danger");
  }
}

function randomGas([min, max]) {
  return Math.round(min + Math.random() * (max - min));
}

function enterPhase(index) {
  const previous = PHASES[phaseIndex];
  const phase = PHASES[index];
  const wasInterlock = interlock;

  phaseIndex = index;
  phaseElapsed = 0;
  status = phase.status;
  interlock = Boolean(phase.interlock);
  purgeActive = Boolean(phase.purge);
  valveOn = Boolean(phase.valveOn);
  gas = phase.gas[0];

  if (phase.interlock && !wasInterlock) {
    eventOpen("interlock", EVENTS.interlock);
  }

  if (previous.interlock && !phase.interlock) {
    eventClose("interlock");
  }

  if (phase.id === "valve") {
    eventOnce(EVENTS.valveOn);
  }

  if (phase.id === "lockout") {
    eventOnce(EVENTS.lockout);
  }

  if (phase.id === "reset" && previous.interlock) {
    eventOnce(EVENTS.reset);
  }

  syncThresholdEvents();
  console.log(`\n[phase] ${phase.label} · gas ${gas}%`);
}

function updateGas(phase) {
  const [min, max] = phase.gas;

  if (phase.id === "purge") {
    const progress = phaseElapsed / phase.duration;
    gas = Math.round(max + (min - max) * (1 - progress));
    return;
  }

  const target = randomGas([min, max]);
  const step = Math.max(-2, Math.min(2, target - gas));
  gas = Math.max(min, Math.min(max, gas + step));
}

function telemetry() {
  return {
    device: DEVICE_ID,
    boot: BOOT_ID,
    ts: Math.floor(Date.now() / 1000),
    up: Math.floor((Date.now() - startedAt) / 1000),
    gas,
    status,
    interlock,
    purge: purgeActive,
    valve: valveOn ? "OPEN" : "CLOSED",
    valve_on: valveOn,
    servo_angle: valveOn ? 90 : 0,
    relay_purge: purgeActive,
    relay_blower: purgeActive,
  };
}

async function shutdown() {
  if (stopping) return;
  stopping = true;
  console.log("\n[sim] stopping…");
  try {
    await publish(TOPICS.availability, "offline", { retain: true });
  } finally {
    client.end(false, () => process.exit(0));
  }
}

async function main() {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("MQTT connection timed out")),
      15_000,
    );
    client.once("connect", () => {
      clearTimeout(timer);
      resolve();
    });
    client.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });

  client.on("error", (error) => console.error("[mqtt]", error.message));
  console.log(`[sim] connected to ${BROKER_URL}`);
  console.log(`[sim] topic prefix ${TOPICS.telemetry}`);
  console.log(`[sim] device ${DEVICE_ID} · boot ${BOOT_ID}`);

  await publish(TOPICS.availability, "online", { retain: true });
  eventOnce({
    type: "SYSTEM_START",
    category: "Info",
    source: "System",
    title: "System started",
    detail: `Device ${DEVICE_ID} is online`,
  });

  enterPhase(0);

  let lastPrint = 0;

  while (!stopping) {
    const phase = PHASES[phaseIndex];
    phaseElapsed += 1;
    updateGas(phase);
    syncThresholdEvents();

    await publishJson(TOPICS.telemetry, telemetry());

    if (Date.now() - lastPrint >= 5_000) {
      lastPrint = Date.now();
      console.log(
        `[telemetry] ${status.padEnd(7)} gas ${String(gas).padStart(3)}% valve ${valveOn ? "OPEN  " : "CLOSED"} purge ${purgeActive ? "on " : "off"}`,
      );
    }

    if (phaseElapsed >= phase.duration) {
      enterPhase((phaseIndex + 1) % PHASES.length);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main().catch((error) => {
  console.error("[sim] failed:", error.message);
  client.end(true);
  process.exit(1);
});
