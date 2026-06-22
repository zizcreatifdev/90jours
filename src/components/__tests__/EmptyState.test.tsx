import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MessageSquare, Bell, ClipboardList } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";

describe("EmptyState", () => {
  it("affiche le titre requis", () => {
    render(<EmptyState icon={MessageSquare} title="Aucun message" />);
    expect(screen.getByText("Aucun message")).toBeInTheDocument();
  });

  it("affiche le titre comme un heading", () => {
    render(<EmptyState icon={MessageSquare} title="Aucun message" />);
    expect(screen.getByRole("heading", { name: "Aucun message" })).toBeInTheDocument();
  });

  it("affiche la description quand elle est fournie", () => {
    render(
      <EmptyState
        icon={Bell}
        title="Aucune notification"
        description="Vous êtes à jour !"
      />
    );
    expect(screen.getByText("Vous êtes à jour !")).toBeInTheDocument();
  });

  it("n'affiche pas de description quand elle est absente", () => {
    const { container } = render(<EmptyState icon={MessageSquare} title="Titre" />);
    // Only the heading should have text, no extra paragraph
    expect(container.querySelectorAll("p").length).toBe(0);
  });

  it("affiche le bouton d'action quand action est fournie", () => {
    const handleClick = vi.fn();
    render(
      <EmptyState
        icon={ClipboardList}
        title="Aucun brief"
        action={{ label: "Ajouter un brief", onClick: handleClick }}
      />
    );
    expect(screen.getByRole("button", { name: "Ajouter un brief" })).toBeInTheDocument();
  });

  it("n'affiche pas de bouton quand action est absente", () => {
    render(<EmptyState icon={MessageSquare} title="Vide" />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("appelle onClick quand le bouton d'action est cliqué", () => {
    const handleClick = vi.fn();
    render(
      <EmptyState
        icon={Bell}
        title="Vide"
        action={{ label: "Créer", onClick: handleClick }}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Créer" }));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it("applique les classes personnalisées via className", () => {
    const { container } = render(
      <EmptyState
        icon={MessageSquare}
        title="Test"
        className="my-custom-class"
      />
    );
    expect(container.firstChild).toHaveClass("my-custom-class");
  });

  it("conserve les classes par défaut quand className est vide", () => {
    const { container } = render(<EmptyState icon={Bell} title="Test" />);
    expect(container.firstChild).toHaveClass("rounded-2xl");
    expect(container.firstChild).toHaveClass("border");
  });
});
