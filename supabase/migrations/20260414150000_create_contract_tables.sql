-- Migration: contract_templates + student_contracts (Prompt-23)
-- Enables digital contract signing for student enrollment.

-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.contract_templates (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name         TEXT        NOT NULL,
  content      TEXT        NOT NULL,  -- HTML with {{variable}} placeholders
  formation_id UUID        REFERENCES public.formations(id) ON DELETE SET NULL,
  is_active    BOOLEAN     DEFAULT true NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at   TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.student_contracts (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cohort_id         UUID        NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  template_id       UUID        REFERENCES public.contract_templates(id) ON DELETE SET NULL,
  signed_at         TIMESTAMPTZ,
  signature_name    TEXT,
  ip_address        TEXT,
  contract_snapshot TEXT,        -- frozen HTML at time of signature
  created_at        TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (user_id, cohort_id)
);

-- ── Triggers ──────────────────────────────────────────────────────────────────

CREATE TRIGGER update_contract_templates_updated_at
  BEFORE UPDATE ON public.contract_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── RLS — contract_templates ──────────────────────────────────────────────────

ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contract_templates_select_auth"
  ON public.contract_templates FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "contract_templates_admin_all"
  ON public.contract_templates FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

-- ── RLS — student_contracts ───────────────────────────────────────────────────

ALTER TABLE public.student_contracts ENABLE ROW LEVEL SECURITY;

-- Students see & manage their own contracts
CREATE POLICY "student_contracts_own"
  ON public.student_contracts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins see all
CREATE POLICY "student_contracts_admin_select"
  ON public.student_contracts FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Staff see all (read-only)
CREATE POLICY "student_contracts_staff_select"
  ON public.student_contracts FOR SELECT
  USING (public.has_role(auth.uid(), 'staff'));

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS student_contracts_user_id_idx ON public.student_contracts (user_id);
CREATE INDEX IF NOT EXISTS student_contracts_cohort_id_idx ON public.student_contracts (cohort_id);

-- ── Default template ──────────────────────────────────────────────────────────

INSERT INTO public.contract_templates (name, content, is_active) VALUES (
  'Contrat standard 90 jours',
  $TEMPLATE$<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;line-height:1.7;margin:0;padding:0;background:#fff}
    .container{max-width:800px;margin:0 auto;padding:40px}
    .header{text-align:center;margin-bottom:40px;border-bottom:3px solid #2563eb;padding-bottom:30px}
    .logo{font-size:32px;font-weight:900;color:#2563eb;letter-spacing:-1px;margin-bottom:8px}
    .doc-title{font-size:22px;font-weight:700;color:#1a1a2e;text-transform:uppercase;letter-spacing:2px}
    .doc-sub{font-size:13px;color:#6b7280;margin-top:6px}
    .section{margin:32px 0}
    .section-title{font-size:15px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:1px;border-left:4px solid #2563eb;padding-left:12px;margin-bottom:16px}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;background:#f8fafc;border-radius:8px;padding:20px}
    .info-item label{font-size:11px;font-weight:600;text-transform:uppercase;color:#9ca3af;display:block}
    .info-item span{font-size:15px;font-weight:600;color:#1a1a2e}
    ul.c{list-style:none;padding:0;margin:0}
    ul.c li{padding:10px 12px 10px 36px;position:relative;border-bottom:1px solid #f1f5f9}
    ul.c li:last-child{border-bottom:none}
    ul.c li::before{content:"✓";position:absolute;left:12px;color:#10b981;font-weight:700}
    .fin-box{background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:20px}
    .amount{font-size:28px;font-weight:800;color:#2563eb}
    .warn{background:#fff7ed;border-left:4px solid #f97316;padding:16px;border-radius:0 8px 8px 0;margin:16px 0;font-size:14px;color:#9a3412}
    .sig-section{margin-top:48px;border-top:2px solid #e5e7eb;padding-top:32px}
    .sig-line{border-bottom:1px solid #374151;width:300px;margin:40px 0 8px}
    .sig-label{font-size:12px;color:#6b7280}
    .footer-note{font-size:11px;color:#9ca3af;text-align:center;margin-top:48px;padding-top:16px;border-top:1px solid #f1f5f9}
  </style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="logo">90 JOURS</div>
    <div class="doc-title">Contrat de Formation</div>
    <div class="doc-sub">Document contractuel officiel — à conserver</div>
  </div>

  <div class="section">
    <div class="section-title">Identification des parties</div>
    <div class="info-grid">
      <div class="info-item"><label>Prénom</label><span>{{prenom}}</span></div>
      <div class="info-item"><label>Nom</label><span>{{nom}}</span></div>
      <div class="info-item"><label>Email</label><span>{{email}}</span></div>
      <div class="info-item"><label>Formation</label><span>{{formation}}</span></div>
      <div class="info-item"><label>Cohorte</label><span>Cohorte {{cohorte}}</span></div>
      <div class="info-item"><label>Formateur référent</label><span>{{formateur}}</span></div>
      <div class="info-item"><label>Date de début</label><span>{{date_debut}}</span></div>
      <div class="info-item"><label>Date de fin</label><span>{{date_fin}}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Engagements de l'étudiant(e)</div>
    <ul class="c">
      <li>Soumettre tous les briefs dans les délais impartis, ou informer le formateur en cas d'empêchement</li>
      <li>Rendre le livrable final (portfolio) avant la date de clôture de la cohorte</li>
      <li>Participer activement à toutes les sessions, masterclasses et exercices pratiques</li>
      <li>Respecter les membres de la communauté et contribuer à un environnement d'apprentissage bienveillant</li>
      <li>Consacrer un minimum de 15 heures par semaine à la formation et aux exercices pratiques</li>
      <li>Utiliser les ressources pédagogiques de manière éthique et responsable</li>
      <li>Informer le formateur de toute difficulté rencontrée dans les meilleurs délais</li>
    </ul>
  </div>

  <div class="section">
    <div class="section-title">Engagements de la formation</div>
    <ul class="c">
      <li>Donner accès à l'intégralité des ressources pédagogiques numériques pour la durée de la formation</li>
      <li>Proposer un suivi personnalisé par un formateur dédié tout au long du parcours</li>
      <li>Remettre une attestation de réussite à l'issue si les critères sont remplis</li>
      <li>Garantir une disponibilité du support durant toute la durée de la cohorte (jours ouvrés)</li>
      <li>Maintenir l'accès à la plateforme pendant 6 mois après la fin de la cohorte</li>
      <li>Animer les sessions de masterclass et sessions de recherche aux dates prévues</li>
    </ul>
  </div>

  <div class="section">
    <div class="section-title">Conditions financières</div>
    <div class="fin-box">
      <div style="margin-bottom:12px">
        <label style="font-size:12px;font-weight:600;text-transform:uppercase;color:#6b7280">Montant total de la formation</label>
        <div class="amount">{{montant}}</div>
      </div>
      <p style="font-size:14px;color:#1e40af;margin:0">Le paiement peut s'effectuer en une ou plusieurs échéances, selon l'accord convenu lors de l'inscription.</p>
    </div>
    <div class="warn">
      <strong>⚠️ Politique de remboursement :</strong> Aucun remboursement ne sera accordé passé un délai de 7 jours calendaires après la signature du présent contrat, sauf cas de force majeure dûment justifié.
    </div>
  </div>

  <div class="section">
    <div class="section-title">Dispositions générales</div>
    <p style="font-size:14px;color:#374151">Le présent contrat constitue l'intégralité de l'accord entre les parties concernant la formation. Toute modification doit faire l'objet d'un avenant écrit cosigné. En cas de litige, les parties s'engagent à rechercher une solution amiable avant tout recours judiciaire.</p>
    <p style="font-size:14px;color:#374151;margin-top:12px">Les données personnelles collectées dans le cadre de ce contrat sont traitées conformément à notre politique de confidentialité, accessible sur notre plateforme.</p>
  </div>

  <div class="sig-section">
    <div class="section-title">Signature numérique</div>
    <p style="font-size:14px;color:#374151">En signant ce contrat, je, <strong>{{prenom}} {{nom}}</strong>, déclare avoir lu et accepté l'intégralité des conditions ci-dessus.</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:24px">
      <div>
        <div class="sig-line"></div>
        <div class="sig-label">Signature — {{signature_name}}</div>
        <div style="font-size:13px;color:#374151;margin-top:8px">Signé numériquement le : <strong>{{date_signature}}</strong></div>
        <div style="font-size:13px;color:#374151">à <strong>{{heure_signature}}</strong></div>
      </div>
      <div>
        <div class="sig-line"></div>
        <div class="sig-label">Pour 90 Jours Formation</div>
        <div style="font-size:13px;color:#374151;margin-top:8px">Représenté(e) par : <strong>{{formateur}}</strong></div>
      </div>
    </div>
  </div>

  <div class="footer-note">
    Document généré automatiquement par la plateforme 90 Jours Formation. Conservez cet exemplaire comme preuve de votre engagement contractuel.
  </div>
</div>
</body>
</html>$TEMPLATE$,
  true
);
