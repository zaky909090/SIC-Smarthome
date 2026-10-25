import { useState } from "react";
import EventsTable from "@/components/events/EventsTable.jsx";
import { EMPTY_FILTER } from "@/utils/iot.js";

export default function EventLog() {
  const [filter, setFilter] = useState(EMPTY_FILTER);

  return (
    <EventsTable
      title="Event log"
      subtitle="Every MQTT event received during this session, searchable and filterable"
      pageSize={10}
      filter={filter}
      onFilterChange={setFilter}
      showToolbarFilter
      showExport
    />
  );
}
