import { describe, it, expect } from "vitest";
import { isValidUrl } from "@/lib/validate-url";

describe("isValidUrl", () => {
  // ─── URLs valides ─────────────────────────────────────────────────────────

  it("accepte une URL https standard", () => {
    expect(isValidUrl("https://monportfolio.com")).toBe(true);
  });

  it("accepte une URL http standard", () => {
    expect(isValidUrl("http://monportfolio.com")).toBe(true);
  });

  it("accepte une URL avec chemin et paramètres", () => {
    expect(isValidUrl("https://github.com/user/repo?tab=readme")).toBe(true);
  });

  it("accepte une URL avec sous-domaine", () => {
    expect(isValidUrl("https://www.behance.net/user/portfolio")).toBe(true);
  });

  // ─── Vecteurs XSS, doivent être rejetés ─────────────────────────────────

  it("rejette javascript: (XSS classique)", () => {
    expect(isValidUrl("javascript:alert(1)")).toBe(false);
  });

  it("rejette data: (XSS via data URI)", () => {
    expect(isValidUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
  });

  it("rejette vbscript:", () => {
    expect(isValidUrl("vbscript:msgbox(1)")).toBe(false);
  });

  // ─── Chaînes invalides ────────────────────────────────────────────────────

  it("rejette une chaîne vide", () => {
    expect(isValidUrl("")).toBe(false);
  });

  it("rejette un chemin relatif", () => {
    expect(isValidUrl("/relative/path")).toBe(false);
  });

  it("rejette du texte sans protocole", () => {
    expect(isValidUrl("monportfolio.com")).toBe(false);
  });
});
