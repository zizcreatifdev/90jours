import { Video, FlaskConical, FileText, Bookmark, Flag } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface EventTypeStyle {
  bg: string;
  text: string;
  border: string;
  dot: string;
  label: string;
  Icon: LucideIcon;
}

// Source unique de verite pour les couleurs et icones des types d'evenements.
// Utilise dans DashboardCalendar ET SessionsManager pour garantir la coherence.
// Palette : masterclass = dore (accent), recherche = bleu royal (primary),
//           brief = mauve sobre (calendar-brief), personnel = vert sage (calendar-personal).
export const EVENT_TYPE_STYLES: Record<string, EventTypeStyle> = {
  masterclass: {
    bg: "bg-accent/15",
    text: "text-accent",
    border: "border-accent/30",
    dot: "bg-accent",
    label: "Masterclass",
    Icon: Video,
  },
  research: {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/20",
    dot: "bg-primary",
    label: "Recherche",
    Icon: FlaskConical,
  },
  brief: {
    bg: "bg-calendar-brief/15",
    text: "text-calendar-brief",
    border: "border-calendar-brief/30",
    dot: "bg-calendar-brief",
    label: "Brief",
    Icon: FileText,
  },
  personal: {
    bg: "bg-calendar-personal/15",
    text: "text-calendar-personal",
    border: "border-calendar-personal/30",
    dot: "bg-calendar-personal",
    label: "Personnel",
    Icon: Bookmark,
  },
  cohort_date: {
    bg: "bg-calendar-cohort/15",
    text: "text-calendar-cohort",
    border: "border-calendar-cohort/30",
    dot: "bg-calendar-cohort",
    label: "Cohorte",
    Icon: Flag,
  },
};
