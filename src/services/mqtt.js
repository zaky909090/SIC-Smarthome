import mqtt from "mqtt";
import { MQTT_URL, TOPICS } from "@/config.js";

/**
 * Owns the MQTT transport only. The provider remains responsible for turning
 * messages into React state.
 */
export function connectMqtt({ onMessage, onStatus }) {
  let client = null;
  let disposed = false;

  const handleConnect = () => {
    if (disposed || !client) return;
    onStatus("connected");
    client.subscribe(
      [TOPICS.telemetry, TOPICS.event, TOPICS.availability],
      { qos: 1 },
      (error) => {
        if (error && !disposed) onStatus("disconnected");
      },
    );
  };

  const handleMessage = (topic, payload) => {
    if (!disposed) onMessage(topic, payload, Date.now());
  };

  const handleDisconnect = () => {
    if (!disposed) onStatus("disconnected");
  };

  // Delay the socket so React StrictMode's first setup/cleanup pair does not
  // open and immediately abandon a WebSocket connection.
  const timer = window.setTimeout(() => {
    client = mqtt.connect(MQTT_URL, {
      clientId: `smarthome-dash-${Math.random().toString(16).slice(2, 10)}`,
      clean: true,
      keepalive: 30,
      reconnectPeriod: 4000,
      connectTimeout: 10_000,
    });

    client.on("connect", handleConnect);
    client.on("message", handleMessage);
    client.on("error", handleDisconnect);
    client.on("close", handleDisconnect);
    client.on("offline", handleDisconnect);
  }, 200);

  return () => {
    disposed = true;
    window.clearTimeout(timer);
    if (client) {
      client.removeAllListeners();
      client.end(true);
    }
  };
}
