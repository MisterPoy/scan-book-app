import { describe, expect, it } from "vitest";
import { hasBookDetails, mergeBookDetails } from "./bookDetails";

describe("bookDetails", () => {
  it("préfère toujours les informations déjà enregistrées", () => {
    const result = mergeBookDetails(
      {
        description: "Résumé Firestore",
        publisher: "Éditeur local",
        pageCount: 638,
      },
      {
        description: "Résumé distant",
        publisher: "Éditeur distant",
        publishedDate: "2002",
      },
    );

    expect(result).toMatchObject({
      description: "Résumé Firestore",
      publisher: "Éditeur local",
      publishedDate: "2002",
      pageCount: 638,
    });
  });

  it("récupère les informations distantes uniquement quand elles manquent", () => {
    const result = mergeBookDetails({}, { description: "Résumé distant" });
    expect(result.description).toBe("Résumé distant");
    expect(hasBookDetails(result)).toBe(true);
  });

  it("reconnaît aussi les anciennes notes enregistrées sous notes", () => {
    const result = mergeBookDetails({ notes: "Note personnelle" }, null);
    expect(result.personalNote).toBe("Note personnelle");
    expect(hasBookDetails(result)).toBe(true);
  });
});
