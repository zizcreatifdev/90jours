# ARCHITECTURE.md — 90 Jours Formation Platform

## Stack Technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| UI Framework | React | 18.3.1 |
| Langage | TypeScript | 5.8.3 |
| Routing | React Router DOM | 6.30.1 |
| State / Data Fetching | React Query (@tanstack) | 5.83.0 |
| State Auth | React Context (AuthContext) | - |
| Styling | Tailwind CSS | 3.4.17 |
| Composants UI | shadcn/ui + Radix UI | - |
| Formulaires | React Hook Form + Zod | 7.61.1 / 3.25.76 |
| Graphiques | Recharts | 2.15.4 |
| Drag & Drop | @dnd-kit/core | 6.3.1 |
| Génération PDF | html2canvas | 1.4.1 |
| Backend / BDD | Supabase (PostgreSQL) | 2.95.3 |
| Auth | Supabase Auth | - |
| Edge Functions | Deno (Supabase Functions) | - |
| Build | Vite + React SWC | 5.4.19 |
| PWA | vite-plugin-pwa | 1.2.0 |
| Tests | Vitest + Testing Library | 3.2.4 / 16.0.0 |
| Icons | Lucide React | 0.462.0 |

## Structure des Dossiers

```
/home/user/90jours/
├── public/                        # Assets statiques (icons PWA, favicon)
├── src/
│   ├── App.tsx                    # Routing principal + providers globaux
│   ├── main.tsx                   # Point d'entrée React
│   ├── pages/                     # Pages = routes
│   │   ├── Index.tsx              # Landing page publique
│   │   ├── Login.tsx              # Page de connexion
│   │   ├── Register.tsx           # Page d'inscription
│   │   ├── AdminDashboard.tsx     # Dashboard super_admin
│   │   ├── StaffDashboard.tsx     # Dashboard formateur/staff
│   │   ├── StudentDashboard.tsx   # Dashboard étudiant
│   │   ├── ProfilePage.tsx        # Profil utilisateur
│   │   ├── SetupAccount.tsx       # Setup post-invitation
│   │   └── NotFound.tsx           # 404
│   ├── components/
│   │   ├── ui/                    # Composants shadcn/Radix (40+)
│   │   ├── attestation/           # Éditeur drag-drop attestations
│   │   │   ├── AttestationDragDropEditor.tsx
│   │   │   ├── AttestationTracker.tsx
│   │   │   ├── DraggableElement.tsx
│   │   │   └── ElementProperties.tsx
│   │   ├── [composants métier]    # Voir liste complète ci-dessous
│   ├── contexts/
│   │   └── AuthContext.tsx        # État global auth + rôles
│   ├── hooks/
│   │   ├── use-cohorts.ts         # Fetch cohorts + real-time subscriptions
│   │   ├── use-push-notifications.ts
│   │   ├── use-site-settings.ts
│   │   ├── use-calendar-events.ts
│   │   ├── use-hero-slides.ts
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   ├── integrations/supabase/
│   │   ├── client.ts              # Instance Supabase configurée
│   │   └── types.ts               # Types auto-générés (1000+ lignes)
│   ├── lib/
│   │   ├── utils.ts               # clsx/tailwind-merge helper
│   │   ├── export-csv.ts          # Export CSV admin
│   │   └── mock-data.ts           # Données de démo (non utilisées en prod)
│   └── test/
│       ├── setup.ts               # Config Vitest global
│       └── example.test.ts        # Test exemple (placeholder)
├── supabase/
│   ├── functions/                 # Edge Functions Deno
│   │   ├── send-push-notification/index.ts  # Web Push RFC 8291/8292
│   │   ├── invite-staff/index.ts            # Invitation formateurs
│   │   ├── delete-user/index.ts             # Suppression compte
│   │   ├── list-user-emails/index.ts        # Liste emails
│   │   └── get-vapid-key/index.ts           # Clé publique VAPID
│   └── migrations/                # 37 fichiers SQL (ordre chronologique)
├── vite.config.ts
├── vitest.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## Routes de l'Application

| Route | Composant | Protection |
|-------|-----------|-----------|
| `/` | Index | Public |
| `/login` | Login | Public |
| `/register` | Register | Public |
| `/setup-account` | SetupAccount | Public (post-invitation) |
| `/admin` | AdminDashboard | `super_admin` requis |
| `/staff` | StaffDashboard | `staff` requis |
| `/student` | StudentDashboard | `student` requis |
| `/profile` | ProfilePage | Authentifié |
| `*` | NotFound | - |

## Schéma de la Base de Données Supabase

### Tables Principales

#### Authentification & Utilisateurs
```sql
profiles (id, first_name, last_name, phone, avatar_url, created_at, updated_at)
user_roles (id, user_id, role ENUM['super_admin','staff','student'], created_at)
```

#### Formations & Cohortes
```sql
formations (id, name, description, duration_days, price, attestation_config, created_at)
cohorts (id, formation_id, name, start_date, end_date, capacity, status, created_at)
enrollments (id, user_id, cohort_id, progress INT, enrolled_at, created_at)
```

#### Contenu Pédagogique
```sql
briefs (id, cohort_id, title, description, deadline, publish_at, category_id, created_at)
brief_categories (id, name, color, created_at)
brief_submissions (id, brief_id, user_id, content, is_late, delay_days, submitted_at)
resources (id, cohort_id, title, type ENUM['pdf','video','link'], url, created_at)
announcements (id, cohort_id, title, content, created_by, created_at)
seen_announcements (id, user_id, announcement_id, seen_at)
masterclass_sessions (id, cohort_id, title, scheduled_at, duration_minutes, url)
research_sessions (id, cohort_id, title, scheduled_at, description)
```

#### Évaluation & Certifications
```sql
portfolios (id, user_id, cohort_id, url, status ENUM['pending','validated','rejected'], feedback, updated_at)
attestations (id, user_id, cohort_id, certificate_number, status, issued_at, issuer_id)
attestation_actions (id, attestation_id, action, performed_by, performed_at)
```

#### Messagerie & Notifications
```sql
messages (id, sender_id, recipient_id, cohort_id, content, parent_id, created_at)
notifications (id, user_id, title, body, type, is_read, created_at)
push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at)
```

#### Finance
```sql
payments (id, user_id, cohort_id, amount, status, payment_method, reference, paid_at)
promo_codes (id, code, discount_type ENUM['percent','fixed'], discount_value, early_bird, max_uses, used_count, expires_at)
promo_code_usage (id, promo_code_id, user_id, used_at)
expenses (id, amount, category, description, receipt_url, created_by, created_at)
staff_payments (id, staff_id, amount, period_start, period_end, staff_type, paid_at)
```

#### Gestion Staff
```sql
staff_formations (id, staff_id, formation_id, assigned_at)
staff_tasks (id, title, description, assigned_to, assigned_by, status, due_date, created_at)
staff_task_comments (id, task_id, user_id, content, created_at)
```

#### Configuration Site
```sql
site_settings (id, key, value, updated_at)
hero_slides (id, image_url, title, subtitle, sort_order, is_active, created_at)
audit_logs (id, user_id, action, target_table, target_id, details, created_at)
```

### Fonctions & Triggers SQL
```sql
has_role(user_id, role)               -- SECURITY DEFINER pour RLS
update_updated_at_column()            -- Trigger auto-timestamp
handle_new_user()                     -- Créer profil à l'inscription
recalculate_enrollment_progress()     -- Calcul progression depuis briefs
recalculate_cohort_progress()         -- Recalcul batch progression
```

## Flux d'Authentification

```
1. App Load
   └── AuthContext monte → écoute onAuthStateChange

