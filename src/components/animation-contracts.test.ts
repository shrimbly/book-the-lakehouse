import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/app/globals.css", "utf8");
const bookingBars = readFileSync(
  "src/components/calendar/BookingBars.tsx",
  "utf8",
);
const calendar = readFileSync("src/components/Calendar.tsx", "utf8");
const photoSheet = readFileSync("src/components/PhotoSheet.tsx", "utf8");
const avatarPhotoEditor = readFileSync(
  "src/components/AvatarPhotoEditor.tsx",
  "utf8",
);
const monthSwiper = readFileSync("src/components/MonthSwiper.tsx", "utf8");
const overlayPrimitives = readFileSync(
  "src/components/calendar/overlayPrimitives.tsx",
  "utf8",
);

function cssBlock(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return css.match(new RegExp(`${escaped}\\s*{(?<body>[\\s\\S]*?)}`))
    ?.groups?.body ?? "";
}

function keyframes(name: string): string {
  return css.match(new RegExp(`@keyframes ${name}\\s*{(?<body>[\\s\\S]*?)\\n}`))
    ?.groups?.body ?? "";
}

describe("animation contracts", () => {
  it("keeps theme toggle motion on individual transform properties", () => {
    const icon = cssBlock(".theme-toggle-icon");
    const orb = cssBlock(".theme-toggle-orb");

    expect(icon).toContain("translate 620ms");
    expect(icon).toContain("rotate 620ms");
    expect(icon).toContain("scale 620ms");
    expect(icon).toContain("filter 460ms");
    expect(orb).toContain("translate 620ms");
    expect(orb).toContain("scale 620ms");
  });

  it("keeps calendar drag scroll eased instead of snapping", () => {
    expect(cssBlock(".calendar-grid-viewport")).toContain(
      "height 520ms cubic-bezier(0.22, 0.61, 0.36, 1)",
    );
    expect(cssBlock(".calendar-scroll-track")).toContain(
      "transform 640ms cubic-bezier(0.16, 0.84, 0.44, 1)",
    );
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain(".calendar-scroll-track {\n    transition: none;");
  });

  it("keeps month swipe feedback and one-month lockout", () => {
    expect(cssBlock("main.month-gesture-preview")).toContain(
      "translate3d(var(--month-gesture-x, 0), 0, 0)",
    );
    expect(cssBlock("main.month-gesture-preview")).toContain(
      "blur(var(--month-gesture-blur, 0))",
    );
    expect(cssBlock("main.month-gesture-preview")).toContain(
      "transform 280ms cubic-bezier(0.22, 0.61, 0.36, 1)",
    );
    expect(cssBlock("main.month-gesture-preview")).toContain(
      "filter 260ms cubic-bezier(0.22, 0.61, 0.36, 1)",
    );
    expect(cssBlock("main.month-gesture-preview")).toContain(
      "will-change: filter, transform",
    );
    expect(cssBlock("html, body")).toContain("overflow-x: hidden");
    expect(cssBlock("html, body")).toContain("overscroll-behavior-x: none");
    expect(cssBlock("main")).toContain("touch-action: pan-y");
    expect(css).toContain("filter: none;");
    expect(css).toContain("transform: none;");
    expect(monthSwiper).toContain("let monthNavigationLockedUntil = 0");
    expect(monthSwiper).toContain("const MONTH_NAV_LOCK_MS = 1200");
    expect(monthSwiper).toContain('const MONTH_GESTURE_CLASS = "month-gesture-preview"');
    expect(monthSwiper).toContain("const MONTH_GESTURE_TRANSLATE_PX = 14");
    expect(monthSwiper).toContain("const MONTH_GESTURE_BLUR_PX = 0.45");
    expect(monthSwiper).toContain("const MONTH_GESTURE_RELEASE_MS = 300");
    expect(monthSwiper).toContain("const MONTH_GESTURE_RELEASE_HOLD_MS = 100");
    expect(monthSwiper).toContain("const MONTH_GESTURE_PAN_DELAY = 0.24");
    expect(monthSwiper).toContain(
      'const BOOKING_SELECTION_SELECTOR = "[data-booking-selection-active',
    );
    expect(monthSwiper).toContain("function isBookingSelectionActive()");
    expect(monthSwiper).toContain("clamped - MONTH_GESTURE_PAN_DELAY");
    expect(monthSwiper).toContain("const translateProgress = panProgress ** 1.45");
    expect(monthSwiper).toContain("const blurProgress = 1 - (1 - clamped) ** 1.35");
    expect(monthSwiper).toContain('"--month-gesture-x"');
    expect(monthSwiper).toContain('"--month-gesture-blur"');
    expect(monthSwiper).toContain("blocked = shouldIgnoreGestureTarget(e.target)");
    expect(monthSwiper).toContain("|| isBookingSelectionActive()");
    expect(monthSwiper).toContain("if (isBookingSelectionActive())");
    expect(monthSwiper).toContain("if (horizontalIntent) e.preventDefault()");
    expect(monthSwiper).toContain(
      'window.addEventListener("pointermove", onMove, { passive: false })',
    );
    expect(monthSwiper).not.toContain('target?.closest("[data-iso]")');
    expect(monthSwiper).not.toContain("MONTH_GESTURE_SCALE");
    expect(monthSwiper).not.toContain('"--month-gesture-scale"');
    expect(cssBlock("main.month-gesture-preview")).not.toContain("scale3d");
    expect(monthSwiper).toContain("setGesturePreview(1,");
    expect(monthSwiper).toContain("releaseThenNavigate");
    expect(monthSwiper).toContain('main.style.setProperty("--month-gesture-x", "0px")');
    expect(monthSwiper).toContain('main.style.setProperty("--month-gesture-blur", "0px")');
    expect(monthSwiper).toContain("clearGesturePreview()");
    expect(monthSwiper).toContain("isMonthNavigationLocked()");
    expect(monthSwiper).toContain("lockMonthNavigation()");
    expect(monthSwiper).not.toContain("nav=swipe");
    expect(monthSwiper).not.toContain("month-swipe-arriving");
    expect(calendar).toContain(
      'const BOOKING_SELECTION_ATTRIBUTE = "data-booking-selection-active"',
    );
    expect(calendar).toContain(
      'document.documentElement.setAttribute(BOOKING_SELECTION_ATTRIBUTE, "true")',
    );
    expect(calendar).toContain(
      "document.documentElement.removeAttribute(BOOKING_SELECTION_ATTRIBUTE)",
    );
    expect(calendar).toContain("}, [pickStart])");
    expect(css).not.toContain("month-swipe-arriving");
    expect(css).not.toContain("@keyframes month-swipe-arrive");
  });

  it("keeps ribbon and avatar enter/exit keyframes transform based", () => {
    expect(keyframes("ribbon-grow")).toContain("scaleX(0)");
    expect(keyframes("ribbon-grow")).toContain("scaleX(1)");
    expect(keyframes("ribbon-shrink")).toContain("clip-path");
    expect(keyframes("ribbon-close")).toContain("width: 0");
    expect(keyframes("ribbon-cover")).toContain("width: 100%");
    expect(keyframes("avatar-pop")).toContain("scale(0.82)");
    expect(keyframes("avatar-shrink")).toContain("scale(0.78)");
  });

  it("keeps dark overlay ribbons brighter under booking washes", () => {
    expect(css).toContain(':root[data-theme="dark"]:has(.selection-backdrop)');
    expect(css).toContain(
      ":root:not([data-theme]):has(.selection-backdrop)",
    );
    expect(css).toContain("--theme-ribbon-fill-color: 58%");
    expect(css).toContain("--theme-ribbon-fill-paper: 42%");
    expect(css).toContain("--theme-ribbon-muted-fill-color: 46%");
    expect(css).toContain("--theme-ribbon-label-ink: 70%");
    expect(css).toContain("--theme-ribbon-muted-label-muted: 74%");
  });

  it("keeps preview ribbons animating width and position", () => {
    const previewFill = cssBlock(".preview-ribbon-fill");

    expect(previewFill).toContain(
      "left 220ms cubic-bezier(0.32, 0.72, 0.4, 1)",
    );
    expect(previewFill).toContain(
      "width 220ms cubic-bezier(0.32, 0.72, 0.4, 1)",
    );
    expect(css).toContain("@starting-style");
    expect(css).toContain(".preview-ribbon-fill { width: 0; }");
  });

  it("keeps overlay enter and exit animations paired", () => {
    expect(css).toContain("--animate-selection-panel-in: selection-panel-in 420ms");
    expect(css).toContain("--animate-selection-panel-out: selection-panel-out 240ms");
    expect(css).toContain(
      "--animate-selection-backdrop-in: selection-backdrop-in 320ms",
    );
    expect(css).toContain(
      "--animate-selection-backdrop-out: selection-backdrop-out 240ms",
    );
    expect(cssBlock(".selection-panel")).toContain(
      "opacity 420ms cubic-bezier(0.16, 0.84, 0.44, 1)",
    );
    expect(cssBlock(".selection-panel")).toContain(
      "filter 420ms cubic-bezier(0.16, 0.84, 0.44, 1)",
    );
    expect(cssBlock(".selection-panel")).toContain(
      "transform 420ms cubic-bezier(0.16, 0.84, 0.44, 1)",
    );
    expect(cssBlock(".selection-panel")).toContain(
      "will-change: opacity, transform, filter",
    );
    expect(cssBlock(".selection-panel.is-closing")).toContain(
      "transition-duration: 240ms",
    );
    expect(cssBlock(".selection-backdrop")).toContain(
      "transition: opacity 320ms cubic-bezier(0.16, 0.84, 0.44, 1)",
    );
    expect(cssBlock(".selection-backdrop")).toContain("will-change: opacity");
    expect(cssBlock(".selection-backdrop.is-closing")).toContain(
      "transition-duration: 240ms",
    );
    expect(keyframes("selection-panel-in")).toContain("translateY(32px) scale(0.965)");
    expect(keyframes("selection-panel-in")).toContain("filter: blur(8px)");
    expect(keyframes("selection-panel-out")).toContain("translateY(28px) scale(0.975)");
    expect(keyframes("selection-backdrop-in")).toContain("opacity: 0");
    expect(keyframes("selection-backdrop-out")).toContain("opacity: 0");
    expect(overlayPrimitives).toContain("function useStagedPresence");
    expect(overlayPrimitives).toContain("window.requestAnimationFrame");
    expect(overlayPrimitives).toContain("secondFrame = window.requestAnimationFrame");
    expect(overlayPrimitives).toContain("opacity: isClosing || !isVisible ? 0 : 1");
    expect(overlayPrimitives).toContain('filter: isHidden ? "blur(8px)" : "blur(0)"');
    expect(overlayPrimitives).toContain("const EXIT_ANIMATION_MS = 260");
    expect(overlayPrimitives).toContain("translate3d(0, 28px, 0) scale(0.975)");
    expect(overlayPrimitives).toContain("selection-backdrop fixed inset-0");
    expect(overlayPrimitives).toContain("selection-panel pointer-events-none");
    expect(overlayPrimitives).toContain('isClosing ? "is-closing" : ""');
    expect(bookingBars).toContain("onClick={() => closeWith(onEdit)}");
    expect(bookingBars).not.toContain("confirm-picking");
    expect(bookingBars).not.toContain("key={motionKey}");
    expect(bookingBars).toContain("<BottomOverlayShell isClosing={isClosing}>");
    expect(bookingBars).toContain("booking-confirm-card");
    expect(bookingBars).toContain("booking-confirm-meta-layer");
    expect(bookingBars).toContain("locked ? \"is-visible\" : \"is-hidden\"");
    expect(cssBlock(".booking-confirm-card")).toContain(
      "height 520ms cubic-bezier(0.16, 0.84, 0.44, 1)",
    );
    expect(cssBlock(".booking-confirm-card")).toContain(
      "transform 520ms cubic-bezier(0.16, 0.84, 0.44, 1)",
    );
    expect(cssBlock(".booking-confirm-card.is-locked")).toContain(
      "translateY(-0.75rem) scale(1.035)",
    );
    expect(cssBlock(".booking-confirm-meta-layer")).toContain(
      "opacity 320ms cubic-bezier(0.16, 0.84, 0.44, 1)",
    );
    expect(cssBlock(".booking-confirm-meta-layer")).toContain(
      "filter 320ms cubic-bezier(0.16, 0.84, 0.44, 1)",
    );
    expect(cssBlock(".booking-confirm-meta-layer")).toContain(
      "transform 320ms cubic-bezier(0.16, 0.84, 0.44, 1)",
    );
    expect(cssBlock(".booking-confirm-meta-layer.is-hidden")).toContain(
      "filter: blur(5px)",
    );
    expect(bookingBars).toContain("booking-payment-content");
    expect(bookingBars).toContain("const showPaymentDetails = paymentMode && !!payment");
    expect(bookingBars).toContain("const shouldMorphToPayment =");
    expect(bookingBars).toContain("function handleConfirm()");
    expect(bookingBars).toContain("if (shouldMorphToPayment)");
    expect(bookingBars).toContain("onConfirm();");
    expect(bookingBars).toContain('"--booking-flow-height"');
    expect(calendar).toContain(
      "const canShowPaymentReview = paymentReview != null && paymentConfig != null",
    );
    expect(calendar).toContain("if (paymentReview && !paymentConfig)");
    expect(calendar).toContain("paymentMode={canShowPaymentReview}");
    expect(cssBlock(".booking-confirm-card.is-payment")).toContain(
      "translateY(-0.75rem) scale(1)",
    );
    expect(keyframes("booking-payment-content-in")).toContain("filter: blur(8px)");
    expect(bookingBars).toContain("booking-action-card");
    expect(bookingBars).toContain("booking-action-layer");
    expect(cssBlock(".booking-action-card")).toContain(
      "height 420ms cubic-bezier(0.16, 0.84, 0.44, 1)",
    );
    expect(cssBlock(".booking-action-card.is-deleting")).toContain(
      "translateY(-0.25rem) scale(1.015)",
    );
  });

  it("keeps fullscreen image overlays blurred, scaled, and theme washed", () => {
    for (const source of [photoSheet, avatarPhotoEditor]) {
      expect(source).toContain("themed-overlay-wash fixed inset-0");
      expect(source).toContain("blur(4px)");
      expect(source).toContain("backdrop-filter 260ms");
      expect(source).toContain("opacity 260ms");
    }

    expect(photoSheet).toContain("scale3d(0.97, 0.97, 1)");
    expect(photoSheet).toContain(
      "transform 420ms cubic-bezier(0.16, 0.84, 0.44, 1)",
    );
    expect(photoSheet).not.toContain("rgba(250, 248, 244");
    expect(photoSheet).not.toContain("bg-ink/45");
    expect(avatarPhotoEditor).not.toContain("color-mix(in srgb, var(--color-paper) 32%");
  });

  it("keeps edit booking expansion mounted closed before opening", () => {
    expect(bookingBars).toContain("const EDIT_EXPANSION_DELAY_MS = 260");
    expect(bookingBars).toContain("const [editing, setEditing] = useState(false)");
    expect(bookingBars).toContain("window.setTimeout");
    expect(bookingBars).toContain("EDIT_EXPANSION_DELAY_MS");
    expect(bookingBars).toContain("window.requestAnimationFrame");
    expect(bookingBars).toContain("secondFrame = window.requestAnimationFrame");
    expect(bookingBars).toContain("setEditing(true)");
    expect(bookingBars).toContain("window.clearTimeout(timer)");
    expect(bookingBars).toContain("function EditControlsPanel");
    expect(bookingBars).toContain("measuredPanel.style.setProperty");
    expect(bookingBars).toContain('"--edit-panel-height"');
    expect(bookingBars).toContain("`${measuredContent.scrollHeight}px`");
    expect(bookingBars).toContain("new ResizeObserver(measure)");
    expect(bookingBars).toContain("booking-edit-panel");
    expect(bookingBars).toContain('editing ? "is-open" : ""');
    expect(bookingBars).toContain("booking-edit-content");
    expect(cssBlock(".booking-edit-panel")).toContain(
      "transition: height 640ms cubic-bezier(0.22, 0.61, 0.36, 1)",
    );
    expect(cssBlock(".booking-edit-panel")).toContain("will-change: height");
    expect(cssBlock(".booking-edit-panel.is-open")).toContain(
      "height: var(--edit-panel-height, 0px)",
    );
    expect(cssBlock(".booking-edit-content")).toContain("opacity: 0");
    expect(cssBlock(".booking-edit-content")).toContain("filter: blur(4px)");
    expect(cssBlock(".booking-edit-content")).toContain("transform: translateY(-6px)");
    expect(cssBlock(".booking-edit-content")).toContain(
      "opacity 360ms cubic-bezier(0.22, 0.61, 0.36, 1)",
    );
    expect(cssBlock(".booking-edit-content")).toContain(
      "filter 360ms cubic-bezier(0.22, 0.61, 0.36, 1)",
    );
    expect(cssBlock(".booking-edit-content")).toContain(
      "transform 360ms cubic-bezier(0.22, 0.61, 0.36, 1)",
    );
    expect(cssBlock(".booking-edit-content")).toContain("transition-delay: 90ms");
    expect(cssBlock(".booking-edit-panel.is-open .booking-edit-content")).toContain(
      "opacity: 1",
    );
    expect(cssBlock(".booking-edit-panel.is-open .booking-edit-content")).toContain(
      "filter: blur(0)",
    );
    expect(cssBlock(".booking-edit-panel.is-open .booking-edit-content")).toContain(
      "transform: translateY(0)",
    );
    expect(bookingBars).not.toContain("transition-[grid-template-rows]");
  });

  it("keeps the global theme transition low-specificity", () => {
    expect(css).toContain(":where(:root.theme-ready) :where(*, *::before, *::after)");
    expect(css).toContain("transition-property:");
    expect(css).toContain("background-color");
    expect(css).toContain("border-color");
    expect(css).toContain("box-shadow");
  });
});
