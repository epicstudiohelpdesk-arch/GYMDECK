import React, {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Check, ChevronDown, Search, X } from "lucide-react";

export const cx = (...values) => values.filter(Boolean).join(" ");

/* ------------------------------------------------------------------ *
 * Buttons
 * ------------------------------------------------------------------ */

const BUTTON_BASE =
  "inline-flex select-none items-center justify-center gap-1.5 rounded-xl font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50";

const BUTTON_VARIANTS = {
  primary:
    "bg-orange-500 text-white shadow-sm hover:bg-orange-600 active:bg-orange-700",
  secondary:
    "border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100",
  subtle:
    "border border-transparent bg-slate-100 text-slate-700 hover:bg-slate-200/80",
  ghost:
    "border border-transparent bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  danger:
    "border border-transparent bg-rose-50 text-rose-700 hover:bg-rose-100",
  "danger-solid":
    "bg-rose-600 text-white shadow-sm hover:bg-rose-700 active:bg-rose-800",
  emerald:
    "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800",
};

const BUTTON_SIZES = {
  xs: "h-7 px-2 text-[11px]",
  sm: "h-8 px-2.5 text-[11.5px]",
  md: "h-9 px-3.5 text-[12px]",
  lg: "h-10 px-4 text-[12.5px]",
};

export const Button = ({
  as: Tag = "button",
  variant = "secondary",
  size = "md",
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  iconSize,
  className,
  children,
  type = "button",
  ...props
}) => {
  const glyph = iconSize || (size === "xs" || size === "sm" ? 13 : 15);
  return (
    <Tag
      type={Tag === "button" ? type : undefined}
      className={cx(BUTTON_BASE, BUTTON_SIZES[size] || BUTTON_SIZES.md, BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.secondary, className)}
      {...props}
    >
      {LeftIcon ? <LeftIcon size={glyph} strokeWidth={2.2} aria-hidden="true" /> : null}
      {children}
      {RightIcon ? <RightIcon size={glyph} strokeWidth={2.2} aria-hidden="true" /> : null}
    </Tag>
  );
};

export const IconButton = ({
  label,
  icon: Icon,
  variant = "ghost",
  size = "md",
  className,
  ...props
}) => {
  const dimensions = size === "sm" ? "h-7 w-7" : size === "lg" ? "h-10 w-10" : "h-8 w-8";
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40",
        dimensions,
        BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.ghost,
        className
      )}
      {...props}
    >
      <Icon size={size === "sm" ? 14 : 16} strokeWidth={2.1} aria-hidden="true" />
    </button>
  );
};

/* ------------------------------------------------------------------ *
 * Badges / chips
 * ------------------------------------------------------------------ */

const BADGE_TONES = {
  slate: "border-slate-200 bg-slate-50 text-slate-600",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  rose: "border-rose-200 bg-rose-50 text-rose-700",
  orange: "border-orange-200 bg-orange-50 text-orange-700",
  sky: "border-sky-200 bg-sky-50 text-sky-700",
  violet: "border-violet-200 bg-violet-50 text-violet-700",
};

const DOT_TONES = {
  slate: "bg-slate-400",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  orange: "bg-orange-500",
  sky: "bg-sky-500",
  violet: "bg-violet-500",
};

export const Badge = ({ tone = "slate", dot = false, className, children }) => (
  <span
    className={cx(
      "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold leading-4 whitespace-nowrap",
      BADGE_TONES[tone] || BADGE_TONES.slate,
      className
    )}
  >
    {dot ? <span className={cx("h-1.5 w-1.5 rounded-full", DOT_TONES[tone] || DOT_TONES.slate)} /> : null}
    {children}
  </span>
);

/* ------------------------------------------------------------------ *
 * Cards
 * ------------------------------------------------------------------ */

export const Card = ({ className, children, ...props }) => (
  <div
    className={cx("rounded-2xl border border-slate-200/80 bg-white shadow-sm", className)}
    {...props}
  >
    {children}
  </div>
);

