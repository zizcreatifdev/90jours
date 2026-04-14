# CLAUDE.md — Règles de Travail pour Claude

## Workflow Obligatoire pour Chaque Prompt

```bash
# 1. Snapshot avant modification
git add . && git commit -m "snapshot avant prompt-XX"

# 2. Lire les fichiers mémoire
# → ARCHITECTURE.md, PROJECT_STATE.md, TEST_AGENT.md, CLAUDE.md

# 3. Exécuter la tâche

# 4. Tests + rapport
npm run test
npm run lint

# 5. Mettre à jour PROJECT_STATE.md

# 6. Commit final
git add . && git commit -m "prompt-XX : [description courte]"
git push -u origin claude/create-project-state-K3MOH
```

**En cas de problème grave**: `git revert HEAD`

---

## Stack — Ne Jamais Changer

- **React 18** avec hooks fonctionnels uniquement (pas de classes)
- **TypeScript strict** — pas de `any`, pas de `@ts-ignore` sans justification
- **Tailwind CSS** pour le styling — pas de CSS inline ou fichiers .css séparés
- **shadcn/ui** pour les composants UI — utiliser les composants existants dans `src/components/ui/`
- **Supabase** comme seul backend — pas d'autres API ou services externes
- **React Query** pour tous les appels Supabase (pas de fetch/axios directs dans les composants)
- **React Hook Form + Zod** pour tous les formulaires

---

## Conventions de Code

### TypeScript
```typescript
// Types explicites pour les props des composants
interface MonComposantProps {
  title: string;
  onAction: () => void;
}

// Utiliser les types Supabase générés
import type { Database } from "@/integrations/supabase/types";
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

// Éviter any — utiliser unknown si nécessaire
```

### Composants React
```typescript
// Toujours des composants fonctionnels avec arrow functions
const MonComposant = ({ title }: MonComposantProps) => {
  return <div>{title}</div>;
};
export default MonComposant;

// Imports: alias @ obligatoire (pas de ../)
import { Button } from "@/components/ui/button";
```

### Appels Supabase
```typescript
// Dans des hooks React Query — jamais directement dans les composants
const { data, isLoading } = useQuery({
  queryKey: ["profiles"],
  queryFn: async () => {
    const { data, error } = await supabase.from("profiles").select("*");
    if (error) throw error;
    return data;
  },
});
```

### Styling
```typescript
// Utiliser cn() pour combiner les classes Tailwind
import { cn } from "@/lib/utils";
<div className={cn("flex items-center", isActive && "bg-primary")} />
```

### Nommage
| Élément | Convention | Exemple |
|---------|-----------|---------|
| Composants | PascalCase | `BriefManager.tsx` |
| Hooks | camelCase + use- | `use-cohorts.ts` |
| Utilitaires | kebab-case | `export-csv.ts` |
| Variables | camelCase | `isLoading` |
| Types/Interfaces | PascalCase | `UserProfile` |
| Constantes | UPPER_SNAKE_CASE | `MAX_COHORT_SIZE` |

---

## Ce Qu'il Ne Faut JAMAIS Modifier

### Fichiers Critiques
- `src/integrations/supabase/types.ts` — auto-généré, ne pas éditer manuellement
- `src/integrations/supabase/client.ts` — configuration Supabase (modifier seulement si nécessaire)
- `.env` — variables d'environnement sensibles
- `supabase/migrations/` — **JAMAIS** modifier les migrations existantes, toujours créer une nouvelle

### Patterns à Ne Pas Casser
- **AuthContext** (`src/contexts/AuthContext.tsx`) — logique d'auth fragile, modifier avec précaution
- **ProtectedRoute** (`src/components/ProtectedRoute.tsx`) — sécurité des routes
- **RLS Supabase** — ne jamais désactiver les politiques Row Level Security
- **has_role()** function — utilisée par toutes les politiques RLS

### Base de Données
- Toujours créer une **nouvelle migration** pour changer le schéma
- **Jamais** de `DROP TABLE` ou `ALTER TABLE ... DROP COLUMN` sans backup
- Toujours tester les migrations en local avant push

---

## Structure des Commits

```
prompt-XX : [verbe] [quoi] [où?]
```

### Verbes Standards
- `add` — nouvelle fonctionnalité
- `fix` — correction de bug
- `update` — modification d'existant
- `refactor` — refactoring sans changement fonctionnel
- `style` — changements CSS/Tailwind uniquement
- `test` — ajout/modification de tests
- `docs` — documentation uniquement
- `db` — migration Supabase

### Exemples
```
prompt-05 : add StudentBriefs pagination et filtre par catégorie
prompt-06 : fix AttestationIssuer crash quand cohort_id null
prompt-07 : update PaymentManager export CSV avec nouvelles colonnes
snapshot avant prompt-08
```

---

## Structure des Tests

```typescript
// src/components/__tests__/MonComposant.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import MonComposant from "@/components/MonComposant";

describe("MonComposant", () => {
  it("affiche le titre correctement", () => {
    render(<MonComposant title="Test" />);
    expect(screen.getByText("Test")).toBeInTheDocument();
  });
});
```

---

## Gestion des Erreurs

```typescript
// Pattern standard pour les mutations Supabase
const mutation = useMutation({
  mutationFn: async (data: FormData) => {
    const { error } = await supabase.from("table").insert(data);
    if (error) throw error;
  },
  onSuccess: () => {
    toast({ title: "Succès", description: "Opération réussie" });
    queryClient.invalidateQueries({ queryKey: ["table"] });
  },
  onError: (error) => {
    toast({ title: "Erreur", description: error.message, variant: "destructive" });
  },
});
```

---

## Checklist Avant Push

- [ ] `npm run test` passe sans erreurs
- [ ] `npm run lint` sans warnings critiques
- [ ] `npm run build` compile sans erreurs TypeScript
- [ ] Pas de `console.log` oubliés en production
- [ ] `PROJECT_STATE.md` mis à jour
- [ ] Commit message suit la convention
