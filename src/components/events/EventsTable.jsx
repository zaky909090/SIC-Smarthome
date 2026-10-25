import { Fragment, useMemo, useState } from "react";
import EventFilter from "@/components/events/EventFilter.jsx";
import CustomSelect from "@/components/ui/CustomSelect.jsx";
import Icon from "@/components/ui/Icon.jsx";
import { useIot } from "@/hooks/useIot.js";
import { exportEvents } from "@/utils/csv.js";
import {
  CATEGORY_STYLES,
  EMPTY_FILTER,
  eventDuration,
  formatDateTime,
  formatDuration,
  getEventDisplay,
  matchesEventFilter,
  matchesEventSearch,
  STATE_LABELS,
  thresholdStatus,
} from "@/utils/iot.js";

const CATEGORY_ICONS = {
  Warning: {
    name: "report_problem",
    className: "bg-status-warning/10 text-status-warning",
  },
  Danger: {
    name: "warning",
    className: "bg-status-danger/10 text-status-danger",
    filled: true,
  },
  Interlock: {
    name: "air",
    className: "bg-status-purge/10 text-status-purge",
  },
  Reset: {
    name: "restart_alt",
    className: "bg-brand-100 text-primary",
  },
  Info: {
    name: "check_circle",
    className: "bg-bg-subtle text-text-secondary",
  },
};

const SORT_OPTIONS = [
  { value: "newest", label: "Terbaru" },
  { value: "oldest", label: "Terlama" },
];

const ACTIVE_STATUSES = {
  Warning: "text-status-warning-strong",
  Danger: "text-status-danger-strong",
  Interlock: "text-status-purge-strong",
  Reset: "text-primary",
  Info: "text-text-secondary",
};

const GAS_STYLES = {
  NORMAL: "text-status-normal-strong",
  ELEVATED: "text-text-primary",
  WARNING: "text-status-warning-strong",
  DANGER: "text-status-danger-strong",
};

function eventStatus(event) {
  if (event.state === "ACTIVE") {
    return {
      label: STATE_LABELS.ACTIVE,
      dot: "bg-status-danger animate-pulse",
      text: ACTIVE_STATUSES[event.category] || "text-status-danger-strong",
    };
  }
  if (event.state === "INTERRUPTED") {
    return {
      label: STATE_LABELS.INTERRUPTED,
      dot: "bg-status-warning",
      text: "text-status-warning-strong",
    };
  }
  return {
    label: STATE_LABELS.RESOLVED,
    dot: "bg-status-normal",
    text: "text-status-normal-strong",
  };
}

function pageNumbers(current, total) {
  if (total <= 5) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  return [...new Set([1, total, current - 1, current, current + 1])]
    .filter((page) => page >= 1 && page <= total)
    .sort((a, b) => a - b);
}

