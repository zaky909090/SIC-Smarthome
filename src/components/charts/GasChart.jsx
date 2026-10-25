import { useState } from "react";
import RangeSelect from "@/components/charts/RangeSelect.jsx";
import Icon from "@/components/ui/Icon.jsx";
import { useIot } from "@/hooks/useIot.js";
import {
  RANGES,
  STATUS_META,
  buildHistory,
  formatInterval,
  formatTime,
} from "@/utils/iot.js";

const THRESHOLDS = [
  {
    value: 60,
    label: "Danger",
    line: "border-status-danger/70",
    pill: "bg-status-danger-strong text-white",
    text: "text-status-danger-strong",
  },
  {
    value: 50,
    label: "Warning",
    line: "border-status-warning/70",
    pill: "bg-status-warning-strong text-white",
    text: "text-status-warning-strong",
  },
  {
    value: 20,
    label: "Safe",
    line: "border-status-normal/70",
    pill: "bg-status-normal-strong text-white",
    text: "text-status-normal-strong",
  },
];

const TOOLTIP_STATUS = {
  NORMAL: "bg-status-normal text-[#052E1B]",
  WARNING: "bg-status-warning text-[#0B0F19]",
  DANGER: "bg-status-danger-strong text-white",
  PURGE: "bg-status-purge text-white",
  LOCKOUT: "bg-status-lockout text-white",
};

