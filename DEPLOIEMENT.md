# DEPLOIEMENT.md — Migration vers une nouvelle instance Supabase (rebrand 60 jours)

Checklist ordonnée des étapes **manuelles** (réalisées par un humain — Claude Code
ne les exécute pas). Pour chaque étape : **[Supabase]**, **[Vercel]** ou **[App]**.

> Aucune clé / aucun secret n'est stocké dans le repo. Les `.sql` ne contiennent
> ni mot de passe ni clé. Le front n'utilise que la clé **publique** (anon).

---

## 1. Monter la base — **[Supabase]**
- [ ] Ouvrir le **SQL Editor** de la NOUVELLE instance (base vide).
- [ ] Coller l'intégralité de `MIGRATION_60JOURS.sql` et **exécuter en une seule fois**.
- [ ] Vérifier qu'aucune erreur n'est remontée et que les tables/policies sont créées.

## 2. Vérifier les extensions cron — **[Supabase]**
- [ ] Confirmer que **`pg_cron`** et **`pg_net`** sont autorisés/activés sur le projet
      (Database > Extensions). Le script les active via `CREATE EXTENSION IF NOT EXISTS`,
      mais certains plans exigent de les activer depuis le dashboard.

## 3. Déployer les 8 Edge Functions — **[Supabase]**
- [ ] Déployer : `invite-staff`, `delete-user`, `list-user-emails`,
      `send-push-notification`, `get-vapid-key`, `brief-reminders`, `payment-reminders`,
      `send-email` (ex. `supabase functions deploy <nom>` ou via le dashboard).
- [ ] Le fichier `supabase/config.toml` porte la planification cron — il sera
      réappliqué au déploiement (voir étape 8).

## 4. Provisionner les secrets Edge Functions — **[Supabase]**
- [ ] Définir les secrets (Project Settings > Edge Functions > Secrets, ou
      `supabase secrets set ...`) : **`VAPID_PUBLIC_KEY`**, **`VAPID_PRIVATE_KEY`**, **`VAPID_SUBJECT`**.
      - `VAPID_SUBJECT` = une URL `mailto:` (ex. `mailto:contact@ton-domaine.com`).
      - Générer une paire VAPID : `npx web-push generate-vapid-keys`
        (donne la clé publique et la clé privée).
- [ ] (Emails) Tant que **`BREVO_API_KEY`** est absent, `send-email` tourne en
      **mode log** (rien n'est envoyé, tout est tracé dans les logs) et l'inscription
      fonctionne normalement. Pour activer l'envoi réel via Brevo :
      - **`BREVO_API_KEY`** : clé API transactionnelle Brevo (active l'envoi réel).
      - **`EMAIL_FROM`** : adresse expéditeur vérifiée chez Brevo (fallback `contact@60jours.com`).
      - **`APP_URL`** : base de l'app pour les liens des emails (fallback `https://60jours.vercel.app`).
      - Redéployer `send-email` après avoir défini les secrets.
- [ ] `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` sont
      **injectés automatiquement** par Supabase — rien à faire.

## 5. Configurer les variables d'env front — **[Vercel]** + **[App]**
- [ ] Sur **Vercel** (Project > Settings > Environment Variables) ET dans le `.env`
      local, renseigner (voir `.env.example`) :
      `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (et/ou `VITE_SUPABASE_PUBLISHABLE_KEY`).
- [ ] Utiliser **uniquement** l'URL + la **clé anon/publishable** de la nouvelle
      instance. **JAMAIS** la clé `service_role` côté front.

## 6. Mettre à jour le CORS des Edge Functions — **[Supabase]**
- [ ] Dans `invite-staff`, `delete-user`, `list-user-emails`, mettre à jour la
      constante `ALLOWED_ORIGINS` avec le domaine Vercel final
      (actuellement codé en dur : `https://90jours.com`, `https://formations90jours.netlify.app`).
- [ ] Redéployer ces 3 functions après modification.

## 7. Créer le compte super_admin — **[App]** ou **[Supabase]**, puis **[Supabase]**
- [ ] Créer le compte : inscription via l'app (`/register`) **OU** Authentication >
      Users > Add user. (Cela crée `auth.users` + le profil via trigger.)
- [ ] **Ensuite seulement** : dans le SQL Editor, ouvrir `SETUP_SUPERADMIN.sql`,
      remplacer `REMPLACER_PAR_TON_EMAIL` par l'email du compte, et exécuter.

## 8. Vérifier le cron actif — **[Supabase]**
- [ ] Confirmer la planification : `brief-reminders` à **08:00 UTC** (`0 8 * * *`),
      `payment-reminders` à **09:00 UTC** (`0 9 * * *`).

## 9. Test de bout en bout — **[App]**
- [ ] Inscription d'un nouvel étudiant.
- [ ] Connexion (login).
- [ ] Accès à `/admin` avec le compte super_admin.
- [ ] (Optionnel) Vérifier upload avatar/ressources, envoi d'un message, attestation.

---

## Rappels post-migration (hygiène secrets de l'ancienne instance)
- [ ] Retirer `.env` du suivi git (`git rm --cached .env`) — il est déjà dans `.gitignore`.
- [ ] **Régénérer / révoquer** les clés de l'ANCIENNE instance Supabase (anon,
      service_role) puisqu'elles ont pu être committées.
