import { describe, expect, it } from "vitest";
import { categorySuggestions, mergeGenreOptions } from "./genreOptions";

describe("genreOptions", () => {
  it("réunit les genres principaux, existants et suggérés sans doublons", () => {
    const options = mergeGenreOptions(
      ["Science-fiction", "  Space opera  "],
      ["science-fiction", "Fiction / Dystopie"],
    );

    expect(options).toContain("Science-fiction");
    expect(options).toContain("Space opera");
    expect(options).toContain("Fiction / Dystopie");
    expect(
      options.filter((option) => option.toLowerCase() === "science-fiction"),
    ).toHaveLength(1);
  });

  it("isole les catégories externes qui ne sont pas déjà des genres principaux", () => {
    expect(categorySuggestions(["Horreur", "Fiction / Gothic"])).toEqual([
      "Fiction / Gothic",
    ]);
  });
});
