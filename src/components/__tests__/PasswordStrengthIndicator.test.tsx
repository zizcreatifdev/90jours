import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import PasswordStrengthIndicator, { getPasswordStrength } from "@/components/PasswordStrengthIndicator";

// ── getPasswordStrength unit tests ──────────────────────────────────────────

describe("getPasswordStrength", () => {
  it("retourne 'weak' pour une chaîne vide", () => {
    expect(getPasswordStrength("")).toBe("weak");
  });

  it("retourne 'weak' pour un mot de passe court sans critères (score 0)", () => {
    expect(getPasswordStrength("abc")).toBe("weak");
  });

  it("retourne 'weak' quand un seul critère est satisfait (longueur seule)", () => {
    expect(getPasswordStrength("abcdefgh")).toBe("weak"); // length ≥ 8 only
  });

  it("retourne 'weak' quand un seul critère est satisfait (majuscule seule)", () => {
    expect(getPasswordStrength("ABC")).toBe("weak"); // uppercase only
  });

  it("retourne 'medium' pour 2 critères satisfaits (longueur + majuscule)", () => {
    expect(getPasswordStrength("Abcdefgh")).toBe("medium"); // length + uppercase
  });

  it("retourne 'medium' pour 2 critères satisfaits (chiffre + spécial, trop court)", () => {
    expect(getPasswordStrength("a1!")).toBe("medium"); // digit + special
  });

  it("retourne 'medium' pour 3 critères satisfaits (longueur + majuscule + chiffre)", () => {
    expect(getPasswordStrength("Abcdefg1")).toBe("medium"); // length + uppercase + digit
  });

  it("retourne 'medium' pour 3 critères satisfaits (longueur + chiffre + spécial)", () => {
    expect(getPasswordStrength("abcdefg1!")).toBe("medium"); // length + digit + special
  });

  it("retourne 'strong' quand les 4 critères sont satisfaits", () => {
    expect(getPasswordStrength("Abcdefg1!")).toBe("strong"); // all 4
  });

  it("retourne 'strong' pour un mot de passe très fort", () => {
    expect(getPasswordStrength("MyP@ssw0rd2024!")).toBe("strong");
  });
});

// ── PasswordStrengthIndicator rendering tests ────────────────────────────────

describe("PasswordStrengthIndicator", () => {
  it("n'affiche rien quand le mot de passe est vide", () => {
    const { container } = render(<PasswordStrengthIndicator password="" />);
    expect(container.firstChild).toBeNull();
  });

  it("affiche 'Faible' pour un mot de passe faible", () => {
    render(<PasswordStrengthIndicator password="abc" />);
    expect(screen.getByText("Faible")).toBeInTheDocument();
  });

  it("affiche 'Moyen' pour un mot de passe moyen", () => {
    render(<PasswordStrengthIndicator password="Abcdefgh" />);
    expect(screen.getByText("Moyen")).toBeInTheDocument();
  });

  it("affiche 'Fort' pour un mot de passe fort", () => {
    render(<PasswordStrengthIndicator password="Abcdefg1!" />);
    expect(screen.getByText("Fort")).toBeInTheDocument();
  });

  it("affiche la barre de progression avec le bon aria-label", () => {
    render(<PasswordStrengthIndicator password="Abcdefg1!" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-label", "Force du mot de passe : Fort");
  });

  it("affiche le hint sur les critères", () => {
    render(<PasswordStrengthIndicator password="abc" />);
    expect(screen.getByText(/8 car\./)).toBeInTheDocument();
  });
});
