import CustomSelect from "@/components/ui/CustomSelect.jsx";
import { RANGES } from "@/utils/iot.js";

const OPTIONS = Object.entries(RANGES).map(([value, range]) => ({
  value,
  label: range.label,
}));

export default function RangeSelect({
  value,
  onChange,
  ariaLabel = "Time range",
  showIcon = true,
}) {
  return (
    <CustomSelect
      value={value}
      onChange={onChange}
      options={OPTIONS}
      ariaLabel={ariaLabel}
      icon={showIcon ? "schedule" : undefined}
      variant="pill"
    />
  );
}
