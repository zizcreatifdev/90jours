import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";

// Mock AuthContext, vi.mock est hissé en haut par Vitest
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

type AppRole = "super_admin" | "staff" | "student";

// Utilisateur de test minimal, ProtectedRoute ne lit que `user` comme boolean
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUser = { id: "test-user-123" } as any;

const baseAuth = {
  user: null as null,
  session: null,
  loading: false,
  roles: [] as AppRole[],
  activeRole: null as AppRole | null,
  setActiveRole: vi.fn(),
  profile: null,
  refreshProfile: vi.fn().mockResolvedValue(undefined) as () => Promise<void>,
  signOut: vi.fn().mockResolvedValue(undefined) as () => Promise<void>,
};

/**
 * Rend ProtectedRoute dans un MemoryRouter avec toutes les routes de redirection
 * possibles, afin de vérifier vers où l'utilisateur est renvoyé.
 */
const renderProtectedRoute = (
  authOverrides: Partial<typeof baseAuth>,
  requiredRole?: AppRole
) => {
  vi.mocked(useAuth).mockReturnValue({ ...baseAuth, ...authOverrides });

  return render(
    <MemoryRouter initialEntries={["/protected"]}>
      <Routes>
        {/* Route protégée sous test */}
        <Route
          path="/protected"
          element={
            <ProtectedRoute requiredRole={requiredRole}>
              <div>Contenu Protégé</div>
            </ProtectedRoute>
          }
        />
        {/* Destinations de redirection */}
        <Route path="/login"   element={<div>Page Login</div>} />
        <Route path="/admin"   element={<div>Dashboard Admin</div>} />
        <Route path="/staff"   element={<div>Dashboard Staff</div>} />
        <Route path="/student" element={<div>Dashboard Étudiant</div>} />
      </Routes>
    </MemoryRouter>
  );
};

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Cas 1 : utilisateur non authentifié ──────────────────────────────────

  it("redirige vers /login si l'utilisateur n'est pas authentifié", () => {
    renderProtectedRoute({ user: null, loading: false });

    expect(screen.getByText("Page Login")).toBeInTheDocument();
    expect(screen.queryByText("Contenu Protégé")).not.toBeInTheDocument();
  });

  // ─── Cas 2 : mauvais activeRole ───────────────────────────────────────────

  it("redirige vers /student quand activeRole=student tente d'accéder à une route staff", () => {
    // Utilisateur ayant les deux rôles, mais activeRole = student
    // Avant le fix, roles.includes("staff") était true → accès autorisé (FAILLE)
    // Après le fix, activeRole !== "staff" → redirection correcte
    renderProtectedRoute(
      {
        user: mockUser,
        roles: ["staff", "student"],
        activeRole: "student",
      },
      "staff"
    );

    expect(screen.getByText("Dashboard Étudiant")).toBeInTheDocument();
    expect(screen.queryByText("Contenu Protégé")).not.toBeInTheDocument();
  });

  it("redirige vers /admin quand activeRole=super_admin tente d'accéder à une route staff", () => {
    renderProtectedRoute(
      {
        user: mockUser,
        roles: ["super_admin", "staff"],
        activeRole: "super_admin",
      },
      "staff"
    );

    expect(screen.getByText("Dashboard Admin")).toBeInTheDocument();
    expect(screen.queryByText("Contenu Protégé")).not.toBeInTheDocument();
  });

  it("redirige vers /login quand activeRole est null (aucun rôle attribué)", () => {
    renderProtectedRoute(
      {
        user: mockUser,
        roles: [],
        activeRole: null,
      },
      "student"
    );

    expect(screen.getByText("Page Login")).toBeInTheDocument();
    expect(screen.queryByText("Contenu Protégé")).not.toBeInTheDocument();
  });

  // ─── Cas 3 : bon activeRole → accès autorisé ─────────────────────────────

  it("affiche le contenu protégé quand activeRole correspond au rôle requis (staff)", () => {
    renderProtectedRoute(
      {
        user: mockUser,
        roles: ["staff"],
        activeRole: "staff",
      },
      "staff"
    );

    expect(screen.getByText("Contenu Protégé")).toBeInTheDocument();
  });

  it("affiche le contenu protégé quand activeRole=super_admin et requiredRole=super_admin", () => {
    renderProtectedRoute(
      {
        user: mockUser,
        roles: ["super_admin"],
        activeRole: "super_admin",
      },
      "super_admin"
    );

    expect(screen.getByText("Contenu Protégé")).toBeInTheDocument();
  });

  it("affiche le contenu protégé sans requiredRole (route authentifiée sans restriction de rôle)", () => {
    renderProtectedRoute({
      user: mockUser,
      roles: ["student"],
      activeRole: "student",
    });

    expect(screen.getByText("Contenu Protégé")).toBeInTheDocument();
  });

  // ─── État de chargement ───────────────────────────────────────────────────

  it("affiche le spinner de chargement et ne redirige pas pendant loading=true", () => {
    renderProtectedRoute({ user: null, loading: true });

    // Ni le contenu protégé ni une page de redirection ne doit s'afficher
    expect(screen.queryByText("Contenu Protégé")).not.toBeInTheDocument();
    expect(screen.queryByText("Page Login")).not.toBeInTheDocument();
    // Le spinner Loader2 est un SVG, on vérifie sa présence dans le DOM
    expect(document.querySelector("svg")).toBeInTheDocument();
  });
});