export const SectionHeading = ({ icon: Icon, title, description, aside, className }) => (
  <div className={cx("flex items-start justify-between gap-3", className)}>
    <div className="flex items-start gap-2.5">
      {Icon ? (
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
          <Icon size={14} strokeWidth={2.1} aria-hidden="true" />
        </span>
      ) : null}
      <div>
        <h3 className="text-[12px] font-bold leading-5 text-slate-800">{title}</h3>
        {description ? (
          <p className="mt-0.5 text-[11px] leading-4 text-slate-400">{description}</p>
        ) : null}
      </div>
    </div>
    {aside}
  </div>
);

/* ------------------------------------------------------------------ *
 * Tabs / segmented controls
 * ------------------------------------------------------------------ */

export const Tabs = ({ items = [], value, onChange, className, ariaLabel = "Sections" }) => (
  <div
    role="tablist"
    aria-label={ariaLabel}
    className={cx("flex items-center gap-1 overflow-x-auto", className)}
  >
    {items.map((item) => {
      const active = item.key === value;
      return (
        <button
          key={item.key}
          type="button"
          role="tab"
          aria-selected={active}
          onClick={() => onChange?.(item.key)}
          className={cx(
            "relative inline-flex shrink-0 items-center gap-2 whitespace-nowrap px-3 py-3 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30 rounded-t-lg",
            active ? "text-orange-600" : "text-slate-500 hover:text-slate-800"
          )}
        >
          {item.icon ? <item.icon size={14} strokeWidth={2.1} aria-hidden="true" /> : null}
          {item.label}
          {typeof item.count === "number" ? (
            <span
              className={cx(
                "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-3 tabular-nums",
                active ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-500"
              )}
            >
              {item.count}
            </span>
          ) : null}
          <span
            className={cx(
              "absolute inset-x-2 -bottom-px h-0.5 rounded-full transition-colors",
              active ? "bg-orange-500" : "bg-transparent"
            )}
          />
        </button>
      );
    })}
  </div>
);

