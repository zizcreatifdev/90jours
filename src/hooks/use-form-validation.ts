/**
 * use-form-validation.ts
 *
 * Validation legere et reutilisable, compatible avec les formulaires useState
 * (pas de react-hook-form). A utiliser avec les composants <RequiredLabel> et
 * <FieldError>.
 *
 * Principe : le composant assemble un objet `values` (a chaque rendu, peu importe
 * que l'etat soit un objet unique ou des useState separes) et declare des `rules`.
 * Le hook calcule les erreurs par champ et la validite globale (pour le bouton).
 *
 * Exemple d'usage :
 *
 *   const [email, setEmail] = useState("");
 *   const [password, setPassword] = useState("");
 *
 *   const { showError, handleBlur, isValid, validateAll } = useFormValidation(
 *     { email, password },
 *     {
 *       email: { required: true, validate: (v) => isEmail(String(v)) ? null : "Email invalide." },
 *       password: { required: "Le mot de passe est requis." },
 *     }
 *   );
 *
 *   const onSubmit = (e) => {
 *     e.preventDefault();
 *     if (!validateAll()) return;     // marque tous les champs touched + bloque si invalide
 *     // ... logique de soumission inchangee
 *   };
 *
 *   <RequiredLabel htmlFor="email" required>Email</RequiredLabel>
 *   <Input id="email" value={email}
 *          onChange={(e) => setEmail(e.target.value)}
 *          onBlur={() => handleBlur("email")}
 *          aria-invalid={!!showError("email")} />
 *   <FieldError message={showError("email")} />
 *
 *   <Button type="submit" disabled={submitting || !isValid}>Valider</Button>
 *
 * Notes :
 * - `isValid` evalue TOUS les champs requis (independamment de touched) : ideal
 *   pour desactiver le bouton de soumission.
 * - `showError(field)` ne renvoie un message que si le champ a ete touche (blur)
 *   ou si une tentative de soumission a eu lieu : evite d'afficher des erreurs
 *   sur un formulaire vierge.
 * - Un champ "vide" = undefined, null, chaine vide/espaces, false (checkbox requise)
 *   ou tableau vide. Le nombre 0 est considere comme une valeur (utiliser `validate`
 *   pour exiger un montant > 0).
 */

import { useState, useCallback } from "react";

export type ValidationValues = Record<string, unknown>;

export interface ValidationRule {
  /** true = requis (message par defaut), ou chaine = message personnalise. */
  required?: boolean | string;
  /** Validation custom : renvoie un message d'erreur, ou null si valide. */
  validate?: (value: unknown, allValues: ValidationValues) => string | null;
}

export type ValidationRules = Record<string, ValidationRule>;

const DEFAULT_REQUIRED_MESSAGE = "Ce champ est requis.";

const isEmptyValue = (value: unknown): boolean => {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (typeof value === "boolean") return value === false;
  if (Array.isArray(value)) return value.length === 0;
  return false;
};

export interface UseFormValidationResult {
  /** Erreur courante d'un champ (ignore touched) ou null. */
  getError: (field: string) => string | null;
  /** Erreur a afficher (seulement si touche ou soumission tentee) ou null. */
  showError: (field: string) => string | null;
  /** Marque un champ comme touche (a brancher sur onBlur). */
  handleBlur: (field: string) => void;
  /** true si tous les champs declares sont valides. */
  isValid: boolean;
  /** Marque tous les champs touched et renvoie la validite globale. */
  validateAll: () => boolean;
  /** Reinitialise l'etat touched / tentative de soumission. */
  reset: () => void;
}

export function useFormValidation(
  values: ValidationValues,
  rules: ValidationRules,
): UseFormValidationResult {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const getError = useCallback(
    (field: string): string | null => {
      const rule = rules[field];
      if (!rule) return null;

      const value = values[field];

      if (rule.required && isEmptyValue(value)) {
        return typeof rule.required === "string" ? rule.required : DEFAULT_REQUIRED_MESSAGE;
      }

      if (rule.validate) {
        return rule.validate(value, values);
      }

      return null;
    },
    [rules, values],
  );

  const isValid = Object.keys(rules).every((field) => getError(field) === null);

  const showError = useCallback(
    (field: string): string | null => {
      if (!touched[field] && !submitAttempted) return null;
      return getError(field);
    },
    [touched, submitAttempted, getError],
  );

  const handleBlur = useCallback((field: string) => {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  }, []);

  const validateAll = useCallback(() => {
    setSubmitAttempted(true);
    return Object.keys(rules).every((field) => getError(field) === null);
  }, [rules, getError]);

  const reset = useCallback(() => {
    setTouched({});
    setSubmitAttempted(false);
  }, []);

  return { getError, showError, handleBlur, isValid, validateAll, reset };
}

// ── Validateurs reutilisables ───────────────────────────────────────────────

/** Verifie un format email simple. */
export const isValidEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
