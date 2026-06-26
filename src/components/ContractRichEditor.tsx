import { useEffect } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { Bold, Italic, Underline as UnderlineIcon, Heading2, Heading3, List, ListOrdered, Undo2, Redo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { VariableNode, varTextToEditorHtml, editorHtmlToVarText } from "@/lib/contract-variable";

interface ContractRichEditorProps {
  value: string;
  onChange: (html: string) => void;
  onBlur?: () => void;
  onEditorReady?: (editor: Editor) => void;
}

const ToolbarButton = ({
  active,
  disabled,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    title={title}
    disabled={disabled}
    // onMouseDown preventDefault : garde le focus/la selection dans l'editeur
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    className={cn(
      "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40",
      active && "bg-secondary text-foreground"
    )}
  >
    {children}
  </button>
);

const ContractRichEditor = ({ value, onChange, onBlur, onEditorReady }: ContractRichEditorProps) => {
  const editor = useEditor({
    extensions: [StarterKit, Underline, VariableNode],
    // Les {{cle}} stockés sont convertis en marqueurs de chip avant parsing.
    content: varTextToEditorHtml(value),
    // A la sauvegarde, les chips sont reconverties en {{cle}} texte brut.
    onUpdate: ({ editor }) => onChange(editorHtmlToVarText(editor.getHTML())),
    onBlur: () => onBlur?.(),
  });

  useEffect(() => {
    if (editor) onEditorReady?.(editor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // Synchronise le contenu externe (ex changement de template) sans boucle :
  // on compare dans le meme espace ({{cle}}) que la valeur stockée.
  useEffect(() => {
    if (editor && value !== editorHtmlToVarText(editor.getHTML())) {
      editor.commands.setContent(varTextToEditorHtml(value || ""), false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!editor) return null;

  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border p-1.5">
        <ToolbarButton title="Gras" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Italique" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Souligné" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-border" />
        <ToolbarButton title="Titre" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Sous-titre" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-border" />
        <ToolbarButton title="Liste a puces" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Liste numerotee" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-border" />
        <ToolbarButton title="Annuler" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Retablir" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>
      </div>
      <EditorContent
        editor={editor}
        className={cn(
          "contract-editor min-h-[360px] max-h-[60vh] overflow-y-auto px-4 py-3 text-sm leading-relaxed",
          "[&_h2]:mt-4 [&_h2]:font-display [&_h2]:text-base [&_h2]:font-bold [&_h3]:mt-3 [&_h3]:font-display [&_h3]:font-semibold",
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_u]:underline",
          "[&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[320px]",
          // Chip variable (non editable, insecable, charte 60jours accent)
          "[&_.contract-var]:mx-0.5 [&_.contract-var]:inline-flex [&_.contract-var]:items-center [&_.contract-var]:whitespace-nowrap [&_.contract-var]:rounded-full [&_.contract-var]:bg-accent/15 [&_.contract-var]:px-2 [&_.contract-var]:py-0.5 [&_.contract-var]:text-xs [&_.contract-var]:font-medium [&_.contract-var]:text-accent [&_.contract-var]:align-baseline"
        )}
      />
    </div>
  );
};

export default ContractRichEditor;
