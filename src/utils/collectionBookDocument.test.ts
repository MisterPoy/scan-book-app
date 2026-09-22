import { describe, expect, it } from "vitest";
import { createCollectionBookDocument } from "./collectionBookDocument";

describe("createCollectionBookDocument", () => {
  it("conserve toutes les métadonnées disponibles", () => {
    const document = createCollectionBookDocument(
      {
        isbn: "9780000000001",
        title: "Livre test",
        authors: ["Autrice"],
        publisher: "Éditeur",
        publishedDate: "2026",
        description: "Résumé",
        pageCount: 320,
        imageLinks: { thumbnail: "https://example.test/cover.jpg" },
        genre: "Roman",
        tags: ["fiction"],
        categories: ["Littérature"],
        notes: "Note historique",
      },
      { addedAt: "2026-09-22T00:00:00.000Z" },
    );

    expect(document).toMatchObject({
      isbn: "9780000000001",
      description: "Résumé",
      pageCount: 320,
      customCoverUrl: "https://example.test/cover.jpg",
      genre: "Roman",
      tags: ["fiction"],
      categories: ["Littérature"],
      notes: "Note historique",
      readingStatus: "a_lire",
      bookType: "physique",
      isRead: false,
    });
  });

  it("synchronise le statut lu avec le champ historique isRead", () => {
    const document = createCollectionBookDocument(
      { isbn: "1", title: "Livre" },
      { readingStatus: "lu" },
    );

    expect(document.readingStatus).toBe("lu");
    expect(document.isRead).toBe(true);
  });

  it("n'écrit pas de valeurs vides dans Firestore", () => {
    const document = createCollectionBookDocument({
      isbn: "1",
      title: "Livre",
      description: "",
      categories: [],
    });

    expect(document).not.toHaveProperty("description");
    expect(document).not.toHaveProperty("categories");
  });
});
