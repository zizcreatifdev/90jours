import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RequiredLabel from "@/components/ui/required-label";
import FieldError from "@/components/ui/field-error";
import { useFormValidation } from "@/hooks/use-form-validation";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Plus, Loader2, Trash2, Tag } from "lucide-react";

interface Category {
  id: string;
  name: string;
  created_at: string;
}

const CategoryManager = () => {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const { showError, handleBlur, isValid, validateAll, reset } = useFormValidation(
    { name },
    { name: { required: "Le nom de la catégorie est requis." } },
  );

  const fetchCategories = async () => {
    const { data } = await supabase.from("brief_categories").select("*").order("name");
    if (data) setCategories(data as Category[]);
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("brief_categories").insert({ name: name.trim() } as any);
    setSaving(false);
    if (error) {
      toast({ title: "Erreur", description: error.code === "23505" ? "Cette catégorie existe déjà." : error.message, variant: "destructive" });
    } else {
      toast({ title: "Catégorie créée" });
      setName("");
      reset();
      fetchCategories();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("brief_categories").delete().eq("id", id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: "Catégorie supprimée" }); setCategories(prev => prev.filter(c => c.id !== id)); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Tag className="h-5 w-5" />
        <h2 className="font-display text-lg font-semibold text-foreground">Catégories de briefs</h2>
      </div>

      <form onSubmit={handleCreate} className="flex items-end gap-3">
        <div className="flex-1">
          <RequiredLabel required>Nouvelle catégorie</RequiredLabel>
          <Input value={name} onChange={e => setName(e.target.value)} onBlur={() => handleBlur("name")} aria-invalid={!!showError("name")} placeholder="Ex: Création de flyer" />
          <FieldError message={showError("name")} />
        </div>
        <Button type="submit" disabled={saving || !isValid} size="sm">
          {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
          Ajouter
        </Button>
      </form>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : categories.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">Aucune catégorie créée.</p>
      ) : (
        <div className="space-y-2">
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{cat.name}</span>
              </div>
              <ConfirmDialog
                trigger={<button className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>}
                title="Supprimer cette catégorie ?"
                description="Les briefs associés ne seront pas supprimés mais perdront leur catégorie."
                confirmLabel="Supprimer"
                onConfirm={() => handleDelete(cat.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoryManager;
