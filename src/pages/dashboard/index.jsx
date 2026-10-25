import { useState } from "react";
import AlertBanner from "@/pages/dashboard/components/AlertBanner.jsx";
import ConnectionNotice from "@/pages/dashboard/components/ConnectionNotice.jsx";
import KpiCards from "@/pages/dashboard/components/KpiCards.jsx";
import EventsTable from "@/components/events/EventsTable.jsx";
import GasChart from "@/components/charts/GasChart.jsx";
import GasGauge from "@/components/charts/GasGauge.jsx";
import PageHeader from "@/components/ui/PageHeader.jsx";
import { useIot } from "@/hooks/useIot.js";
import { exportEvents } from "@/utils/csv.js";
import { EMPTY_FILTER, matchesEventFilter } from "@/utils/iot.js";

export default function Dashboard() {
  const { events, now } = useIot();
  const [range, setRange] = useState("1h");
  const [filter, setFilter] = useState(EMPTY_FILTER);

  const filteredEvents = events.filter((event) =>
    matchesEventFilter(event, filter),
  );

  return (
    <>
      <PageHeader
        title="Ringkasan Keamanan Gas"
        subtitle="Pemantauan kebocoran gas secara langsung dan perlindungan otomatis"
        range={range}
        onRangeChange={setRange}
        filter={filter}
        onFilterChange={setFilter}
        onExport={() => exportEvents(filteredEvents, now)}
      />

      <AlertBanner />
      <ConnectionNotice />
      <KpiCards />

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="animate-rise min-w-0 lg:col-span-8">
          <GasChart range={range} onRangeChange={setRange} />
        </div>
        <div className="animate-rise min-w-0 lg:col-span-4" style={{ animationDelay: "70ms" }}>
          <GasGauge />
        </div>
      </section>

      <EventsTable
        title="Kejadian Terbaru"
        subtitle="Pembaruan alarm gas, perubahan katup, dan pengaman perangkat"
        pageSize={5}
        filter={filter}
        onFilterChange={setFilter}
      />
    </>
  );
}
