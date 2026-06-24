# PROJECT_STATE.md — État du Projet

**Dernière mise à jour**: 22 juin 2026
**Branche active**: `main`
**Prompt actuel**: payment-reminders recalé sur les vraies échéances J+15/J+30/J+60 (à redéployer sur Supabase)

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
| Composants React | 100 |
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
| sidebar-compact | 2026-06-22 | DashboardSidebar.tsx : remplacement des 5 lignes utilitaires pleine largeur par zone compacte 2 niveaux. Expanded: rangée icones horizontale (Mode Focus h-8/w-8 + ThemeToggle + Notifications+badge h-8/w-8 avec gap-0.5) + bloc profil (Avatar + prénom + ChevronDown, w-full h-10) ouvert via shadcn DropdownMenu (Mon profil → /profile, separateur, Déconnexion → handleSignOut, text-destructive). Collapsed: colonne verticale icones (h-10/w-10) + Avatar seul (meme DropdownMenu). Mode Focus INTACT (onToggleFocusMode, Maximize2, localStorage, bouton flottant Minimize2 hors SidebarNav). Mobile Sheet toujours expanded=true, applique layout expanded. Imports ajoutes: ChevronDown Lucide, DropdownMenu/Content/Item/Separator/Trigger shadcn. build OK 62/62 ✅ | ✅ Terminé |
| payment-reminders-echeances | 2026-06-23 | PRIORITÉ 4. Réécriture de supabase/functions/payment-reminders/index.ts : rappels basés sur les VRAIES échéances (J+15 inscription, J+30 tranche 1, J+60 tranche 2 depuis cohort.start_date) au lieu de l'âge d'un paiement pending. Même logique de montants que StudentPaymentStatus : inscription=registration_fee, formationCost=total_price-registration_fee, tranche1=tranche_1_amount (fallback floor/2). PAYÉ : somme des payments status=paid (deleted_at null) par catégorie inscription / formation (FORMATION_TYPES tranche_1/tranche_2/formation_complete/formation). Rappel émis SEULEMENT si échéance dépassée (now>due) ET shortfall>0 (montant non couvert) : inscription shortfall=eff-paid.inscription ; tranche1=tranche1-paid.formation ; tranche2=formationCost-max(paid.formation,tranche1) (portions non chevauchantes). Un pending en attente de validation ne déclenche PLUS de faux rappel (on ne lit que les paid). Remise promo INTÉGRÉE : effectiveInscription = registration_fee - discount (lu défensivement depuis promo_code_usage.discount_amount ; si colonne absente -> remise ignorée sans casser). Message clair par échéance (label + cohorte + montant) + total. Déduplication 7 jours préservée (notifications type=payment). Bonus : EMOJIS retirés (💳/⚠️, violation charte) ; embed cassé profiles:user_id sur payments remplacé par jointure client-side (profils chargés séparément) -> la fonction ne plante plus sur la nouvelle instance. Cron config.toml inchangé. build app OK 62/62 (fonction Deno hors build). À REDÉPLOYER : supabase functions deploy payment-reminders. | ✅ Terminé |
| branding-pwa | 2026-06-23 | PRIORITÉ 3 (3 points rouges branding). DIAGNOSTIC : pwa-icon-192/512.png byte-identiques et 328x170 (non carrés, manifest mentait sur les sizes) ; logo_url absent de Login (logoDark/White en dur) + DashboardSidebar ("60" en dur) ; hero_image_url = code mort (heroFileRef + branches "hero" dans handleImageUpload/handleRemoveImage, AUCUNE UI rendue, le hero public utilise hero_slides). CORRECTION (1) icônes : nouveau public/pwa-icon.svg CARRÉ 512 (navy #0E1B2E + "60" doré #C5A05A + filet, zone de sécurité maskable respectée) ; vite.config manifest -> icons SVG (purpose any + maskable, sizes "any"), theme_color/background_color #0E1B2E, includeAssets svg ; index.html favicon SVG+ico, apple-touch + og:image + twitter:image -> SVG, theme-color #0E1B2E ; suppression des 2 PNG cassés (git rm). (2) logo propagé : Login (gauche + mobile) et DashboardSidebar (admin/staff/student) lisent settings.logo_url via useSiteSettings, fallback élégant CONSERVÉ (logoDark/White pour Login, monogramme "60" pour sidebar) si logo_url vide -> rien ne casse tant qu'aucun logo uploadé. (3) hero_image_url : code mort retiré de SiteSettingsPanel (heroFileRef, branches "hero", champ Props), handlers logo-only ; colonne base NON touchée. zéro emoji/tiret long. build OK 62/62. ACTION MANUELLE RESTANTE : SVG installable sur navigateurs modernes, mais pour compat maximale (apple-touch-icon iOS, og:image réseaux sociaux qui ne rendent pas le SVG) fournir des PNG carrés exportés du SVG : pwa-icon-192.png (192x192), pwa-icon-512.png (512x512), apple-touch 180x180, og-image raster (1200x630). SIGNALEMENT : Navbar/ForgotPassword/ResetPassword utilisent encore les assets logo en dur (hors scope Login+sidebars, à unifier si souhaité). | ✅ Terminé |
| promo-snapshot-remise | 2026-06-23 | Immunisation de la remise contre la désactivation du code (la migration promo n'étant pas encore jouée, complétée directement dans les 2 fichiers identiques MIGRATION_PROMO_RPC.sql + supabase/migrations/20260623140000_promo_rpc.sql). PARTIE 1 migration : ADD COLUMN IF NOT EXISTS `promo_code_usage.discount_amount integer NOT NULL DEFAULT 0` (montant FCFA figé). apply_promo_code (SIGNATURE INCHANGÉE text,uuid,uuid,uuid) calcule la remise CÔTÉ SERVEUR : lit discount_type/value du code + registration_fee de la cohorte (JOIN cohorts->formations sur p_cohort_id, non manipulable par le client) -> percentage: round(fee*value/100) ; fixed: min(value,fee) -> stocke dans discount_amount à l'INSERT. Choix : calcul serveur plutôt que montant passé par le front (abuse-proof, un client ne peut pas gonfler sa remise ; signature inchangée). Sécurité/atomicité/anti-doublon conservées. PARTIE 2 front : src/lib/student-discount.ts lit désormais le discount_amount FIGÉ (select user_id, discount_amount, payments:payment_id(cohort_id)) -> PLUS d'embed promo_codes -> la remise ne dépend plus de l'état (is_active) du code. buildDiscountMap(rows) somme discount_amount (plus de param fee) ; fetchStudentDiscount(userId, cohortId) (plus de param fee) ; discountForCode conservé pour l'aperçu en session (StudentPaymentStatus.handleApplyPromo). 4 consommateurs mis à jour (appels simplifiés) : StudentPaymentStatus, StudentAttestation, AttestationIssuer (select registration_fee retiré, devenu inutile), AttestationTracker. Sans remise : comportement inchangé (discount_amount=0). build OK 62/62. À EXÉCUTER sur Supabase : MIGRATION_PROMO_RPC.sql (ré-exécutable : ADD COLUMN IF NOT EXISTS + DROP/CREATE FUNCTION). Le SIGNALEMENT précédent (code désactivé -> remise perdue côté étudiant) est désormais RÉSOLU. | ✅ Terminé |
| promo-persistance-attestation | 2026-06-23 | FINALISATION codes promo (remise persistante + seuil attestation). Nouveau helper partagé `src/lib/student-discount.ts` : `discountForCode(type, value, registrationFee)` (pure : percentage -> round(fee*v/100), fixed -> min(value, fee)), `fetchPromoUsage(userIds)` (lit promo_code_usage avec embeds promo_codes:promo_code_id + payments:payment_id, FK réelles, RLS own/admin), `buildDiscountMap(rows, feeByCohort)` -> Map "userId_cohortId"->remise (frais d'inscription par cohorte, plafonné), `fetchStudentDiscount(userId, cohortId, fee)`. PARTIE 2 StudentPaymentStatus : état persistedDiscount chargé dans fetchData via fetchStudentDiscount (après la formation) ; discountAmount = persistedDiscount>0 ? persistedDiscount : sessionDiscount ; effectiveInscriptionAmount/effectiveTotalDue/remaining reflètent la remise même après rechargement ; si persistedDiscount>0 le champ code est remplacé par "Remise déjà appliquée" (anti double application, en plus de la contrainte base) ; handleApplyPromo réutilise discountForCode (cohérence session/base). PARTIE 3 seuil attestation corrigé dans les 3 écrans, réutilisant le helper : StudentAttestation (totalRequired = total_price - fetchStudentDiscount), AttestationIssuer (select + registration_fee, fetchPromoUsage(studentIds) filtré sur la cohorte + buildDiscountMap, required_total = requiredTotal - discount par étudiant), AttestationTracker (multi-cohorte : fetchPromoUsage(userIds) + buildDiscountMap avec registration_fee par cohorte via useCohorts, requiredTotal -= discount par clé user_cohort). Donc un étudiant ayant payé son total RÉDUIT est soldé et éligible. tranches/formationCost INCHANGÉS ; sans remise comportement identique (discount=0). RLS OK (promo_code_usage own/admin, payments own/admin, promo_codes active/admin). build OK 62/62. SIGNALEMENT : si un code utilisé est ensuite désactivé (is_active=false), l'embed promo_codes côté ÉTUDIANT (policy "active only") renvoie null -> remise perdue à la lecture étudiante (admin non affecté, FOR ALL) ; correctif futur = snapshot discount_type/value dans promo_code_usage à l'application. | ✅ Terminé |
| promo-solde-global | 2026-06-23 | StudentPaymentStatus.tsx : la remise promo se répercute désormais sur le SOLDE GLOBAL et le restant, pas seulement la ligne inscription. `discountAmount = promoApplied ? max(0, inscriptionAmount - effectiveInscriptionAmount) : 0` et `effectiveTotalDue = totalDue - discountAmount` (après totalDue). `remaining = max(effectiveTotalDue - totalPaid, 0)` -> "Restant" + bouton "Payer le solde global" (waveHref(remaining)) reflètent la remise (payer le solde ne récupère plus la différence). `inscriptionFullyPaid` passe à `inscriptionPaid >= effectiveInscriptionAmount` (cohérence : l'inscription réduite payée compte comme soldée). formationCost / tranche1 / tranche2 / formationFullyPaid INCHANGÉS. Égalité vérifiée : effectiveInscriptionAmount + formationCost = effectiveTotalDue. Note "Remise code promo : X déduits du total" affichée (Tag, accent) sous le résumé si discountAmount > 0. zéro emoji/tiret long. build OK 62/62. SIGNALEMENTS (à traiter séparément) : (1) seuil attestation "paiement complet" utilise total_price brut dans AttestationIssuer.tsx:198 (payments_total>=required_total l.313/449/544), attestation/AttestationTracker.tsx:96-98, StudentAttestation.tsx:69/73 -> un étudiant avec remise paie effectiveTotalDue<total_price et n'atteindrait jamais le seuil ; ces 3 composants doivent soustraire la remise (via promo_code_usage->promo_codes). (2) Persistance : promoApplied est un état de session (réinitialisé après déclaration) ; au rechargement la remise n'est pas rechargée depuis promo_code_usage, donc remaining/inscription reviennent au plein tarif tant que la remise n'est pas reconstruite depuis la base. | ✅ Terminé |
| promo-ui-etudiant | 2026-06-23 | CODES PROMO étape 2/2 (câblage UI). StudentPaymentStatus.tsx : champ "Code promo" + bouton Appliquer ajoutés sous la ligne Inscription, visibles seulement si inscription non payée (!inscriptionFullyPaid). Validation via `(supabase.rpc as any)("validate_promo_code", { p_code, p_cohort_id: cohortId })` (cast car RPC non typée dans types.ts). Si invalide -> message d'erreur sous le champ (row.message). Si valide -> calcul réduction sur l'inscription (percentage : round(inscription*(1-v/100)) ; fixed : max(0, inscription-v)), affichage montant barré + nouveau montant en doré, état promoApplied + bouton Retirer. Répercussion : nouvel état `effectiveInscriptionAmount = promoApplied ? newAmount : inscriptionAmount` utilisé dans la PaymentLine inscription (amount + waveAmount = bouton Wave au montant réduit), lineAmount("inscription"), et le label declareOptions. À la déclaration (handleDeclarePayment) : insert payments .select("id").single() pour récupérer le payment_id, puis si type=inscription && promoApplied -> `apply_promo_code(p_code, p_user_id, p_payment_id, p_cohort_id)` ; si success=false (épuisé/déjà utilisé) toast "Code promo non appliqué" mais le paiement reste créé (choix : le paiement existe déjà, on informe sans le supprimer). Tranches/coût formation/total_price/remaining INCHANGÉS (réduction strictement sur l'inscription). zéro emoji, zéro tiret long, Tag Lucide, design 60jours. build OK 62/62. Pré-requis base : MIGRATION_PROMO_RPC.sql doit être exécutée sur Supabase. | ✅ Terminé |
| promo-une-fois-par-etudiant | 2026-06-23 | Complément de la migration promo (non encore jouée en base, donc complétée directement dans les 2 fichiers identiques MIGRATION_PROMO_RPC.sql + supabase/migrations/20260623140000_promo_rpc.sql) : un code ne peut être utilisé qu'UNE fois par étudiant. (1) Index unique idempotent `CREATE UNIQUE INDEX IF NOT EXISTS promo_code_usage_unique_user_code ON public.promo_code_usage (promo_code_id, user_id)` ajouté après BEGIN (avant les fonctions). (2) apply_promo_code : pré-vérification `IF EXISTS (SELECT 1 FROM promo_code_usage WHERE promo_code_id=v_id AND user_id=p_user_id)` -> "Vous avez déjà utilisé ce code." SANS incrémenter ni réinsérer ; et incrément+INSERT déplacés dans un sous-bloc BEGIN/EXCEPTION WHEN unique_violation pour la concurrence (la violation de l'index annule aussi l'incrément current_uses, pas de fuite). Reste intact : validate_promo_code, incrément atomique borné par max_uses, sécurité auth.uid()=p_user_id, search_path, REVOKE/GRANT, BEGIN/COMMIT, en-tête. Les 2 fichiers restent identiques (diff -q OK). build OK 62/62. À EXÉCUTER sur Supabase : MIGRATION_PROMO_RPC.sql. | ✅ Terminé |
| promo-rpc | 2026-06-23 | CODES PROMO étape 1/2 (backend). Nouvelle migration `supabase/migrations/20260623140000_promo_rpc.sql` + `MIGRATION_PROMO_RPC.sql` racine (identiques, BEGIN/COMMIT). Deux fonctions SECURITY DEFINER (search_path = public figé) pour appliquer un code sans donner de droit d'écriture direct sur promo_codes (table réservée super_admin). (1) `validate_promo_code(p_code text, p_cohort_id uuid)` STABLE, lecture seule -> TABLE(valid bool, promo_code_id uuid, discount_type, discount_value, message) : vérifie code existe / is_active / non expiré (early_bird_deadline > now) / non épuisé (max_uses null OU current_uses < max_uses) / cohorte compatible (cohort_id null = toutes, sinon = p_cohort_id), message d'erreur clair par cas. (2) `apply_promo_code(p_code, p_user_id, p_payment_id, p_cohort_id)` VOLATILE -> TABLE(success bool, message) : garde sécurité auth.uid() = p_user_id (un étudiant n'applique que pour lui), incrément ATOMIQUE concurrent-safe (UPDATE ... SET current_uses+1 WHERE id=v AND is_active AND deadline OK AND current_uses<max_uses AND cohorte OK RETURNING : le verrou de ligne sérialise les applications concurrentes, max_uses jamais dépassé), puis INSERT promo_code_usage (promo_code_id, user_id, payment_id). Permissions : REVOKE ALL FROM PUBLIC + GRANT EXECUTE TO authenticated sur les 2. Réduction calculée côté front en étape 2/2 (porte sur frais d'inscription : percentage -> inscription*(1-v/100), fixed -> max(0, inscription-v)). DROP FUNCTION IF EXISTS avant CREATE (idempotent). Aucune modif UI ni table. À EXÉCUTER sur Supabase : MIGRATION_PROMO_RPC.sql. build OK 62/62. Étape 2/2 = câblage UI (saisie code dans StudentPaymentStatus, appel RPC, montant inscription réduit). | ✅ Terminé |
| inbox-messages-formateur | 2026-06-23 | PRIORITÉ 1 étape 3/3 (boucle "message aux formateurs" FERMÉE). Nouveau composant StaffMessages.tsx (inspiré de StudentMessages, ce dernier NON modifié) : lit messages WHERE parent_id IS NULL AND recipient_id = formateur courant (les DM envoyés par l'admin via StaffMessageSender, cohort_id null), affiche expéditeur (Administration), titre, contenu, date, badge "Administration", fil de réponses (parent_id), realtime INSERT, skeleton + EmptyState propre. Réponse implémentée : insert messages parent_id + recipient_id = expéditeur d'origine (admin) + cohort_id null ; RLS INSERT staff OK via "Staff can send messages" (has_role staff). Round-trip complet : la réponse du formateur apparaît dans le fil côté admin (AdminMessages charge les replies par parent_id). Intégration : placeholder tab=messages du StaffDashboard remplacé par <StaffMessages /> ; deep-link notif /staff?tab=messages mène désormais à l'écran réel. RLS lecture confirmée : "Staff can view all messages" (has_role staff/super_admin) -> aucune migration nécessaire. RÉSERVE : la table messages n'a pas de colonne is_read (StudentMessages ne marque rien non plus) ; l'état lu/non-lu vit sur la table notifications (NotificationPanel), pas sur messages -> pas de marquage "lu" sur l'inbox, par cohérence avec le modèle. build OK 62/62. PRIORITÉ 1 (3 étapes) terminée. | ✅ Terminé |
| staff-routing-onglets | 2026-06-23 | PRIORITÉ 1 étape 2/3. StaffDashboard.tsx ne routait que `tab=calendar` : tous les autres onglets (sidebar + deep-links notif) tombaient sur la vue par défaut, et messages/attestations n'avaient aucun contenu. Lecture du paramètre `tab` (searchParams) et routage dédié pour CHAQUE onglet attendu : calendar (DashboardCalendar), tasks (StaffTasks), briefs (BriefManager role=staff), portfolios (PortfolioManager), announcements + resources (cartes extraites en variables réutilisées aussi dans l'overview, zéro duplication), overview/défaut (vue complète inchangée). messages -> placeholder propre (MessageSquare, "lecture arrive prochainement" en attendant l'inbox étape 3/3). attestations -> placeholder info (Award, "délivrées par l'administration") car aucune fonctionnalité staff attestation n'existe. Sidebar staff enrichie : ajout liens Briefs (BookOpen) et Portfolios (Briefcase). Résultat : tous les deep-links NotificationPanel rôle staff (briefs/messages/tasks/portfolios/attestations) et tous les liens sidebar staff mènent désormais à un écran réel (plus de lien mort ; messages = placeholder temporaire). calendar et overview inchangés. build OK 62/62. Reste étape 3/3 : construire l'inbox messages formateur (lecture table messages recipient_id=formateur). | ✅ Terminé |
| rls-staff-validation | 2026-06-23 | PRIORITÉ 1 étape 1/3. Correction faille fonctionnelle : le rôle staff (formateur) n'avait que SELECT sur brief_submissions et portfolios, donc le feedback de brief (BriefManager.tsx:187 update feedback) et la validation de portfolio (PortfolioManager.tsx:66 update status/admin_notes/validated_at) étaient rejetés silencieusement par la RLS. Nouvelle migration `supabase/migrations/20260623130000_rls_staff_validation.sql` + `MIGRATION_RLS_STAFF_VALIDATION.sql` racine (identiques, BEGIN/COMMIT) : AJOUTE 2 policies UPDATE via has_role(auth.uid(),'staff') -> "Staff can update brief submissions" (brief_submissions FOR UPDATE USING+WITH CHECK staff) et "Staff can validate portfolios" (portfolios FOR UPDATE USING+WITH CHECK staff). DROP POLICY IF EXISTS sur les nouveaux noms uniquement (idempotent). AUCUNE policy existante modifiée (students update own / admins manage all conservées). Pas de modif de code (colonnes écrites cohérentes avec les policies). À EXÉCUTER sur Supabase : MIGRATION_RLS_STAFF_VALIDATION.sql. build OK 62/62. Étapes 2 (routing onglets StaffDashboard) et 3 (inbox messages formateur) à suivre. | ✅ Terminé |
| message-aux-formateurs | 2026-06-22 | Nouveau flux admin -> formateurs (n'existait pas : les senders existants ciblent tous les étudiants). Composant src/components/StaffMessageSender.tsx (bouton "Message aux formateurs", icône UserCog, monté UNIQUEMENT sur AdminDashboard à côté de FormateurMessageSender/OfficialMessageSender). Champs : Destinataire (Select "Tous les formateurs" + chaque formateur par prénom+nom, liste via user_roles role='staff' joint à profiles, pattern fetchStaff ; court-circuit si aucun staff) REQUIS, Titre (optionnel), Message (requis), validation via use-form-validation (bouton désactivé tant que destinataire+message vides). Envoi 2 canaux comme FormateurMessageSender : (1) table messages, une ligne par formateur (sender_id=admin, recipient_id=formateur, cohort_id=null) ; (2) notifications, une ligne par formateur, préfixe "Message de l'administration : ..." ; (3) push sendPushToUsers. try/catch/finally + toast succès/erreur + reset. RLS OK sans migration : notifications "Admins can manage all notifications" FOR ALL (insert toute cible) + "Staff can view notifications" (lecture) ; messages "Staff can send messages" (admin insert toute recipient) + "Staff can view all messages" (lecture). Réception : NotificationPanel monté sur StaffDashboard lit notifications WHERE user_id=current -> formateurs reçoivent. SIGNALEMENT : pas d'écran staff dédié pour lire la table messages (recipient_id=leur id) ; le canal fiable de lecture est la notification. OfficialMessageSender/FormateurMessageSender non modifiés. build OK 62/62 ✅ | ✅ Terminé |
| labels-cohortes-formation | 2026-06-22 | Harmonisation des libellés de cohortes dans tous les menus déroulants pour distinguer deux cohortes de même nom (ex "Genesis (Graphisme)" vs "Genesis (Head of AI)"). Pattern uniforme `{nom}{c.formation ? ` (${c.formation.name})` : ""}` (parenthèses, pas de tiret ; pas de parenthèses vides si formation absente), modèle = BriefManager/AttestationIssuer déjà corrects. PARTIE 1 (8 menus, formation déjà chargée via useCohorts) : StaffDashboard:324, PaymentManager:437, AdminMessages:187, PortfolioManager:98, PromoCodeManager:221, OfficialMessageSender:139, FormateurMessageSender:132, SignedContractsPanel:110. PARTIE 2 (2 menus, jointure formation ajoutée à la requête) : TaskManager (select "id, name, formation:formations(name)" + état typé + label) et DashboardCalendar (idem). Jointure formation:formations(name) légitime (FK cohorts->formations existe, pas un embed profiles cassé). 3 menus déjà corrects non touchés. build OK 62/62 ✅ | ✅ Terminé |
| fix-sentinel-none | 2026-06-22 | Correction du sentinel `["none"]` passé à `.in("user_id", ...)` sur colonne uuid quand la liste d'IDs est vide : Postgres tentait de caster "none" en uuid -> erreur 22P02, avalée par un catch muet -> toast "Impossible de charger...". Survenait dès qu'il n'y a aucun étudiant/staff (base neuve). 3 occurrences corrigées par court-circuit propre (liste vide, sans requête) : (1) AdminDashboard.fetchStudents -> `if (studentIds.length === 0) { setStudents([]); return; }` puis `.in("user_id", studentIds)`. (2) StaffDashboard.fetchData -> ressources/annonces (scopées cohorte) chargées d'abord, requête enrollments exécutée seulement si studentIds non vide (sinon enrollments=[]), donc la cohorte s'affiche même sans étudiant. (3) AccountingPanel.fetchStaff -> `if (ids.length === 0) { setStaffList([]); return; }`. Catch muets améliorés : `catch (err) { console.error("<fn>:", err); ... }` dans fetchStudents et StaffDashboard.fetchData (toast conservé) pour rendre les vraies erreurs Supabase visibles. Comportement inchangé quand il y a des données. Vérif : 0 sentinel "none" restant dans src/. build OK 62/62 ✅ | ✅ Terminé |
| nettoyage-coherence | 2026-06-22 | Corrections de cohérence (suite audit). (1) Fallbacks hero unifiés : use-site-settings.ts defaults alignés sur les textes de référence d'Index.tsx (hero_title "Révélez votre potentiel créatif en 60 jours" + hero_subtitle "Que vous soyez en reconversion..."), plus de fallback mort/divergent. (2) Type legacy "formation" rendu filtrable dans PaymentManager : ajouté à PAYMENT_TYPES (formulaire) et au dropdown de filtre par type (cohérent avec la stat qui le comptait déjà). (3) Catégorie comptabilité : AccountingPanel allTransactions étiquetait tout paiement étudiant "Inscription" ; nouveau map paymentTypeLabels -> category reflète le vrai payment_type (Inscription/Tranche 1/Tranche 2/Formation complète), options ajoutées au dropdown de filtre catégorie. (4) Code mort supprimé : src/components/CohortCard.tsx (0 importeur, supplanté par PublicCohortCard inline ; vérifié avant suppression). (5) Tiret long retiré dans NotFound.tsx (commentaire SVG) -> virgule. Scan final : 0 tiret long dans src/. build OK 62/62 ✅ | ✅ Terminé |
| fix-embeds-profiles | 2026-06-22 | Correction systémique des embeds PostgREST `profiles:<col>(...)` cassés (aucune FK vers profiles dans le schéma : tous les user_id/staff_id/staff_user_id référencent auth.users). Même correctif que fetchStudents partout : requête principale sans embed + chargement profiles séparé + jointure client-side via Map, forme de données consommée par le rendu préservée à l'identique. (1) AdminDashboard.fetchActivity : 3 selects (enrollments/payments/brief_submissions) -> user_id explicite + 1 requête profiles groupée, fmt(user_id) au lieu de fmt(row.profiles), embeds valides cohorts/briefs conservés. (2) StaffDashboard.fetchData : enrollments select * sans embed + profiles map (first_name/last_name/phone), s.profiles?.* préservé. (3) BriefManager : enrollments select user_id + profiles map après filtre rôle étudiant, student.profiles préservé. (4) AttestationIssuer : enrollments select user_id + profiles map, lecture profileMap.get(e.user_id) au lieu de e.profiles. (5) SignedContractsPanel : student_contracts sans embed profiles (embed cohorts:cohort_id VALIDE conservé, FK existe) + profiles map, c.profile preservé. (6) AccountingPanel : payments (embed cohorts/formations valide conservé) + staff_payments sans embed, 1 requête profiles groupée (user_id + staff_user_id), p.profiles/sp.profiles préservés ; handleAddStaffPayment insert .select(*) + rattache profil depuis staffList. Bonus hors-liste corrigés aussi : ContractSign (staff_formations.staff_id -> profil formateur chargé séparément). Vérif finale : 0 embed profiles: restant dans src/ (seuls subsistent les assignations client-side .profiles=). build OK 62/62 ✅ | ✅ Terminé |
| carte-hierarchie-fix-students | 2026-06-22 | PARTIE A (fix): AdminDashboard.tsx fetchStudents échouait (toast "Impossible de charger les étudiants récents") car l'embed PostgREST `profiles:user_id(...)` sur enrollments ne se résout pas : aucune FK enrollments->profiles dans la nouvelle instance (user_id REFERENCES auth.users, types.ts ne liste que enrollments_cohort_id_fkey, 0 FK vers profiles dans tout le schéma). Pas un souci RLS (super_admin a FOR ALL). Correctif CODE (pas de migration) : requête enrollments sans embed (colonnes explicites) + chargement profiles séparé + jointure client-side via Map sur user_id (même pattern que fetchUsers qui fonctionne). Toast conservé mais ne se déclenche plus en nominal. Note: même embed cassé ailleurs (fetchActivity, StaffDashboard fetchData, BriefManager, AttestationIssuer, SignedContractsPanel, AccountingPanel) hors périmètre de cette tâche. PARTIE B (carte publique): PublicCohortCard hiérarchie inversée pour distinguer 2 cohortes de même nom sur formations différentes. En-tête navy: DURÉE à gauche (cohort.formation?.duration_days + " jours", masquée si null, pas de "undefined jours") + badge niveau à droite (inchangé). Corps: GRAND TITRE = nom de la FORMATION (Fraunces font-black, fallback "Formation"), SOUS-TITRE = "Promo {cohort.name}" doré petites caps tracking. Filière retirée de l'en-tête. Description/dates/places/prix(total_price)/bouton Me prévenir/S'inscrire, zones Initiation/Perfectionnement, état cohortsError : tous préservés. build OK 62/62, zéro emoji, zéro tiret long, Lucide. | ✅ Terminé |
| robustesse-erreurs | 2026-06-22 | Gestion d'erreur robuste sur les chemins de LECTURE (mutations déjà protégées non touchées). OBJ1 use-cohorts.ts expose `isError`/`error` en plus de loading/data ; Index.tsx distingue PANNE (cohortsError -> message "Impossible de charger les formations" + bouton Réessayer/refetch) du VRAI vide (aucuneCohorteOuverte -> "aucune session" + liste d'attente) ; Register.tsx idem (branche erreur dédiée avant waitlist/form, garde `!cohortsError`) ; AdminDashboard + StaffDashboard reçoivent `isError` + toast d'erreur léger. OBJ2 StudentDashboard.tsx fetchEnrollments/fetchCohortData : try/catch/finally (setLoading(false) garanti) + état loadError + écran "Impossible de charger vos données" + bouton Réessayer (reloadKey) ; plus de skeleton éternel. OBJ3 use-site-settings/use-calendar-events/use-student-badges : setLoading(false) déplacé dans finally (fallbacks/valeurs par défaut conservés). OBJ4 AdminDashboard (fetchStudents/fetchMonthlyData/fetchActivity/fetchUsers) + StaffDashboard (fetchData) : try/catch + toast d'erreur (plus de panneau vide muet). Comportement nominal (succès) inchangé partout. Messages FR sobres, zéro emoji, zéro tiret long, AlertCircle/RefreshCw Lucide. build OK 62/62 ✅ | ✅ Terminé |
| padding-global-public | 2026-06-22 | Index.tsx : padding horizontal des 5 conteneurs de sections augmenté de px-4 (16px) à px-6 sm:px-8 lg:px-12 (24/32/48px responsive) pour aérer le contenu sur les côtés. Sections concernées : Comment ça marche (l.380), Nos formations (l.422), Témoignages (l.505), CTA final (l.598), Footer (l.631). Même valeur partout pour alignement vertical cohérent entre sections. container mx-auto conservé, marges verticales (py-*) et contenus inchangés. Hero plein écran (px-6 md:px-10 propre) laissé tel quel. build OK 62/62 ✅ | ✅ Terminé |
| sous-titres-zones | 2026-06-22 | Index.tsx section "Nos formations" : ajout d'un sous-titre discret (text-sm text-muted-foreground) sous chaque titre de zone, entre le titre/filet et la grille. Sous "Initiation" : "Pour démarrer de zéro et poser des bases solides." Sous "Perfectionnement" : "Pour monter en niveau et affiner sa pratique." Titre passé de mb-6 à mb-2, sous-titre mb-6. Aucune autre modification (cartes, zones, logique intactes). build OK 62/62 ✅ | ✅ Terminé |
| formations-publique | 2026-06-22 | Index.tsx refonte section "Nos formations" : nouveau composant PublicCohortCard (en-tete navy #0E1B2E, filiere name en doré capitales à gauche, badge niveau Initiation/Perfectionnement à droite, body Fraunces font-black, description line-clamp-2, dates, places, prix formation.total_price FCFA, CTA "S'inscrire" doré ou "Me prevenir" Bell si complet). Deux zones par niveau : Initiation (formation.level !== "avance") et Perfectionnement (formation.level === "avance"), chacune masquée si vide. Etat aucuneCohorteOuverte : message + bouton "Rejoindre la liste d'attente" ouvre Dialog WaitlistForm. Dialog "Me prévenir" par cohorte pleine avec preselectedFormationId. Suppression FILIERE_COLORS (#8B5CF6/#F97316/#0D9488) et dots footer colorés (remplacés par ligne dorée h-px). FIX bugs : cohort.formation?.level (pas cohort.level), cohort.formation?.total_price (pas cohort.total_price). build OK 62/62 ✅ | ✅ Terminé |
