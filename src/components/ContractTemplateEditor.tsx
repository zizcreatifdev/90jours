import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RequiredLabel from "@/components/ui/required-label";
import FieldError from "@/components/ui/field-error";
import { useFormValidation } from "@/hooks/use-form-validation";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ConfirmDialog from "@/components/ConfirmDialog";
import ContractRichEditor from "@/components/ContractRichEditor";
import { extractContractBody, renderContractDocument, CONTRACT_CSS } from "@/lib/contract-style";
import { sanitizeContractHtml } from "@/lib/sanitize-html";
import { CONTRACT_VARIABLES } from "@/lib/contract-variable";
import type { Editor } from "@tiptap/react";
import { Loader2, Plus, Pencil, Trash2, Eye, FileSignature, ToggleLeft, ToggleRight } from "lucide-react";

interface ContractTemplate {
  id: string;
  name: string;
  description: string | null;
  content: string;
  formation_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const DEMO_VARS: Record<string, string> = {
  prenom: "Aminata",
  nom: "Diallo",
  email: "aminata.diallo@email.com",
  formation: "Design Graphique 60 Jours",
  cohorte: "A",
  formateur: "Pierre Martin",
  date_debut: "1er septembre 2026",
  date_fin: "29 novembre 2026",
  montant: "50 000 FCFA",
  frais_inscription: "10 000 FCFA",
  cout_total: "50 000 FCFA",
  livrable: "Portfolio",
  date_signature: "14 avril 2026",
  heure_signature: "09:30",
  signature_name: "Aminata Diallo",
};

const fillDemo = (html: string): string =>
  Object.entries(DEMO_VARS).reduce(
    (acc, [k, v]) => acc.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v),
    html
  );

