import { describe, expect, it } from "vitest";
import {
  calculateProfileCropSource,
  calculateProfilePreviewFrame,
} from "./image";

describe("profile image crop geometry", () => {
  it("keeps preview and saved crop centered on the same source rectangle", () => {
    const crop = { zoom: 1.8, x: 0.45, y: -0.3 };
    const source = calculateProfileCropSource(1200, 800, crop);
    const preview = calculateProfilePreviewFrame(1200, 800, crop);

    expect(preview.leftPercent).toBeCloseTo(-(source.sx / source.side) * 100);
    expect(preview.topPercent).toBeCloseTo(-(source.sy / source.side) * 100);
    expect(preview.widthPercent).toBeCloseTo((1200 / source.side) * 100);
    expect(preview.heightPercent).toBeCloseTo((800 / source.side) * 100);
  });

  it("preserves the original image aspect ratio while zooming the preview", () => {
    const preview = calculateProfilePreviewFrame(1200, 800, {
      zoom: 2.4,
      x: 0,
      y: 0,
    });

    expect(preview.widthPercent / preview.heightPercent).toBeCloseTo(
      1200 / 800,
    );
    expect(preview.widthPercent).toBeGreaterThan(100);
    expect(preview.heightPercent).toBeGreaterThan(100);
  });

  it("moves the saved crop in the same direction as the previewed image", () => {
    const center = calculateProfileCropSource(1200, 800, {
      zoom: 2,
      x: 0,
      y: 0,
    });
    const draggedRight = calculateProfileCropSource(1200, 800, {
      zoom: 2,
      x: 0.6,
      y: 0,
    });
    const draggedUp = calculateProfileCropSource(1200, 800, {
      zoom: 2,
      x: 0,
      y: -0.6,
    });

    expect(draggedRight.sx).toBeLessThan(center.sx);
    expect(draggedUp.sy).toBeGreaterThan(center.sy);
  });

  it("clamps crop input to the supported zoom and position bounds", () => {
    expect(
      calculateProfileCropSource(900, 600, { zoom: 99, x: 99, y: -99 }),
    ).toEqual({
      sx: 0,
      sy: 400,
      side: 200,
    });
  });
});
