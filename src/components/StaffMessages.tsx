import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MessageSquare, Send, Loader2, ChevronDown, ChevronUp, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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

type ProfileMap = Record<string, { first_name: string; last_name: string }>;

const StaffMessages = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"admin" | "students">("admin");

  // Admin section (messages received from administration)
  const [adminMessages, setAdminMessages] = useState<Message[]>([]);
  const [adminReplies, setAdminReplies] = useState<Record<string, Message[]>>({});
  const [loadingAdmin, setLoadingAdmin] = useState(true);
  const [adminProfiles, setAdminProfiles] = useState<ProfileMap>({});

  // Student conversations section (messages sent by formateur + student replies)
  const [sentMessages, setSentMessages] = useState<Message[]>([]);
  const [sentReplies, setSentReplies] = useState<Record<string, Message[]>>({});
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [studentProfiles, setStudentProfiles] = useState<ProfileMap>({});

  // Shared reply UI state
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [sending, setSending] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

  const fetchAdminMessages = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .is("parent_id", null)
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      setAdminMessages(data as Message[]);
      const msgIds = data.map((m: any) => m.id as string);
      const allSenderIds: string[] = [...new Set(data.map((m: any) => m.sender_id as string))];

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
          setAdminReplies(grouped);
          replyData.forEach((r: any) => {
            if (!allSenderIds.includes(r.sender_id as string)) allSenderIds.push(r.sender_id as string);
          });
        }
      }

      if (allSenderIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, first_name, last_name")
          .in("user_id", allSenderIds);
        if (profilesData) {
          const map: ProfileMap = {};
          profilesData.forEach((p: any) => { map[p.user_id] = p; });
          setAdminProfiles(map);
        }
      }
    }
    setLoadingAdmin(false);
  };

  const fetchStudentConversations = async () => {
    if (!user) return;
    // Root messages sent by this formateur via FormateurMessageSender
    const { data } = await supabase
      .from("messages")
      .select("*")
      .is("parent_id", null)
      .eq("sender_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      setSentMessages(data as Message[]);
      const msgIds = data.map((m: any) => m.id as string);

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
          setSentReplies(grouped);

          // Profiles to load: individual recipients + reply senders (excluding self)
          const recipientIds = data
            .filter((m: any) => m.recipient_id && m.recipient_id !== user.id)
            .map((m: any) => m.recipient_id as string);
          const replySenderIds = replyData
            .filter((r: any) => r.sender_id !== user.id)
            .map((r: any) => r.sender_id as string);
          const allIds = [...new Set([...recipientIds, ...replySenderIds])];

          if (allIds.length > 0) {
            const { data: profilesData } = await supabase
              .from("profiles")
              .select("user_id, first_name, last_name")
              .in("user_id", allIds);
            if (profilesData) {
              const map: ProfileMap = {};
              profilesData.forEach((p: any) => { map[p.user_id] = p; });
              setStudentProfiles(map);
            }
          }
        } else {
          setSentReplies({});
        }
      } else {
        setSentReplies({});
      }
    }
    setLoadingStudents(false);
  };

  useEffect(() => {
    fetchAdminMessages();
    fetchStudentConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user) return;
    // Channel 1: messages addressed to the formateur (from admin)
    const ch1 = supabase
      .channel("staff-msg-admin-" + user.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `recipient_id=eq.${user.id}` }, () => {
        fetchAdminMessages();
      })
      .subscribe();

    // Canal 2 : sans filtre car Supabase Realtime ne supporte pas de filtre multi-colonnes
    // (sender_id + parent_id). Toute insertion dans messages declenche un re-fetch ;
    // fetchStudentConversations ne charge que les messages envoyes par ce formateur.
    const ch2 = supabase
      .channel("staff-msg-sent-" + user.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        fetchStudentConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const switchTab = (tab: "admin" | "students") => {
    setActiveTab(tab);
    setReplyingTo(null);
    setReplyContent("");
  };

  const handleReplyAdmin = async (parentId: string, originalSenderId: string) => {
    if (!user || !replyContent.trim()) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      parent_id: parentId,
      recipient_id: originalSenderId,
      content: replyContent.trim(),
      cohort_id: null,
    });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setReplyContent("");
      setReplyingTo(null);
      setExpandedReplies(prev => new Set([...prev, parentId]));
      fetchAdminMessages();
    }
    setSending(false);
  };

  const handleReplyStudent = async (parentId: string, cohortId: string | null) => {
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
      fetchStudentConversations();
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

  const getAdminSenderName = (senderId: string) => {
    if (senderId === user?.id) return "Vous";
    const p = adminProfiles[senderId];
    if (p) return `${p.first_name} ${p.last_name}`.trim() || "Administration";
    return "Administration";
  };

  const getStudentName = (userId: string) => {
    if (userId === user?.id) return "Vous";
    const p = studentProfiles[userId];
    if (p) return `${p.first_name} ${p.last_name}`.trim() || "Etudiant";
    return "Etudiant";
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

  const renderSkeleton = () => (
    <div className="space-y-4 pt-2">
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

  const formInit = (profile?.first_name?.[0] || user?.email?.[0] || "F").toUpperCase();

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
          <MessageSquare className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">Messages</h2>
          <p className="text-sm text-muted-foreground">Echanges avec l'administration et vos etudiants</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-4">
        <button
          onClick={() => switchTab("admin")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
            activeTab === "admin"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Administration
          {!loadingAdmin && adminMessages.length > 0 && (
            <span className="ml-2 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {adminMessages.length}
            </span>
          )}
        </button>
        <button
          onClick={() => switchTab("students")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
            activeTab === "students"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Users className="h-3.5 w-3.5" />
          Etudiants
          {!loadingStudents && sentMessages.length > 0 && (
            <span className="ml-1.5 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {sentMessages.length}
            </span>
          )}
        </button>
      </div>

      {/* Administration tab */}
      {activeTab === "admin" && (
        loadingAdmin ? renderSkeleton() : adminMessages.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="Aucun message pour le moment"
            description="Les messages que l'administration vous adresse apparaitront ici."
          />
        ) : (
          <div className="space-y-4">
            {adminMessages.map(msg => {
              const msgReplies = adminReplies[msg.id] || [];
              const isExpanded = expandedReplies.has(msg.id);
              return (
                <div key={msg.id} className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-9 w-9 flex-shrink-0">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                          {getAdminSenderName(msg.sender_id)[0]?.toUpperCase() || "A"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-foreground">{getAdminSenderName(msg.sender_id)}</span>
                          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">Administration</span>
                          <span className="text-xs text-muted-foreground/60">{formatDate(msg.created_at)}</span>
                        </div>
                        {msg.title && <h3 className="mt-1 text-sm font-semibold text-foreground">{msg.title}</h3>}
                        <p className="mt-1.5 text-sm text-muted-foreground whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-border bg-secondary/30">
                    {msgReplies.length > 0 && (
                      <button onClick={() => toggleReplies(msg.id)} className="flex w-full items-center gap-1.5 px-5 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        {msgReplies.length} reponse{msgReplies.length > 1 ? "s" : ""}
                      </button>
                    )}
                    {isExpanded && msgReplies.map(reply => (
                      <div key={reply.id} className="px-5 py-3 border-t border-border/50">
                        <div className="flex items-start gap-2.5 pl-4">
                          <Avatar className="h-7 w-7 flex-shrink-0">
                            <AvatarFallback className={`text-[10px] font-bold ${reply.sender_id === user?.id ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>
                              {getAdminSenderName(reply.sender_id)[0]?.toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-foreground">{getAdminSenderName(reply.sender_id)}</span>
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
                            placeholder="Ecrire une reponse..."
                            value={replyContent}
                            onChange={e => setReplyContent(e.target.value)}
                            className="min-h-[60px] text-sm bg-background"
                            rows={2}
                          />
                          <div className="flex flex-col gap-1">
                            <Button size="sm" onClick={() => handleReplyAdmin(msg.id, msg.sender_id)} disabled={sending || !replyContent.trim()}>
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
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Students tab */}
      {activeTab === "students" && (
        loadingStudents ? renderSkeleton() : sentMessages.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Aucune conversation pour le moment"
            description="Les messages que vous envoyez aux etudiants et leurs reponses apparaitront ici."
          />
        ) : (
          <div className="space-y-4">
            {sentMessages.map(msg => {
              const msgReplies = sentReplies[msg.id] || [];
              const isExpanded = expandedReplies.has(msg.id);
              const recipientName = msg.recipient_id ? getStudentName(msg.recipient_id) : null;
              return (
                <div key={msg.id} className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-9 w-9 flex-shrink-0">
                        <AvatarFallback className="bg-accent text-accent-foreground text-xs font-bold">
                          {formInit}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-foreground">Vous</span>
                          {recipientName ? (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                              Pour : {recipientName}
                            </span>
                          ) : (
                            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                              Toute la cohorte
                            </span>
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
                      <button onClick={() => toggleReplies(msg.id)} className="flex w-full items-center gap-1.5 px-5 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        {msgReplies.length} reponse{msgReplies.length > 1 ? "s" : ""}
                      </button>
                    )}
                    {isExpanded && msgReplies.map(reply => (
                      <div key={reply.id} className="px-5 py-3 border-t border-border/50">
                        <div className="flex items-start gap-2.5 pl-4">
                          <Avatar className="h-7 w-7 flex-shrink-0">
                            <AvatarFallback className={`text-[10px] font-bold ${reply.sender_id === user?.id ? "bg-accent text-accent-foreground" : "bg-primary/20 text-primary"}`}>
                              {getStudentName(reply.sender_id)[0]?.toUpperCase() || "E"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-foreground">{getStudentName(reply.sender_id)}</span>
                              {reply.sender_id !== user?.id && (
                                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">Etudiant</span>
                              )}
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
                            placeholder="Ecrire une reponse..."
                            value={replyContent}
                            onChange={e => setReplyContent(e.target.value)}
                            className="min-h-[60px] text-sm bg-background"
                            rows={2}
                          />
                          <div className="flex flex-col gap-1">
                            <Button size="sm" onClick={() => handleReplyStudent(msg.id, msg.cohort_id)} disabled={sending || !replyContent.trim()}>
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
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
};

export default StaffMessages;
