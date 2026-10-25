import { useIot } from "@/hooks/useIot.js";
import { STATUS_META, formatAgo, formatClock, formatDuration } from "@/utils/iot.js";
import Icon from "@/components/ui/Icon.jsx";

function Card({ children, className = "" }) {
  return (
    <div
      className={`card-interactive flex min-h-[168px] flex-col justify-between rounded-[20px] border border-border bg-bg-card p-5 shadow-card ${className}`}
    >
      {children}
    </div>
  );
}

function CardHeader({ label, icon, iconClass = "bg-ink text-white" }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-title-md text-text-secondary">{label}</span>
      <span
        className={`kpi-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconClass}`}
      >
        <Icon name={icon} className="text-[19px]" />
      </span>
    </div>
  );
}

function Footer({ children, className = "border-border text-text-muted" }) {
  return (
    <div
      className={`flex items-center justify-between gap-3 border-t pt-3 text-body-sm ${className}`}
    >
      {children}
    </div>
  );
}

function StatusCard({ telemetry, connection }) {
  const status = telemetry?.status || null;
  const meta = status ? STATUS_META[status] : STATUS_META.NORMAL;
  const dark = status ? meta.darkText : false;
  const titleClass = dark ? "text-text-primary/75" : "text-brand-100";
  const valueClass = dark ? "text-text-primary" : "text-white";
  const footerClass = dark
    ? "border-text-primary/15 text-text-primary/70"
    : "border-white/15 text-brand-100";
  const badgeClass = dark
    ? "bg-text-primary/10 text-text-primary"
    : "bg-white/15 text-white";

  return (
    <div
      role="status"
      aria-live={status === "DANGER" ? "assertive" : "polite"}
      className="card-interactive relative flex min-h-[168px] flex-col justify-between overflow-hidden rounded-[20px] p-5 text-white shadow-sm"
      style={{ background: meta.gradient }}
    >
      <div aria-hidden="true" className="hero-orb pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-white/10" />
      {connection.state === "online" && <span aria-hidden="true" className="hero-sheen" />}

      <div className="relative flex items-center justify-between gap-3">
        <span className={`text-title-md font-medium ${titleClass}`}>
          System status
        </span>
        <span className="kpi-icon flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
          <Icon name="verified_user" className="text-[20px] text-white" />
        </span>
      </div>

      <div className="relative my-4">
        <div className="flex items-center gap-2.5">
          <span
            className={`text-[28px] font-bold leading-9 tracking-tight sm:text-metric-num ${valueClass}`}
          >
            {status ? meta.label : "—"}
          </span>
          {status && (
            <span key={status} className="relative h-3 w-3" style={{ color: meta.dot }} aria-hidden="true">
              <span className="status-ring absolute inset-0 rounded-full border border-current" />
              <span className="absolute inset-0 rounded-full border-2 border-white/80 bg-current" />
            </span>
          )}
        </div>
        <span
          className={`mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-label-sm backdrop-blur-sm ${badgeClass}`}
        >
          {telemetry
            ? telemetry.interlock
              ? "Interlock on"
              : "Interlock off"
            : connection.label}
        </span>
      </div>

      <Footer className={footerClass}>
        <span>
          {telemetry ? `Since ${formatClock(telemetry.statusSince)}` : "Awaiting telemetry"}
        </span>
        <span className="text-[11px] font-medium">
          {telemetry ? `${telemetry.gas}% gas` : "No reading"}
        </span>
      </Footer>
    </div>
  );
}

