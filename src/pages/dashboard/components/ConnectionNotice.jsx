import { useIot } from "@/hooks/useIot.js";
import { formatAgo } from "@/utils/iot.js";
import Icon from "@/components/ui/Icon.jsx";

export default function ConnectionNotice() {
  const { connection, telemetry, now, age } = useIot();

  if (connection.state === "online" || connection.state === "connecting") {
    return null;
  }

  const waiting = connection.state === "waiting";
  const className = waiting
    ? "border-status-warning/30 bg-[#FFFAEB] text-status-warning-strong"
    : "border-status-danger/25 bg-[#FEF3F2] text-status-danger-strong";

  return (
    <div
      role="status"
      className={`animate-rise flex items-start gap-3 rounded-2xl border px-4 py-3 ${className}`}
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/60">
        <Icon
          name={waiting ? "hourglass_top" : "cloud_off"}
          className="text-[18px]"
        />
      </span>
      <div>
        <p className="text-body-md font-semibold">{connection.label}</p>
        <p className="mt-0.5 text-body-sm leading-5 opacity-90">
          {waiting
            ? telemetry
              ? `Telemetri terlambat. Data terakhir ${formatAgo(telemetry.receivedAt, now)} dari ${telemetry.device || "perangkat"}.`
              : "Terhubung ke MQTT. Menunggu pesan telemetri pertama."
            : "Tidak ada data baru dari perangkat. Pastikan perangkat atau simulasi berjalan dan topik MQTT sesuai."}
        </p>
      </div>
      {age != null && (
        <span className="ml-auto hidden whitespace-nowrap pt-1 text-label-md font-semibold opacity-80 sm:block">
          {formatAgo(telemetry.receivedAt, now)}
        </span>
      )}
    </div>
  );
}
