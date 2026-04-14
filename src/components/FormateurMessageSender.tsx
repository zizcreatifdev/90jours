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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Send, Loader2, MessageSquare } from "lucide-react";

const FormateurMessageSender = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { cohorts } = useCohorts();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [cohortId, setCohortId] = useState("");
  const [recipientId, setRecipientId] = useState("all");
  const [students, setStudents] = useState<{ user_id: string; first_name: string; last_name: string }[]>([]);

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
          title: `💬 Message du formateur : ${title || "Nouveau message"}`,
          message: content.substring(0, 200),
          created_by: user.id,
        }));
        await supabase.from("notifications").insert(notifications);

        // Send push notifications
        sendPushToUsers(targetIds, `💬 Message du formateur : ${title || "Nouveau message"}`, content.substring(0, 200));
      }

      toast({ title: `Message envoyé ! 🎉` });
      setTitle("");
      setContent("");
      setRecipientId("all");
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
              <Label>Cohorte</Label>
              <Select value={cohortId} onValueChange={setCohortId}>
                <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>
                  {cohorts.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Destinataire</Label>
              <Select value={recipientId} onValueChange={setRecipientId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🌐 Toute la cohorte</SelectItem>
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
            <Label htmlFor="fmt-content">Message</Label>
            <Textarea id="fmt-content" required maxLength={2000} rows={4} value={content} onChange={e => setContent(e.target.value)} placeholder="Rédigez votre message..." />
          </div>
          <Button type="submit" disabled={sending || !cohortId || !content.trim()} className="w-full">
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Envoyer {recipientId === "all" ? "à toute la cohorte" : "à l'étudiant"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FormateurMessageSender;