export const Segmented = ({ value, onChange, options = [], ariaLabel, className }) => (
  <div
    role="group"
    aria-label={ariaLabel}
    className={cx("inline-flex items-center gap-0.5 rounded-xl border border-slate-200 bg-slate-50 p-0.5", className)}
  >
    {options.map((option) => {
      const active = option.value === value;
      return (
        <button
          key={option.value}
          type="button"
          aria-pressed={active}
          aria-label={option.ariaLabel}
          title={option.label}
          onClick={() => onChange?.(option.value)}
          className={cx(
            "inline-flex h-7 items-center gap-1.5 rounded-[9px] px-2 text-[11.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30",
            active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          {option.icon ? <option.icon size={13} strokeWidth={2.1} aria-hidden="true" /> : null}
          {option.showLabel === false ? null : option.label}
        </button>
      );
    })}
  </div>
);

/* ------------------------------------------------------------------ *
 * Form fields
 * ------------------------------------------------------------------ */

const CONTROL_BASE =
  "w-full rounded-xl border bg-white px-3 text-[12.5px] text-slate-800 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 disabled:bg-slate-100 disabled:text-slate-500";

export const FieldLabel = ({ htmlFor, required, children }) => (
  <label
    htmlFor={htmlFor}
    className="mb-1.5 flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-[0.07em] text-slate-500"
  >
    {children}
    {required ? <span className="text-orange-500">*</span> : null}
  </label>
);

export const FieldHint = ({ id, tone = "muted", children }) => (
  <p
    id={id}
    className={cx(
      "mt-1.5 text-[11px] leading-4",
      tone === "error" ? "font-medium text-rose-600" : "text-slate-400"
    )}
  >
    {children}
  </p>
);

export const TextField = ({
  label,
  hint,
  error,
  required,
  id: providedId,
  className,
  inputClassName,
  ...props
}) => {
  const generatedId = useId();
  const id = providedId || generatedId;
  const describedBy = error || hint ? `${id}-help` : undefined;
  return (
    <div className={className}>
      {label ? <FieldLabel htmlFor={id} required={required}>{label}</FieldLabel> : null}
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cx(CONTROL_BASE, "h-10", error ? "border-rose-300 focus:border-rose-400 focus:ring-rose-500/10" : "border-slate-200", inputClassName)}
        {...props}
      />
      {error || hint ? <FieldHint id={describedBy} tone={error ? "error" : "muted"}>{error || hint}</FieldHint> : null}
    </div>
  );
};

export const TextAreaField = ({
  label,
  hint,
  error,
  required,
  id: providedId,
  className,
  inputClassName,
  rows = 3,
  ...props
}) => {
  const generatedId = useId();
  const id = providedId || generatedId;
  const describedBy = error || hint ? `${id}-help` : undefined;
  return (
    <div className={className}>
      {label ? <FieldLabel htmlFor={id} required={required}>{label}</FieldLabel> : null}
      <textarea
        id={id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cx(CONTROL_BASE, "py-2.5 leading-5", error ? "border-rose-300 focus:border-rose-400 focus:ring-rose-500/10" : "border-slate-200", inputClassName)}
        {...props}
      />
      {error || hint ? <FieldHint id={describedBy} tone={error ? "error" : "muted"}>{error || hint}</FieldHint> : null}
    </div>
  );
};

export const SearchField = ({
  value,
  onChange,
  placeholder = "Search…",
  ariaLabel = "Search",
  className,
}) => (
  <div className={cx("relative", className)}>
    <Search
      size={15}
      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
      aria-hidden="true"
    />
    <input
      type="search"
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className={cx(
        CONTROL_BASE,
        "h-9 border-slate-200 pl-9 pr-8 [&::-webkit-search-cancel-button]:hidden"
      )}
    />
    {value ? (
      <button
        type="button"
        onClick={() => onChange?.("")}
        aria-label="Clear search"
        className="absolute right-2 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
      >
        <X size={12} strokeWidth={2.4} aria-hidden="true" />
      </button>
    ) : null}
  </div>
);

/* ------------------------------------------------------------------ *
 * Custom dropdown (listbox) — portal mounted so it is never clipped
 * ------------------------------------------------------------------ */

const DROPDOWN_SIZES = {
  sm: "h-8 pl-2.5 pr-2 text-[11.5px]",
  md: "h-9 pl-3 pr-2 text-[12px]",
  lg: "h-10 pl-3 pr-2.5 text-[12.5px]",
};

export const Dropdown = ({
  value,
  onChange,
  options = [],
  placeholder = "Select",
  id: providedId,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  disabled = false,
  size = "md",
  className,
  leadingIcon: LeadingIcon,
  menuMinWidth = 200,
  invalid = false,
}) => {
  const generatedId = useId();
  const triggerId = providedId || generatedId;
  const listId = `${triggerId}-list`;
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [menuStyle, setMenuStyle] = useState(null);

  const normalized = useMemo(
    () =>
      options.map((option) =>
        typeof option === "string" ? { value: option, label: option } : option
      ),
    [options]
  );

  const selectedIndex = normalized.findIndex((option) => option.value === value);
  const selected = selectedIndex >= 0 ? normalized[selectedIndex] : null;

  const computePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.max(rect.width, menuMinWidth);
    const openUp = window.innerHeight - rect.bottom < 260 && rect.top > 260;
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
    setMenuStyle({
      position: "fixed",
      left,
      width,
      top: openUp ? undefined : rect.bottom + 6,
      bottom: openUp ? window.innerHeight - rect.top + 6 : undefined,
      zIndex: 10000,
    });
  }, [menuMinWidth]);

  useLayoutEffect(() => {
    if (!open) return;
    computePosition();
    const frame = requestAnimationFrame(computePosition);
    return () => cancelAnimationFrame(frame);
  }, [open, computePosition]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event) => {
      if (triggerRef.current?.contains(event.target)) return;
      if (menuRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const onViewportChange = () => computePosition();
    document.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [open, computePosition]);

  const openMenu = () => {
    if (disabled) return;
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  };

  const close = (returnFocus = false) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  };

  const commit = (index) => {
    const option = normalized[index];
    if (!option) return;
    onChange?.(option.value);
    close(true);
  };

  const onTriggerKeyDown = (event) => {
    if (disabled) return;
    const { key } = event;
    if (!open) {
      if (key === "ArrowDown" || key === "ArrowUp" || key === "Enter" || key === " ") {
        event.preventDefault();
        openMenu();
      }
      return;
    }
    if (key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(normalized.length - 1, index + 1));
    } else if (key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(0, index - 1));
    } else if (key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (key === "End") {
      event.preventDefault();
      setActiveIndex(normalized.length - 1);
    } else if (key === "Enter" || key === " ") {
      event.preventDefault();
      commit(activeIndex);
    } else if (key === "Escape") {
      event.preventDefault();
      close(true);
    } else if (key === "Tab") {
      close();
    }
  };

  const triggerClasses = cx(
    "inline-flex w-full items-center justify-between gap-2 rounded-xl border bg-white font-semibold text-slate-700 shadow-sm outline-none transition-colors focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400",
    DROPDOWN_SIZES[size] || DROPDOWN_SIZES.md,
    invalid ? "border-rose-300" : "border-slate-200 hover:border-slate-300",
    className
  );

  const menu =
    open && menuStyle
      ? createPortal(
          <div
            ref={menuRef}
            id={listId}
            role="listbox"
            aria-labelledby={triggerId}
            style={menuStyle}
            onKeyDown={onTriggerKeyDown}
            className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl inventory-anim-pop"
          >
            {normalized.length === 0 ? (
              <p className="px-3 py-2.5 text-[11.5px] text-slate-400">No options available</p>
            ) : (
              normalized.map((option, index) => {
                const isSelected = option.value === value;
                const isActive = index === activeIndex;
                return (
                  <button
                    key={`${option.value}-${index}`}
                    id={`${listId}-${index}`}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={-1}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => commit(index)}
                    className={cx(
                      "flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-colors",
                      isActive ? "bg-slate-100" : "bg-transparent"
                    )}
                  >
                    {option.icon ? (
                      <option.icon size={14} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
                    ) : null}
                    <span className="min-w-0 flex-1">
                      <span className={cx("block truncate text-[12px] font-semibold", isSelected ? "text-orange-700" : "text-slate-700")}>
                        {option.label}
                      </span>
                      {option.description ? (
                        <span className="mt-0.5 block truncate text-[10.5px] font-medium text-slate-400">
                          {option.description}
                        </span>
                      ) : null}
                    </span>
                    {isSelected ? (
                      <Check size={13} className="mt-0.5 shrink-0 text-orange-600" aria-hidden="true" />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        aria-activedescendant={open && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        disabled={disabled}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onTriggerKeyDown}
        className={triggerClasses}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {LeadingIcon ? <LeadingIcon size={13} className="shrink-0 text-slate-400" aria-hidden="true" /> : null}
          <span className={cx("truncate", selected ? "text-slate-700" : "font-medium text-slate-400")}>
            {selected ? selected.label : placeholder}
          </span>
        </span>
        <ChevronDown
          size={14}
          className={cx("shrink-0 text-slate-400 transition-transform duration-150", open ? "rotate-180" : "")}
          aria-hidden="true"
        />
      </button>
      {menu}
    </>
  );
};

export const DropdownField = ({
  label,
  hint,
  error,
  required,
  id: providedId,
  className,
  ...props
}) => {
  const generatedId = useId();
  const id = providedId || generatedId;
  const describedBy = error || hint ? `${id}-help` : undefined;
  return (
    <div className={className}>
      {label ? <FieldLabel htmlFor={id} required={required}>{label}</FieldLabel> : null}
      <Dropdown id={id} ariaDescribedBy={describedBy} invalid={Boolean(error)} {...props} />
      {error || hint ? <FieldHint id={describedBy} tone={error ? "error" : "muted"}>{error || hint}</FieldHint> : null}
    </div>
  );
};

export const Switch = ({ checked, onChange, label, description, id: providedId, disabled }) => {
  const generatedId = useId();
  const id = providedId || generatedId;
  return (
    <div
      className={cx(
        "flex items-start justify-between gap-3 rounded-xl border p-3 transition-colors",
        checked ? "border-orange-200 bg-orange-50/40" : "border-slate-200 bg-white",
        disabled ? "opacity-60" : ""
      )}
    >
      <div className="min-w-0">
        <label htmlFor={id} className="block cursor-pointer text-[12px] font-semibold text-slate-800">
          {label}
        </label>
        {description ? (
          <p className="mt-0.5 text-[11px] leading-4 text-slate-400">{description}</p>
        ) : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={cx(
          "relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 focus-visible:ring-offset-2",
          checked ? "bg-orange-500" : "bg-slate-300"
        )}
      >
        <span
          className={cx(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-[18px]" : "translate-x-0.5"
          )}
        />
      </button>
    </div>
  );
};

/* ------------------------------------------------------------------ *
 * Dialog shells (modal + drawer)
 * ------------------------------------------------------------------ */

let bodyLocks = 0;

const useDialog = (isOpen, onClose) => {
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return undefined;
    const previous = document.activeElement;
    bodyLocks += 1;
    document.body.style.overflow = "hidden";

    const focusables = () =>
      Array.from(
        panelRef.current?.querySelectorAll(
          'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
        ) || []
      ).filter((element) => element.offsetParent !== null);

    const frame = requestAnimationFrame(() => {
      const [first] = focusables();
      (first || panelRef.current)?.focus({ preventScroll: true });
    });

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        panelRef.current?.focus();
        return;
      }
      const firstElement = items[0];
      const lastElement = items[items.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      bodyLocks = Math.max(0, bodyLocks - 1);
      if (bodyLocks === 0) document.body.style.overflow = "";
      previous?.focus?.({ preventScroll: true });
    };
  }, [isOpen]);

  return panelRef;
};

const DialogHeader = ({ icon: Icon, title, description, titleId, onClose }) => (
  <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
    <div className="flex min-w-0 items-start gap-3">
      {Icon ? (
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-600">
          <Icon size={17} strokeWidth={2.1} aria-hidden="true" />
        </span>
      ) : null}
      <div className="min-w-0">
        <h2 id={titleId} className="truncate text-[14px] font-bold tracking-tight text-slate-900">
          {title}
        </h2>
        {description ? (
          <p className="mt-0.5 text-[11.5px] leading-5 text-slate-500">{description}</p>
        ) : null}
      </div>
    </div>
    <IconButton label="Close dialog" icon={X} onClick={onClose} />
  </div>
);

const MODAL_SIZES = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
};

export const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  icon,
  size = "lg",
  footer,
  children,
  bodyClassName,
}) => {
  const titleId = useId();
  const panelRef = useDialog(isOpen, onClose);
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9000] flex items-end justify-center sm:items-center sm:p-6">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm inventory-anim-fade"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cx(
          "relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl outline-none sm:rounded-2xl inventory-anim-pop",
          MODAL_SIZES[size] || MODAL_SIZES.lg
        )}
      >
        <DialogHeader icon={icon} title={title} description={description} titleId={titleId} onClose={onClose} />
        <div className={cx("min-h-0 flex-1 overflow-y-auto px-5 py-5", bodyClassName)}>{children}</div>
        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
};

