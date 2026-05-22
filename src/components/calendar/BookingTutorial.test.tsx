import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildMonthCells } from "@/lib/calendar";
import {
  BOOKING_TUTORIAL_OPEN_EVENT,
  BOOKING_TUTORIAL_STORAGE_KEY,
} from "@/lib/booking-tutorial";
import type { Person } from "@/lib/data";
import { BookingTutorial } from "./BookingTutorial";

const me: Person = {
  id: "james",
  first: "James",
  initial: "J",
  color: "#3a4e48",
  imageUrl: null,
};

const cells = buildMonthCells(2026, 4, [], [me], "2026-05-01");

class ResizeObserverStub {
  observe() {}
  disconnect() {}
}

describe("BookingTutorial", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("opens on first load and marks the tutorial seen when skipped", () => {
    const onVisualChange = vi.fn();
    render(
      <BookingTutorial cells={cells} me={me} onVisualChange={onVisualChange} />,
    );

    expect(screen.queryByText("How to book your stay")).toBeNull();

    act(() => vi.advanceTimersByTime(700));

    expect(screen.getByText("How to book your stay")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Skip" }));

    expect(window.localStorage.getItem(BOOKING_TUTORIAL_STORAGE_KEY)).toBe("1");
    expect(document.querySelector(".booking-tutorial-card.is-closing")).toBeTruthy();

    act(() => vi.advanceTimersByTime(260));

    expect(screen.queryByText("How to book your stay")).toBeNull();
  });

  it("does not auto-open after the browser has seen it", () => {
    window.localStorage.setItem(BOOKING_TUTORIAL_STORAGE_KEY, "1");

    render(
      <BookingTutorial cells={cells} me={me} onVisualChange={() => undefined} />,
    );

    act(() => vi.advanceTimersByTime(1000));

    expect(screen.queryByText("How to book your stay")).toBeNull();
  });

  it("replays from the browser event even after it has been seen", () => {
    window.localStorage.setItem(BOOKING_TUTORIAL_STORAGE_KEY, "1");

    render(
      <BookingTutorial cells={cells} me={me} onVisualChange={() => undefined} />,
    );

    act(() => {
      window.dispatchEvent(new Event(BOOKING_TUTORIAL_OPEN_EVENT));
    });

    expect(screen.getByText("How to book your stay")).toBeTruthy();
  });

  it("renders scripted demo visuals and writes seen when finished", () => {
    const onVisualChange = vi.fn();
    render(
      <BookingTutorial cells={cells} me={me} onVisualChange={onVisualChange} />,
    );

    act(() => vi.advanceTimersByTime(700));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText("Tap your first day")).toBeTruthy();
    expect(onVisualChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        previewRows: expect.any(Array),
        pointer: expect.objectContaining({ motion: "tap" }),
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText("Or press and drag")).toBeTruthy();
    expect(onVisualChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        previewRows: expect.any(Array),
        pointer: expect.objectContaining({
          gridColumnEnd: expect.any(Number),
          motion: "drag",
        }),
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText("Edit an existing booking")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();
    expect(
      document.querySelector("[data-booking-tutorial-edit-pointer]"),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    act(() => vi.advanceTimersByTime(1150));
    expect(screen.getByRole("button", { name: "Delete" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(window.localStorage.getItem(BOOKING_TUTORIAL_STORAGE_KEY)).toBe("1");
    expect(document.querySelector(".booking-tutorial-card.is-closing")).toBeTruthy();
  });
});
