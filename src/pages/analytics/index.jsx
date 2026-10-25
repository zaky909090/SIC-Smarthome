import { useState } from "react";
import GasChart from "@/components/charts/GasChart.jsx";
import GasGauge from "@/components/charts/GasGauge.jsx";
import PageHeader from "@/components/ui/PageHeader.jsx";
import { useIot } from "@/hooks/useIot.js";
import { exportHistory } from "@/utils/csv.js";
import { buildHistory } from "@/utils/iot.js";

export default function Analytics() {
  const { minutes, now } = useIot();
  const [range, setRange] = useState("1h");

  return (
    <>
      <PageHeader
        title="Analisis Gas"
        subtitle="Tren tingkat gas dan pembacaan perangkat saat ini"
        range={range}
        onRangeChange={setRange}
        onExport={() =>
          exportHistory(buildHistory(minutes, range, now), range)
        }
      />

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="animate-rise min-w-0 lg:col-span-8">
          <GasChart range={range} onRangeChange={setRange} />
        </div>
        <div className="animate-rise min-w-0 lg:col-span-4" style={{ animationDelay: "70ms" }}>
          <GasGauge />
        </div>
      </section>
    </>
  );
}
