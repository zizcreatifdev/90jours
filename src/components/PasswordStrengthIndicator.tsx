export type PasswordStrength = "weak" | "medium" | "strong";

/**
 * Evaluates password strength against 4 criteria:
 * - 8+ characters
 * - At least 1 uppercase letter
 * - At least 1 digit
 * - At least 1 special character
 *
 * Score 0-1 → "weak" | Score 2-3 → "medium" | Score 4 → "strong"
 */
export function getPasswordStrength(password: string): PasswordStrength {
  const criteria = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = criteria.filter(Boolean).length;
  if (score <= 1) return "weak";
  if (score <= 3) return "medium";
  return "strong";
}

interface PasswordStrengthIndicatorProps {
  password: string;
}

const strengthConfig = {
  weak: {
    label: "Faible",
    bars: 1,
    barColor: "bg-destructive",
    textColor: "text-destructive",
  },
  medium: {
    label: "Moyen",
    bars: 2,
    barColor: "bg-yellow-500",
    textColor: "text-yellow-600 dark:text-yellow-400",
  },
  strong: {
    label: "Fort",
    bars: 3,
    barColor: "bg-green-500",
    textColor: "text-green-600 dark:text-green-400",
  },
};

const PasswordStrengthIndicator = ({ password }: PasswordStrengthIndicatorProps) => {
  if (!password) return null;

  const strength = getPasswordStrength(password);
  const { label, bars, barColor, textColor } = strengthConfig[strength];

  return (
    <div className="mt-1.5 space-y-1.5">
      <div className="flex gap-1" role="progressbar" aria-label={`Force du mot de passe : ${label}`} aria-valuenow={bars} aria-valuemin={0} aria-valuemax={3}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${i <= bars ? barColor : "bg-muted"}`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs font-semibold ${textColor}`}>{label}</span>
        <span className="text-xs text-muted-foreground">8 car. · Maj · Chiffre · Symbole</span>
      </div>
    </div>
  );
};

export default PasswordStrengthIndicator;
