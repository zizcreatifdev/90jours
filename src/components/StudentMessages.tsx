import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MessageSquare, Send, Loader2, ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Message {
  id: string;
  sender_id: string;
  cohort_id: string | null;
  recipient_id: string | null;
  parent_id: string | null;
  title: string | null;
  content: string;
  created_at: string;
  sender_name?: string;
}

interface Recipient {
  id: string;
  label: string;
}

interface StudentMessagesProps {
  cohortId: string;
  formationId?: string | null;
  isArchived?: boolean;
}

const StudentMessages = ({ cohortId, formationId, isArchived }: StudentMessagesProps) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [replies, setReplies] = useState<Record<string, Message[]>>({});
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [sending, setSending] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [profiles, setProfiles] = useState<Record<string, { first_name: string; last_name: string }>>({});

  // New message dialog state
  const [newMsgOpen, setNewMsgOpen] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [newMsgRecipientId, setNewMsgRecipientId] = useState("");
  const [newMsgTitle, setNewMsgTitle] = useState("");
  const [newMsgContent, setNewMsgContent] = useState("");
  const [sendingNew, setSendingNew] = useState(false);

  const fetchMessages = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("messages")
      .select("*")
      .is("parent_id", null)
      .or(`cohort_id.eq.${cohortId},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      setMessages(data as Message[]);

      const msgIds = data.map((m: any) => m.id);
      if (msgIds.length > 0) {
        const { data: replyData } = await supabase
          .from("messages")
          .select("*")
          .in("parent_id", msgIds)
          .order("created_at", { ascending: true });

        if (replyData) {
          const grouped: Record<string, Message[]> = {};
          replyData.forEach((r: any) => {
            if (!grouped[r.parent_id]) grouped[r.parent_id] = [];
            grouped[r.parent_id].push(r as Message);
          });
          setReplies(grouped);
        }
      }

      const senderIds = [...new Set([...data.map((m: any) => m.sender_id)])];
      if (senderIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, first_name, last_name")
          .in("user_id", senderIds);

        if (profilesData) {
          const map: Record<string, { first_name: string; last_name: string }> = {};
          profilesData.forEach((p: any) => { map[p.user_id] = p; });
          setProfiles(map);
        }
      }
    }
    setLoading(false);
  };

  // Fetch possible recipients: formateur(s) for this formation + admins
  const fetchRecipients = async () => {
    const list: Recipient[] = [];

    if (formationId) {
      const { data: staffRows } = await supabase
        .from("staff_formations")
        .select("user_id, profiles:user_id(first_name, last_name)")
        .eq("formation_id", formationId);

      (staffRows || []).forEach((row: any) => {
        const p = row.profiles;
        const label = p ? `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Formateur" : "Formateur";
        list.push({ id: row.user_id, label });
      });
    }

    // Add super admins as fallback "Administration" option
    const { data: admins } = await supabase
      .from("profiles")
      .select("user_id, first_name, last_name")
      .eq("role", "super_admin");

    (admins || []).forEach((a: any) => {
      const alreadyAdded = list.some(r => r.id === a.user_id);
      if (!alreadyAdded) {
        list.push({ id: a.user_id, label: "Administration" });
      }
    });

    setRecipients(list);
    if (list.length > 0 && !newMsgRecipientId) {
      setNewMsgRecipientId(list[0].id);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [user, cohortId]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("student-messages-" + cohortId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, cohortId]);

  const handleReply = async (parentId: string) => {
    if (!user || !replyContent.trim()) return;
    setSending(true);

    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      parent_id: parentId,
      content: replyContent.trim(),
      cohort_id: cohortId,
    });

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setReplyContent("");
      setReplyingTo(null);
      setExpandedReplies(prev => new Set([...prev, parentId]));
      fetchMessages();
    }
    setSending(false);
  };

  const handleSendNew = async () => {
    if (!user || !newMsgRecipientId || !newMsgTitle.trim() || !newMsgContent.trim()) return;
    setSendingNew(true);

    const { data: recipientProfile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("user_id", newMsgRecipientId)
      .maybeSingle();

    if (!recipientProfile) {
      toast({ title: "Destinataire indisponible", description: "Ce formateur n'est plus disponible.", variant: "destructive" });
      setSendingNew(false);
      return;
    }

    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      recipient_id: newMsgRecipientId,
      title: newMsgTitle.trim(),
      content: newMsgContent.trim(),
      cohort_id: cohortId,
      parent_id: null,
    });

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      setSendingNew(false);
      return;
    }

    // Notification for the recipient
    const senderName = profile
      ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "un etudiant"
      : "un etudiant";
    await supabase.from("notifications").insert({
      user_id: newMsgRecipientId,
      title: "Nouveau message",
      message: `Nouveau message de ${senderName} : ${newMsgTitle.trim()}`,
      type: "message",
      created_by: user.id,
      cohort_id: cohortId,
    });

    toast({ title: "Message envoye", description: "Votre message a ete transmis." });
    setNewMsgOpen(false);
    setNewMsgTitle("");
    setNewMsgContent("");
    fetchMessages();
    setSendingNew(false);
  };

  const openNewMsg = () => {
    fetchRecipients();
    setNewMsgOpen(true);
  };

  const toggleReplies = (msgId: string) => {
    setExpandedReplies(prev => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  };

  const getSenderName = (senderId: string) => {
    const p = profiles[senderId];
    if (p) return `${p.first_name} ${p.last_name}`.trim() || "Formateur";
    return "Formateur";
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "A l'instant";
    if (minutes < 60) return `Il y a ${minutes}min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="h-5 w-40" />
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <MessageSquare className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">Messages</h2>
            <p className="text-sm text-muted-foreground">Echanges avec vos formateurs</p>
          </div>
        </div>
        <Button size="sm" onClick={openNewMsg} className="gap-2" disabled={!!isArchived}>
          <Plus className="h-4 w-4" />
          Nouveau message
        </Button>
      </div>

      {/* New message dialog */}
      <Dialog open={newMsgOpen} onOpenChange={setNewMsgOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Nouveau message</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {recipients.length > 0 ? (
              <div className="space-y-1.5">
                <Label htmlFor="nm-recipient">Destinataire</Label>
                <Select value={newMsgRecipientId} onValueChange={setNewMsgRecipientId}>
                  <SelectTrigger id="nm-recipient">
                    <SelectValue placeholder="Choisir un destinataire" />
                  </SelectTrigger>
                  <SelectContent>
                    {recipients.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground rounded-xl bg-secondary px-4 py-3">
                Aucun formateur associe a cette formation. Le message sera transmis a l'administration.
              </p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="nm-title">Objet</Label>
              <Input
                id="nm-title"
                placeholder="Objet de votre message"
                value={newMsgTitle}
                onChange={e => setNewMsgTitle(e.target.value)}
                maxLength={120}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nm-content">Message</Label>
              <Textarea
                id="nm-content"
                placeholder="Ecrivez votre message ici..."
                value={newMsgContent}
                onChange={e => setNewMsgContent(e.target.value)}
                className="min-h-[120px]"
                rows={5}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={() => setNewMsgOpen(false)} disabled={sendingNew}>
                <X className="h-4 w-4 mr-1" /> Annuler
              </Button>
              <Button
                onClick={handleSendNew}
                disabled={sendingNew || !newMsgTitle.trim() || !newMsgContent.trim() || !newMsgRecipientId}
                className="gap-2"
              >
                {sendingNew ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Envoyer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {messages.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="Aucun message pour l'instant"
          description="Les messages de vos formateurs apparaitront ici. Vous pouvez aussi initier un echange."
        />
      ) : (
        <div className="space-y-4">
          {messages.map(msg => {
            const msgReplies = replies[msg.id] || [];
            const isExpanded = expandedReplies.has(msg.id);

            return (
              <div key={msg.id} className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
                {/* Main message */}
                <div className="p-5">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-9 w-9 flex-shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                        {getSenderName(msg.sender_id)[0]?.toUpperCase() || "F"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">
                          {msg.sender_id === user?.id ? "Vous" : getSenderName(msg.sender_id)}
                        </span>
                        {msg.recipient_id ? (
                          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">Personnel</span>
                        ) : (
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Cohorte</span>
                        )}
                        <span className="text-xs text-muted-foreground/60">{formatDate(msg.created_at)}</span>
                      </div>
                      {msg.title && (
                        <h3 className="mt-1 text-sm font-semibold text-foreground">{msg.title}</h3>
                      )}
                      <p className="mt-1.5 text-sm text-muted-foreground whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                </div>

                {/* Replies section */}
                <div className="border-t border-border bg-secondary/30">
                  {msgReplies.length > 0 && (
                    <button
                      onClick={() => toggleReplies(msg.id)}
                      className="flex w-full items-center gap-1.5 px-5 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      {msgReplies.length} reponse{msgReplies.length > 1 ? "s" : ""}
                    </button>
                  )}

                  {isExpanded && msgReplies.map(reply => (
                    <div key={reply.id} className="px-5 py-3 border-t border-border/50">
                      <div className="flex items-start gap-2.5 pl-4">
                        <Avatar className="h-7 w-7 flex-shrink-0">
                          <AvatarFallback className={`text-[10px] font-bold ${reply.sender_id === user?.id ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>
                            {getSenderName(reply.sender_id)[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-foreground">
                              {reply.sender_id === user?.id ? "Vous" : getSenderName(reply.sender_id)}
                            </span>
                            <span className="text-[10px] text-muted-foreground/60">{formatDate(reply.created_at)}</span>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground whitespace-pre-wrap">{reply.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Reply input - hidden in archive mode */}
                  {!isArchived && (
                    replyingTo === msg.id ? (
                      <div className="px-5 py-3 border-t border-border/50">
                        <div className="flex gap-2">
                          <Textarea
                            placeholder="Ecrire une reponse..."
                            value={replyContent}
                            onChange={e => setReplyContent(e.target.value)}
                            className="min-h-[60px] text-sm bg-background"
                            rows={2}
                          />
                          <div className="flex flex-col gap-1">
                            <Button size="sm" onClick={() => handleReply(msg.id)} disabled={sending || !replyContent.trim()}>
                              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { setReplyingTo(null); setReplyContent(""); }}>
                              Annuler
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setReplyingTo(msg.id); setExpandedReplies(prev => new Set([...prev, msg.id])); }}
                        className="flex w-full items-center gap-1.5 px-5 py-2.5 text-xs font-medium text-accent hover:text-accent/80 transition-colors border-t border-border/50"
                      >
                        <MessageSquare className="h-3.5 w-3.5" /> Repondre
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentMessages;
