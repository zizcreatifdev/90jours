import { useState } from "react";
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
import { Send, Loader2, MessageSquarePlus, PartyPopper, Info, AlertTriangle, Globe } from "lucide-react";

const MESSAGE_TYPES = [
  { value: "official", label: "Message officiel", Icon: Info },
  { value: "celebration", label: "Celebration", Icon: PartyPopper },
  { value: "urgent", label: "Urgent", Icon: AlertTriangle },
  { value: "info", label: "Information", Icon: Info },
];

const OfficialMessageSender = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { cohorts } = useCohorts();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("official");
  const [cohortId, setCohortId] = useState("all");

  const { showError, handleBlur, isValid, validateAll, reset } = useFormValidation(
    { title, message },
    {
      title: { required: "Le titre est requis." },
      message: { required: "Le message est requis." },
    },
  );

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;
    if (!user) return;
    setSending(true);

    try {
      // Get target students
      let studentIds: string[] = [];
      if (cohortId === "all") {
        const { data } = await supabase.from("enrollments").select("user_id");
        studentIds = [...new Set((data || []).map((e: any) => e.user_id))];
      } else {
        const { data } = await supabase.from("enrollments").select("user_id").eq("cohort_id", cohortId);
        studentIds = (data || []).map((e: any) => e.user_id);
      }

      if (studentIds.length === 0) {
        toast({ title: "Aucun étudiant trouvé", variant: "destructive" });
        setSending(false);
        return;
      }

      // Insert notifications for all students
      const notifications = studentIds.map(uid => ({
        user_id: uid,
        cohort_id: cohortId === "all" ? null : cohortId,
        type,
        title,
        message,
        created_by: user.id,
      }));

      const { error } = await supabase.from("notifications").insert(notifications);
      if (error) throw error;

      // Send push notifications
      sendPushToUsers(studentIds, title, message);

      toast({ title: `Message envoyé à ${studentIds.length} étudiant(s).` });
      setTitle("");
      setMessage("");
      setType("official");
      setCohortId("all");
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
        <Button className="gap-2">
          <MessageSquarePlus className="h-4 w-4" /> Message officiel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Send className="h-5 w-5" /> Envoyer un message officiel
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSend} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type de message</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MESSAGE_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      <span className="flex items-center gap-2">
                        <t.Icon className="h-4 w-4 shrink-0" />
                        {t.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Destinataires</Label>
              <Select value={cohortId} onValueChange={setCohortId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <span className="flex items-center gap-2">
                      <Globe className="h-4 w-4 shrink-0" />
                      Toutes les cohortes
                    </span>
                  </SelectItem>
                  {cohorts.map(c => (
                    <SelectItem key={c.id} value={c.id}>Cohorte {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <RequiredLabel htmlFor="msg-title" required>Titre</RequiredLabel>
            <Input id="msg-title" maxLength={200} value={title} onChange={e => setTitle(e.target.value)} onBlur={() => handleBlur("title")} aria-invalid={!!showError("title")} placeholder="Ex: Joyeuse fête de Tabaski !" />
            <FieldError message={showError("title")} />
          </div>
          <div>
            <RequiredLabel htmlFor="msg-content" required>Message</RequiredLabel>
            <Textarea id="msg-content" maxLength={2000} rows={4} value={message} onChange={e => setMessage(e.target.value)} onBlur={() => handleBlur("message")} aria-invalid={!!showError("message")} placeholder="Rédigez votre message..." />
            <FieldError message={showError("message")} />
          </div>
          <Button type="submit" disabled={sending || !isValid} className="w-full">
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Envoyer à {cohortId === "all" ? "tous les étudiants" : "la cohorte"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default OfficialMessageSender;
