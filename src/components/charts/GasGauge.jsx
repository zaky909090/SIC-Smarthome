import { useIot } from "@/hooks/useIot.js";
import { thresholdStatus } from "@/utils/iot.js";
import Icon from "@/components/ui/Icon.jsx";

const SEGMENTS = 16;

const PALETTES = {
  NORMAL: [
    "#1E6593", "#1F6998", "#22709F", "#2677A6",
    "#2B87BE", "#3290C5", "#3B99CC", "#4DA4D0",
    "#5EAED6", "#6FB7DB", "#83C4E1", "#94CCE6",
    "#A6D5EB", "#B8DEEE", "#CAE6F3", "#DCEEF8",
  ],
  WARNING: [
    "#B54708", "#C05609", "#CC5F09", "#D96C0A",
    "#E67A0B", "#F79009", "#F89B21", "#FAA53A",
    "#FDB022", "#FDB84A", "#FEC05F", "#FEC978",
    "#FED28F", "#FEDBA5", "#FEE3BB", "#FEEBD1",
  ],
  DANGER: [
    "#B42318", "#C0271C", "#CC2B20", "#D92D20",
    "#E2362B", "#F04438", "#F25449", "#F5655A",
    "#F97066", "#FA7D73", "#FB8B82", "#FCA098",
    "#FDAFA8", "#FDBEB8", "#FECDC8", "#FEDCD9",
  ],
  PURGE: [
    "#42307D", "#4D3695", "#593DB0", "#6938EF",
    "#7350F2", "#7A5AF8", "#8669F9", "#9279FA",
    "#9B8AFB", "#A79AFB", "#B3A9FC", "#BFB8FC",
    "#CBC6FD", "#D7D4FE", "#E3E2FE", "#EFEFFE",
  ],
  LOCKOUT: [
    "#1D2939", "#233041", "#29374A", "#344054",
    "#3D4A5D", "#475467", "#556275", "#667085",
    "#7A8699", "#8C98A9", "#98A2B3", "#AAB3C1",
    "#BCC3CE", "#CDD3DB", "#DEE2E7", "#EFF1F3",
  ],
};

const LEVEL_BADGES = {
  NORMAL: "bg-status-normal/10 text-status-normal-strong",
  ELEVATED: "bg-status-warning/15 text-status-warning-strong",
  WARNING: "bg-status-warning/15 text-status-warning-strong",
  DANGER: "bg-status-danger/10 text-status-danger-strong",
};

const LEVEL_LABELS = {
  NORMAL: "Rentang aman",
  ELEVATED: "Meningkat",
  WARNING: "Ambang peringatan",
  DANGER: "Ambang bahaya",
};

