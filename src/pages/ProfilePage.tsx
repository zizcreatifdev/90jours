import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DashboardSidebar from "@/components/DashboardSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RequiredLabel from "@/components/ui/required-label";
import FieldError from "@/components/ui/field-error";
import { useFormValidation } from "@/hooks/use-form-validation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Camera, Save, ArrowLeft, LogOut, Menu, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";

const ProfilePage = () => {
  const { user, profile, roles, refreshProfile, signOut } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const { showError, handleBlur, isValid, validateAll } = useFormValidation(
    { firstName, lastName, phone },
    {
      firstName: { required: "Le prénom est requis." },
      lastName: { required: "Le nom est requis." },
      phone: { required: "Le téléphone est requis." },
    }
  );

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("first_name, last_name, phone, avatar_url")
        .eq("user_id", user.id)
        .single();
      if (data) {
        setFirstName(data.first_name);
        setLastName(data.last_name);
        setPhone(data.phone || "");
        setAvatarUrl(data.avatar_url);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const compressImage = (file: File, maxSizeMB: number): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let quality = 0.9;
        const canvas = document.createElement("canvas");
        const { width, height } = img;
        // Crop to square (1:1) from center
        const size = Math.min(width, height);
        const sx = (width - size) / 2;
        const sy = (height - size) / 2;
        const MAX_DIM = 800;
        const outSize = Math.min(size, MAX_DIM);
        canvas.width = outSize;
        canvas.height = outSize;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not supported"));
        ctx.drawImage(img, sx, sy, size, size, 0, 0, outSize, outSize);

        const tryCompress = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) return reject(new Error("Compression failed"));
              if (blob.size <= maxSizeMB * 1024 * 1024 || quality <= 0.3) {
                resolve(new File([blob], file.name, { type: "image/jpeg" }));
              } else {
                quality -= 0.1;
                tryCompress();
              }
            },
            "image/jpeg",
            quality
          );
        };
        tryCompress();
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = url;
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Erreur", description: "Veuillez sélectionner une image.", variant: "destructive" });
      return;
    }

    setUploading(true);

    // Auto-compress if over 5 MB
    if (file.size > 5 * 1024 * 1024) {
      try {
        file = await compressImage(file, 5);
        toast({ title: "Image compressée automatiquement" });
      } catch {
        toast({ title: "Erreur", description: "Impossible de compresser l'image.", variant: "destructive" });
        setUploading(false);
        return;
      }
    }

    const filePath = `${user.id}/avatar.jpeg`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast({ title: "Erreur", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const newUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: newUrl })
      .eq("user_id", user.id);

    if (updateError) {
      toast({ title: "Erreur", description: updateError.message, variant: "destructive" });
    } else {
      setAvatarUrl(newUrl);
      toast({ title: "Photo mise à jour !" });
      await refreshProfile();
    }
    setUploading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;
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
    }
  };

  const role = roles.includes("super_admin") ? "admin" : roles.includes("staff") ? "staff" : "student";
  const dashboardPath = role === "admin" ? "/admin" : role === "staff" ? "/staff" : "/student";

  const completenessFields = [
    { key: "first_name", filled: !!firstName.trim(), suggestion: "Renseignez votre prénom" },
    { key: "last_name",  filled: !!lastName.trim(),  suggestion: "Renseignez votre nom" },
    { key: "phone",      filled: !!phone.trim(),      suggestion: "Renseignez votre numéro de téléphone" },
    { key: "avatar_url", filled: !!avatarUrl,         suggestion: "Ajoutez une photo de profil" },
  ];
  const completenessPercent = Math.round(
    completenessFields.filter(f => f.filled).length / completenessFields.length * 100
  );
  const completenessMissing = completenessFields.filter(f => !f.filled);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar role={role} />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar role={role} mobileOpen={sidebarOpen} onMobileOpenChange={setSidebarOpen} />
      <main className="flex-1 overflow-auto">
        <header className="flex items-center gap-4 bg-card px-4 py-4 md:px-8 md:py-5 border-b border-border">
          <button onClick={() => setSidebarOpen(true)} aria-label="Ouvrir le menu" className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-foreground md:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <Link to={dashboardPath}>
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" /> Retour
            </Button>
          </Link>
          <h1 className="font-display text-lg md:text-xl font-bold text-foreground">Mon profil</h1>
        </header>

        <div className="mx-auto max-w-lg p-4 md:p-8">
          {/* Avatar */}
          <div className="mb-8 flex flex-col items-center">
            <div className="relative group">
              <Avatar className="h-28 w-28 border-4 border-border">
                <AvatarImage src={avatarUrl || undefined} alt="Photo de profil" className="object-cover" />
                <AvatarFallback className="bg-accent text-accent-foreground font-display text-3xl font-bold">
                  {(firstName?.[0] || "E").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/0 group-hover:bg-foreground/40 transition-colors cursor-pointer"
              >
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-background opacity-0 group-hover:opacity-100 transition-opacity" />
                ) : (
                  <Camera className="h-6 w-6 text-background opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">Cliquez pour changer la photo</p>
          </div>

          {/* Completeness indicator */}
          {completenessPercent < 100 && (
            <div className="mb-6 rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/20 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  Profil complété à {completenessPercent}%
                </span>
                <span className="text-xs text-amber-600 dark:text-amber-500">
                  {completenessFields.filter(f => f.filled).length}/{completenessFields.length} champs
                </span>
              </div>
              <Progress value={completenessPercent} className="h-1.5 mb-3" />
              <ul className="space-y-1.5">
                {completenessMissing.map(f => (
                  <li key={f.key} className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                    <ChevronRight className="h-3 w-3 shrink-0" />
                    {f.suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <RequiredLabel htmlFor="prof-fn" required>Prénom</RequiredLabel>
                <Input id="prof-fn" value={firstName} onChange={e => setFirstName(e.target.value)} onBlur={() => handleBlur("firstName")} aria-invalid={!!showError("firstName")} />
                <FieldError message={showError("firstName")} />
              </div>
              <div>
                <RequiredLabel htmlFor="prof-ln" required>Nom</RequiredLabel>
                <Input id="prof-ln" value={lastName} onChange={e => setLastName(e.target.value)} onBlur={() => handleBlur("lastName")} aria-invalid={!!showError("lastName")} />
                <FieldError message={showError("lastName")} />
              </div>
            </div>
            <div>
              <RequiredLabel htmlFor="prof-phone" required>Téléphone</RequiredLabel>
              <Input id="prof-phone" value={phone} onChange={e => setPhone(e.target.value)} onBlur={() => handleBlur("phone")} aria-invalid={!!showError("phone")} placeholder="+221..." />
              <FieldError message={showError("phone")} />
            </div>
            <div className="rounded-xl bg-secondary p-4 text-sm text-muted-foreground">
              <p><span className="font-medium text-foreground">Email :</span> {user?.email}</p>
              <p className="mt-1"><span className="font-medium text-foreground">Rôle :</span> {role === "admin" ? "Administrateur" : role === "staff" ? "Staff" : "Étudiant"}</p>
            </div>
            <Button type="submit" disabled={saving || !isValid} className="w-full gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer
            </Button>
          </form>

          <Button variant="outline" onClick={() => signOut()} className="mt-4 w-full gap-2 text-destructive hover:text-destructive">
            <LogOut className="h-4 w-4" /> Déconnexion
          </Button>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;
