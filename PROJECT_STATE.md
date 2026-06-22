# PROJECT_STATE.md — État du Projet

**Dernière mise à jour**: 22 juin 2026
**Branche active**: `claude/elegant-curie-wcw2cl`
**Prompt actuel**: refonte-contrat : nouveau design premium + contenu rédigé + variables livrable/dates

> 🚧 **Migration Supabase en cours** — préparation du passage vers une nouvelle
> instance Supabase (base vierge) rebrandée « 60 jours » sur les seeds.
> Fichiers créés à la racine : `MIGRATION_60JOURS.sql` (les 42 migrations
> concaténées + 5 modifs de seed), `SETUP_SUPERADMIN.sql`, `DEPLOIEMENT.md`.
> Hygiène secrets : `.gitignore` (+ `.env.local`, `.env.*.local`) et `.env.example`
> (noms de variables front, valeurs vides) mis à jour.
> Étapes manuelles restantes : voir `DEPLOIEMENT.md`.

---

## Vue d'Ensemble

| Métrique | Valeur |
|---------|--------|
| Composants React | 99 |
| Pages | 10 |
| Hooks custom | 9 |
| Tables Supabase | 33 |
| Migrations SQL | 44 |
| Edge Functions | 7 |
| Tests | 63 (1 placeholder + 8 ProtectedRoute + 10 validate-url + 9 AuthContext + 10 export-csv + 16 PasswordStrengthIndicator + 9 EmptyState) |
| Couverture tests | ~25% (ProtectedRoute + validate-url + AuthContext + export-csv + PasswordStrengthIndicator + EmptyState) |

---

## État par Module

### Authentification & Rôles
**Fichiers**: `src/contexts/AuthContext.tsx`, `src/components/ProtectedRoute.tsx`, `src/components/RoleSwitcher.tsx`

| Feature | Status | % |
|---------|--------|---|
| Login / Logout | ✅ Complet | 100% |
| Inscription | ✅ Complet | 100% |
| RBAC (3 rôles) | ✅ Complet | 100% |
| Switch de rôle | ✅ Complet | 100% |
| Setup post-invitation | ✅ Complet | 100% |
| Persistance rôle actif | ✅ Complet | 100% |
| **Mot de passe oublié** | ✅ Complet | 100% |

**Complétion globale**: 100%
**Bugs connus**: Aucun identifié
**Prochaines étapes**: Ajouter tests unitaires

---

### Dashboard Admin
**Fichiers**: `src/pages/AdminDashboard.tsx` + composants associés

| Feature | Status | % |
|---------|--------|---|
| Vue d'ensemble (stats) | ✅ Complet | 100% |
| Gestion formations | ✅ Complet | 100% |
| Gestion cohortes | ✅ Complet | 100% |
| Gestion formateurs | ✅ Complet | 100% |
| Gestion paiements | ✅ Complet | 100% |
| Codes promo | ✅ Complet | 100% |
| Comptabilité | ✅ Complet | 100% |
| Attestations | ✅ Complet | 100% |
| Éditeur templates attestation | ✅ Complet | 100% |
| Messagerie admin | ✅ Complet | 100% |
| Notifications push | ✅ Complet | 100% |
| Logs d'audit | ✅ Complet | 100% |
| Paramètres site | ✅ Complet | 100% |
| Calendrier | ✅ Complet | 100% |
| Contrats (templates + signés) | ✅ Complet | 100% |
| Témoignages (CRUD + reorder + toggle) | ✅ Complet | 100% |
| Liste d'attente (WaitlistManager) | ✅ Complet | 100% |

**Complétion globale**: 100%
**Bugs connus**: Aucun identifié
**Prochaines étapes**: Tests d'intégration des flux critiques

---

### Dashboard Staff (Formateur)
**Fichiers**: `src/pages/StaffDashboard.tsx` + composants associés

| Feature | Status | % |
|---------|--------|---|
| Vue formations assignées | ✅ Complet | 100% |
| Gestion briefs | ✅ Complet | 100% |
| Catégories de briefs | ✅ Complet | 100% |
| Validation portfolios | ✅ Complet | 100% |
| Messagerie vers étudiants | ✅ Complet | 100% |
| Annonces cohorte | ✅ Complet | 100% |
| Gestion tâches | ✅ Complet | 100% |
| Calendrier | ✅ Complet | 100% |
| Messages officiels formateur | ✅ Complet | 100% |

**Complétion globale**: 100%
**Bugs connus**: Aucun identifié
**Prochaines étapes**: Tester le flux validation portfolio end-to-end

---

### Dashboard Étudiant
**Fichiers**: `src/pages/StudentDashboard.tsx` + composants associés