2. INITIAL_SESSION / SIGNED_IN
   ├── Fetch user_roles WHERE user_id = auth.uid()
   ├── Fetch profiles WHERE id = auth.uid()
   ├── Détermine activeRole (priorité: super_admin > staff > student)
   └── Stocke activeRole dans localStorage ("90jours-active-role")

3. Navigation
   └── ProtectedRoute vérifie roles.includes(requiredRole)
       ├── Oui → affiche le composant enfant
       └── Non → redirect vers /login ou dashboard autorisé

4. RoleSwitcher (utilisateurs multi-rôles)
   └── Permet de changer activeRole manuellement

5. SIGNED_OUT
   ├── Vide l'état React (user, roles, profile)
   └── Supprime localStorage "90jours-active-role"
```

## Rôles Utilisateurs

### super_admin
- Gestion complète des utilisateurs et rôles
- CRUD formations, cohortes, briefs
- Gestion financière (paiements, dépenses, staff)
- Configuration site (logo, hero, footer)
- Logs d'audit
- Invitations staff
- Émission attestations
- Codes promo

### staff (Formateur)
- Voir/gérer ses formations assignées uniquement
- Créer/publier des briefs
- Valider portfolios étudiants
- Envoyer messages aux étudiants
- Suivre la progression des étudiants
- Créer annonces de cohorte
- Gestion des tâches personnelles

### student (Étudiant)
- Voir ses cohortes inscrites
- Soumettre des briefs
- Soumettre son portfolio
- Voir sa progression
- Télécharger ses attestations
- Accéder aux ressources et annonces
- Messagerie directe

## Variables d'Environnement

```bash
VITE_SUPABASE_PROJECT_ID="vlfugigvqfqflfenuwkb"
VITE_SUPABASE_URL="https://vlfugigvqfqflfenuwkb.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGc..."  # Clé anon publique
```

## PWA Configuration

- **Mode**: standalone
- **Service Worker**: autoUpdate via workbox
- **Custom SW**: `/public/custom-sw.js`
- **Icons**: pwa-icon-192.png, pwa-icon-512.png
- **Theme color**: #1a1d23
- **Offline**: navigation fallback activé