const DRAWER_SIZES = {
  sm: "sm:max-w-md",
  md: "sm:max-w-xl",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-3xl",
};

export const Drawer = ({
  isOpen,
  onClose,
  title,
  description,
  icon,
  size = "lg",
  footer,
  children,
  bodyClassName,
}) => {
  const titleId = useId();
  const panelRef = useDialog(isOpen, onClose);
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9000] flex justify-end">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm inventory-anim-fade"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cx(
          "relative flex h-full w-full flex-col overflow-hidden bg-slate-50 shadow-2xl outline-none inventory-anim-slide",
          DRAWER_SIZES[size] || DRAWER_SIZES.lg
        )}
      >
        <div className="border-b border-slate-200/80 bg-white">
          <DialogHeader icon={icon} title={title} description={description} titleId={titleId} onClose={onClose} />
        </div>
        <div className={cx("min-h-0 flex-1 overflow-y-auto p-4 sm:p-5", bodyClassName)}>{children}</div>
        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200/80 bg-white px-4 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
};

/* ------------------------------------------------------------------ *
 * Misc
 * ------------------------------------------------------------------ */

export const InlineAlert = ({ tone = "rose", icon: Icon = AlertCircle, title, children, action, className }) => {
  const tones = {
    rose: "border-rose-200 bg-rose-50 text-rose-800",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    sky: "border-sky-200 bg-sky-50 text-sky-800",
  };
  return (
    <div className={cx("flex items-start gap-2.5 rounded-xl border p-3 text-[11.5px] leading-5", tones[tone] || tones.rose, className)}>
      <Icon size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-bold">{title}</p> : null}
        <div className={title ? "mt-0.5" : ""}>{children}</div>
      </div>
      {action}
    </div>
  );
};

