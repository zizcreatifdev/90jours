# TEST_AGENT.md — Tests & Couverture

## Commandes

```bash
# Lancer tous les tests (une fois)
npm run test

# Mode watch (re-run sur sauvegarde)
npm run test:watch

# Lint
npm run lint

# Build + vérification TypeScript
npm run build

# Combiné : test + lint
npm run test && npm run lint
```

## Configuration des Tests

**Framework**: Vitest 3.2.4 + Testing Library 16.0.0
**Environnement**: jsdom (simulation DOM navigateur)
**Globals**: activés (describe, it, expect disponibles sans import)
**Setup file**: `src/test/setup.ts`
**Pattern**: `src/**/*.{test,spec}.{ts,tsx}`
**Alias**: `@/` → `src/`

```typescript
// vitest.config.ts
{
  environment: "jsdom",
  globals: true,
  setupFiles: ["./src/test/setup.ts"],
  include: ["src/**/*.{test,spec}.{ts,tsx}"]
}
```

## Tests Existants

### src/test/example.test.ts
```typescript
describe("example", () => {
  it("should pass", () => {
    expect(true).toBe(true);  // Placeholder — toujours vert
  });
});
```
**Status**: ✅ Passe | **Utilité**: Placeholder (aucune valeur réelle)

---

## Couverture Actuelle

| Module | Tests | Couverture |
|--------|-------|-----------|
| Composants | 0 | 0% |
| Hooks | 0 | 0% |
| Utilitaires | 0 | 0% |
| Pages | 0 | 0% |
| AuthContext | 0 | 0% |
| **TOTAL** | **1 (placeholder)** | **~0%** |

**Note**: La couverture réelle est nulle. Le seul test existant est un placeholder.

---

## Zones Prioritaires à Tester (TODO)

### Priorité Haute
- [ ] `src/contexts/AuthContext.tsx` — logique de rôles, redirections
- [ ] `src/components/ProtectedRoute.tsx` — protection des routes
- [ ] `src/lib/export-csv.ts` — export des données
- [ ] `src/lib/utils.ts` — fonction cn()

### Priorité Moyenne
- [ ] `src/hooks/use-cohorts.ts` — fetch et transformations
- [ ] `src/hooks/use-push-notifications.ts` — souscriptions
- [ ] `src/components/StudentBriefs.tsx` — soumission briefs
- [ ] `src/components/PaymentManager.tsx` — calculs financiers

### Priorité Basse
- [ ] Composants UI shadcn (déjà testés en upstream)
- [ ] Pages (mieux testées en E2E)
- [ ] Edge Functions Supabase (tests séparés côté Deno)

---

## Template de Test — Composant

```typescript
// src/components/__tests__/NomComposant.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import NomComposant from "@/components/NomComposant";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe("NomComposant", () => {
  it("affiche le composant correctement", () => {
    renderWithProviders(<NomComposant />);
    expect(screen.getByRole("heading")).toBeInTheDocument();
  });
});
```

## Template de Test — Hook

```typescript
// src/hooks/__tests__/use-mon-hook.test.ts
import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMonHook } from "@/hooks/use-mon-hook";

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe("useMonHook", () => {
  it("retourne les données correctement", async () => {
    const { result } = renderHook(() => useMonHook(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBeDefined();
  });
});
```

---

## Rapport de Test Actuel (au 14 avril 2026)

```
Test Files  1 passed (1)
Tests       1 passed (1)
Duration    ~200ms

Couverture : NON configurée (pas de --coverage dans les scripts)
```

**Pour activer la couverture:**
```bash
# Installer
npm install -D @vitest/coverage-v8

# Lancer avec rapport
npx vitest run --coverage
```