const ContractTemplateEditor = () => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formContent, setFormContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const editorRef = useRef<Editor | null>(null);

  // Aperçu : remplit les variables (demo) puis réinjecte le style premium.
  const buildPreview = (body: string) => renderContractDocument(fillDemo(body));

  const { showError, handleBlur, isValid, validateAll, reset } = useFormValidation(
    { name: formName, content: formContent },
    {
      name: { required: "Le nom du template est requis." },
      content: { required: "Le contenu HTML est requis." },
    },
  );

  const fetchTemplates = async () => {
    const { data } = await supabase
      .from("contract_templates")
      .select("*")
      .order("created_at", { ascending: false });
    setTemplates((data || []) as ContractTemplate[]);
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, []);

  const resetForm = () => { setEditingId(null); setFormName(""); setFormDescription(""); setFormContent(""); reset(); };

  const handleEdit = (t: ContractTemplate) => {
    setEditingId(t.id);
    setFormName(t.name);
    setFormDescription(t.description || "");
    // On édite uniquement le CORPS : on retire le style/enveloppe figés.
    setFormContent(extractContractBody(t.content));
    reset();
  };

  const handleSave = async () => {
    if (!validateAll()) return;
    if (!formName.trim() || !formContent.trim() || editorRef.current?.isEmpty) {
      toast({ title: "Erreur", description: "Nom et contenu requis.", variant: "destructive" });
      return;
    }
    setSaving(true);

    if (editingId) {
      const { error } = await supabase
        .from("contract_templates")
        .update({ name: formName.trim(), description: formDescription.trim() || null, content: formContent.trim() })
        .eq("id", editingId);
      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Template mis à jour" });
        resetForm();
        fetchTemplates();
      }
    } else {
      const { error } = await supabase
        .from("contract_templates")
        .insert({ name: formName.trim(), description: formDescription.trim() || null, content: formContent.trim(), is_active: true });
      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Template créé" });
        resetForm();
        fetchTemplates();
      }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("contract_templates").delete().eq("id", id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else setTemplates(prev => prev.filter(t => t.id !== id));
  };

  const handleToggleActive = async (t: ContractTemplate) => {
    const { error } = await supabase
      .from("contract_templates")
      .update({ is_active: !t.is_active })
      .eq("id", t.id);
    if (!error) setTemplates(prev => prev.map(x => x.id === t.id ? { ...x, is_active: !x.is_active } : x));
  };

  const isEditing = editingId !== null;

  return (
    <div className="space-y-6">
      {/* Template list */}
      <div className="rounded-2xl border border-border bg-card shadow-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-display text-base font-semibold text-foreground flex items-center gap-2">
            <FileSignature className="h-4 w-4" /> Templates de contrat ({templates.length})
          </h2>
          {!isEditing && (
            <Button size="sm" onClick={() => { setEditingId(""); reset(); }}>
              <Plus className="mr-1 h-4 w-4" /> Nouveau template
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : templates.length === 0 && !isEditing ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">Aucun template. Cliquez sur "Nouveau template" pour commencer.</p>
        ) : (
          <div className="divide-y divide-border">
            {templates.map(t => (
              <div key={t.id} className="flex items-center justify-between gap-4 px-6 py-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-foreground">{t.name}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      t.is_active
                        ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {t.is_active ? "Actif" : "Inactif"}
                    </span>
                  </div>
                  {t.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{t.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground/60 mt-0.5">
                    {t.formation_id ? "Formation spécifique" : "Générique"}, mis à jour le {new Date(t.updated_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setPreviewHtml(buildPreview(extractContractBody(t.content)))}
                    title="Aperçu"
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleToggleActive(t)}
                    title={t.is_active ? "Désactiver" : "Activer"}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  >
                    {t.is_active ? <ToggleRight className="h-4 w-4 text-green-600" /> : <ToggleLeft className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => handleEdit(t)}
                    title="Modifier"
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <ConfirmDialog
                    trigger={
                      <button title="Supprimer" className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    }
                    title="Supprimer ce template ?"
                    description="Les contrats déjà signés ne seront pas affectés (ils ont un snapshot)."
                    confirmLabel="Supprimer"
                    onConfirm={() => handleDelete(t.id)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Editor form */}
      {(isEditing || editingId === "") && (
        <div className="rounded-2xl border border-border bg-card shadow-card p-6">
          <h3 className="font-display text-base font-semibold text-foreground mb-5">
            {editingId ? "Modifier le template" : "Nouveau template"}
          </h3>
          <div className="grid gap-5 lg:grid-cols-3">
            {/* Form (left 2/3) */}
            <div className="lg:col-span-2 space-y-4">
              <div>
                <RequiredLabel required>Nom du template</RequiredLabel>
                <Input
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  onBlur={() => handleBlur("name")}
                  aria-invalid={!!showError("name")}
                  placeholder="Ex: Contrat standard 60 jours"
                />
                <FieldError message={showError("name")} />
              </div>
              <div>
                <Label>Description <span className="text-muted-foreground font-normal">(usage interne)</span></Label>
                <Textarea
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  rows={2}
                  maxLength={300}
                  placeholder="Ex: Engagement bilatéral étudiant / organisme de formation. Couvre le règlement intérieur, les modalités pédagogiques et les conditions d'abandon."
                />
                <p className="mt-1 text-xs text-muted-foreground">{formDescription.length}/300</p>
              </div>
              <div>
                <RequiredLabel required>Contenu du contrat</RequiredLabel>
                <ContractRichEditor
                  value={formContent}
                  onChange={setFormContent}
                  onBlur={() => handleBlur("content")}
                  onEditorReady={(ed) => { editorRef.current = ed; }}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Mise en forme façon traitement de texte. Le style premium (police, filet doré) est appliqué automatiquement a l'affichage.
                </p>
                <FieldError message={showError("content")} />
              </div>
              <div className="flex gap-3">
                <Button onClick={handleSave} disabled={saving || !isValid}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {editingId ? "Enregistrer les modifications" : "Créer le template"}
                </Button>
                <Button variant="outline" onClick={resetForm}>Annuler</Button>
                {formContent && (
                  <Button variant="ghost" onClick={() => setPreviewHtml(buildPreview(formContent))}>
                    <Eye className="mr-1.5 h-4 w-4" /> Aperçu
                  </Button>
                )}
              </div>
            </div>

            {/* Variables reference (right 1/3) */}
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Variables disponibles</p>
              <div className="space-y-2">
                {CONTRACT_VARIABLES.map(v => (
                  <div key={v.key} className="flex items-start gap-2">
                    <button
                      type="button"
                      className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent hover:bg-accent/20 transition-colors"
                      onClick={() => editorRef.current?.chain().focus().insertContent({ type: "variable", attrs: { key: v.key } }).run()}
                      title="Cliquer pour insérer au curseur"
                    >
                      {v.label}
                    </button>
                    <span className="text-xs text-muted-foreground">{v.description}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[10px] text-muted-foreground">Cliquez sur une variable pour l'insérer au curseur. Elle apparait comme une pastille et sera remplacée par la vraie valeur a la signature.</p>
            </div>
          </div>
        </div>
      )}

      {/* Preview modal */}
      <Dialog open={previewHtml !== null} onOpenChange={() => setPreviewHtml(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Aperçu du contrat (données fictives)</DialogTitle>
          </DialogHeader>
          <div className="rounded-xl border border-border bg-white text-[13px]">
            <style dangerouslySetInnerHTML={{ __html: CONTRACT_CSS }} />
            <div
              dangerouslySetInnerHTML={{ __html: sanitizeContractHtml((previewHtml || "").replace(/<style[\s\S]*?<\/style>/gi, "")) }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContractTemplateEditor;
