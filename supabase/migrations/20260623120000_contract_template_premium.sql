-- Migration: refonte du template de contrat (design premium + contenu rédigé)
-- Met à jour le template générique actif avec un document contractuel élégant
-- (typographie serif Fraunces, filet doré, palette 60jours) et les variables
-- {{frais_inscription}}, {{cout_total}}, {{livrable}}, {{date_signature}}.
-- Les contrats déjà signés ne sont pas affectés (ils ont un snapshot figé).

DO $$
DECLARE
  new_content TEXT := $CONTRACT$<style>
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600&display=swap');
.contract-doc{--navy:#0E1B2E;--gold:#C5A05A;--ink:#2b3445;--muted:#6b7280;--line:#e7e3da;font-family:'Inter',Arial,sans-serif;color:var(--ink);line-height:1.75;background:#FBFAF8;margin:0;padding:0}
.contract-doc *{box-sizing:border-box}
.contract-doc .page{max-width:760px;margin:0 auto;padding:56px 48px;background:#FBFAF8}
.contract-doc .doc-head{text-align:center;margin-bottom:42px}
.contract-doc .brand{font-family:'Fraunces',Georgia,serif;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:var(--gold);font-weight:600;margin-bottom:14px}
.contract-doc .doc-title{font-family:'Fraunces',Georgia,serif;font-size:29px;font-weight:700;color:var(--navy);letter-spacing:.3px;margin:0 0 18px;line-height:1.25}
.contract-doc .rule{width:64px;height:2px;background:var(--gold);margin:0 auto;border:none}
.contract-doc .parties{margin:34px 0;font-size:15px}
.contract-doc .parties p{margin:6px 0}
.contract-doc .party-name{font-weight:600;color:var(--navy)}
.contract-doc article{margin:26px 0}
.contract-doc .art-title{font-family:'Fraunces',Georgia,serif;font-size:16px;font-weight:600;color:var(--navy);margin:0 0 10px;display:flex;align-items:baseline;gap:10px}
.contract-doc .art-num{display:inline-flex;align-items:center;justify-content:center;min-width:26px;height:26px;border:1px solid var(--gold);border-radius:50%;color:var(--gold);font-size:12px;font-weight:600;font-family:'Inter',Arial,sans-serif;line-height:1}
.contract-doc p{margin:0 0 12px}
.contract-doc ul{margin:8px 0 12px;padding-left:20px}
.contract-doc li{margin:6px 0}
.contract-doc .fin{background:#fff;border:1px solid var(--line);border-radius:10px;padding:16px 22px;margin:12px 0}
.contract-doc .fin .row{display:flex;justify-content:space-between;align-items:baseline;padding:7px 0;font-size:15px}
.contract-doc .fin .row.total{border-top:1px solid var(--line);margin-top:4px;padding-top:12px;font-weight:600;color:var(--navy)}
.contract-doc .fin .amount{font-weight:600;color:var(--navy)}
.contract-doc .sign{margin-top:46px;padding-top:24px;border-top:1px solid var(--line);font-size:15px}
.contract-doc .sign .name{font-family:'Fraunces',Georgia,serif;font-size:21px;color:var(--navy);margin-top:8px}
.contract-doc .foot{margin-top:38px;text-align:center;font-size:12px;color:var(--muted)}
</style>
<div class="contract-doc">
  <div class="page">
    <div class="doc-head">
      <div class="brand">60 jours</div>
      <h1 class="doc-title">Contrat d'engagement de formation</h1>
      <hr class="rule"/>
    </div>

    <div class="parties">
      <p>Entre les parties soussignées :</p>
      <p><span class="party-name">la plateforme 60jours</span>, ci-après désignée l'Organisme,</p>
      <p>et <span class="party-name">{{prenom}} {{nom}}</span>, ci-après désigné l'Apprenant.</p>
    </div>

    <article>
      <h2 class="art-title"><span class="art-num">1</span> Objet</h2>
      <p>Le présent contrat a pour objet la formation <strong>{{formation}}</strong>, dispensée au sein de la cohorte <strong>{{cohorte}}</strong>, du <strong>{{date_debut}}</strong> au <strong>{{date_fin}}</strong>.</p>
    </article>

    <article>
      <h2 class="art-title"><span class="art-num">2</span> Engagement de l'Apprenant</h2>
      <p>L'Apprenant s'engage à faire preuve d'assiduité, à réaliser les briefs qui lui sont confiés et à respecter les délais de remise. Le respect des échéances conditionne la bonne progression et la réussite du parcours.</p>
    </article>

    <article>
      <h2 class="art-title"><span class="art-num">3</span> Conditions financières</h2>
      <div class="fin">
        <div class="row"><span>Frais d'inscription</span><span class="amount">{{frais_inscription}}</span></div>
        <div class="row total"><span>Coût total de la formation</span><span class="amount">{{cout_total}}</span></div>
      </div>
      <p>Les frais d'inscription sont réglés avant le début de la formation, et au plus tard quinze (15) jours après le démarrage de la cohorte. Le solde est acquitté en une ou deux tranches, l'intégralité devant être réglée avant la fin du parcours.</p>
    </article>

    <article>
      <h2 class="art-title"><span class="art-num">4</span> Délivrance de l'attestation</h2>
      <p>L'attestation de formation est délivrée sous réserve de la réunion des deux conditions suivantes :</p>
      <ul>
        <li>le règlement intégral du coût de la formation ;</li>
        <li>la soumission et la validation du livrable final ({{livrable}}).</li>
      </ul>
      <p>Une fois ces conditions remplies, l'attestation est émise par l'Organisme.</p>
    </article>

    <article>
      <h2 class="art-title"><span class="art-num">5</span> Engagement de l'Organisme</h2>
      <p>L'Organisme s'engage à assurer l'encadrement pédagogique de l'Apprenant, à fournir des retours sur les travaux rendus et à garantir l'accès aux ressources de la formation pendant toute sa durée.</p>
    </article>

    <article>
      <h2 class="art-title"><span class="art-num">6</span> Dispositions générales</h2>
      <p>Le présent contrat prend effet à sa signature et demeure valable pour toute la durée de la formation. En cas de différend, les parties s'engagent à rechercher une solution amiable ; à défaut, le litige sera réglé selon le droit sénégalais.</p>
    </article>

    <div class="sign">
      <p>Fait le <strong>{{date_signature}}</strong>, signé électroniquement par l'Apprenant.</p>
      <div class="name">{{signature_name}}</div>
    </div>

    <div class="foot">Document contractuel 60jours, à conserver par l'Apprenant.</div>
  </div>
</div>$CONTRACT$;
BEGIN
  UPDATE public.contract_templates
     SET content = new_content,
         name = 'Contrat d''engagement 60 jours',
         is_active = true,
         updated_at = now()
   WHERE formation_id IS NULL
     AND is_active = true;

  IF NOT FOUND THEN
    INSERT INTO public.contract_templates (name, content, is_active)
    VALUES ('Contrat d''engagement 60 jours', new_content, true);
  END IF;
END $$;
