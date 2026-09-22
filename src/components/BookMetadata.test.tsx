import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  BookTypeBadge,
  BookTypeField,
  ReadingStatusBadge,
  ReadingStatusField,
} from "./BookMetadata";

describe("BookMetadata", () => {
  it("affiche les libellés de statut et de type", () => {
    render(
      <>
        <ReadingStatusBadge status="en_cours" />
        <BookTypeBadge type="audio" />
      </>,
    );

    expect(screen.getByText("En cours")).toBeInTheDocument();
    expect(screen.getByText("Audio")).toBeInTheDocument();
  });

  it("transmet les changements sans transformer les valeurs métier", () => {
    const onStatusChange = vi.fn();
    const onTypeChange = vi.fn();

    render(
      <>
        <ReadingStatusField
          id="status"
          value="a_lire"
          onChange={onStatusChange}
        />
        <BookTypeField
          id="type"
          value="physique"
          onChange={onTypeChange}
        />
      </>,
    );

    fireEvent.change(screen.getByDisplayValue("À lire"), {
      target: { value: "lu" },
    });
    fireEvent.change(screen.getByDisplayValue("Physique"), {
      target: { value: "numerique" },
    });

    expect(onStatusChange).toHaveBeenCalledWith("lu");
    expect(onTypeChange).toHaveBeenCalledWith("numerique");
  });
});
