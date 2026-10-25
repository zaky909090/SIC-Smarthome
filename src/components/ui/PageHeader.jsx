import EventFilter from "@/components/events/EventFilter.jsx";
import RangeSelect from "@/components/charts/RangeSelect.jsx";
import Icon from "@/components/ui/Icon.jsx";

export default function PageHeader({
  title,
  subtitle,
  range,
  onRangeChange,
  filter,
  onFilterChange,
  onExport,
}) {
  return (
    <section className="animate-rise flex flex-col justify-between gap-4 pb-1 lg:flex-row lg:items-center">
      <div>
        <h1 className="text-[26px] font-bold leading-9 tracking-tight text-text-primary sm:text-headline-lg">
          {title}
        </h1>
        <p className="mt-0.5 text-body-md text-text-secondary">{subtitle}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {range && onRangeChange && (
          <RangeSelect value={range} onChange={onRangeChange} />
        )}

        {filter && onFilterChange && (
          <EventFilter filter={filter} onFilterChange={onFilterChange} />
        )}

        {onExport && (
          <button
            type="button"
            onClick={onExport}
            className="group flex items-center gap-2 rounded-full border border-border bg-bg-card px-4 py-2 text-label-md font-semibold text-text-primary shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:bg-brand-50 hover:shadow-card-hover active:translate-y-0 active:scale-[0.98]"
          >
            <Icon
              name="download"
              className="text-[18px] text-text-secondary transition-colors group-hover:text-primary"
            />
            Export CSV
          </button>
        )}
      </div>
    </section>
  );
}
