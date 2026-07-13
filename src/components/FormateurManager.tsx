import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RequiredLabel from "@/components/ui/required-label";
import FieldError from "@/components/ui/field-error";
import { useFormValidation, isValidEmail } from "@/hooks/use-form-validation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Loader2, UserPlus, Trash2, GraduationCap } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";

interface Formateur {
  user_id: string;
  first_name: string;
  last_name: string;
  role: string;
  formations: { id: string; name: string; formation_id: string; staff_formation_id: string }[];
}

const FormateurManager = () => {
  const { toast } = useToast();
  const { user, isOwner } = useAuth();
  const [formateurs, setFormateurs] = useState<Formateur[]>([]);
  const [formations, setFormations] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inviteRole, setInviteRole] = useState<"staff" | "assistant">("staff");
  const [form, setForm] = useState({ email: "", first_name: "", last_name: "", formation_id: "" });

  const { showError, handleBlur, isValid, validateAll, reset } = useFormValidation(
    { first_name: form.first_name, last_name: form.last_name, email: form.email },
    {
      first_name: { required: "Le prénom est requis." },
      last_name: { required: "Le nom est requis." },
      email: {
        required: "L'email est requis.",
        validate: (v) => isValidEmail(String(v ?? "")) ? null : "Email invalide.",
      },
    },
  );

  const fetchData = async () => {
    setLoading(true);

    // Fetch formations
    const { data: formationsData } = await supabase.from("formations").select("id, name").order("name");
    if (formationsData) setFormations(formationsData);

    // Fetch all users with staff or assistant role
    const { data: staffRoles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["staff", "assistant"]);

    const staffUserIds = staffRoles?.map((r: any) => r.user_id) || [];
    const roleByUserId = new Map<string, string>((staffRoles || []).map((r: any) => [r.user_id, r.role]));

    if (staffUserIds.length > 0) {
      // Fetch staff_formations
      const { data: staffFormations } = await supabase
        .from("staff_formations")
        .select("id, user_id, formation_id, formations(id, name)")
        .in("user_id", staffUserIds);

      // Build map with all staff users
      const userMap = new Map<string, Formateur>();
      for (const uid of staffUserIds) {
        userMap.set(uid, { user_id: uid, first_name: "", last_name: "", role: roleByUserId.get(uid) || "staff", formations: [] });
      }

      for (const sf of (staffFormations || []) as any[]) {
        const entry = userMap.get(sf.user_id);
        if (entry && sf.formations) {
          entry.formations.push({
            id: sf.formations.id,
            name: sf.formations.name,
            formation_id: sf.formation_id,
            staff_formation_id: sf.id,
          });
        }
      }

      // Fetch profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name")
        .in("user_id", staffUserIds);

      if (profiles) {
        for (const p of profiles) {
          const entry = userMap.get(p.user_id);
          if (entry) {
            entry.first_name = p.first_name;
            entry.last_name = p.last_name;
          }
        }
      }

      setFormateurs(Array.from(userMap.values()));
    } else {
      setFormateurs([]);
    }

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;
    setSaving(true);

    try {
      const body: Record<string, string> = {
        email: form.email,
        first_name: form.first_name,
        last_name: form.last_name,
        role: inviteRole,
      };
      if (inviteRole === "staff" && form.formation_id) {
        body.formation_id = form.formation_id;
      }
      const { data, error } = await supabase.functions.invoke("invite-staff", { body });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const roleLabel = inviteRole === "assistant" ? "assistant" : "formateur";
      if (data.is_new && data.email_sent === false) {
        toast({
          title: "Compte créé, email non envoyé",
          description: `Le compte a été créé pour ${form.email} mais l'email d'invitation n'a pas pu être envoyé${data.email_error ? ` : ${data.email_error}` : ""}.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: data.is_new ? `Invitation ${roleLabel} envoyée !` : `${inviteRole === "assistant" ? "Assistant" : "Membre staff"} ajouté !`,
          description: data.is_new
            ? `Un email d'invitation a été envoyé à ${form.email}.`
            : inviteRole === "staff" && form.formation_id
              ? `${form.email} a été assigné à la formation.`
              : `Le rôle ${roleLabel} a été attribué à ${form.email}.`,
        });
      }

      setOpen(false);
      setInviteRole("staff");
      setForm({ email: "", first_name: "", last_name: "", formation_id: "" });
      reset();
      fetchData();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAssignment = async (staffFormationId: string, formateurName: string, formationName: string) => {
    const { error } = await supabase.from("staff_formations").delete().eq("id", staffFormationId);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Affectation supprimée" });
      if (user) {
        await supabase.from("audit_logs").insert({
          performed_by: user.id,
          action: "staff_formation_removed",
          details: { formateur: formateurName, formation: formationName },
        });
      }
      fetchData();
    }
  };

  const handleRemoveFormateur = async (userId: string, formateurName: string) => {
    // Delete all staff_formations for this user
    const { error: sfError } = await supabase.from("staff_formations").delete().eq("user_id", userId);
    if (sfError) {
      toast({ title: "Erreur", description: sfError.message, variant: "destructive" });
      return;
    }
    // Delete the staff role row (keep student role)
    const { error: roleError } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "staff");
    if (roleError) {
      toast({ title: "Erreur", description: roleError.message, variant: "destructive" });
      return;
    }
    if (user) {
      await supabase.from("audit_logs").insert({
        performed_by: user.id,
        action: "staff_role_removed",
        target_user_id: userId,
        details: { formateur: formateurName },
      });
    }
    toast({ title: "Formateur retiré", description: "Le rôle formateur a été retiré. L'utilisateur conserve son rôle étudiant." });
    fetchData();
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
          <GraduationCap className="h-5 w-5" /> Staff & Formateurs
        </h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <UserPlus className="mr-1.5 h-4 w-4" /> Inviter un membre staff
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">Inviter un membre de l'equipe</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleInvite} className="space-y-4 pt-2">
              <div>
                <Label>Role</Label>
                <Select value={inviteRole} onValueChange={v => { setInviteRole(v as "staff" | "assistant"); setForm(f => ({ ...f, formation_id: "" })); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Formateur (staff)</SelectItem>
                    <SelectItem value="assistant">Assistant operationnel</SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">
                  {inviteRole === "assistant"
                    ? "Acces operationnel complet (cohortes, briefs, portfolios, sessions). Aucun acces financier ni emission d'attestation."
                    : "Formateur lie a une formation. Acces aux cohortes de sa formation."}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <RequiredLabel htmlFor="inv-first" required>Prenom</RequiredLabel>
                  <Input id="inv-first" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} onBlur={() => handleBlur("first_name")} aria-invalid={!!showError("first_name")} placeholder="Prenom" />
                  <FieldError message={showError("first_name")} />
                </div>
                <div>
                  <RequiredLabel htmlFor="inv-last" required>Nom</RequiredLabel>
                  <Input id="inv-last" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} onBlur={() => handleBlur("last_name")} aria-invalid={!!showError("last_name")} placeholder="Nom" />
                  <FieldError message={showError("last_name")} />
                </div>
              </div>
              <div>
                <RequiredLabel htmlFor="inv-email" required>Email</RequiredLabel>
                <Input id="inv-email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} onBlur={() => handleBlur("email")} aria-invalid={!!showError("email")} placeholder="membre@email.com" />
                <FieldError message={showError("email")} />
              </div>
              {inviteRole === "staff" && (
                <div>
                  <Label>Formation a assigner <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
                  <Select value={form.formation_id} onValueChange={v => setForm({ ...form, formation_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger>
                    <SelectContent>
                      {formations.map(f => (
                        <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button type="submit" disabled={saving || !isValid} className="w-full">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                Inviter
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {formateurs.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Aucun formateur assigné pour le moment.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {formateurs.map((f) => (
            <div key={f.user_id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <span className="font-display text-sm font-bold text-primary">
                      {(f.first_name?.[0] || "?").toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-foreground">
                      {f.first_name || "En attente"} {f.last_name || ""}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {f.role === "assistant" ? "Assistant" : f.formations.length > 0 ? "Formateur" : "Staff"}
                    </p>
                  </div>
                </div>
                {isOwner && (
                  <ConfirmDialog
                    trigger={
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    }
                    title="Retirer ce formateur ?"
                    description={`${f.first_name || "Ce formateur"} ${f.last_name || ""} sera remis en tant qu'étudiant et retiré de toutes les formations.`}
                    confirmLabel="Retirer"
                    onConfirm={() => handleRemoveFormateur(f.user_id, `${f.first_name} ${f.last_name}`)}
                  />
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {f.formations.map((fm) => (
                  <div key={fm.staff_formation_id} className="flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                    {fm.name}
                    <ConfirmDialog
                      trigger={
                        <button className="ml-1 text-accent/60 hover:text-destructive transition-colors">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      }
                      title="Retirer cette affectation ?"
                      description={`Le formateur ne sera plus assigné à "${fm.name}".`}
                      confirmLabel="Retirer"
                      onConfirm={() => handleRemoveAssignment(fm.staff_formation_id, `${f.first_name} ${f.last_name}`, fm.name)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FormateurManager;
