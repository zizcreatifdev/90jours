import { useState, useEffect } from "react";
import { sendPushToUsers } from "@/hooks/use-push-notifications";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useCohorts } from "@/hooks/use-cohorts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import RequiredLabel from "@/components/ui/required-label";
import FieldError from "@/components/ui/field-error";
import { useFormValidation } from "@/hooks/use-form-validation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Send, Loader2, MessageSquare, Globe } from "lucide-react";

const FormateurMessageSender = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { cohorts: allCohorts } = useCohorts();
  const [assignedFormationIds, setAssignedFormationIds] = useState<string[]>([]);
  const [loadingFormations, setLoadingFormations] = useState(true);
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [cohortId, setCohortId] = useState("");
  const [recipientId, setRecipientId] = useState("all");
  const [students, setStudents] = useState<{ user_id: string; first_name: string; last_name: string }[]>([]);

  const { showError, handleBlur, isValid, validateAll, reset } = useFormValidation(
    { cohortId, content },
    {
      cohortId: { required: "Veuillez choisir une cohorte." },
      content: { required: "Le message est requis." },
    },
  );

  useEffect(() => {
    if (!user) return;
    supabase.from("staff_formations").select("formation_id").eq("user_id", user.id)
      .then(({ data }) => {
        if (data) setAssignedFormationIds(data.map((d: any) => d.formation_id));
        setLoadingFormations(false);
      });
  }, [user]);

  const cohorts = loadingFormations ? [] : assignedFormationIds.length > 0
    ? allCohorts.filter(c => c.formation_id && assignedFormationIds.includes(c.formation_id))
    : [];

  // Fetch students when cohort changes
  useEffect(() => {
    if (!cohortId) { setStudents([]); return; }
    const fetchStudents = async () => {
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("user_id")
        .eq("cohort_id", cohortId);

      if (enrollments && enrollments.length > 0) {
        const userIds = enrollments.map((e: any) => e.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, first_name, last_name")
          .in("user_id", userIds);
        if (profiles) setStudents(profiles as any);
      }
    };
    fetchStudents();
  }, [cohortId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;
    if (!user || !cohortId) return;
    setSending(true);

    try {
      const { error } = await supabase.from("messages").insert({
        sender_id: user.id,
        cohort_id: cohortId,
        recipient_id: recipientId === "all" ? null : recipientId,
        title: title.trim() || null,
        content: content.trim(),
      });

      if (error) throw error;

      // Also create notifications for targeted students
      let targetIds: string[] = [];
      if (recipientId === "all") {
        targetIds = students.map(s => s.user_id);
      } else {
        targetIds = [recipientId];
      }

      if (targetIds.length > 0) {
        const notifications = targetIds.map(uid => ({
          user_id: uid,
          cohort_id: cohortId,
          type: "official" as string,
          title: `Message du formateur : ${title || "Nouveau message"}`,
          message: content.substring(0, 200),
          created_by: user.id,
        }));
        await supabase.from("notifications").insert(notifications);

        // Send push notifications
        sendPushToUsers(targetIds, `Message du formateur : ${title || "Nouveau message"}`, content.substring(0, 200));
      }

      toast({ title: "Message envoyé." });
      setTitle("");
      setContent("");
      setRecipientId("all");
      reset();
      setOpen(false);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
    setSending(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <MessageSquare className="h-4 w-4" /> Message formateur
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <MessageSquare className="h-5 w-5" /> Envoyer un message
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSend} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <RequiredLabel required>Cohorte</RequiredLabel>
              <Select value={cohortId} onValueChange={(v) => { setCohortId(v); handleBlur("cohortId"); }}>
                <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>
                  {cohorts.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}{c.formation ? ` (${c.formation.name})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={showError("cohortId")} />
            </div>
            <div>
              <Label>Destinataire</Label>
              <Select value={recipientId} onValueChange={setRecipientId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <span className="flex items-center gap-2">
                      <Globe className="h-4 w-4 shrink-0" />
                      Toute la cohorte
                    </span>
                  </SelectItem>
                  {students.map(s => (
                    <SelectItem key={s.user_id} value={s.user_id}>
                      {s.first_name} {s.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="fmt-title">Titre (optionnel)</Label>
            <Input id="fmt-title" maxLength={200} value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Retour sur le brief de la semaine" />
          </div>
          <div>
            <RequiredLabel htmlFor="fmt-content" required>Message</RequiredLabel>
            <Textarea id="fmt-content" maxLength={2000} rows={4} value={content} onChange={e => setContent(e.target.value)} onBlur={() => handleBlur("content")} aria-invalid={!!showError("content")} placeholder="Rédigez votre message..." />
            <FieldError message={showError("content")} />
          </div>
          <Button type="submit" disabled={sending || !isValid} className="w-full">
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Envoyer {recipientId === "all" ? "à toute la cohorte" : "à l'étudiant"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FormateurMessageSender;
