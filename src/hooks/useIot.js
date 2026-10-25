import { useContext } from "react";
import { IotContext } from "@/context/iot-context.js";

export function useIot() {
  const context = useContext(IotContext);
  if (!context) {
    throw new Error("useIot must be used inside IotProvider");
  }
  return context;
}