function LevelBadge({ level }) {
  if (!level) {
    return (
      <span className="mt-1 inline-block rounded-full bg-bg-subtle px-2 py-0.5 text-[10px] font-semibold text-text-muted">
        Belum ada data
      </span>
    );
  }

  return (
    <span
      className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${LEVEL_BADGES[level]}`}
    >
      {LEVEL_LABELS[level]}
    </span>
  );
}

export default function GasGauge() {
  const { telemetry, summary, connection } = useIot();
  const gas = telemetry?.gas ?? null;
  const status = telemetry?.status || "NORMAL";
  const palette = PALETTES[status] || PALETTES.NORMAL;
  const activeSegments =
    gas == null ? 0 : Math.min(SEGMENTS, Math.round((gas / 100) * SEGMENTS));
  const peakLevel = thresholdStatus(summary.peakToday);
  const averageLevel = thresholdStatus(summary.average1h);

  return (
    <section className="flex h-full flex-col justify-between rounded-[20px] border border-border bg-bg-card p-5 shadow-card sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-title-md font-bold text-text-primary">
            Tingkat Gas Saat Ini
          </h2>
          <p className="text-body-sm text-text-secondary">
            Indeks pembacaan detektor saat ini
          </p>
        </div>

        <details className="relative">
          <summary
            aria-label="Ambang indikator gas"
            className="flex h-8 w-8 list-none items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-bg-subtle [&::-webkit-details-marker]:hidden"
          >
            <Icon name="more_horiz" className="text-[20px]" />
          </summary>
          <div className="animate-tooltip-in absolute right-0 z-30 mt-2 w-56 rounded-2xl border border-border bg-bg-card p-4 text-body-sm shadow-tooltip">
            <p className="mb-2 font-semibold text-text-primary">
              Ambang indeks MQ-2
            </p>
            <dl className="space-y-1.5 text-text-secondary">
              <div className="flex justify-between gap-3">
                <dt>Aman</dt>
                <dd className="font-semibold text-status-normal-strong">0–20%</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Peringatan</dt>
                <dd className="font-semibold text-status-warning-strong">50–59%</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Bahaya</dt>
                <dd className="font-semibold text-status-danger-strong">60–100%</dd>
              </div>
            </dl>
            <p className="mt-2 border-t border-border pt-2 text-[11px] leading-4 text-text-muted">
              Nilai gas adalah indeks pembacaan analog MQ-2, bukan ppm.
            </p>
          </div>
        </details>
      </div>

      <div className="my-6 flex flex-1 flex-col items-center justify-center">
        <div
          role="img"
          aria-label={
            gas == null
              ? "Tingkat gas tidak tersedia. Belum ada telemetri yang diterima."
              : `Tingkat gas saat ini ${gas} persen. Puncak hari ini ${
                  summary.peakToday == null ? "tidak tersedia" : `${summary.peakToday} persen`
                }, rata-rata satu jam terakhir ${
                  summary.average1h == null ? "tidak tersedia" : `${summary.average1h} persen`
                }.`
          }
          className="relative flex h-36 w-64 items-center justify-center overflow-hidden"
          style={{ "--gauge-color": gas == null ? "#98A2B3" : palette[5] }}
        >
          <span aria-hidden="true" className="gauge-halo pointer-events-none absolute inset-0" />
          <svg
            className="relative h-36 w-64"
            viewBox="0 0 240 135"
            aria-hidden="true"
            focusable="false"
          >
            <g transform="translate(120, 125)">
              {Array.from({ length: SEGMENTS }, (_, index) => (
                <rect
                  key={index}
                  x="-7"
                  y="-105"
                  width="14"
                  height="28"
                  rx="7"
                  className={`gauge-segment ${index === activeSegments - 1 && connection.state === "online" ? "gauge-tip" : ""}`}
                  fill={
                    index < activeSegments ? palette[index] : "#E9EEF3"
                  }
                  transform={`rotate(${-90 + index * 12})`}
                />
              ))}
            </g>
          </svg>

          <div className="absolute bottom-1 flex flex-col items-center">
            <span className="font-mono text-[32px] font-bold leading-none tracking-tight tabular text-text-primary sm:text-metric-num">
              {gas == null ? "—" : `${gas}%`}
            </span>
            <span className="mt-1 text-title-md font-medium text-text-secondary">
              Tingkat gas
            </span>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
        <div className="rounded-xl border border-border bg-bg-subtle p-3 transition-colors hover:border-brand-200 hover:bg-brand-50">
          <span className="block text-body-sm text-text-secondary">
            Puncak hari ini
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-title-md font-bold tabular text-text-primary">
              {summary.peakToday == null ? "—" : `${summary.peakToday}%`}
            </span>
          </div>
          <LevelBadge level={peakLevel} />
        </div>

        <div className="rounded-xl border border-border bg-bg-subtle p-3 transition-colors hover:border-brand-200 hover:bg-brand-50">
          <span className="block text-body-sm text-text-secondary">
            Rata-rata 1 jam
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-title-md font-bold tabular text-text-primary">
              {summary.average1h == null ? "—" : `${summary.average1h}%`}
            </span>
          </div>
          <LevelBadge level={averageLevel} />
        </div>
      </div>
    </section>
  );
}
