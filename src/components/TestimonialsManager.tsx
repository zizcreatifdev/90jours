import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Pencil, Trash2, Eye, EyeOff, GripVertical, Upload, X, Loader2, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Testimonial {
  id: string;
  name: string;
  role: string;
  content: string;
  photo_url: string | null;
  is_visible: boolean;
  display_order: number;
  created_at: string;
}

interface FormState {
  name: string;
  role: string;
  content: string;
  photo_url: string;
}

const EMPTY_FORM: FormState = { name: "", role: "", content: "", photo_url: "" };

const TestimonialsManager = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<Testimonial | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag-and-drop state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // supabase typed as any throughout this component because "testimonials"
  // is a new table not yet in the auto-generated types file.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db
      .from("testimonials")
      .select("*")
      .order("display_order", { ascending: true });
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else setItems(data || []);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Open form (add or edit) ──────────────────────────────────────────────
  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (t: Testimonial) => {
    setEditing(t);
    setForm({ name: t.name, role: t.role, content: t.content, photo_url: t.photo_url || "" });
    setDialogOpen(true);
  };

  // ── Photo upload to Supabase Storage ────────────────────────────────────
  const handlePhotoUpload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `testimonials/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) {
      toast({ title: "Erreur upload", description: upErr.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    setForm((f) => ({ ...f, photo_url: urlData.publicUrl }));
    setUploading(false);
  };

  // ── Save (insert or update) ──────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim() || !form.role.trim() || !form.content.trim()) {
      toast({ title: "Champs requis", description: "Nom, rôle et contenu sont obligatoires.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      role: form.role.trim(),
      content: form.content.trim(),
      photo_url: form.photo_url || null,
    };
    let err: { message: string } | null = null;
    if (editing) {
      const { error } = await db.from("testimonials").update(payload).eq("id", editing.id);
      err = error;
    } else {
      const maxOrder = items.length > 0 ? Math.max(...items.map((t) => t.display_order)) + 1 : 0;
      const { error } = await db.from("testimonials").insert({ ...payload, display_order: maxOrder });
      err = error;
    }
    if (err) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } else {
      toast({ title: editing ? "Témoignage mis à jour" : "Témoignage ajouté" });
      setDialogOpen(false);
      await load();
    }
    setSaving(false);
  };

  // ── Toggle visibility ────────────────────────────────────────────────────
  const handleToggle = async (t: Testimonial) => {
    setTogglingId(t.id);
    const { error } = await db
      .from("testimonials")
      .update({ is_visible: !t.is_visible })
      .eq("id", t.id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else setItems((prev) => prev.map((x) => x.id === t.id ? { ...x, is_visible: !x.is_visible } : x));
    setTogglingId(null);
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce témoignage ?")) return;
    setDeletingId(id);
    const { error } = await db.from("testimonials").delete().eq("id", id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else setItems((prev) => prev.filter((t) => t.id !== id));
    setDeletingId(null);
  };

  // ── Drag-and-drop reorder ─────────────────────────────────────────────────
  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };
  const handleDrop = async (dropIndex: number) => {
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const reordered = [...items];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    const updated = reordered.map((t, i) => ({ ...t, display_order: i }));
    setItems(updated);
    setDragIndex(null);
    setDragOverIndex(null);

    // Persist new order
    await Promise.all(
      updated.map((t) =>
        db.from("testimonials").update({ display_order: t.display_order }).eq("id", t.id)
      )
    );
    toast({ title: "Ordre mis à jour" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">Témoignages</h2>
          <p className="text-sm text-muted-foreground">
            {items.filter((t) => t.is_visible).length} visible{items.filter((t) => t.is_visible).length !== 1 ? "s" : ""} · {items.length} au total
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          Ajouter
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
          <Quote className="mx-auto mb-3 h-8 w-8 opacity-30" />
          <p className="text-sm">Aucun témoignage. Ajoutez-en un !</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((t, index) => (
            <div
              key={t.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={() => handleDrop(index)}
              onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
              className={cn(
                "flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-all",
                dragOverIndex === index && dragIndex !== index && "border-accent bg-accent/5",
                !t.is_visible && "opacity-60"
              )}
            >
              {/* Drag handle */}
              <div className="mt-1 cursor-grab text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing">
                <GripVertical className="h-5 w-5" />
              </div>

              {/* Photo */}
              {t.photo_url ? (
                <img
                  src={t.photo_url}
                  alt={t.name}
                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
                  {t.name[0]}
                </div>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-foreground text-sm">{t.name}</span>
                  <span className="text-xs text-muted-foreground">{t.role}</span>
                  {t.is_visible ? (
                    <span className="rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">Visible</span>
                  ) : (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Masqué</span>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{t.content}</p>
              </div>

              {/* Actions */}
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  title="Prévisualiser"
                  onClick={() => { setPreviewItem(t); setPreviewOpen(true); }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  title={t.is_visible ? "Masquer" : "Rendre visible"}
                  disabled={togglingId === t.id}
                  onClick={() => handleToggle(t)}
                >
                  {togglingId === t.id
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : t.is_visible
                    ? <EyeOff className="h-4 w-4" />
                    : <Eye className="h-4 w-4 text-accent" />
                  }
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  title="Modifier"
                  onClick={() => openEdit(t)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  title="Supprimer"
                  disabled={deletingId === t.id}
                  onClick={() => handleDelete(t.id)}
                >
                  {deletingId === t.id
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Trash2 className="h-4 w-4" />
                  }
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add / Edit dialog ──────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier le témoignage" : "Ajouter un témoignage"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="t-name">Nom *</Label>
                <Input
                  id="t-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Aminata Diallo"
                  maxLength={80}
                />
              </div>
              <div>
                <Label htmlFor="t-role">Rôle / Formation *</Label>
                <Input
                  id="t-role"
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  placeholder="Alumni Graphisme 2025"
                  maxLength={100}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="t-content">Témoignage *</Label>
              <Textarea
                id="t-content"
                rows={4}
                maxLength={600}
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                placeholder="Cette formation a complètement changé ma façon de..."
              />
              <p className="mt-1 text-xs text-muted-foreground">{form.content.length}/600</p>
            </div>

            {/* Photo upload */}
            <div>
              <Label>Photo (optionnelle)</Label>
              <div className="mt-1.5 flex items-center gap-3">
                {form.photo_url ? (
                  <div className="relative">
                    <img
                      src={form.photo_url}
                      alt="Preview"
                      className="h-14 w-14 rounded-full object-cover border border-border"
                    />
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, photo_url: "" }))}
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-border bg-muted text-muted-foreground">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  </div>
                )}
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePhotoUpload(file);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading ? "Envoi..." : "Choisir une photo"}
                  </Button>
                  <p className="mt-1 text-xs text-muted-foreground">JPG, PNG, WebP — max 2 Mo</p>
                </div>
              </div>
            </div>

            {/* Preview card */}
            {(form.name || form.content) && (
              <div className="rounded-xl border border-border bg-secondary/40 p-4">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Aperçu</p>
                <div className="flex items-start gap-3">
                  {form.photo_url ? (
                    <img src={form.photo_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                  ) : form.name ? (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
                      {form.name[0]}
                    </div>
                  ) : null}
                  <div>
                    <p className="text-sm font-semibold text-foreground">{form.name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{form.role || "—"}</p>
                    {form.content && (
                      <p className="mt-1.5 text-sm italic text-foreground/80 line-clamp-3">"{form.content}"</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={saving || uploading}>
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enregistrement...</> : "Enregistrer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Preview modal ──────────────────────────────────────────────────── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Aperçu du témoignage</DialogTitle>
          </DialogHeader>
          {previewItem && (
            <div className="rounded-2xl border border-border bg-[#f8f8f8] dark:bg-[#1a1a1a] p-6 mt-2">
              <Quote className="mb-4 h-7 w-7 text-accent opacity-40" />
              <p className="mb-6 text-base leading-relaxed text-foreground italic">
                "{previewItem.content}"
              </p>
              <div className="flex items-center gap-3">
                {previewItem.photo_url ? (
                  <img src={previewItem.photo_url} alt={previewItem.name} className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-lg font-bold text-accent-foreground">
                    {previewItem.name[0]}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-foreground">{previewItem.name}</p>
                  <p className="text-sm text-muted-foreground">{previewItem.role}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TestimonialsManager;
