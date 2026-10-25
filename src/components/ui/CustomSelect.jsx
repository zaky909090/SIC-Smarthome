import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/Icon.jsx";

const TRIGGER_STYLES = {
  pill: "gap-2 rounded-full border border-border bg-bg-subtle px-3 py-2 text-label-md font-medium shadow-sm hover:border-brand-200 hover:bg-brand-50",
  field:
    "w-full justify-between gap-2 rounded-xl border border-border bg-bg-subtle px-3 py-2 text-left text-body-md hover:border-brand-200 hover:bg-brand-50",
  bare: "gap-1 text-label-md font-semibold",
};

function normalizeOptions(options) {
  return options.map((option) =>
    typeof option === "string"
      ? { value: option, label: option }
      : {
          value: option.value,
          label: option.label ?? option.value,
          icon: option.icon,
        },
  );
}

export default function CustomSelect({
  value,
  onChange,
  options = [],
  ariaLabel = "Select option",
  placeholder = "Select",
  variant = "pill",
  icon,
  className = "",
  disabled = false,
}) {
  const normalized = normalizeOptions(options);
  const selectedIndex = normalized.findIndex(
    (option) => String(option.value) === String(value),
  );
  const selected = normalized[selectedIndex];

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [menuPos, setMenuPos] = useState(null);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const optionRefs = useRef([]);
  const baseId = useId();
  const menuId = `${baseId}-menu`;

  const closeMenu = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
  }, []);

  const openMenu = (initialIndex = selectedIndex) => {
    if (disabled || normalized.length === 0) return;

    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) {
      setOpen(true);
      return;
    }

    const width = Math.min(
      Math.max(rect.width, variant === "field" ? 0 : 168),
      window.innerWidth - 16,
    );
    const estimatedHeight = Math.min(240, normalized.length * 40 + 8);
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUp = spaceBelow < estimatedHeight + 12 && spaceAbove > spaceBelow;
    const available = (openUp ? spaceAbove : spaceBelow) - 12;

    setMenuPos({
      top: openUp ? undefined : rect.bottom + 6,
      bottom: openUp ? window.innerHeight - rect.top + 6 : undefined,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
      width,
      maxHeight: Math.max(0, Math.min(232, available)),
    });
    setActiveIndex(initialIndex >= 0 ? initialIndex : 0);
    setOpen(true);
  };

  const selectOption = (option) => {
    onChange(option.value);
    closeMenu();
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (menuRef.current?.contains(event.target)) return;
      if (!containerRef.current?.contains(event.target)) closeMenu();
    };
    const handleScroll = (event) => {
      if (menuRef.current?.contains(event.target)) return;
      closeMenu();
    };
    const handleResize = () => closeMenu();
    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [open, closeMenu]);

  useEffect(() => {
    if (open || !menuPos) return undefined;
    const timer = window.setTimeout(() => setMenuPos(null), 150);
    return () => window.clearTimeout(timer);
  }, [open, menuPos]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  const handleKeyDown = (event) => {
    if (disabled) return;

    if (!open) {
      if (
        event.key === "Enter" ||
        event.key === " " ||
        event.key === "ArrowDown" ||
        event.key === "ArrowUp"
      ) {
        event.preventDefault();
        openMenu(selectedIndex >= 0 ? selectedIndex : event.key === "ArrowUp" ? normalized.length - 1 : 0);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, normalized.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(normalized.length - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const option = normalized[activeIndex] ?? normalized[selectedIndex];
      if (option) selectOption(option);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeMenu();
    } else if (event.key === "Tab") {
      closeMenu();
    }
  };

  const triggerClass = [
    "flex items-center text-text-primary transition-all duration-200",
    TRIGGER_STYLES[variant] || TRIGGER_STYLES.pill,
    open ? "border-primary/40 ring-2 ring-primary/10" : "",
    disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-activedescendant={
          open && activeIndex >= 0 ? `${menuId}-option-${activeIndex}` : undefined
        }
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={handleKeyDown}
        onBlur={(event) => {
          if (!menuRef.current?.contains(event.relatedTarget)) closeMenu();
        }}
        className={triggerClass}
      >
        {icon && (
          <Icon name={icon} className="text-[18px] text-text-secondary" />
        )}
        <span className={`truncate ${selected ? "" : "text-text-muted"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <Icon
          name="expand_more"
          className={`ml-auto text-[17px] text-text-secondary transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {menuPos &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="listbox"
            aria-hidden={!open}
            data-open={open}
            aria-label={ariaLabel}
            className={`select-menu fixed z-[80] overflow-hidden rounded-xl border border-border bg-bg-card p-1 shadow-tooltip ${open ? "animate-select-in" : ""}`}
            style={{
              top: menuPos.top,
              bottom: menuPos.bottom,
              left: menuPos.left,
              width: menuPos.width,
            }}
          >
            <div
              className="overflow-y-auto"
              style={{ maxHeight: menuPos.maxHeight }}
            >
              {normalized.length === 0 ? (
                <div className="px-3.5 py-3 text-center text-body-sm text-text-muted">
                  No options
                </div>
              ) : (
                normalized.map((option, index) => {
                  const isSelected =
                    String(option.value) === String(value);
                  const isActive = index === activeIndex;

                  return (
                    <div
                      key={option.value}
                      ref={(element) => {
                        optionRefs.current[index] = element;
                      }}
                      id={`${menuId}-option-${index}`}
                      role="option"
                      aria-selected={isSelected}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => selectOption(option)}
                      className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-3.5 py-2.5 text-left text-body-md transition-colors ${
                        isSelected
                          ? "bg-brand-50 font-semibold text-primary"
                          : isActive
                            ? "bg-bg-subtle text-text-primary"
                            : "text-text-secondary hover:bg-bg-subtle hover:text-text-primary"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2 truncate">
                        {option.icon && (
                          <Icon
                            name={option.icon}
                            className="text-[17px] text-text-secondary"
                          />
                        )}
                        {option.label}
                      </span>
                      {isSelected && (
                        <Icon name="check" className="text-[17px] text-primary" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
