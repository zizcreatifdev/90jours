import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle, Loader2 } from "lucide-react";

interface WaitlistFormProps {
  preselectedFormationId?: string | null;
  onSuccess?: () => void;
}

interface Formation {
  id: string;
  name: string;
}

const WaitlistForm = ({ preselectedFormationId, onSuccess }: WaitlistFormProps) => {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    formation_id: preselectedFormationId || "other",
    formation_other: "",
    message: "",
  });
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: formations = [] } = useQuery<Formation[]>({
    queryKey: ["formations-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("formations")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as Formation[];
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        full_name: formData.full_name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        message: formData.message.trim() || null,
        consent_marketing: true,
      };

      if (formData.formation_id && formData.formation_id !== "other") {
        payload.formation_id = formData.formation_id;
      } else {
        payload.formation_id = null;
        payload.formation_other = formData.formation_other.trim() || null;
      }

      const { error: insertError } = await supabase.from("waitlist").insert(payload);
      if (insertError) throw insertError;

      setSubmitted(true);
      onSuccess?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#C5A05A]/15">
          <CheckCircle className="h-8 w-8 text-[#C5A05A]" />
        </div>
        <h3 className="font-display text-xl font-bold text-[#0E1B2E] dark:text-[#FBFAF8]">
          Vous etes sur la liste !
        </h3>
        <p className="max-w-xs text-sm text-muted-foreground">
          Nous vous contacterons en priorite des qu'une place se libere ou qu'une nouvelle cohorte ouvre.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="wl-name">Nom complet</Label>
          <Input
            id="wl-name"
            required
            maxLength={100}
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            placeholder="Aminata Diallo"
          />
        </div>
        <div>
          <Label htmlFor="wl-phone">Telephone</Label>
          <Input
            id="wl-phone"
            type="tel"
            required
            maxLength={20}
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+221 77 000 00 00"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="wl-email">Email</Label>
        <Input
          id="wl-email"
          type="email"
          required
          maxLength={100}
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="aminata@email.com"
        />
      </div>

      <div>
        <Label htmlFor="wl-formation">Formation souhaitee</Label>
        <Select
          value={formData.formation_id}
          onValueChange={(v) => setFormData({ ...formData, formation_id: v, formation_other: "" })}
        >
          <SelectTrigger id="wl-formation">
            <SelectValue placeholder="Choisir une formation" />
          </SelectTrigger>
          <SelectContent>
            {formations.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.name}
              </SelectItem>
            ))}
            <SelectItem value="other">Autre / Je ne sais pas encore</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.formation_id === "other" && (
        <div>
          <Label htmlFor="wl-formation-other">Precisez (optionnel)</Label>
          <Input
            id="wl-formation-other"
            maxLength={200}
            value={formData.formation_other}
            onChange={(e) => setFormData({ ...formData, formation_other: e.target.value })}
            placeholder="Ex. : graphisme, UI/UX..."
          />
        </div>
      )}

      <div>
        <Label htmlFor="wl-message">Message (optionnel)</Label>
        <Textarea
          id="wl-message"
          rows={3}
          maxLength={800}
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          placeholder="Parlez-nous de votre projet ou de vos disponibilites..."
          className="mt-1"
        />
        <p className="mt-1 text-xs text-muted-foreground">{formData.message.length}/800</p>
      </div>

      <div className="flex items-start gap-3">
        <Checkbox
          id="wl-consent"
          checked={consentMarketing}
          onCheckedChange={(v) => setConsentMarketing(!!v)}
          className="mt-0.5 shrink-0"
        />
        <label htmlFor="wl-consent" className="cursor-pointer text-sm text-muted-foreground leading-snug">
          J'accepte d'etre recontacte(e) par 60jours au sujet des formations.
        </label>
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</p>
      )}

      <Button
        type="submit"
        disabled={submitting || !consentMarketing}
        className="w-full bg-[#C5A05A] text-white hover:bg-[#b08d49] font-semibold disabled:opacity-50"
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Envoi en cours...
          </>
        ) : (
          "Me prévenir en priorité"
        )}
      </Button>
    </form>
  );
};

export default WaitlistForm;
