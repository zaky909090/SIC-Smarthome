import { useEffect, useRef } from "react";
import CustomSelect from "@/components/ui/CustomSelect.jsx";
import Icon from "@/components/ui/Icon.jsx";
import {
  CATEGORY_LABELS,
  countActiveFilters,
  EMPTY_FILTER,
  SOURCE_LABELS,
  STATE_LABELS,
} from "@/utils/iot.js";

const CATEGORIES = Object.entries(CATEGORY_LABELS).map(
  ([value, label]) => ({ value, label }),
);
const STATES = Object.entries(STATE_LABELS).map(([value, label]) => ({
  value,
  label,
}));
const SOURCES = Object.entries(SOURCE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

function Field({ label, value, onChange, options }) {
  return (
    <div className="block">
      <span className="mb-1.5 block text-label-sm font-semibold uppercase tracking-wide text-text-muted">
        {label}
      </span>
      <CustomSelect
        value={value}
        onChange={onChange}
        options={[{ value: "All", label: "Semua" }, ...options]}
        ariaLabel={`Saring ${label.toLowerCase()}`}
        variant="field"
      />
    </div>
  );
}

export default function EventFilter({ filter, onFilterChange }) {
  const activeCount = countActiveFilters(filter);
  const detailsRef = useRef(null);

  useEffect(() => {
    const handleOutside = (event) => {
      if (event.target.closest?.(".select-menu")) return;
      const details = detailsRef.current;
      if (details?.open && !details.contains(event.target)) details.open = false;
    };
    const handleResize = () => {
      if (detailsRef.current) detailsRef.current.open = false;
    };
    document.addEventListener("pointerdown", handleOutside);
    window.addEventListener("resize", handleResize);
    return () => {
      document.removeEventListener("pointerdown", handleOutside);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const update = (key, value) => {
    onFilterChange({ ...filter, [key]: value });
  };

  return (
    <details
      ref={detailsRef}
      className="group relative"
      onToggle={(event) => {
        const details = event.currentTarget;
        if (!details.open) return;
        const width = Math.min(280, window.innerWidth - 32);
        details.style.setProperty("--filter-right", `${Math.min(0, details.getBoundingClientRect().right - width - 8)}px`);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !event.defaultPrevented) {
          event.preventDefault();
          event.currentTarget.open = false;
          event.currentTarget.querySelector("summary")?.focus();
        }
      }}
    >
      <summary className="flex list-none items-center gap-2 rounded-full bg-primary px-4 py-2 text-label-md font-semibold text-white shadow-sm transition-all duration-200 hover:bg-primary-hover hover:shadow-card-hover active:scale-[0.98] group-open:bg-primary-hover [&::-webkit-details-marker]:hidden">
        <Icon
          name="filter_list"
          className="text-[18px] transition-transform duration-200 group-hover:-rotate-6"
        />
        Filter
        {activeCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-primary">
            {activeCount}
          </span>
        )}
      </summary>

      <div className="filter-panel absolute z-40 mt-2 w-[280px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-bg-card p-4 shadow-tooltip" style={{ right: "var(--filter-right, 0px)" }}>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-title-md font-bold text-text-primary">
            Saring Kejadian
          </p>
          <button
            type="button"
            disabled={activeCount === 0}
            onClick={() => onFilterChange(EMPTY_FILTER)}
            className="text-label-sm font-semibold text-primary transition hover:text-primary-hover disabled:cursor-not-allowed disabled:text-text-muted"
          >
            Bersihkan
          </button>
        </div>

        <div className="space-y-3">
          <Field
            label="Kategori"
            value={filter.category}
            onChange={(value) => update("category", value)}
            options={CATEGORIES}
          />
          <Field
            label="Status"
            value={filter.state}
            onChange={(value) => update("state", value)}
            options={STATES}
          />
          <Field
            label="Sumber"
            value={filter.source}
            onChange={(value) => update("source", value)}
            options={SOURCES}
          />
        </div>
      </div>
    </details>
  );
}
