import { ArrowUp, ArrowRight, ArrowDown, type LucideIcon } from "lucide-react";

/**
 * Source unique de verite pour les statuts et priorites des taches staff.
 * Importe par TaskManager (admin), StaffTasks (formateur) et TaskBoard (Kanban
 * partage) pour eviter toute duplication. Seuls ces 3 statuts sont emis vers
 * staff_tasks (le statut est un TEXT libre cote DB, garanti uniquement ici).
 */

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "high" | "medium" | "low";

export interface StatusConfigItem {
  label: string;
  className: string;
  dotClassName: string;
}

export const STATUS_CONFIG: Record<TaskStatus, StatusConfigItem> = {
  todo: { label: "À faire", className: "bg-secondary text-muted-foreground", dotClassName: "bg-muted-foreground/50" },
  in_progress: { label: "En cours", className: "bg-primary/10 text-primary", dotClassName: "bg-primary" },
  done: { label: "Terminé", className: "bg-green-500/10 text-green-600", dotClassName: "bg-green-500" },
};

/** Ordre des colonnes du Kanban, de gauche a droite. */
export const STATUS_ORDER: TaskStatus[] = ["todo", "in_progress", "done"];

export interface PriorityConfigItem {
  label: string;
  icon: LucideIcon;
  className: string;
}

export const PRIORITY_CONFIG: Record<TaskPriority, PriorityConfigItem> = {
  high: { label: "Haute", icon: ArrowUp, className: "bg-destructive/10 text-destructive border-destructive/20" },
  medium: { label: "Moyenne", icon: ArrowRight, className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  low: { label: "Basse", icon: ArrowDown, className: "bg-muted text-muted-foreground border-border" },
};

/** Retourne la config de statut, avec repli sur "todo" si la valeur est inconnue. */
export const resolveStatus = (status: string): TaskStatus =>
  (STATUS_ORDER as string[]).includes(status) ? (status as TaskStatus) : "todo";

/** Une tache est en retard si elle a une deadline passee et n'est pas terminee. */
export const isTaskOverdue = (deadline: string | null, status: string): boolean =>
  !!deadline && new Date(deadline) < new Date() && status !== "done";