function ValveCard({ telemetry, now }) {
  const open = telemetry?.valve === "OPEN";
  const lastChange = telemetry
    ? `Last change ${formatAgo(telemetry.valveChangedAt, now)}`
    : "No telemetry";

  return (
    <Card>
      <CardHeader label="Valve" icon="valve" />

      <div className="my-4">
        <div className="flex items-baseline gap-2.5">
          <span className="text-[28px] font-bold leading-9 tracking-tight text-text-primary sm:text-metric-num">
            {telemetry ? (open ? "Open" : "Closed") : "—"}
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-label-sm ${
              open
                ? "bg-status-normal/10 font-semibold text-status-normal-strong"
                : "bg-bg-subtle font-medium text-text-secondary"
            }`}
          >
            {telemetry ? `${telemetry.servoAngle}°` : "—"}
          </span>
        </div>
        <p className="mt-1 text-body-sm text-text-muted">
          {telemetry
            ? open
              ? "Gas line is open"
              : "Gas line is closed"
            : "Waiting for valve state"}
        </p>
      </div>

      <Footer>
        <span>{lastChange}</span>
        <span className="flex items-center gap-1">
          <Icon
            name={open ? "check_circle" : "radio_button_unchecked"}
            className={`text-[16px] ${open ? "text-status-normal" : "text-text-muted"}`}
          />
          {telemetry ? (telemetry.valveOn ? "Switch on" : "Switch off") : "—"}
        </span>
      </Footer>
    </Card>
  );
}

function PurgeCard({ telemetry, now, live }) {
  const relays = telemetry
    ? Number(telemetry.relayPurge) + Number(telemetry.relayBlower)
    : 0;
  const active = Boolean(telemetry?.purgeActive);
  const runtime = active ? formatDuration(now - telemetry.purgeSince) : null;

  const description = !telemetry
    ? "Waiting for relay state"
    : relays === 2
      ? "Purge and blower are running"
      : relays === 1
        ? telemetry.relayPurge
          ? "Purge relay is on"
          : "Blower relay is on"
        : "Both relays are off";

  return (
    <Card>
      <CardHeader
        label="Purge and blower"
        icon="mode_fan"
        iconClass={`bg-brand-100 text-primary ${active && live ? "animate-spin [animation-duration:4s]" : ""}`}
      />

      <div className="my-4">
        <div className="flex items-baseline gap-2.5">
          <span className="text-[28px] font-bold leading-9 tracking-tight text-text-primary sm:text-metric-num">
            {telemetry ? (active ? "On" : "Off") : "—"}
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-label-sm ${
              active
                ? "bg-status-purge/10 font-semibold text-status-purge-strong"
                : "bg-bg-subtle font-medium text-text-secondary"
            }`}
          >
            {telemetry ? (active ? (telemetry.interlock ? "Interlock" : "Active") : "Idle") : "—"}
          </span>
        </div>
        <p className="mt-1 text-body-sm text-text-muted">{description}</p>
      </div>

      <Footer>
        <span>{runtime ? `Runtime ${runtime}` : telemetry ? "Runtime: Idle" : "Runtime: —"}</span>
        <span className="text-[11px]">
          {telemetry
            ? relays > 0
              ? `${relays} relay${relays === 1 ? "" : "s"} on`
              : "No relay active"
            : "No relay data"}
        </span>
      </Footer>
    </Card>
  );
}

function AlertsCard({ summary, telemetry }) {
  const hazard =
    telemetry?.status && telemetry.status !== "NORMAL" ? telemetry.status : null;
  const hasActive = summary.activeAlerts > 0;
  const badgeClass = hasActive
    ? "bg-status-danger/10 text-status-danger-strong"
    : hazard
      ? STATUS_META[hazard].softClass
      : "bg-status-normal/10 text-status-normal-strong";
  const badgeText = hasActive
    ? `${summary.activeAlerts} active`
    : hazard
      ? "Current hazard"
      : "None active";

  return (
    <Card>
      <CardHeader
        label="Alerts today"
        icon="notifications_active"
        iconClass="bg-primary-container text-white"
      />

      <div className="my-4">
        <div className="flex items-baseline gap-2.5">
          <span className="text-[28px] font-bold leading-9 tracking-tight text-text-primary sm:text-metric-num">
            {summary.alertsToday}
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-label-sm font-semibold ${badgeClass}`}
          >
            {badgeText}
          </span>
        </div>
        <p className="mt-1 text-body-sm text-text-muted">
          {summary.resolvedToday} resolved today
        </p>
      </div>

      <Footer>
        <span>Since 00:00 local time</span>
        <span className="text-[11px]">
          {summary.totalToday} event{summary.totalToday === 1 ? "" : "s"} today
        </span>
      </Footer>
    </Card>
  );
}

export default function KpiCards() {
  const { telemetry, summary, now, connection } = useIot();

  return (
    <section
      aria-label="System metrics"
      className="kpi-grid grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <StatusCard telemetry={telemetry} connection={connection} />
      <ValveCard telemetry={telemetry} now={now} />
      <PurgeCard telemetry={telemetry} now={now} live={connection.state === "online"} />
      <AlertsCard summary={summary} telemetry={telemetry} />
    </section>
  );
}