| Feature | Status | % |
|---------|--------|---|
| Profil étudiant | ✅ Complet | 100% |
| Briefs & soumissions | ✅ Complet | 100% |
| Portfolio | ✅ Complet | 100% |
| Attestations | ✅ Complet | 100% |
| Statut paiement | ✅ Complet | 100% |
| Messagerie | ✅ Complet | 100% |
| Suivi progression | ✅ Complet | 100% |

**Complétion globale**: 100%
**Bugs connus**: Aucun identifié
**Prochaines étapes**: Améliorer UX mobile

---

### Système d'Attestations
**Fichiers**: `src/components/attestation/`, `src/components/AttestationIssuer.tsx`, `src/components/AttestationTemplateEditor.tsx`

| Feature | Status | % |
|---------|--------|---|
| Éditeur drag-drop | ✅ Complet | 100% |
| Propriétés éléments | ✅ Complet | 100% |
| Émission attestations | ✅ Complet | 100% |
| Tracker attestations | ✅ Complet | 100% |
| Génération PDF (html2canvas) | ✅ Complet | 100% |
| Numéros de certificat uniques | ✅ Complet | 100% |
| **Export ZIP batch cohorte (JSZip)** | ✅ Complet | 100% |

**Complétion globale**: 100%
**Bugs connus**: Aucun identifié

---

### Système de Notifications Push
**Fichiers**: `src/components/PushNotificationProvider.tsx`, `src/hooks/use-push-notifications.ts`, `supabase/functions/send-push-notification/`

| Feature | Status | % |
|---------|--------|---|
| Souscription Web Push | ✅ Complet | 100% |
| Envoi depuis admin | ✅ Complet | 100% |
| Chiffrement RFC 8291/8292 | ✅ Complet | 100% |
| Nettoyage souscriptions mortes | ✅ Complet | 100% |
| Clé VAPID | ✅ Complet | 100% |
| **Rappels automatiques deadlines (cron 24h)** | ✅ Complet | 100% |

**Complétion globale**: 100%
**Bugs connus**: Aucun identifié

---

### Gestion Financière
**Fichiers**: `src/components/PaymentManager.tsx`, `src/components/AccountingPanel.tsx`, `src/components/PromoCodeManager.tsx`

| Feature | Status | % |
|---------|--------|---|
| Suivi paiements étudiants | ✅ Complet | 100% |
| Codes promo (% et fixe) | ✅ Complet | 100% |
| Early bird pricing | ✅ Complet | 100% |
| Paiements staff | ✅ Complet | 100% |
| Suivi dépenses | ✅ Complet | 100% |
| Export CSV | ✅ Complet | 100% |
| Vue comptabilité | ✅ Complet | 100% |

**Complétion globale**: 100%
**Bugs connus**: Aucun identifié

---

### Configuration Site
**Fichiers**: `src/components/SiteSettingsPanel.tsx`, `src/components/HeroImageSettings.tsx`, `src/hooks/use-site-settings.ts`, `src/hooks/use-hero-slides.ts`

| Feature | Status | % |
|---------|--------|---|
| Logo dynamique | ✅ Complet | 100% |
| Images hero carousel | ✅ Complet | 100% |
| Footer personnalisable | ✅ Complet | 100% |
| Thème clair/sombre | ✅ Complet | 100% |

**Complétion globale**: 100%
**Bugs connus**: Aucun identifié

---

### Infrastructure & DevOps
| Feature | Status | % |
|---------|--------|---|
| PWA (installable) | ✅ Complet | 100% |
| Service Worker | ✅ Complet | 100% |
| Edge Functions Deno | ✅ Complet | 100% |
| RLS Supabase | ✅ Complet | 100% |
| Real-time subscriptions | ✅ Complet | 100% |
| Tests unitaires | ⚠️ Placeholder | 2% |
| Couverture de code | ❌ Non configurée | 0% |
| Documentation | ✅ Créée maintenant | 100% |

---

## Audit UX Expert (prompt-17)

**Status**: ✅ 100% — Audit réalisé le 14 avril 2026

