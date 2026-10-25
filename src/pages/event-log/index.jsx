import { useState } from "react";
import EventsTable from "@/components/events/EventsTable.jsx";
import { EMPTY_FILTER } from "@/utils/iot.js";

export default function EventLog() {
  const [filter, setFilter] = useState(EMPTY_FILTER);

  return (
    <EventsTable
      title="Riwayat Kejadian"
      subtitle="Semua kejadian MQTT yang diterima selama sesi ini, dapat dicari dan disaring"
      pageSize={10}
      filter={filter}
      onFilterChange={setFilter}
      showToolbarFilter
      showExport
    />
  );
}
