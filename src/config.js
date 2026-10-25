const env = import.meta.env || {};

export const MQTT_URL =
  env.VITE_MQTT_URL || "wss://broker.hivemq.com:8884/mqtt";

export const TOPIC_PREFIX =
  env.VITE_MQTT_TOPIC_PREFIX || "sic8/smarthome88";

export const TOPICS = {
  telemetry: `${TOPIC_PREFIX}/telemetry`,
  event: `${TOPIC_PREFIX}/event`,
  availability: `${TOPIC_PREFIX}/availability`,
};

export const THRESHOLDS = {
  safe: 20,
  warning: 50,
  danger: 60,
};

export const DEFAULT_DEVICE_ID = "ESP32-GAS-01";

export const STALE_AFTER_MS = 10_000;
export const WAITING_AFTER_MS = 3_000;
export const MAX_EVENTS = 500;
export const MAX_MINUTES = 1440;