### Quick Wins UX (12 items)
| ID | Description | Impact | Effort | Fichiers |
|----|-------------|--------|--------|---------|
| QW-01 | Deadline urgency badge sur les briefs (< 4h 🔴, < 18h ⚠️) | 🔴 Fort | petit | ✅ StudentBriefs.tsx |
| QW-02 | Icônes contextuelles selon type ressource (PDF/vidéo/lien) | 🟠 Moyen | petit | ✅ StudentDashboard.tsx |
| QW-03 | StatsCard : supprimer checkmark inutile (ou remplacer par trend) | 🟠 Moyen | petit | ✅ StatsCard.tsx |
| QW-04 | Sidebar admin : grouper 17 items en sections (Pédagogie / Finance / Admin) | 🔴 Fort | petit | ✅ DashboardSidebar.tsx |
| QW-05 | Badge notifs pulsant (animate-pulse) si non lues | 🟡 Subtil | petit | ✅ DashboardSidebar.tsx |
| QW-06 | Progress bar: transition CSS duration-700 ease-out | 🟡 Subtil | petit | ✅ progress.tsx |
| QW-07 | Brief descriptions expandables (line-clamp-2 + "Lire plus") | 🟠 Moyen | petit | ✅ StudentBriefs.tsx |
| QW-08 | Attestation: checklist → stepper horizontal avec CTA contextuels | 🔴 Fort | petit | ✅ StudentAttestation.tsx |
| QW-09 | Skeletons dans 5 composants internes (BriefsSkeleton + 4 autres) | 🟠 Moyen | moyen | ✅ StudentBriefs + Messages + Portfolio + AuditLog + PaymentStatus |
| QW-10 | CohortCard: "⚡ places restantes" animé si spotsLeft <= 3 | 🟠 Moyen | petit | ✅ CohortCard.tsx |
| QW-11 | Annonces: badge "non lu" navigue vers onglet annonces | 🟠 Moyen | petit | ✅ StudentDashboard.tsx |
| QW-12 | Input search: spinner micro pendant debounce (search !== debouncedSearch) | 🟡 Subtil | petit | ✅ AdminDashboard.tsx + PaymentManager.tsx + AccountingPanel.tsx |

### Redesigns Suggérés
| Dashboard | Problème principal | Proposition | Status |
|-----------|-------------------|-------------|--------|
| Étudiant | BarChart par semaine peu engageant | ActivityHeatmap style GitHub (52×7 jours) | ✅ prompt-20 |
| Staff | Liste étudiants plate, pas d'alerte santé cohorte | Indicateur 🟢🟠🔴 par étudiant + compteur santé cohorte | ✅ prompt-20 |
| Admin | Overview sans alertes ni feed activité | AdminAlertBanner (portfolios/paiements/deadlines) + feed 10 dernières actions | ✅ prompt-20 |
| Landing | Carousel sans indicateurs, CTA inscrit si connecté | Dots carousel + smart CTA selon auth | ✅ prompt-24 |

### Nice to Have (7 items)
| ID | Description | Impact | Effort |
|----|-------------|--------|--------|
| NH-01 | Streak soumission + badges achievements (DB légère) | 🔴 Fort | moyen | ✅ prompt-22 |
| NH-02 | Galerie portfolio cohorte (opt-in, vue mosaïque) | 🔴 Fort | moyen |
| NH-03 | Feedback formateur inline sur briefs (migration + notif push) | 🔴 Fort | grand | ✅ prompt-21 |
| NH-04 | Mode Focus (sidebar masquée, plein écran, localStorage) | 🟠 Moyen | petit | ✅ prompt-21 |
| NH-05 | ActivityHeatmap style GitHub (remplace BarChart étudiant) | 🟠 Moyen | moyen | ✅ prompt-20 |
| NH-06 | Replay masterclass iframe YouTube/Vimeo intégré | 🟠 Moyen | petit |
| NH-07 | Edge Function payment-reminders (cron hebdo, pattern brief-reminders) | 🔴 Fort | moyen | ✅ prompt-21 |

---

## Audit Complet (prompt-02)

**Status**: ✅ 100% — Rapport d'audit généré le 14 avril 2026

### Résumé des Findings

| Catégorie | Critique 🔴 | Important 🟠 | Utile 🟡 | Total |
|-----------|------------|-------------|---------|-------|
| Sécurité | 1 | 3 | 2 | 6 |
| Performance | 2 | 2 | 2 | 6 |
| UX/UI | 1 | 2 | 3 | 6 |
| Tests | 2 | 3 | 0 | 5 |
| Fonctionnalités manquantes | 1 | 1 | 5 | 7 |
| **TOTAL** | **7** | **11** | **12** | **30** |

---

## Bugs Connus / Failles Identifiées

