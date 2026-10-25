import {
  PiArrowsClockwise,
  PiBellRinging,
  PiCaretDown,
  PiCheck,
  PiCheckCircle,
  PiClock,
  PiCloudSlash,
  PiCpu,
  PiDotsThree,
  PiDownloadSimple,
  PiFan,
  PiFunnel,
  PiHourglass,
  PiLock,
  PiMagnifyingGlass,
  PiNotepad,
  PiPipe,
  PiShieldCheck,
  PiWarning,
  PiWarningFill,
  PiWind,
} from "react-icons/pi";

const ICONS = {
  __proto__: null,
  air: PiWind,
  check: PiCheck,
  check_circle: PiCheckCircle,
  cloud_off: PiCloudSlash,
  download: PiDownloadSimple,
  event_note: PiNotepad,
  expand_more: PiCaretDown,
  filter_list: PiFunnel,
  hourglass_top: PiHourglass,
  lock: PiLock,
  memory: PiCpu,
  mode_fan: PiFan,
  more_horiz: PiDotsThree,
  notifications_active: PiBellRinging,
  report_problem: PiWarning,
  restart_alt: PiArrowsClockwise,
  schedule: PiClock,
  search: PiMagnifyingGlass,
  sync: PiArrowsClockwise,
  valve: PiPipe,
  verified_user: PiShieldCheck,
  warning: PiWarning,
};

export default function Icon({ name, className = "", filled = false }) {
  const Glyph = filled && name === "warning" ? PiWarningFill : ICONS[name];

  return Glyph ? (
    <Glyph
      aria-hidden="true"
      focusable="false"
      className={`inline-block shrink-0 align-middle ${className}`}
    />
  ) : null;
}
