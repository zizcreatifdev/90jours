import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserCircle } from "lucide-react";

const StudentProfile = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState(profile?.first_name || "");
  const [lastName, setLastName] = useState(profile?.last_name || "");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadProfile = async () => {
    if (!user || loaded) return;
    const { data } = await supabase
      .from("profiles")
      .select("first_name, last_name, phone")
      .eq("user_id", user.id)
      .single();
    if (data) {
      setFirstName(data.first_name);
      setLastName(data.last_name);
      setPhone(data.phone || "");
    }
    setLoaded(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ first_name: firstName, last_name: lastName, phone })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profil mis à jour !" });
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) loadProfile(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <UserCircle className="h-4 w-4" /> Mon profil
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Modifier mon profil</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4 pt-2">
          <div>
            <Label htmlFor="prof-fn">Prénom</Label>
            <Input id="prof-fn" required value={firstName} onChange={e => setFirstName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="prof-ln">Nom</Label>
            <Input id="prof-ln" required value={lastName} onChange={e => setLastName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="prof-phone">Téléphone</Label>
            <Input id="prof-phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+225..." />
          </div>
          <div className="text-xs text-muted-foreground">
            Email : {user?.email}
          </div>
          <Button type="submit" disabled={saving} className="w-full">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StudentProfile;
