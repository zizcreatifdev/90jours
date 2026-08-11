-- Migration : separation de la formation graphisme en deux formations distinctes.
-- Approche A (sans risque) : renommage de la formation existante (UUID inchange),
-- creation d''une nouvelle formation initiation.
-- Les enrollments, payments, student_contracts, attestations, briefs, portfolios
-- rattaches a la cohorte perfectionnement restent intacts : aucune donnee etudiante
-- n''est touchee.
--
-- A executer manuellement via le Dashboard Supabase (SQL Editor).
-- JAMAIS modifier les migrations existantes.

-- =============================================================================
-- VERIFICATION PREALABLE (decommenter pour controle avant execution)
-- =============================================================================
-- SELECT id, name, slug, total_price, level
-- FROM public.formations
-- WHERE slug = 'graphisme';
-- Attendu : 1 ligne avec slug='graphisme'.

-- =============================================================================
-- ETAPE 1A : Renommer la formation existante en Graphisme Perfectionnement
-- L''UUID est conserve -> tous les FK (cohorts, attestations, portfolios,
-- staff_formations) pointent toujours vers le bon enregistrement.
-- NE TOUCHE PAS au contenu editorial (pitch, learn_points, etc.) ni au prix.
-- =============================================================================

UPDATE public.formations
SET
  name = 'Graphisme Perfectionnement',
  slug = 'graphisme-perfectionnement'
WHERE slug = 'graphisme';

-- =============================================================================
-- ETAPE 1B : Creer la formation Graphisme Initiation
-- Contrainte CHECK formations_tranches_sum_check :
--   registration_fee + tranche_1_amount + tranche_2_amount = total_price
--   10000 + 7500 + 7500 = 25000 (satisfait)
-- =============================================================================

INSERT INTO public.formations (
  name,
  slug,
  level,
  duration_days,
  total_price,
  registration_fee,
  tranche_1_amount,
  tranche_2_amount,
  deliverable_label,
  deliverable_description,
  attestation_title,
  attestation_body,
  attestation_color,
  is_active,
  pitch,
  learn_intro,
  learn_points,
  learn_conclusion,
  target_audience,
  method_description,
  why_us_points
) VALUES (
  'Graphisme Initiation',
  'graphisme-initiation',
  'Debutant',
  60,
  25000,
  10000,
  7500,
  7500,
  'Portfolio',
  'Soumettez le lien de votre portfolio de fin de formation.',
  'Attestation de formation en Graphisme Initiation',
  'Nous certifions que {student_name} a suivi avec succes la formation "Graphisme Initiation" et a valide l''ensemble des livrables requis.',
  '#003BA4',
  true,
  'Vous voulez vous lancer dans le graphisme mais vous ne savez pas par ou commencer. Ici, on ne vous noie pas sous les tutos. En 60 jours, on vous construit des bases solides et, des le depart, le bon etat d''esprit : l''exigence, le sens du detail, l''habitude de bien faire. Vous ne sortez pas en ayant juste touche au graphisme. Vous sortez en sachant ce que vous faites, et pourquoi.',
  'On ne commence pas par un logiciel. On commence par comprendre ce qui fait un bon design. Les outils viennent ensuite, a votre rythme. Ce qui compte, c''est de poser des fondations que vous ne remettrez jamais en question :',
  '[
    "Les fondamentaux du design : typographie, couleur, composition, gestion de l''espace. Le socle de tout.",
    "L''oeil : apprendre a voir ce qui marche et ce qui ne marche pas, et pourquoi.",
    "La methode de travail : chercher, s''inspirer sans copier, construire une idee avant d''ouvrir un logiciel.",
    "Les bons reflexes des le debut : la rigueur, le soin, l''exigence sur ses propres livrables."
  ]'::jsonb,
  'On avance pas a pas, avec de la pratique et des corrections. Vous progressez en faisant, en vous trompant, en recommencant. C''est comme ca qu''on apprend vraiment, pas en regardant.',
  'Vous debutez, ou presque. Vous etes curieux, motive, et vous voulez apprendre le graphisme serieusement, pas juste bricoler. Vous preferez comprendre les bases une bonne fois plutot que d''accumuler des astuces sans logique. Si vous voulez demarrer sur de bonnes fondations et prendre les bons reflexes des le premier jour, cette formation est faite pour vous.',
  'Ici, on apprend en faisant. De la pratique, des corrections, encore et encore. On prend aussi le temps de repondre a vos questions et de parler du metier tel qu''il est vraiment. Vous n''etes pas seul devant un ecran : vous etes accompagne, on regarde votre travail, on vous montre comment progresser. C''est ce qui fait toute la difference avec un tutoriel.',
  '[
    "Cohortes limitees : un accompagnement rapproche, pas une salle anonyme.",
    "Corrections personnalisees : c''est la que se joue votre progression.",
    "100% en ligne : formez-vous d''ou vous voulez, au rythme intensif de la cohorte.",
    "Des bases solides ET les bons reflexes : vous repartez avec des fondations qui vous serviront toute votre carriere.",
    "Une attestation qui valide votre parcours."
  ]'::jsonb
);

-- =============================================================================
-- VERIFICATION FINALE (decommenter pour controle apres execution)
-- =============================================================================
-- SELECT slug, name, total_price, registration_fee, level, is_active
-- FROM public.formations
-- ORDER BY name;
-- Attendu : 2 lignes :
--   graphisme-initiation    | Graphisme Initiation    | 25000 | 10000 | Debutant      | true
--   graphisme-perfectionnement | Graphisme Perfectionnement | 60000 | 10000 | (existant) | true
