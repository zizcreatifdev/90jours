import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCohorts } from "@/hooks/use-cohorts";
import { MessageSquare, Send, Loader2, ChevronDown, ChevronUp, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import Pagination from "@/components/ui/Pagination";

interface Message {
  id: string;
  sender_id: string;
  cohort_id: string | null;
  recipient_id: string | null;
  parent_id: string | null;
  title: string | null;
  content: string;
  created_at: string;
}

const PAGE_SIZE = 20;

const AdminMessages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { cohorts } = useCohorts();
  const [messages, setMessages] = useState<Message[]>([]);
  const [replies, setReplies] = useState<Record<string, Message[]>>({});
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Record<string, { first_name: string; last_name: string }>>({});
  const [filterCohort, setFilterCohort] = useState("all");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [sending, setSending] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("messages")
      .select("*", { count: "exact" })
      .is("parent_id", null)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (filterCohort !== "all") {
      query = query.eq("cohort_id", filterCohort);
    }

    const { data, count } = await query;
    if (count !== null) setTotalCount(count);

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

      const senderIds = [...new Set(data.map((m: any) => m.sender_id))];
      if (senderIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, first_name, last_name")
          .in("user_id", senderIds);
        if (profilesData) {
          const map: Record<string, { first_name: string; last_name: string }> = {};
          profilesData.forEach((p: any) => { map[p.user_id] = p; });
          setProfiles(prev => ({ ...prev, ...map }));
        }
      }
    }
    setLoading(false);
  }, [filterCohort, page]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  // Reset to page 0 when filter changes
  const handleFilterChange = (value: string) => {
    setFilterCohort(value);
    setPage(0);
  };

  useEffect(() => {
    const channel = supabase
      .channel("admin-messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => fetchMessages())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchMessages]);

  const handleReply = async (parentId: string) => {
    if (!user || !replyContent.trim()) return;
    setSending(true);
    const parentMsg = messages.find(m => m.id === parentId);
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      parent_id: parentId,
      content: replyContent.trim(),
      cohort_id: parentMsg?.cohort_id || null,
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

  const toggleReplies = (msgId: string) => {
    setExpandedReplies(prev => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  };

  const getName = (id: string) => {
    const p = profiles[id];
    return p ? `${p.first_name} ${p.last_name}`.trim() || "Utilisateur" : "Utilisateur";
  };

  const getCohortName = (cohortId: string | null) => {
    if (!cohortId) return null;
    return cohorts.find(c => c.id === cohortId)?.name || "Cohorte";
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "À l'instant";
    if (minutes < 60) return `Il y a ${minutes}min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <MessageSquare className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">Messages</h2>
            <p className="text-sm text-muted-foreground">Tous les échanges formateur / étudiant</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterCohort} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les cohortes</SelectItem>
              {cohorts.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}{c.formation ? ` (${c.formation.name})` : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : messages.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Aucun message</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {messages.map(msg => {
              const msgReplies = replies[msg.id] || [];
              const isExpanded = expandedReplies.has(msg.id);
              const cohortName = getCohortName(msg.cohort_id);

              return (
                <div key={msg.id} className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-9 w-9 flex-shrink-0">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                          {getName(msg.sender_id)[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-foreground">{getName(msg.sender_id)}</span>
                          {cohortName && (
                            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{cohortName}</span>
                          )}
                          {msg.recipient_id ? (
                            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">→ {getName(msg.recipient_id)}</span>
                          ) : (
                            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Cohorte</span>
                          )}
                          <span className="text-xs text-muted-foreground/60">{formatDate(msg.created_at)}</span>
                        </div>
                        {msg.title && <h3 className="mt-1 text-sm font-semibold text-foreground">{msg.title}</h3>}
                        <p className="mt-1.5 text-sm text-muted-foreground whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border bg-secondary/30">
                    {msgReplies.length > 0 && (
                      <button
                        onClick={() => toggleReplies(msg.id)}
                        className="flex w-full items-center gap-1.5 px-5 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        {msgReplies.length} réponse{msgReplies.length > 1 ? "s" : ""}
                      </button>
                    )}

                    {isExpanded && msgReplies.map(reply => (
                      <div key={reply.id} className="px-5 py-3 border-t border-border/50">
                        <div className="flex items-start gap-2.5 pl-4">
                          <Avatar className="h-7 w-7 flex-shrink-0">
                            <AvatarFallback className="text-[10px] font-bold bg-muted text-muted-foreground">
                              {getName(reply.sender_id)[0]?.toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-foreground">{getName(reply.sender_id)}</span>
                              <span className="text-[10px] text-muted-foreground/60">{formatDate(reply.created_at)}</span>
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground whitespace-pre-wrap">{reply.content}</p>
                          </div>
                        </div>
                      </div>
                    ))}

                    {replyingTo === msg.id ? (
                      <div className="px-5 py-3 border-t border-border/50">
                        <div className="flex gap-2">
                          <Textarea
                            placeholder="Écrire une réponse..."
                            value={replyContent}
                            onChange={e => setReplyContent(e.target.value)}
                            className="min-h-[60px] text-sm bg-background"
                            rows={2}
                          />
                          <div className="flex flex-col gap-1">
                            <Button size="sm" onClick={() => handleReply(msg.id)} disabled={sending || !replyContent.trim()}>
                              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { setReplyingTo(null); setReplyContent(""); }}>Annuler</Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setReplyingTo(msg.id); setExpandedReplies(prev => new Set([...prev, msg.id])); }}
                        className="flex w-full items-center gap-1.5 px-5 py-2.5 text-xs font-medium text-accent hover:text-accent/80 transition-colors border-t border-border/50"
                      >
                        <MessageSquare className="h-3.5 w-3.5" /> Répondre
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
};

export default AdminMessages;
