-- Add editorial content fields to formations table
ALTER TABLE public.formations
  ADD COLUMN pitch text,
  ADD COLUMN learn_intro text,
  ADD COLUMN learn_points jsonb,
  ADD COLUMN learn_conclusion text,
  ADD COLUMN target_audience text,
  ADD COLUMN method_description text,
  ADD COLUMN why_us_points jsonb;

-- Pre-fill the graphisme formation with editorial content
UPDATE public.formations
SET
  pitch = 'En 90 jours, vous passez de curieux a professionnel. Notre formation en graphisme vous donne les bases solides, les outils modernes et les reflexes du metier pour creer avec confiance et talent.',
  learn_intro = 'A l''issue de la formation, vous maitrisez :',
  learn_points = '["Les fondamentaux du design : composition, couleur, typographie", "Les outils professionnels : Illustrator, Photoshop, InDesign", "La creation d''identites visuelles et de supports de communication", "La gestion d''un projet graphique de A a Z", "La construction et la presentation de votre portfolio"]'::jsonb,
  learn_conclusion = 'Chaque module alterne theorie essentielle et projets pratiques evalues par nos formateurs.',
  target_audience = 'Cette formation s''adresse a tous ceux qui veulent entrer dans le monde du graphisme : debutants curieux, autodidactes qui souhaitent structurer leurs acquis, ou professionnels d''un autre secteur en reconversion. Aucun pre-requis technique n''est exige, uniquement la motivation et l''envie de creer.',
  method_description = 'Notre methode repose sur l''apprentissage par la pratique. Des la premiere semaine, vous travaillez sur de vrais projets. Chaque semaine est rythmee par des videos de cours accessibles a vie, des exercices corriges, des sessions de feedback en groupe et un suivi personnalise. Vous avancez a votre rythme, encadres par une communaute active et des formateurs disponibles.',
  why_us_points = '["Une pedagogie bienveillante et exigeante, validee par des centaines d''apprenants", "Des formateurs praticiens, actifs dans le milieu professionnel", "Un suivi individuel : vos travaux sont commentes et corriges", "Une attestation de formation reconnue a la fin du parcours", "Un acces a vie aux ressources et a la communaute apres la formation"]'::jsonb
WHERE slug = 'graphisme';
