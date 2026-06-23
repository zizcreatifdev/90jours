import { useState, useEffect } from "react";
import { sendPushToUsers } from "@/hooks/use-push-notifications";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import RequiredLabel from "@/components/ui/required-label";
import FieldError from "@/components/ui/field-error";
import { useFormValidation } from "@/hooks/use-form-validation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Send, Loader2, UserCog, Users } from "lucide-react";

const StaffMessageSender = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [recipientId, setRecipientId] = useState("all");
  const [formateurs, setFormateurs] = useState<{ user_id: string; first_name: string; last_name: string }[]>([]);

  const { showError, handleBlur, isValid, validateAll, reset } = useFormValidation(
    { recipientId, content },
    {
      recipientId: { required: "Veuillez choisir un destinataire." },
      content: { required: "Le message est requis." },
    },
  );

  // Recupere la liste des formateurs (role staff) joint a profiles (pattern fetchStaff)
  useEffect(() => {
    const fetchFormateurs = async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "staff");
      const ids = (roles || []).map((r: any) => r.user_id);
      if (ids.length === 0) { setFormateurs([]); return; }
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name")
        .in("user_id", ids);
      if (profiles) setFormateurs(profiles as any);
    };
    fetchFormateurs();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;
    if (!user) return;
    setSending(true);

    try {
      // Destinataires cibles : un formateur precis, ou tous les formateurs
      const targetIds = recipientId === "all"
        ? formateurs.map(f => f.user_id)
        : [recipientId];

      if (targetIds.length === 0) {
        toast({ title: "Aucun formateur trouvé", variant: "destructive" });
        setSending(false);
        return;
      }

      // Canal 1 : table messages (une ligne par formateur destinataire, comme FormateurMessageSender)
      const messageRows = targetIds.map(uid => ({
        sender_id: user.id,
        cohort_id: null,
        recipient_id: uid,
        title: title.trim() || null,
        content: content.trim(),
      }));
      const { error: messagesError } = await supabase.from("messages").insert(messageRows);
      if (messagesError) throw messagesError;

      // Canal 2 : notifications (une ligne par formateur) + push
      const notifications = targetIds.map(uid => ({
        user_id: uid,
        cohort_id: null,
        type: "official" as string,
        title: `Message de l'administration : ${title || "Nouveau message"}`,
        message: content.substring(0, 200),
        created_by: user.id,
      }));
      const { error: notifError } = await supabase.from("notifications").insert(notifications);
      if (notifError) throw notifError;

      sendPushToUsers(targetIds, `Message de l'administration : ${title || "Nouveau message"}`, content.substring(0, 200));

      toast({ title: `Message envoyé à ${targetIds.length} formateur(s).` });
      setTitle("");
      setContent("");
      setRecipientId("all");
      reset();
      setOpen(false);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <UserCog className="h-4 w-4" /> Message aux formateurs
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <UserCog className="h-5 w-5" /> Message aux formateurs
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSend} className="space-y-4 pt-2">
          <div>
            <RequiredLabel required>Destinataire</RequiredLabel>
            <Select value={recipientId} onValueChange={(v) => { setRecipientId(v); handleBlur("recipientId"); }}>
              <SelectTrigger aria-invalid={!!showError("recipientId")}><SelectValue placeholder="Choisir..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4 shrink-0" />
                    Tous les formateurs
                  </span>
                </SelectItem>
                {formateurs.map(f => (
                  <SelectItem key={f.user_id} value={f.user_id}>
                    {f.first_name} {f.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={showError("recipientId")} />
          </div>
          <div>
            <Label htmlFor="staff-msg-title">Titre (optionnel)</Label>
            <Input id="staff-msg-title" maxLength={200} value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Réunion pédagogique de la semaine" />
          </div>
          <div>
            <RequiredLabel htmlFor="staff-msg-content" required>Message</RequiredLabel>
            <Textarea id="staff-msg-content" maxLength={2000} rows={4} value={content} onChange={e => setContent(e.target.value)} onBlur={() => handleBlur("content")} aria-invalid={!!showError("content")} placeholder="Rédigez votre message..." />
            <FieldError message={showError("content")} />
          </div>
          <Button type="submit" disabled={sending || !isValid} className="w-full">
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Envoyer {recipientId === "all" ? "à tous les formateurs" : "au formateur"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StaffMessageSender;
