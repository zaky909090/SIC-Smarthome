import { NavLink, Outlet, useLocation } from "react-router-dom";
import logoMark from "@/assets/logo-mark.png";
import { DEFAULT_DEVICE_ID, TOPIC_PREFIX } from "@/config.js";
import { useIot } from "@/hooks/useIot.js";
import Icon from "@/components/ui/Icon.jsx";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/analytics", label: "Analytics" },
  { to: "/event-log", label: "Event Log" },
];

function ConnectionPill() {
  const { telemetry, connection } = useIot();
  const device = telemetry?.device || DEFAULT_DEVICE_ID;

  return (
    <div
      className="flex min-w-0 items-center gap-2.5 rounded-full border border-border bg-bg-subtle py-1.5 pl-1.5 pr-3 transition-colors duration-300"
      title={`${TOPIC_PREFIX}/telemetry · ${connection.detail}`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-white">
        <Icon name="memory" className="text-[18px]" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[11px] font-semibold leading-3.5 text-text-primary">
          {device}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-[10px] font-medium text-text-secondary">
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors duration-300 ${connection.dotClass} ${connection.state === "online" ? "live-dot" : ""}`}
          />
          <span className="truncate">{connection.label}</span>
        </span>
      </span>
    </div>
  );
}

export default function DashboardLayout() {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen px-3 py-4 sm:px-6 sm:py-6">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-full bg-ink px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-6 focus:top-6"
      >
        Skip to content
      </a>

      <div className="mx-auto max-w-[1440px] rounded-[28px] border border-border bg-bg-shell p-4 shadow-card sm:p-6">
        <header className="border-b border-border pb-5">
          <div className="grid grid-cols-2 items-center gap-3 lg:grid-cols-[1fr_auto_1fr]">
            <NavLink
              to="/"
              className="group flex w-fit items-center gap-2 rounded-lg"
              aria-label="SmartHome dashboard"
            >
              <img
                src={logoMark}
                alt=""
                width="36"
                height="36"
                className="h-9 w-9 shrink-0 object-contain transition-transform duration-300 ease-fluid group-hover:-rotate-3 group-hover:scale-105"
              />
              <span className="text-headline-sm font-bold tracking-tight text-text-primary transition-colors group-hover:text-primary">
                SmartHome
              </span>
            </NavLink>

            <nav
              aria-label="Primary"
              className="order-3 col-span-2 flex w-full items-center justify-center rounded-full border border-border bg-bg-subtle p-1 lg:order-none lg:col-span-1 lg:w-auto lg:justify-self-center"
            >
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `rounded-full px-4 py-1.5 text-center text-label-md transition-all duration-200 ease-fluid active:scale-[0.98] ${
                      isActive
                        ? "bg-ink font-medium text-white shadow-sm"
                        : "text-text-secondary hover:bg-white hover:text-primary"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="justify-self-end">
              <ConnectionPill />
            </div>
          </div>
        </header>

        <main key={pathname} id="main-content" className="animate-page-in space-y-6 pt-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
