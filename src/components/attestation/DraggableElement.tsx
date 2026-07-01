import { useState, useRef, useCallback } from "react";
import { TemplateElement } from "./types";
import { Upload, Type, Image, GripVertical, X } from "lucide-react";

interface DraggableElementProps {
  element: TemplateElement;
  selected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<TemplateElement>) => void;
  onDelete: () => void;
  containerRef: React.RefObject<HTMLDivElement>;
  primaryColor: string;
}

const DraggableElement = ({
  element,
  selected,
  onSelect,
  onUpdate,
  onDelete,
  containerRef,
  primaryColor,
}: DraggableElementProps) => {
  const elRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, elX: 0, elY: 0 });
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    if (!containerRef.current) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, elX: element.x, elY: element.y };

    const onMove = (ev: MouseEvent) => {
      const rect = containerRef.current!.getBoundingClientRect();
      const dx = ((ev.clientX - dragStart.current.x) / rect.width) * 100;
      const dy = ((ev.clientY - dragStart.current.y) / rect.height) * 100;
      onUpdate({
        x: Math.max(0, Math.min(100 - element.width, dragStart.current.elX + dx)),
        y: Math.max(0, Math.min(100 - element.height, dragStart.current.elY + dy)),
      });
    };
    const onUp = () => {
      setDragging(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [element, onUpdate, onSelect, containerRef]);

  const handleResizeDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!containerRef.current) return;
    setResizing(true);
    resizeStart.current = { x: e.clientX, y: e.clientY, w: element.width, h: element.height };

    const onMove = (ev: MouseEvent) => {
      const rect = containerRef.current!.getBoundingClientRect();
      const dw = ((ev.clientX - resizeStart.current.x) / rect.width) * 100;
      const dh = ((ev.clientY - resizeStart.current.y) / rect.height) * 100;
      onUpdate({
        width: Math.max(5, Math.min(100 - element.x, resizeStart.current.w + dw)),
        height: Math.max(3, Math.min(100 - element.y, resizeStart.current.h + dh)),
      });
    };
    const onUp = () => {
      setResizing(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [element, onUpdate, containerRef]);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Use data URL for preview; actual upload happens on save
    const reader = new FileReader();
    reader.onload = () => onUpdate({ src: reader.result as string });
    reader.readAsDataURL(file);
    e.target.value = "";
  }, [onUpdate]);

  const opacity = element.type === "image" ? (element.opacity ?? 100) / 100 : 1;
  const isBg = element.type === "image" && element.isBackground;

  const style: React.CSSProperties = {
    position: "absolute",
    left: `${element.x}%`,
    top: `${element.y}%`,
    width: `${element.width}%`,
    height: `${element.height}%`,
    cursor: dragging ? "grabbing" : "grab",
    zIndex: selected ? 20 : isBg ? 1 : 10,
    outline: selected ? "2px solid hsl(var(--accent))" : "1px dashed transparent",
    outlineOffset: "1px",
    borderRadius: "2px",
    opacity,
  };

  if (element.type === "rect") {
    return (
      <div
        ref={elRef}
        style={{
          ...style,
          backgroundColor: element.color || primaryColor,
          borderRadius: element.borderRadius ? `${element.borderRadius}px` : undefined,
          cursor: selected ? "grab" : "default",
        }}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        onMouseDown={selected ? handleMouseDown : undefined}
      >
        {selected && (
          <>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="absolute -top-2 -right-2 bg-destructive text-white rounded-full w-4 h-4 flex items-center justify-center text-[8px] z-30">
              <X className="h-3 w-3" />
            </button>
            <div onMouseDown={handleResizeDown} className="absolute bottom-0 right-0 w-3 h-3 bg-accent cursor-se-resize rounded-sm z-30" />
          </>
        )}
      </div>
    );
  }

  if (element.type === "line") {
    return (
      <div
        ref={elRef}
        style={{
          ...style,
          backgroundColor: element.color || "#cccccc",
          cursor: selected ? "grab" : "default",
        }}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        onMouseDown={selected ? handleMouseDown : undefined}
      >
        {selected && (
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="absolute -top-2 -right-2 bg-destructive text-white rounded-full w-4 h-4 flex items-center justify-center text-[8px] z-30">
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }

  if (element.type === "pattern") {
    const color = element.patternColor || primaryColor;
    if (element.patternType === "topBand" || element.patternType === "bottomBand") {
      return (
        <div
          ref={elRef}
          style={{
            ...style,
            background: `linear-gradient(135deg, ${color}, ${lightenColor(color, 60)})`,
            cursor: selected ? "grab" : "default",
          }}
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          onMouseDown={selected ? handleMouseDown : undefined}
        >
          {selected && (
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="absolute -top-2 -right-2 bg-destructive text-white rounded-full w-4 h-4 flex items-center justify-center text-[8px] z-30">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      );
    }
    return null;
  }

  if (element.type === "image") {
    return (
      <div
        ref={elRef}
        style={style}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        onMouseDown={selected ? handleMouseDown : undefined}
      >
        {selected && (
          <>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="absolute -top-2 -right-2 bg-destructive text-white rounded-full w-4 h-4 flex items-center justify-center z-30">
              <X className="h-3 w-3" />
            </button>
            <div
              onMouseDown={handleResizeDown}
              className="absolute bottom-0 right-0 w-3 h-3 bg-accent cursor-se-resize rounded-sm z-30"
            />
          </>
        )}
        {element.src ? (
          <img src={element.src} alt={element.label || ""} className={`w-full h-full ${isBg ? 'object-cover' : 'object-contain'}`} draggable={false} />
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-full border-2 border-dashed border-muted-foreground/30 rounded bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors">
            <Upload className="h-4 w-4 text-muted-foreground mb-0.5" />
            <span className="text-[8px] text-muted-foreground font-medium">{element.label || "Image"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>
        )}
      </div>
    );
  }

  // Text element
  const isVariable = element.content?.includes("{");
  const displayContent = element.content || "Texte";
  const isBadge = element.id === "formationBadge";

  return (
    <div
      ref={elRef}
      style={{
        ...style,
        ...(isBadge ? {
          backgroundColor: primaryColor,
          borderRadius: "9999px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        } : {}),
      }}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onMouseDown={selected ? handleMouseDown : undefined}
    >
      {selected && (
        <>
          <div className="absolute -top-1 -left-1 cursor-grab" onMouseDown={handleMouseDown}>
            <GripVertical className="h-3 w-3 text-accent" />
          </div>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="absolute -top-2 -right-2 bg-destructive text-white rounded-full w-4 h-4 flex items-center justify-center z-30">
            <X className="h-3 w-3" />
          </button>
          <div
            onMouseDown={handleResizeDown}
            className="absolute bottom-0 right-0 w-3 h-3 bg-accent cursor-se-resize rounded-sm z-30"
          />
        </>
      )}
      <p
        style={{
          fontSize: `${element.fontSize || 12}px`,
          fontWeight: element.fontWeight || "normal",
          fontStyle: element.fontStyle || "normal",
          textAlign: element.textAlign || "left",
          color: isBadge ? "#fff" : (element.color || "#000"),
          lineHeight: 1.4,
          margin: 0,
          overflow: "hidden",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: element.textAlign === "center" ? "center" : element.textAlign === "right" ? "flex-end" : "flex-start",
          fontFamily: "'Georgia', 'Times New Roman', serif",
        }}
        className={isVariable ? "opacity-70" : ""}
      >
        {displayContent}
      </p>
    </div>
  );
};

function lightenColor(hex: string, amount: number) {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0x00ff) + amount);
  const b = Math.min(255, (num & 0x0000ff) + amount);
  return `rgb(${r}, ${g}, ${b})`;
}

export default DraggableElement;
