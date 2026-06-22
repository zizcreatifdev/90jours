# 60 jours de formation

Plateforme de gestion de formations intensives créatives (graphisme, UI/UX, etc.).

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Supabase (auth, base de données, RLS)
- React Query
- Vitest + Testing Library

## Lancer le projet en local

```bash
npm install
npm run dev
```

## Tests

```bash
npm run test
npm run lint
npm run build
```

## Structure

```
src/
  components/   # Composants réutilisables (UI, formulaires, tableaux)
  pages/        # Pages React Router
  hooks/        # Hooks React Query et utilitaires
  contexts/     # AuthContext
  integrations/ # Client Supabase et types générés
  lib/          # Utilitaires (cn, export-csv, etc.)
supabase/
  migrations/   # Migrations SQL (ne jamais modifier les existantes)
```

## Conventions

Voir [CLAUDE.md](./CLAUDE.md) pour les règles de travail, conventions TypeScript, et contraintes de la stack.