| ID | Sévérité | Module | Description | Status |
|----|---------|--------|-------------|--------|
| SEC-01 | 🔴 Critique | ProtectedRoute | Vérifie `roles.includes()` au lieu de `activeRole` — bypass possible pour utilisateurs multi-rôles | ✅ Corrigé (prompt-04) |
| SEC-02 | 🟠 Important | .gitignore | `.env` non exclu du repo git | ✅ Corrigé (prompt-06) |
| SEC-03 | 🟠 Important | Edge Functions | CORS wildcard `"*"` sur fonctions sensibles | ✅ Corrigé (prompt-06) |
| SEC-04 | 🟠 Important | StudentPortfolio | Pas de validation d'URL (XSS potentiel) | ✅ Corrigé (prompt-06) |
| PERF-01 | 🔴 Critique | App.tsx | Zéro code splitting / lazy loading | ✅ Corrigé (prompt-08) |
| PERF-02 | 🔴 Critique | use-cohorts.ts | Charge tous les enrollments en mémoire côté client | ✅ Corrigé (prompt-05) |
| PERF-03 | 🟠 Important | App.tsx | Aucun staleTime React Query | ✅ Corrigé (prompt-05) — use-cohorts |
| UX-01 | 🔴 Critique | Login.tsx | Pas de "Mot de passe oublié" | ✅ Corrigé (prompt-03) |
| UX-02 | 🟠 Important | App.tsx | Aucun Error Boundary React | ✅ Corrigé (prompt-07) |
| UX-03 | 🟠 Important | Login+Register | Double interface inscription incohérente | ✅ Corrigé (prompt-07) |
| TEST-01 | 🔴 Critique | AuthContext.tsx | Zéro test sur logique de rôles | ✅ Corrigé (prompt-09) |
| TEST-02 | 🔴 Critique | ProtectedRoute.tsx | Zéro test sur protection des routes | ✅ Corrigé (prompt-04) — 8 tests |
| FEAT-01 | 🔴 Critique | Login.tsx | Reset de mot de passe absent | ✅ Corrigé (prompt-03) |
| SEC-05 | 🟠 Important | Register/ResetPassword/SetupAccount | Aucun indicateur de force de mot de passe, minLength=6 | ✅ Corrigé (prompt-12) |

---

## Dette Technique

| Priorité | Item | Impact |
|---------|------|--------|
| ~~Haute~~ | ~~SEC-01 : ProtectedRoute vérifie les mauvais rôles~~ | ✅ Corrigé prompt-04 |
| ~~Haute~~ | ~~PERF-02 : use-cohorts O(n) enrollments côté client~~ | ✅ Corrigé prompt-05 |
| ~~Moyenne~~ | ~~PERF-03 : staleTime non configuré~~ | ✅ Corrigé prompt-05 (use-cohorts) |
| ~~Haute~~ | ~~PERF-01 : Pas de code splitting~~ | ✅ Corrigé prompt-08 |
| Moyenne | Tests unitaires (couverture ~18% — AuthContext, ProtectedRoute, validate-url, export-csv) | Risque régressions |
| ~~Haute~~ | ~~UX-01 / FEAT-01 : Mot de passe oublié absent~~ | ✅ Corrigé prompt-03 |
| ~~Haute~~ | ~~Credentials dans .env commité (sécurité)~~ | ✅ Corrigé prompt-06 |
| ~~Moyenne~~ | ~~UX-02 : Pas de Error Boundary~~ | ✅ Corrigé prompt-07 |
| ~~Moyenne~~ | ~~UX-03 : Double interface inscription~~ | ✅ Corrigé prompt-07 |
| ~~Moyenne~~ | ~~PERF-05 : Pagination grandes listes côté Supabase~~ | ✅ Corrigé prompt-11 |
| ~~Moyenne~~ | ~~UX-05 : Debounce sur les recherches~~ | ✅ Corrigé prompt-11 |
| ~~Haute~~ | ~~SEC-05 : Pas d'indicateur de force mot de passe~~ | ✅ Corrigé prompt-12 |
| ~~Moyenne~~ | ~~UX-04 : Empty states absents sur listes vides~~ | ✅ Corrigé prompt-13 |
| ~~Haute~~ | ~~FEAT-06 : Pas de vue profil étudiant pour le formateur~~ | ✅ Corrigé prompt-14 |
| ~~Haute~~ | ~~FEAT-04 : Pas de rappels automatiques pour les deadlines briefs~~ | ✅ Corrigé prompt-15 |
| ~~Moyenne~~ | ~~FEAT-07 : Pas d'export PDF batch pour les attestations d'une cohorte~~ | ✅ Corrigé prompt-16 |
| Moyenne | Pas de .env.example | Onboarding difficile |
| Basse | mock-data.ts non utilisé en prod | Dead code |
| Basse | 29+ `any` types dans les pages | Type safety dégradée |

---

## Historique des Prompts

