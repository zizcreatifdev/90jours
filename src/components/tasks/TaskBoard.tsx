import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  pointerWithin,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertTriangle, Clock, MessageSquare, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  STATUS_CONFIG,
  STATUS_ORDER,
  PRIORITY_CONFIG,
  resolveStatus,
  isTaskOverdue,
  type TaskStatus,
} from "@/lib/task-config";

/**
 * Tache telle qu'attendue par le board : le nom et l'avatar de l'assigne sont
 * deja resolus par le parent (jointure client-side profiles.user_id).
 */
export interface BoardTask {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  assigned_to: string;
  deadline: string | null;
  assignee_name: string;
  assignee_avatar_url: string | null;
  cohort_name?: string | null;
  comment_count?: number;
}

interface TaskBoardProps {
  tasks: BoardTask[];
  /** true/false, ou predicat par carte pour autoriser le deplacement. */
  editable?: boolean | ((task: BoardTask) => boolean);
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onCardClick?: (task: BoardTask) => void;
  /** Notifie le parent du debut/fin de drag (pour suspendre un refetch realtime). */
  onDragStateChange?: (dragging: boolean) => void;
}

/** Initiales a partir du nom complet ("Aminata Diallo" -> "AD"). */
const initialsOf = (name: string): string =>
  name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

interface TaskCardProps {
  task: BoardTask;
  draggable: boolean;
  onClick?: (task: BoardTask) => void;
  overlay?: boolean;
}

const TaskCard = ({ task, draggable, onClick, overlay }: TaskCardProps) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { status: task.status },
    disabled: !draggable,
  });

  const priority = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.medium;
  const PriorityIcon = priority.icon;
  const overdue = isTaskOverdue(task.deadline, task.status);

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      {...(overlay ? {} : attributes)}
      {...(overlay ? {} : listeners)}
      onClick={() => onClick?.(task)}
      className={cn(
        "group rounded-xl border bg-card p-3 shadow-sm transition-shadow",
        draggable ? "cursor-grab active:cursor-grabbing hover:shadow-md" : "cursor-pointer hover:shadow-md",
        overdue ? "border-destructive/40" : "border-border",
        !overlay && isDragging && "opacity-40",
        overlay && "rotate-1 shadow-lg ring-2 ring-accent/40",
      )}
    >
      <div className="flex items-start gap-2">
        {draggable && (
          <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground" />
        )}
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-start justify-between gap-2">
            <h3 className="font-display text-sm font-semibold leading-snug text-foreground line-clamp-2">{task.title}</h3>
            <Avatar className="h-7 w-7 shrink-0" title={task.assignee_name}>
              {task.assignee_avatar_url && <AvatarImage src={task.assignee_avatar_url} alt={task.assignee_name} />}
              <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                {initialsOf(task.assignee_name)}
              </AvatarFallback>
            </Avatar>
          </div>

          {task.description && (
            <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className={cn("text-[10px]", priority.className)}>
              <PriorityIcon className="mr-1 h-3 w-3" /> {priority.label}
            </Badge>
            {overdue && (
              <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-[10px] text-destructive">
                <AlertTriangle className="mr-1 h-3 w-3" /> En retard
              </Badge>
            )}
            {task.cohort_name && (
              <span className="text-[10px] text-muted-foreground">{task.cohort_name}</span>
            )}
            {task.deadline && (
              <span
                className={cn(
                  "flex items-center gap-1 text-[10px]",
                  overdue ? "font-medium text-destructive" : "text-muted-foreground",
                )}
              >
                <Clock className="h-3 w-3" /> {new Date(task.deadline).toLocaleDateString("fr-FR")}
              </span>
            )}
            {typeof task.comment_count === "number" && task.comment_count > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <MessageSquare className="h-3 w-3" /> {task.comment_count}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface ColumnProps {
  status: TaskStatus;
  tasks: BoardTask[];
  isDraggable: (task: BoardTask) => boolean;
  onCardClick?: (task: BoardTask) => void;
}

const Column = ({ status, tasks, isDraggable, onCardClick }: ColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const cfg = STATUS_CONFIG[status];

  return (
    <div className="flex min-w-[260px] flex-1 flex-col">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className={cn("h-2.5 w-2.5 rounded-full", cfg.dotClassName)} />
        <h3 className="font-display text-sm font-semibold text-foreground">{cfg.label}</h3>
        <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {tasks.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "min-h-[140px] flex-1 space-y-2 rounded-xl border border-dashed p-2 transition-colors",
          isOver ? "border-accent/50 bg-accent/5" : "border-border bg-muted/20",
        )}
      >
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} draggable={isDraggable(task)} onClick={onCardClick} />
        ))}
        {tasks.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground/60">Aucune tâche</p>
        )}
      </div>
    </div>
  );
};

const TaskBoard = ({ tasks, editable = false, onStatusChange, onCardClick, onDragStateChange }: TaskBoardProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);

  // PointerSensor : petit seuil de distance pour distinguer clic et drag (detail vs deplacement).
  // TouchSensor : delai d'activation pour ne pas bloquer le scroll vertical sur mobile.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
  );

  const isDraggable = (task: BoardTask): boolean =>
    typeof editable === "function" ? editable(task) : editable;

  const grouped: Record<TaskStatus, BoardTask[]> = { todo: [], in_progress: [], done: [] };
  for (const task of tasks) {
    grouped[resolveStatus(task.status)].push(task);
  }

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) || null : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    onDragStateChange?.(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    onDragStateChange?.(false);
    if (!over) return;
    const newStatus = String(over.id);
    const currentStatus = String(active.data.current?.status ?? "");
    if (!(STATUS_ORDER as string[]).includes(newStatus)) return;
    if (newStatus !== currentStatus) {
      onStatusChange(String(active.id), newStatus as TaskStatus);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    onDragStateChange?.(false);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        {STATUS_ORDER.map((status) => (
          <Column
            key={status}
            status={status}
            tasks={grouped[status]}
            isDraggable={isDraggable}
            onCardClick={onCardClick}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeTask ? <TaskCard task={activeTask} draggable={false} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
};

export default TaskBoard;
