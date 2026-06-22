import { cn } from "@/lib/utils";

interface FieldErrorProps {
  /** Message d'erreur. Si null/undefined, rien n'est rendu. */
  message?: string | null;
  id?: string;
  className?: string;
}

/**
 * Message d'erreur affiche sous un champ de formulaire, dans le style du design
 * system (couleur destructive). Rien n'est rendu si message est vide.
 */
const FieldError = ({ message, id, className }: FieldErrorProps) => {
  if (!message) return null;
  return (
    <p id={id} role="alert" className={cn("mt-1 text-xs text-destructive", className)}>
      {message}
    </p>
  );
};

export default FieldError;
