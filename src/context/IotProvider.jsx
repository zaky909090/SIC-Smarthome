import { useEffect, useMemo, useReducer, useState } from "react";
import { MAX_EVENTS, STALE_AFTER_MS, TOPICS, WAITING_AFTER_MS } from "@/config.js";
import { IotContext } from "@/context/iot-context.js";
import { connectMqtt } from "@/services/mqtt.js";
import {
  addMinute,
  getSummary,
  markOldBootEvents,
  normalizeEvent,
  normalizeTelemetry,
  upsertEvent,
} from "@/utils/iot.js";

const initialState = {
  telemetry: null,
  minutes: [],
  events: [],
  availability: null,
  mqttStatus: "connecting",
};

function reducer(state, action) {
  switch (action.type) {
    case "mqtt/status":
      return { ...state, mqttStatus: action.status };

    case "availability":
      return { ...state, availability: action.value };

    case "telemetry": {
      const receivedAt = action.receivedAt;
      const next = normalizeTelemetry(action.payload, receivedAt);
      if (!next) return state;

      const previous = state.telemetry;
      const bootChanged =
        previous?.boot && next.boot && previous.boot !== next.boot;
      const events = bootChanged
        ? markOldBootEvents(state.events, next.boot, receivedAt)
        : state.events;

      const statusSince =
        previous?.status === next.status
          ? previous.statusSince
          : receivedAt;
      const valveChangedAt =
        previous?.valve === next.valve
          ? previous.valveChangedAt
          : receivedAt;
      const purgeActive =
        next.purge || next.relayPurge || next.relayBlower;
      const purgeSince = purgeActive
        ? previous?.purgeActive
          ? previous.purgeSince
          : receivedAt
        : null;

      return {
        ...state,
        telemetry: {
          ...next,
          statusSince,
          valveChangedAt,
          purgeActive,
          purgeSince,
        },
        minutes: addMinute(state.minutes, next),
        events,
      };
    }

    case "event": {
      const event = normalizeEvent(action.payload, action.receivedAt);
      if (!event) return state;
      const events = upsertEvent(
        state.events,
        event,
        action.receivedAt,
      );
      return {
        ...state,
        events: events.length > MAX_EVENTS ? events.slice(0, MAX_EVENTS) : events,
      };
    }

    default:
      return state;
  }
}

function buildConnection(state, telemetryAge) {
  if (state.mqttStatus === "connecting") {
    return {
      state: "connecting",
      label: "Connecting…",
      detail: "Opening MQTT connection",
      dotClass: "bg-text-muted",
    };
  }

  if (state.mqttStatus !== "connected") {
    return {
      state: "offline",
      label: "MQTT offline",
      detail: "Reconnecting to the broker",
      dotClass: "bg-status-danger",
    };
  }

  if (
    state.availability === "offline" &&
    (telemetryAge == null || telemetryAge > WAITING_AFTER_MS)
  ) {
    return {
      state: "offline",
      label: "Device offline",
      detail: "Last-will message received",
      dotClass: "bg-status-danger",
    };
  }

  if (telemetryAge == null) {
    return {
      state: "waiting",
      label: "Waiting for data",
      detail: "No telemetry received yet",
      dotClass: "bg-status-warning animate-pulse",
    };
  }

  if (telemetryAge <= WAITING_AFTER_MS) {
    return {
      state: "online",
      label: "MQTT connected",
      detail: "Live telemetry",
      dotClass: "bg-status-normal",
    };
  }

  if (telemetryAge <= STALE_AFTER_MS) {
    return {
      state: "waiting",
      label: "Waiting for data",
      detail: "Telemetry is delayed",
      dotClass: "bg-status-warning animate-pulse",
    };
  }

  return {
    state: "offline",
    label: "Device offline",
    detail: "No telemetry for 10 seconds",
    dotClass: "bg-status-danger",
  };
}

export function IotProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [clock, setClock] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(
    () =>
      connectMqtt({
        onStatus: (status) =>
          dispatch({ type: "mqtt/status", status }),
        onMessage: (topic, payload, receivedAt) => {
          const text = payload.toString();

          if (topic === TOPICS.availability) {
            const value = text.trim().toLowerCase();
            if (value === "online" || value === "offline") {
              dispatch({ type: "availability", value });
            }
            return;
          }

          let data;
          try {
            data = JSON.parse(text);
          } catch {
            return;
          }

          if (topic === TOPICS.telemetry) {
            dispatch({ type: "telemetry", payload: data, receivedAt });
          } else if (topic === TOPICS.event) {
            dispatch({ type: "event", payload: data, receivedAt });
          }
        },
      }),
    [],
  );

  const now = clock || state.telemetry?.receivedAt || 0;
  const age = state.telemetry?.receivedAt
    ? Math.max(0, (now || state.telemetry.receivedAt) - state.telemetry.receivedAt)
    : null;
  const connection = useMemo(
    () => buildConnection(state, age),
    [state, age],
  );
  const summary = useMemo(
    () => getSummary(state.minutes, state.events, now),
    [state.minutes, state.events, now],
  );

  const value = useMemo(
    () => ({
      telemetry: state.telemetry,
      minutes: state.minutes,
      events: state.events,
      availability: state.availability,
      mqttStatus: state.mqttStatus,
      now,
      age,
      connection,
      summary,
    }),
    [
      state.telemetry,
      state.minutes,
      state.events,
      state.availability,
      state.mqttStatus,
      now,
      age,
      connection,
      summary,
    ],
  );

  return <IotContext.Provider value={value}>{children}</IotContext.Provider>;
}