export default function EventsTable({
  title = "Kejadian Terbaru",
  subtitle = "Pembaruan alarm gas, perubahan katup, dan pengaman perangkat",
  pageSize = 10,
  filter,
  onFilterChange,
  showToolbarFilter = false,
  showExport = false,
}) {
  const { events, now } = useIot();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(() => new Set());
  const [internalFilter, setInternalFilter] = useState(EMPTY_FILTER);

  const activeFilter = filter || internalFilter;
  const updateFilter = onFilterChange || setInternalFilter;

  const filtered = useMemo(() => {
    return events
      .filter((event) => matchesEventFilter(event, activeFilter))
      .filter((event) => matchesEventSearch(event, search))
      .sort((a, b) =>
        sort === "oldest" ? a.time - b.time : b.time - a.time,
      );
  }, [events, activeFilter, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const rows = filtered.slice(start, start + pageSize);
  const pageKeys = rows.map((event) => event.key);
  const allPageSelected =
    pageKeys.length > 0 && pageKeys.every((key) => selected.has(key));
  const selectedEvents = events.filter((event) => selected.has(event.key));

  const resetPage = () => setPage(1);

  const toggleRow = (key) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const togglePage = () => {
    setSelected((current) => {
      const next = new Set(current);
      if (allPageSelected) pageKeys.forEach((key) => next.delete(key));
      else pageKeys.forEach((key) => next.add(key));
      return next;
    });
  };

  const handleExport = () => {
    exportEvents(selectedEvents.length ? selectedEvents : filtered, now);
  };

  const handleFilterChange = (next) => {
    updateFilter(next);
    resetPage();
  };

  const emptyMessage = events.length
    ? "Tidak ada kejadian yang sesuai dengan pencarian dan filter saat ini."
    : "Belum ada kejadian. Kejadian akan muncul setelah perangkat mengirimkannya.";

  return (
    <section className="animate-rise rounded-[20px] border border-border bg-bg-card p-5 shadow-card sm:p-6">
      <div className="mb-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div>
          <h2 className="text-headline-sm font-bold text-text-primary">
            {title}
          </h2>
          <p className="text-body-sm text-text-secondary">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-full min-w-0 sm:w-auto">
            <Icon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[18px] text-text-muted"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                resetPage();
              }}
              placeholder="Cari kejadian…"
              aria-label="Cari kejadian"
              className="w-full rounded-full border border-border bg-bg-subtle py-2 pl-9 pr-4 text-body-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/15 sm:w-60"
            />
          </div>

          <div className="flex items-center gap-1.5 rounded-full border border-border bg-bg-subtle px-3 py-2 text-label-md text-text-primary transition-colors hover:border-brand-200">
            <span className="text-text-secondary">Urutkan:</span>
            <CustomSelect
              value={sort}
              onChange={(value) => {
                setSort(value);
                resetPage();
              }}
              options={SORT_OPTIONS}
              ariaLabel="Urutkan kejadian"
              variant="bare"
            />
          </div>

          {showToolbarFilter && (
            <EventFilter
              filter={activeFilter}
              onFilterChange={handleFilterChange}
            />
          )}

          {(showExport || selected.size > 0) && (
            <button
              type="button"
              onClick={handleExport}
              className="group flex items-center gap-1.5 rounded-full border border-border bg-bg-card px-3 py-2 text-label-md font-semibold text-text-primary shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:bg-brand-50 hover:shadow-card-hover active:translate-y-0 active:scale-[0.98]"
            >
              <Icon
                name="download"
                className="text-[17px] text-text-secondary transition-colors group-hover:text-primary"
              />
              {selected.size ? `Ekspor ${selected.size}` : "Ekspor"}
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-bg-card">
        <div data-lenis-prevent className="overflow-x-auto">
          <table className="w-full min-w-[1000px] border-collapse text-left">
            <caption className="sr-only">
              {title}. Menampilkan {rows.length} dari {filtered.length} kejadian
              sesuai pencarian dan filter.
            </caption>
            <thead>
              <tr className="border-b border-border bg-bg-subtle text-label-md text-text-secondary">
                <th className="w-10 px-3 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={togglePage}
                    disabled={rows.length === 0}
                    aria-label="Pilih semua kejadian di halaman ini"
                    className="rounded border-border"
                  />
                </th>
                <th className="px-3 py-3 font-medium">Info kejadian</th>
                <th className="px-3 py-3 font-medium">ID kejadian</th>
                <th className="px-3 py-3 font-medium">Tanggal &amp; waktu</th>
                <th className="px-3 py-3 font-medium">Sumber</th>
                <th className="px-3 py-3 font-medium">Kategori</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Tingkat gas</th>
                <th className="px-3 py-3 font-medium">Durasi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border text-body-md">
              {rows.map((event) => {
                const icon = CATEGORY_ICONS[event.category] || CATEGORY_ICONS.Info;
                const state = eventStatus(event);
                const level = thresholdStatus(event.gas);
                const duration = eventDuration(event, now);
                const display = getEventDisplay(event);

                return (
                  <tr
                    key={event.key}
                    className="group animate-event-in transition-colors hover:bg-brand-50/40"
                  >
                    <td className="px-3 py-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={selected.has(event.key)}
                        onChange={() => toggleRow(event.key)}
                        aria-label={`Pilih kejadian ${event.id}`}
                        className="rounded border-border"
                      />
                    </td>

                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110 ${icon.className}`}
                        >
                          <Icon
                            name={icon.name}
                            className="text-[18px]"
                            filled={icon.filled}
                          />
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-text-primary">
                            {display.title}
                          </p>
                          <p className="max-w-[340px] truncate text-body-sm text-text-muted">
                            {display.detail}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-3 py-3.5 font-mono text-body-sm text-text-secondary">
                      {event.id}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3.5 font-mono text-body-sm text-text-secondary">
                      {formatDateTime(event.time)}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3.5 text-text-primary">
                      {display.source}
                    </td>

                    <td className="px-3 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-label-sm font-semibold ${
                          CATEGORY_STYLES[event.category] ||
                          CATEGORY_STYLES.Info
                        }`}
                      >
                        {display.category}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-3 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 text-label-sm font-medium ${state.text}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${state.dot}`} />
                        {state.label}
                      </span>
                    </td>

                    <td
                      className={`whitespace-nowrap px-3 py-3.5 font-mono font-bold tabular ${
                        GAS_STYLES[level] || "text-text-primary"
                      }`}
                    >
                      {event.gas == null ? "—" : `${event.gas}%`}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3.5 font-mono text-body-sm text-text-secondary">
                      {event.state === "ACTIVE" ? (
                        <span className={state.text}>Berlangsung</span>
                      ) : (
                        formatDuration(duration)
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {rows.length === 0 && (
          <div className="px-4 py-12 text-center">
            <span className="mx-auto mb-3 flex h-11 w-11 animate-float items-center justify-center rounded-full bg-bg-subtle text-text-muted">
              <Icon name="event_note" className="text-[22px]" />
            </span>
            <p className="font-semibold text-text-primary">
              {events.length ? "Tidak ada kejadian yang sesuai" : "Belum ada kejadian"}
            </p>
            <p className="mt-1 text-body-sm text-text-muted">{emptyMessage}</p>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-border pt-4 sm:flex-row">
        <span className="text-body-sm text-text-secondary">
          {filtered.length === 0 ? (
            "Belum ada kejadian"
          ) : (
            <>
              Menampilkan{" "}
              <span className="font-semibold text-text-primary">
                {start + 1}
              </span>{" "}
              hingga{" "}
              <span className="font-semibold text-text-primary">
                {Math.min(start + pageSize, filtered.length)}
              </span>{" "}
              dari{" "}
              <span className="font-semibold text-text-primary">
                {filtered.length}
              </span>{" "}
              kejadian
            </>
          )}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={safePage === 1}
            className="rounded-full border border-border bg-bg-card px-3.5 py-1.5 text-label-md text-text-primary transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:bg-brand-50 disabled:cursor-not-allowed disabled:text-text-muted disabled:hover:translate-y-0 disabled:hover:border-border disabled:hover:bg-bg-card"
          >
            Sebelumnya
          </button>

          <div className="flex items-center gap-1">
            {pageNumbers(safePage, totalPages).map((number, index, numbers) => (
              <Fragment key={number}>
                {index > 0 && number - numbers[index - 1] > 1 && (
                  <span className="px-1 text-text-muted">…</span>
                )}
                <button
                  type="button"
                  onClick={() => setPage(number)}
                  aria-current={number === safePage ? "page" : undefined}
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-label-md font-medium transition-all duration-200 ${
                    number === safePage
                      ? "bg-ink text-white shadow-sm"
                      : "text-text-primary hover:bg-brand-50"
                  }`}
                >
                  {number}
                </button>
              </Fragment>
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
            disabled={safePage === totalPages}
            className="rounded-full border border-border bg-bg-card px-3.5 py-1.5 text-label-md text-text-primary transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:bg-brand-50 disabled:cursor-not-allowed disabled:text-text-muted disabled:hover:translate-y-0 disabled:hover:border-border disabled:hover:bg-bg-card"
          >
            Berikutnya
          </button>
        </div>
      </div>
    </section>
  );
}
