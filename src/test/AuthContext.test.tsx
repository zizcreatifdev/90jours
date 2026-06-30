import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// ── Mock Supabase ─────────────────────────────────────────────────────────────

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(),
      signOut: vi.fn().mockResolvedValue({}),
    },
    from: vi.fn(),
  },
}));

// ── Types ─────────────────────────────────────────────────────────────────────

type AppRole = "super_admin" | "staff" | "student";
type AuthEventName = "INITIAL_SESSION" | "SIGNED_IN" | "SIGNED_OUT" | "TOKEN_REFRESHED";
type MockSession = { user: { id: string } } | null;

// ── Shared state ──────────────────────────────────────────────────────────────

/** Captured by the onAuthStateChange mock, lets tests fire events manually. */
let fireAuthEvent: (event: AuthEventName, session: MockSession) => void = () => {};

/** Configures supabase.from() to return the given roles for user_roles table. */
function setupRolesMock(roles: AppRole[]) {
  vi.mocked(supabase.from).mockImplementation((table: string) => {
    if (table === "user_roles") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: roles.map((r) => ({ role: r })),
            error: null,
          }),
        }),
      } as any;
    }
    // "profiles"
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { first_name: "Test", last_name: "User", avatar_url: null },
            error: null,
          }),
        }),
      }),
    } as any;
  });
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

const MOCK_SESSION: MockSession = { user: { id: "user-test-001" } };

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();

  // Capture the callback so tests can fire auth events
  vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((cb: any) => {
    fireAuthEvent = cb;
    return { data: { subscription: { unsubscribe: vi.fn() } } } as any;
  });
});

// ── Priorité des rôles ────────────────────────────────────────────────────────

describe("AuthContext, priorité des rôles (super_admin > staff > student)", () => {
  it("sélectionne super_admin en activeRole par défaut quand l'utilisateur a [super_admin, staff, student]", async () => {
    setupRolesMock(["super_admin", "staff", "student"]);
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => { fireAuthEvent("INITIAL_SESSION", MOCK_SESSION); });

    await waitFor(() => expect(result.current.activeRole).toBe("super_admin"));
    expect(result.current.roles).toEqual(
      expect.arrayContaining(["super_admin", "staff", "student"])
    );
  });

  it("sélectionne staff quand l'utilisateur a [staff, student] (pas super_admin)", async () => {
    setupRolesMock(["staff", "student"]);
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => { fireAuthEvent("INITIAL_SESSION", MOCK_SESSION); });

    await waitFor(() => expect(result.current.activeRole).toBe("staff"));
  });

  it("sélectionne student quand l'utilisateur n'a que [student]", async () => {
    setupRolesMock(["student"]);
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => { fireAuthEvent("INITIAL_SESSION", MOCK_SESSION); });

    await waitFor(() => expect(result.current.activeRole).toBe("student"));
  });
});

// ── Persistance localStorage ──────────────────────────────────────────────────

describe("AuthContext, persistance localStorage", () => {
  it("restaure le rôle stocké si l'utilisateur le possède toujours", async () => {
    // super_admin est le rôle prioritaire, mais le storage dit "staff"
    localStorage.setItem("60jours-active-role", "staff");
    setupRolesMock(["super_admin", "staff"]);
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => { fireAuthEvent("INITIAL_SESSION", MOCK_SESSION); });

    await waitFor(() => expect(result.current.activeRole).toBe("staff"));
  });

  it("ignore le rôle stocké si l'utilisateur ne le possède plus", async () => {
    localStorage.setItem("60jours-active-role", "super_admin");
    setupRolesMock(["student"]);
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => { fireAuthEvent("INITIAL_SESSION", MOCK_SESSION); });

    await waitFor(() => expect(result.current.activeRole).toBe("student"));
  });

  it("stocke le nouveau rôle dans localStorage quand setActiveRole est appelé", async () => {
    setupRolesMock(["super_admin", "staff"]);
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => { fireAuthEvent("INITIAL_SESSION", MOCK_SESSION); });
    await waitFor(() => expect(result.current.activeRole).toBe("super_admin"));

    act(() => { result.current.setActiveRole("staff"); });

    expect(result.current.activeRole).toBe("staff");
    expect(localStorage.getItem("60jours-active-role")).toBe("staff");
  });
});

// ── SIGNED_OUT ────────────────────────────────────────────────────────────────

describe("AuthContext, SIGNED_OUT", () => {
  it("réinitialise user, roles, activeRole et supprime le localStorage", async () => {
    setupRolesMock(["student"]);
    const { result } = renderHook(() => useAuth(), { wrapper });

    // S'identifier d'abord
    act(() => { fireAuthEvent("INITIAL_SESSION", MOCK_SESSION); });
    await waitFor(() => expect(result.current.activeRole).toBe("student"));
    expect(result.current.user).not.toBeNull();

    // Se déconnecter
    act(() => { fireAuthEvent("SIGNED_OUT", null); });

    await waitFor(() => expect(result.current.user).toBeNull());
    expect(result.current.roles).toEqual([]);
    expect(result.current.activeRole).toBeNull();
    expect(localStorage.getItem("60jours-active-role")).toBeNull();
  });
});

// ── setActiveRole avec rôle invalide ─────────────────────────────────────────

describe("AuthContext, setActiveRole invalide", () => {
  it("rejette un rôle que l'utilisateur ne possède pas, activeRole reste inchangé", async () => {
    setupRolesMock(["student"]);
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => { fireAuthEvent("INITIAL_SESSION", MOCK_SESSION); });
    await waitFor(() => expect(result.current.activeRole).toBe("student"));

    act(() => { result.current.setActiveRole("staff"); }); // non accordé

    expect(result.current.activeRole).toBe("student"); // inchangé
    expect(localStorage.getItem("60jours-active-role")).not.toBe("staff");
  });

  it("rejette un rôle invalide même pour un super_admin (rôle non attribué)", async () => {
    setupRolesMock(["super_admin"]);
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => { fireAuthEvent("INITIAL_SESSION", MOCK_SESSION); });
    await waitFor(() => expect(result.current.activeRole).toBe("super_admin"));

    act(() => { result.current.setActiveRole("student"); }); // non accordé

    expect(result.current.activeRole).toBe("super_admin"); // inchangé
  });
});
