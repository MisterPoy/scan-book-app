import { describe, expect, it, vi } from "vitest";
import shelfScanHandler from "../../api/admin/shelf-scan";

describe("shelf scan API", () => {
  it("se charge et refuse une requête sans authentification", async () => {
    let statusCode = 0;
    const json = vi.fn();
    const response = {
      setHeader: vi.fn(),
      status(code: number) {
        statusCode = code;
        return this;
      },
      json,
    };

    await shelfScanHandler(
      { method: "POST", headers: {}, body: {} },
      response,
    );

    expect(statusCode).toBe(401);
    expect(json).toHaveBeenCalledWith({
      code: "AUTH_REQUIRED",
      error: "Authentification requise.",
    });
  });
});
