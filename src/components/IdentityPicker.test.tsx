import { fireEvent, render, screen } from "@testing-library/react";
import { cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IdentityPicker } from "./IdentityPicker";

vi.mock("@/app/actions", () => ({
  setIdentity: vi.fn(),
  updateMyProfile: vi.fn(),
  uploadProfileImage: vi.fn(),
  removeProfileImage: vi.fn(),
}));

const people = [
  {
    id: "mary",
    first: "Mary",
    initial: "M",
    color: "#6b7a8b",
    imageUrl: null,
  },
  {
    id: "willie",
    first: "Willie",
    initial: "W",
    color: "#3a4e48",
    imageUrl: null,
  },
];

describe("IdentityPicker outside interactions", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("closes when a calendar grid pointerdown prevents the follow-up mouse event", () => {
    render(
      <>
        <IdentityPicker people={people} currentId="mary" />
        <div
          data-testid="calendar-cell"
          onPointerDown={(event) => event.preventDefault()}
        />
      </>,
    );

    const trigger = screen.getByRole("button", {
      name: "Edit profile for Mary",
    });

    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    fireEvent.pointerDown(screen.getByTestId("calendar-cell"));

    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });
});
