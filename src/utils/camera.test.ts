import { describe, expect, it, vi } from "vitest";
import { getCameraErrorMessage, stopMediaStream } from "./camera";

describe("camera utilities", () => {
  it("explains a refused camera permission", () => {
    expect(getCameraErrorMessage({ name: "NotAllowedError" })).toContain(
      "Autorisez la caméra",
    );
  });

  it("falls back to a useful generic message", () => {
    expect(getCameraErrorMessage(new Error("unknown"))).toContain(
      "Vérifiez les permissions",
    );
  });

  it("stops every track in a media stream", () => {
    const firstStop = vi.fn();
    const secondStop = vi.fn();
    const stream = {
      getTracks: () => [{ stop: firstStop }, { stop: secondStop }],
    } as unknown as MediaStream;

    stopMediaStream(stream);

    expect(firstStop).toHaveBeenCalledOnce();
    expect(secondStop).toHaveBeenCalledOnce();
  });
});