export const EmptyState = ({ icon: Icon, title, description, action, className }) => (
  <div
    className={cx(
      "flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center",
      className
    )}
  >
    {Icon ? (
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-50 text-orange-500">
        <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
      </span>
    ) : null}
    <h3 className="mt-4 text-[13.5px] font-bold text-slate-900">{title}</h3>
    {description ? (
      <p className="mt-1 max-w-sm text-[11.5px] leading-5 text-slate-500">{description}</p>
    ) : null}
    {action ? <div className="mt-4">{action}</div> : null}
  </div>
);

export const StatCard = ({ label, value, hint, icon: Icon, tone = "slate", badge }) => {
  const tones = {
    slate: "border-slate-200 bg-slate-50 text-slate-500",
    orange: "border-orange-100 bg-orange-50 text-orange-500",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-600",
    amber: "border-amber-100 bg-amber-50 text-amber-600",
    rose: "border-rose-100 bg-rose-50 text-rose-600",
  };
  const alert = (tone === "amber" || tone === "rose") && Number(value) > 0;
  return (
    <div
      className={cx(
        "rounded-2xl border bg-white p-4 shadow-sm",
        alert ? (tone === "rose" ? "border-rose-200" : "border-amber-200") : "border-slate-200/80"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-slate-500">{label}</p>
        {Icon ? (
          <span className={cx("grid h-7 w-7 shrink-0 place-items-center rounded-lg border", tones[tone] || tones.slate)}>
            <Icon size={14} strokeWidth={2.1} aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <div className="mt-2.5 flex items-baseline gap-2">
        <span className="text-[26px] font-extrabold leading-none tracking-tight text-slate-900 tabular-nums">
          {value}
        </span>
        {badge ? <Badge tone={tone}>{badge}</Badge> : null}
      </div>
      {hint ? <p className="mt-1.5 text-[11px] font-medium leading-4 text-slate-400">{hint}</p> : null}
    </div>
  );
};

export const SkeletonBlock = ({ className }) => (
  <div className={cx("animate-pulse rounded-xl bg-slate-200/70", className)} />
);
