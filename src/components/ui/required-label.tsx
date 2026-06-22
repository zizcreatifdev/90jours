import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface RequiredLabelProps {
  htmlFor?: string;
  children: React.ReactNode;
  /** Affiche un asterisque rouge accessible si true. */
  required?: boolean;
  className?: string;
}

/**
 * Label de champ avec asterisque rouge optionnel pour les champs obligatoires.
 * L'asterisque est masque aux lecteurs d'ecran (aria-hidden) et remplace par
 * un texte "(requis)" en sr-only.
 */
const RequiredLabel = ({ htmlFor, children, required = false, className }: RequiredLabelProps) => (
  <Label htmlFor={htmlFor} className={cn(className)}>
    {children}
    {required && (
      <>
        <span className="ml-0.5 text-destructive" aria-hidden="true">
          *
        </span>
        <span className="sr-only"> (requis)</span>
      </>
    )}
  </Label>
);

export default RequiredLabel;
