import { useIot } from "@/hooks/useIot.js";
import { STATUS_BANNER, STATUS_META } from "@/utils/iot.js";
import Icon from "@/components/ui/Icon.jsx";

const ALERT_STYLES = {
  WARNING: {
    wrapper:
      "border-status-warning/30 bg-[#FFFAEB] text-status-warning-strong",
    icon: "bg-status-warning/15 text-status-warning-strong",
    iconName: "report_problem",
  },
  DANGER: {
    wrapper:
      "border-status-danger/30 bg-[#FEF3F2] text-status-danger-strong",
    icon: "bg-status-danger/10 text-status-danger-strong",
    iconName: "warning",
  },
  PURGE: {
    wrapper:
      "border-status-purge/25 bg-[#F4F3FF] text-status-purge-strong",
    icon: "bg-status-purge/10 text-status-purge-strong",
    iconName: "air",
  },
  LOCKOUT: {
    wrapper: "border-status-lockout/20 bg-[#F9FAFB] text-status-lockout",
    icon: "bg-status-lockout/10 text-status-lockout",
    iconName: "lock",
  },
};

export default function AlertBanner() {
  const { telemetry } = useIot();
  const status = telemetry?.status;
  const style = status ? ALERT_STYLES[status] : null;

  if (!style || !STATUS_BANNER[status]) return null;

  const meta = STATUS_META[status];
  const detail = [
    `${telemetry.gas}% gas`,
    telemetry.interlock ? "Interlock on" : "Interlock off",
  ].join(" · ");

  return (
    <div
      role={status === "DANGER" ? "alert" : "status"}
      aria-live={status === "DANGER" ? "assertive" : "polite"}
      key={status}
      className={`animate-rise flex items-start gap-3 rounded-2xl border px-4 py-3 ${style.wrapper}`}
    >
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${style.icon}`}
      >
        <Icon name={style.iconName} className="text-[18px]" filled={status === "DANGER"} />
      </span>
      <div className="min-w-0">
        <p className="text-body-md font-semibold">{meta.label}</p>
        <p className="mt-0.5 text-body-sm leading-5 opacity-90">
          {STATUS_BANNER[status]}
        </p>
      </div>
      <span className="ml-auto hidden whitespace-nowrap pt-1 text-label-md font-semibold opacity-80 sm:block">
        {detail}
      </span>
    </div>
  );
}