function BarTooltip({ bin }) {
  const status = bin.status ? STATUS_META[bin.status] : null;

  return (
    <div className="animate-tooltip-in pointer-events-none w-44 rounded-xl border border-border bg-white p-2.5 text-text-primary shadow-tooltip ring-1 ring-black/5">
      <div className="flex items-center justify-between gap-2 border-b border-border pb-1.5 text-[11px]">
        <span className="font-medium text-text-secondary">
          {formatInterval(bin.start, bin.end)}
        </span>
        <span
          className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
            status
              ? TOOLTIP_STATUS[bin.status]
              : "bg-bg-subtle text-text-muted"
          }`}
        >
          {status ? status.label : "No data"}
        </span>
      </div>

      {bin.samples > 0 ? (
        <div className="mt-1.5 space-y-1 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-text-secondary">
              <span className="h-1.5 w-1.5 rounded-full bg-text-muted" />
              Peak
            </span>
            <span className="font-mono font-bold tabular text-text-primary">
              {bin.peak}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-container" />
              Average
            </span>
            <span className="font-mono font-bold tabular text-primary">
              {bin.average}%
            </span>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-[11px] leading-4 text-text-muted">
          No samples in this interval.
        </p>
      )}
    </div>
  );
}

export default function GasChart({ range = "1h", onRangeChange }) {
  const { minutes, now, connection } = useIot();
  const [selected, setSelected] = useState(11);
  const bins = buildHistory(minutes, range, now);
  const active = bins[selected] || bins[11];
  const hasData = bins.some((bin) => bin.samples > 0);
  const rangeInfo = RANGES[range] || RANGES["1h"];
  const live = connection.state === "online";

  const tooltipAlign =
    selected >= 10
      ? "right-0"
      : selected <= 1
        ? "left-0"
        : "left-1/2 -translate-x-1/2";

  const peakBin = bins.reduce(
    (best, bin) => (bin.peak > best.peak ? bin : best),
    bins[0],
  );
  const liveLabel = live ? "Live updating" : "Waiting for data";

  return (
    <section className="flex h-full flex-col justify-between rounded-[20px] border border-border bg-bg-card p-5 shadow-card sm:p-6">
      <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row">
        <div>
          <h2 className="text-title-md font-bold text-text-primary">
            Gas level history
          </h2>
          <p className="text-body-sm text-text-secondary">
            Peak &amp; average interval metrics with hazard thresholds
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-4 text-body-sm text-text-secondary md:flex">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px] bg-[#EDEEF2]" />
              Peak
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px] bg-[#D0D4DF]" />
              Average
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px] bg-primary" />
              Current
            </span>
          </div>

          {onRangeChange && (
            <RangeSelect
              value={range}
              onChange={onRangeChange}
              showIcon={false}
              ariaLabel="Chart time range"
            />
          )}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border bg-bg-subtle px-3 py-2 text-[11px] sm:hidden">
        <span className="font-semibold text-text-primary">
          {formatInterval(active.start, active.end)}
        </span>
        <span className="text-text-secondary">
          Peak{" "}
          <span className="font-semibold text-text-primary">
            {active.samples ? `${active.peak}%` : "—"}
          </span>
        </span>
        <span className="text-text-secondary">
          Avg{" "}
          <span className="font-semibold text-text-primary">
            {active.samples ? `${active.average}%` : "—"}
          </span>
        </span>
        <span
          className={`ml-auto rounded-full px-2 py-0.5 font-semibold ${
            active.status
              ? STATUS_META[active.status].softClass
              : "bg-bg-card text-text-muted"
          }`}
        >
          {active.status ? STATUS_META[active.status].label : "No data"}
        </span>
      </div>

      <div className="relative h-72 w-full select-none pt-4">
        <p className="sr-only">
          Gas level history over the {rangeInfo.label.toLowerCase()}.{" "}
          {hasData
            ? `The highest interval peaked at ${peakBin.peak} percent between ${formatTime(peakBin.start)} and ${formatTime(peakBin.end)}.`
            : "No telemetry has been received for this range yet."}
        </p>

        <div
          className="absolute bottom-6 left-0 top-0 flex w-8 flex-col justify-between pr-2 text-right font-mono text-[11px] text-text-muted"
          aria-hidden="true"
        >
          {[100, 80, 60, 40, 20, 0].map((tick) => (
            <span key={tick}>{tick}%</span>
          ))}
        </div>

        <div className="absolute bottom-6 left-10 right-2 top-0">
          {THRESHOLDS.map((threshold) => (
            <div
              key={threshold.value}
              className="absolute inset-x-0 z-0"
              style={{ top: `${100 - threshold.value}%` }}
              aria-hidden="true"
            >
              <div className={`border-t border-dashed ${threshold.line}`} />
              <div className="-mt-2.5 flex items-center justify-between">
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold sm:text-[10px] ${threshold.pill}`}
                >
                  {threshold.value}% {threshold.label}
                </span>
                <span
                  className={`hidden font-mono text-[10px] sm:block ${threshold.text}`}
                >
                  Threshold
                </span>
              </div>
            </div>
          ))}

          <div className="absolute inset-0 z-10 grid grid-cols-12 items-end gap-1.5 px-1 sm:gap-3">
            {bins.map((bin) => {
              const isSelected = bin.index === selected;
              const innerHeight = bin.peak
                ? Math.max(1, (bin.average / bin.peak) * 100)
                : 0;

              return (
                <button
                  key={bin.start}
                  type="button"
                  onMouseEnter={() => setSelected(bin.index)}
                  onFocus={() => setSelected(bin.index)}
                  onClick={() => setSelected(bin.index)}
                  aria-pressed={isSelected}
                  aria-label={`${formatInterval(bin.start, bin.end)}. ${bin.samples ? `Peak ${bin.peak} percent, average ${bin.average} percent. ${STATUS_META[bin.status].label}.` : "No data."}`}
                  className="group relative flex h-full items-end justify-center rounded-sm"
                >
                  {isSelected && (
                    <span
                      className={`pointer-events-none absolute top-0 z-30 hidden sm:block ${tooltipAlign}`}
                    >
                      <BarTooltip bin={bin} />
                    </span>
                  )}

                  <span
                    className={`chart-bar relative flex w-full max-w-[28px] items-end justify-center rounded-t-md transition-all duration-500 ease-out ${
                      isSelected
                        ? "bg-brand-100 shadow-[0_0_18px_rgba(30,101,147,0.14)]"
                        : "bg-[#EDEEF2] group-hover:bg-[#E2E4EB]"
                    }`}
                    style={{
                      height: `${bin.peak}%`,
                      animationDelay: `${bin.index * 22}ms`,
                    }}
                  >
                    {isSelected && bin.samples > 0 && (
                      <span className="animate-pulse-soft absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-white bg-primary shadow-[0_0_8px_rgba(30,101,147,0.65)]" />
                    )}
                    <span
                      className={`w-[60%] rounded-t-sm transition-[height] duration-500 ease-out ${
                        isSelected
                          ? "custom-bar-pattern w-[65%] bg-primary"
                          : "bg-[#D0D4DF]"
                      }`}
                      style={{ height: `${innerHeight}%` }}
                    />
                  </span>
                </button>
              );
            })}
          </div>

          {!hasData && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center pb-16">
              <span className="animate-pulse-soft rounded-full border border-border bg-white/95 px-3 py-1.5 text-body-sm font-medium text-text-muted shadow-sm">
                Waiting for telemetry…
              </span>
            </div>
          )}
        </div>

        <div
          className="absolute bottom-0 left-10 right-2 h-5 grid grid-cols-12 gap-1.5 px-1 text-center font-mono text-[9px] text-text-muted sm:gap-3 sm:text-[11px]"
          aria-hidden="true"
        >
          {bins.map((bin) => (
            <span
              key={bin.start}
              className={`${bin.index === selected ? "font-bold text-primary" : ""} ${
                bin.index % 2 === 1 ? "invisible sm:visible" : ""
              }`}
            >
              {now ? formatTime(bin.start) : "—"}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3 text-body-sm text-text-muted">
        <span>Resolution: {rangeInfo.binMinutes} min aggregated bins</span>
        <span className="flex items-center gap-1 text-text-secondary">
          <Icon
            name={live ? "sync" : "hourglass_top"}
            className={`text-[16px] ${live ? "text-status-normal animate-spin [animation-duration:5s]" : "text-status-warning"}`}
          />
          {liveLabel}
        </span>
      </div>
    </section>
  );
}
