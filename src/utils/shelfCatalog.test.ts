import { describe, expect, it } from "vitest";
import type { ShelfDetectedBook } from "../types/shelfImport";
import { buildGoogleBooksUrl } from "./googleBooks";
import {
  deduplicateShelfDetections,
  getShelfDuplicateReason,
  normalizeShelfText,
  scoreShelfCandidate,
} from "./shelfCatalog";

describe("shelfCatalog", () => {
  it("associe la clé configurée aux recherches Google Books", () => {
    const url = new URL(
      buildGoogleBooksUrl("intitle:Dune inauthor:Frank Herbert", 10, "AIza-test-key"),
    );

    expect(url.searchParams.get("q")).toBe("intitle:Dune inauthor:Frank Herbert");
    expect(url.searchParams.get("maxResults")).toBe("10");
    expect(url.searchParams.get("key")).toBe("AIza-test-key");
  });

  it("normalise les accents et la ponctuation pour comparer les livres", () => {
    expect(normalizeShelfText("  L'Étranger — Albert Camus! ")).toBe(
      "l etranger albert camus",
    );
  });

  it("classe une correspondance exacte de titre et auteur au-dessus d'une correspondance partielle", () => {
    const exact = scoreShelfCandidate("Le Nom de la rose", "Umberto Eco", {
      title: "Le Nom de la rose",
      authors: ["Umberto Eco"],
    });
    const partial = scoreShelfCandidate("Le Nom de la rose", "Umberto Eco", {
      title: "La Rose retrouvée",
      authors: ["Jean Dupont"],
    });

    expect(exact).toBe(1);
    expect(exact).toBeGreaterThan(partial);
  });

  it("déduplique les recouvrements entre photos en gardant la lecture la plus fiable", () => {
    const base: Omit<ShelfDetectedBook, "id" | "photoId" | "photoIndex" | "confidence"> = {
      position: 1,
      visibleText: "Dune Frank Herbert",
      title: "Dune",
      author: "Frank Herbert",
      status: "readable",
      note: "",
    };
    const detections: ShelfDetectedBook[] = [
      { ...base, id: "one", photoId: "photo-one", photoIndex: 0, confidence: "low" },
      { ...base, id: "two", photoId: "photo-two", photoIndex: 1, confidence: "high" },
    ];

    expect(deduplicateShelfDetections(detections)).toEqual([detections[1]]);
  });

  it("conserve deux exemplaires visibles sur une même photo", () => {
    const detections: ShelfDetectedBook[] = [1, 2].map((position) => ({
      id: `book-${position}`,
      photoId: "photo-one",
      photoIndex: 0,
      position,
      visibleText: "Dune Frank Herbert",
      title: "Dune",
      author: "Frank Herbert",
      confidence: "high",
      status: "readable",
      note: "",
    }));

    expect(deduplicateShelfDetections(detections)).toHaveLength(2);
  });

  it("détecte un doublon par oeuvre même si l'ISBN diffère", () => {
    expect(
      getShelfDuplicateReason(
        {
          isbn: "9780000000002",
          title: "Dune",
          authors: ["Frank Herbert"],
          source: "Google Books",
          score: 1,
        },
        [{ isbn: "9780000000001", title: "Dune", authors: ["Frank Herbert"] }],
      ),
    ).toContain("Même titre");
  });
});