| Prompt | Date | Description | Status |
|--------|------|-------------|--------|
| prompt-01 | 2026-04-14 | Création fichiers mémoire (ARCHITECTURE.md, CLAUDE.md, TEST_AGENT.md, PROJECT_STATE.md) | ✅ Terminé |
| prompt-02 | 2026-04-14 | Audit complet — 30 findings (7 critiques, 11 importants, 12 utiles) | ✅ Terminé |
| prompt-03 | 2026-04-14 | Ajout mot de passe oublié — ForgotPassword.tsx + ResetPassword.tsx + routes + lien Login | ✅ Terminé |
| prompt-04 | 2026-04-14 | Fix SEC-01 ProtectedRoute : activeRole au lieu de roles[] + 8 tests unitaires (9/9 ✅) | ✅ Terminé |
| prompt-05 | 2026-04-14 | PERF-02 use-cohorts : COUNT SQL groupé + React Query staleTime 5min (9/9 ✅) | ✅ Terminé |
| prompt-06 | 2026-04-14 | SEC-02 .env gitignore + .env.example — SEC-03 CORS whitelist 3 Edge Functions — SEC-04 isValidUrl() + StudentPortfolio (19/19 ✅) | ✅ Terminé |
| prompt-07 | 2026-04-14 | UX-02 ErrorBoundary (class component + main.tsx) — UX-03 suppression onglet signup Login.tsx → lien /register (19/19 ✅) | ✅ Terminé |
| prompt-08 | 2026-04-14 | PERF-01 code splitting : 11 pages → React.lazy() + Suspense dans App.tsx — build vérifié (11 chunks page) (19/19 ✅) | ✅ Terminé |
| prompt-09 | 2026-04-14 | TEST-01 AuthContext (9 tests : priorité rôles, localStorage, SIGNED_OUT, setActiveRole invalide) + TEST-03 export-csv (10 tests : BOM, headers, virgules, guillemets, newlines, null/undefined) (38/38 ✅) | ✅ Terminé |
| prompt-10 | 2026-04-14 | FEAT-02 use-unread-notifications.ts (COUNT SQL + real-time) + badge Bell dans DashboardSidebar (rouge, 99+, tooltip) (38/38 ✅) | ✅ Terminé |
| prompt-11 | 2026-04-14 | PERF-05 pagination Supabase .range() AuditLogPanel + AdminMessages (20/page) + composant Pagination réutilisable — UX-05 use-debounce.ts + debounce dans AccountingPanel, AdminDashboard, PaymentManager + pagination client-side historique (38/38 ✅) | ✅ Terminé |
| prompt-12 | 2026-04-14 | SEC-05 PasswordStrengthIndicator.tsx (barre 3 niveaux, 4 critères) + Register + ResetPassword + SetupAccount (indicateur + blocage si faible + minLength 8) — 16 tests (54/54 ✅) | ✅ Terminé |
| prompt-13 | 2026-04-14 | UX-04 EmptyState.tsx réutilisable (icon, title, description, action, className) + StudentBriefs + StudentMessages + NotificationPanel + StudentPortfolio — 9 tests (63/63 ✅) | ✅ Terminé |
| prompt-14 | 2026-04-14 | FEAT-06 pages/StudentProfilePage.tsx (infos, briefs, portfolio, paiements, messages) + route /student/:id + StaffDashboard lignes cliquables — 63/63 ✅ | ✅ Terminé |
| prompt-15 | 2026-04-14 | FEAT-04 supabase/functions/brief-reminders/index.ts (cron 24h@8h UTC) + config.toml schedule — notifications in-app + push via send-push-notification — 63/63 ✅ | ✅ Terminé |
| prompt-16 | 2026-04-14 | FEAT-07 export ZIP batch attestations cohorte — AttestationIssuer.tsx : bouton "Exporter toute la cohorte (ZIP)" + html2canvas par étudiant + JSZip + barre de progression — 63/63 ✅ | ✅ Terminé |
| prompt-17 | 2026-04-14 | Audit UX Expert — 12 quick wins (deadline urgency, resource icons, sidebar grouping, StatsCard checkmark, brief expand, attestation stepper…) + redesign 3 dashboards + 7 nice-to-have (heatmap, galerie, feedback, streak…) — Rapport uniquement, aucun code modifié | ✅ Terminé |
| prompt-18 | 2026-04-14 | QW-01 badge urgence deadline (🔴<4h / ⚠️<18h, animate-pulse) + QW-05 badge notifs pulsant + QW-06 Progress transition 700ms + QW-07 descriptions expandables (line-clamp-2 + Lire plus) + QW-09 Skeletons dans 5 composants (StudentBriefs/Messages/Portfolio/AuditLog/PaymentStatus) + QW-10 ⚡ places restantes CohortCard — 63/63 ✅ | ✅ Terminé |
| prompt-19 | 2026-04-14 | QW-02 icônes type ressource (PDF🔴/vidéo🔵/lien🟢) + QW-03 StatsCard trend (+12%/-3%) remplace checkmark SVG + QW-04 sidebar admin sections Pédagogie/Finance/Admin + icônes dédoublées (ListTodo, TrendingUp) + QW-08 stepper horizontal attestation (Portfolio→Paiement→Admin) avec CTA contextuels + QW-11 badge annonces cliquable → markAnnouncementsSeen() + QW-12 spinner debounce dans 3 search inputs — 63/63 ✅ | ✅ Terminé |
| prompt-20 | 2026-04-14 | ÉTUDIANT: ActivityHeatmap.tsx style GitHub (remplace BarChart) — STAFF: indicateur santé 🟢🟠🔴 par étudiant (ratio progress/expectedProgress) + compteur santé cohorte — ADMIN: AdminAlertBanner.tsx (portfolios/paiements/deadlines urgentes) + feed "Activité récente" 10 actions (enrollments+payments+submissions) — 63/63 ✅ | ✅ Terminé |
| prompt-21 | 2026-04-14 | NH-04 Mode Focus: toggle Maximize2/Minimize2 dans DashboardSidebar, masque sidebar, persiste localStorage, bouton flottant exit — NH-03 feedback formateur inline: BriefManager.tsx section expandable par brief (textarea+Save par étudiant, notif in-app étudiant), StudentBriefs.tsx bloc feedback sous statut — NH-07 payment-reminders Edge Function (cron 0 9 * * *, paiements pending > 30j, notif étudiant+admin+push) + migration brief_submissions.feedback — 63/63 ✅ | ✅ Terminé |
| prompt-22 | 2026-04-14 | NH-01 Badges motivation: migration student_badges (id, user_id, badge_type, earned_at, metadata, UNIQUE user+type, RLS) — use-student-badges.ts hook (fetch, hasStreak7, checkAndAwardBadges, upsert ignoreDuplicates, newBadge) — BadgeShowcase.tsx (grille 5 badges colorés/verrouillés, animation confetti CSS, barre de progression) — intégration StudentDashboard.tsx (import hook+composant, useRef checkBadgesRef, check on cohort load + realtime channel) — 63/63 ✅ | ✅ Terminé |
| prompt-23 | 2026-04-14 | Contrats: migration contract_templates + student_contracts (RLS, UNIQUE user+cohort, trigger updated_at, template HTML par défaut) — ContractSign.tsx (variables fillTemplate, scroll obligatoire, checkbox, nom signé = vérification profil, upsert snapshot) — ContractTemplateEditor.tsx (liste, editor HTML textarea, variables cliquables, aperçu demo) — SignedContractsPanel.tsx (table, filtre cohorte, modal snapshot, export CSV) — Register.tsx redirect vers /contract-sign si template actif — StudentDashboard.tsx carte "Mon contrat" + modal viewer — AdminDashboard.tsx onglet Contrats (Templates + Contrats signés) — DashboardSidebar FileSignature link — 63/63 ✅ | ✅ Terminé |
| restyle-public-1 | 2026-06-21 | Restyle page publique étape 1/2 : palette globale (CSS vars) bleu nuit #0E1B2E + doré #C5A05A + fond crème #FBFAF8 (remplace bleu électrique), typo Fraunces (display) + Inter (body), HERO premium (overlay nuit dégradé, fallback fond nuit + glow doré au lieu de photo stock, titre Fraunces XL, fallback hero_title/subtitle améliorés 3 publics, bouton doré, nav restylée, logo fallback "60" doré). Logique carrousel intacte. Sections 2-6 inchangées (étape 2). build OK | ✅ Terminé |
| rebrand-60 | 2026-06-21 | Rebranding 90→60 dans le code (index.html, vite.config, custom-sw, pages, composants, hooks fallbacks) + 3 littéraux duration_days par défaut 90→60 (FormationManager) + suppression code mort (mock-data.ts, NavLink.tsx, example.test.ts). localStorage keys "90jours-*" conservés (clés internes non affichées). build OK, 62 tests OK | ✅ Terminé |
| migration-supabase | 2026-06-21 | Préparation nouvelle instance Supabase : `MIGRATION_60JOURS.sql` (42 migrations concaténées + 5 modifs seed : suppr. formation/cohortes d'exemple, site_settings vidés, contrat 90→60, duration_days DEFAULT 60), `SETUP_SUPERADMIN.sql`, `DEPLOIEMENT.md`, `.gitignore`/`.env.example` durcis — build OK | ✅ Terminé |
| prompt-24 | 2026-04-14 | DB: migration testimonials (id, name, role, content, photo_url, is_visible, display_order, RLS public visible / admin all) — Index.tsx refonte complète: Section 2 "Comment ça marche" (4 étapes + IntersectionObserver), Section 3 "Nos formations" (cartes immersives couleurs filière violet/orange/cyan, hover glow, progress bar), Section 4 "Témoignages" (carousel auto-scroll 5s depuis Supabase, masqué si vide), Section 5 CTA gradient animé, Section 6 Footer inline (logo+tagline, nav scroll, contact, "Fait avec passion au Sénégal 🇸🇳") — TestimonialsManager.tsx (liste drag-and-drop reorder, toggle visibility, form add/edit, upload photo Supabase Storage, aperçu preview, dialog modal) — AdminDashboard.tsx onglet "testimonials" — DashboardSidebar MessageSquareQuote link — 63/63 ✅ | ✅ Terminé |
| waitlist | 2026-06-22 | Module liste d'attente complet : migration SQL (waitlist table + RLS + index + consent_marketing BOOLEAN) + WaitlistForm.tsx (checkbox consentement obligatoire) + WaitlistManager.tsx (stats 3 cartes, filtres, table, statut inline, CSV) + DashboardSidebar (ListPlus) + AdminDashboard onglet waitlist + Register.tsx 3 branches exclusives (loading/waitlist-only/form) + Dialog "Me prévenir" cohorte pleine + fix URL bypass cohorte pleine — migration indicatif +221 (Senegal) — 62/62 ✅ | ✅ Terminé |
| nettoyage-lovable | 2026-06-22 | Partie A: suppression toutes traces Lovable (vite.config.ts import+plugin componentTagger, package.json name→"60jours"+lovable-tagger devDep, index.html og:url "https://60jours.vercel.app"/og:image/twitter:image lovable.app→locaux, README.md réécrit, public/placeholder.svg supprimé) — Partie B: NotFound.tsx illustré (SVG 404 géométrique abstrait Fraunces, grille navy, lignes dorées, fond #0E1B2E, bouton doré) — Partie C: OfficialMessageSender emoji labels→Lucide (Globe/Info/PartyPopper/AlertTriangle) — build OK | ✅ Terminé |
| validation-formulaires | 2026-06-22 | Système de validation uniforme : hook `use-form-validation.ts` (champs requis, isValid global pour le bouton, erreurs par champ, blur/submit) + composants `ui/required-label.tsx` (astérisque rouge accessible aria) et `ui/field-error.tsx` (message destructive sous champ). Appliqué à 22 formulaires : Login, Register, ForgotPassword, ResetPassword, SetupAccount, ProfilePage, StudentProfile, StudentPortfolio (isValidUrl intégré), ContractSign (canSign + validation nom préservés), CohortForm, FormationManager, BriefManager, PaymentManager (montant conditionnel si type=formation), CategoryManager, PromoCodeManager, TaskManager, ContractTemplateEditor, TestimonialsManager, OfficialMessageSender, FormateurMessageSender, FormateurManager, WaitlistForm (consentement obligatoire préservé). AttestationTemplateEditor (formation auto-sélectionnée hors form) et HeroImageSettings (upload seul) : pas de champ requis, inchangés. Vérifs métier/force mdp/Supabase préservées. build OK, 62/62 tests, 0 emoji, 0 tiret long | ✅ Terminé |
| zero-emoji | 2026-06-22 | Suppression totale des 42 emojis résiduels dans 14 fichiers src/ : toasts (🎉🎓✅✓⚠), push notif titles (💬📝), badges urgence deadline (🔴⚠️→texte seul), fréquence briefs (📅📆→texte), statuts livraison (✓⏳⚠→texte), FormateurMessageSender 🌐→Globe Lucide, StaffDashboard emoji santé (🟢🟠🔴→CSS dots bg-green/orange/red-500), BadgeShowcase emoji→Lucide (PenLine/Flame/Palette/GraduationCap/Zap/Award), TaskManager priorités (🔴🟡🟢→texte), CohortCard ⚡→texte, StudentMessages/AdminMessages ✕→"Annuler", NotFound.tsx police Georgia→Fraunces. grep final : 0 emoji. build OK 62/62 ✅ | ✅ Terminé |
| attestation-conditions | 2026-06-22 | AttestationIssuer.tsx : paiement complet + livrable validé requis pour émettre (semi-auto). Deux pastilles colorées par étudiant (livrable nommé via deliverable_label dynamique, paiement payé/dû). Bouton individuel actif seulement si paiementComplet ET livrableValide ET !has_attestation. Batch ne prend que les éligibles. Motif de blocage affiché si non éligible. build OK 62/62 ✅ | ✅ Terminé |
| paiement-tranches-A | 2026-06-22 | DB: migration paiement_tranches (formations.tranche_1_amount + tranche_2_amount integer, backfill cohérent, CHECK reg+t1+t2=total_price, remplacement CHECK payments.payment_type → inscription/tranche_1/tranche_2/formation_complete, 'formation' conservé pour compat) + MIGRATION_PAIEMENT_TRANCHES.sql racine. FormationManager: champs Tranche 1/2 + validation somme=coût total (bouton bloqué sinon) + bandeau récap. PaymentManager: types inscription/tranche 1/tranche 2/formation complète, montant pré-rempli selon type+formation (modifiable), filtre tableau vivant. FIX discordance 50/60: montant dû = total_price partout (AttestationIssuer, AttestationTracker, StudentAttestation). types.ts + use-cohorts.ts synchronisés. build OK 62/62 ✅ | ✅ Terminé |
| simplify-tranches | 2026-06-22 | FormationManager: saisie admin simplifiée à inscription + coût total uniquement. Tranches calculées automatiquement à l'enregistrement (tranche_1 = floor(coût/2), tranche_2 = reste), colonnes DB conservées, CHECK reg+t1+t2=total_price respectée. Champs manuels Tranche 1/2 retirés, validation total_price > registration_fee, aide dynamique lecture seule sous le coût total. build OK 62/62 ✅ | ✅ Terminé |
| vercel-spa-rewrite | 2026-06-22 | Création vercel.json (rewrite `/(.*) -> /index.html`) : corrige le 404 Vercel générique sur rafraîchissement et accès direct aux routes non-racine (ex. /admin?tab=overview). netlify.toml conservé sans modification. build OK | ✅ Terminé |
| paiement-etudiant-B1 | 2026-06-22 | DB: migration wave_link (site_settings.wave_payment_url TEXT défaut = lien marchand historique) + MIGRATION_WAVE_LINK.sql racine. Lien Wave éditable depuis l'admin: use-site-settings expose wave_payment_url (+ repli WAVE_PAYMENT_URL_FALLBACK), SiteSettingsPanel champ "Lien de paiement Wave" (validation http(s)), PaymentManager et StudentPaymentStatus lisent le lien depuis site_settings (constantes codées en dur supprimées). FIX régression comptabilisation: StudentPaymentStatus somme désormais TOUS les types (inscription / tranche_1 / tranche_2 / formation_complete / formation hérité). Vue étudiant: toggle "Payer en 1 fois" / "Payer en 2 tranches" (état d'affichage), échéances J+15 (inscription) / J+30 (formation ou tranche 1) / J+60 (tranche 2) calculées depuis cohort.start_date via date-fns, chaque bouton Wave ouvre `${wave_url}?amount=${montant}` au montant exact de la ligne, bouton solde global au montant restant. Déclaration enregistre le bon payment_type selon la ligne. types.ts site_settings synchronisé. build OK 62/62 ✅ | ✅ Terminé |
| paiement-B2 | 2026-06-22 | PARTIE A: badge retard soft non bloquant dans StudentPaymentStatus.tsx — `overdueCount(deadlineDays, isPaid)` via differenceInDays date-fns — si date dépassée ET non payé: bandeau amber "En retard depuis X jours" (AlertCircle + bg-yellow-500/10 text-yellow-700) sous la ligne concernée — aucun bouton bloqué — inscription (J+15), formation/tranche1 (J+30), tranche2 (J+60) — si formationFullyPaid: aucune tranche en retard. PARTIE B: Edge Function payment-reminders — FIX bug 1: `amount/100` et colonne `currency` inexistante retirés, affichage `amount.toLocaleString("fr-FR") + " FCFA"` — FIX bug 2: deduplication 7 jours (query notifications WHERE type="payment" AND created_at > now-7j par user_id), skip si deja rappele cette semaine. build OK 62/62 ✅ | ✅ Terminé |
| refonte-contrat | 2026-06-22 | PARTIE A variables: le moteur réel utilise `{{double_accolade}}` en français (regex ne matche QUE `{{...}}`). Ajout de `{{livrable}}` (formations.deliverable_label), `{{frais_inscription}}` (registration_fee) et `{{cout_total}}` (total_price) dans fillTemplate (ContractSign), chips cliquables + DEMO_VARS (ContractTemplateEditor). La date de signature existe déjà sous `{{date_signature}}` (format d MMMM yyyy, ré-injectée au moment de la signature dans handleSign) et est réutilisée. ContractSign: requête cohort enrichie (registration_fee, total_price, deliverable_label). PARTIE B contenu: nouveau contrat rédigé (parties Organisme/Apprenant + Articles 1 Objet, 2 Engagement Apprenant, 3 Conditions financières, 4 Délivrance attestation 2 conditions, 5 Engagement Organisme, 6 Dispositions générales droit sénégalais + pied "Fait le {{date_signature}}"). PARTIE C design: document premium CSS inline scopé `.contract-doc` (Fraunces serif via @import, filet doré #C5A05A sous titre, numéros d'articles en pastilles dorées, palette navy #0E1B2E sur fond crème #FBFAF8, fin-box prix). Template appliqué via nouvelle migration `20260623120000_contract_template_premium.sql` + `MIGRATION_CONTRAT_PREMIUM.sql` racine (UPDATE template générique actif, fallback INSERT). Logique de signature INTACTE (scroll, case, nom exact, snapshot), SignedContractsPanel non touché. À EXÉCUTER sur Supabase: MIGRATION_CONTRAT_PREMIUM.sql (le contenu vit en base). build OK 62/62 ✅ | ✅ Terminé |
