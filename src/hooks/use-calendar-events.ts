import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CalendarEvent {
  id: string;
  type: "brief" | "masterclass" | "research";
  title: string;
  description?: string | null;
  date: Date;
  cohort_id: string;
  cohort_name?: string;
  formation_id?: string | null;
  formation_name?: string | null;
  duration_minutes?: number;
}

interface UseCalendarEventsOptions {
  cohortIds?: string[];
  formationFilter?: string;
  role: "admin" | "staff" | "student";
}

export function useCalendarEvents({ cohortIds, formationFilter, role }: UseCalendarEventsOptions) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [formations, setFormations] = useState<{ id: string; name: string }[]>([]);

  const fetchEvents = async () => {
    setLoading(true);
    const allEvents: CalendarEvent[] = [];

    // Fetch cohorts with formation info for labeling
    const { data: cohorts } = await supabase
      .from("cohorts")
      .select("id, name, formation_id, formation:formations(id, name)");

    const cohortMap = new Map<string, { name: string; formation_id: string | null; formation_name: string | null }>();
    const formationSet = new Map<string, string>();

    (cohorts || []).forEach((c: any) => {
      cohortMap.set(c.id, {
        name: c.name,
        formation_id: c.formation_id,
        formation_name: c.formation?.name || null,
      });
      if (c.formation) formationSet.set(c.formation.id, c.formation.name);
    });

    setFormations(Array.from(formationSet.entries()).map(([id, name]) => ({ id, name })));

    // Build cohort filter
    let targetCohortIds = cohortIds;
    if (formationFilter && formationFilter !== "all") {
      targetCohortIds = (cohorts || [])
        .filter((c: any) => c.formation_id === formationFilter)
        .map((c: any) => c.id);
      if (targetCohortIds!.length === 0) {
        setEvents([]);
        setLoading(false);
        return;
      }
    }

    // Fetch briefs
    let briefsQuery = supabase.from("briefs").select("id, title, description, deadline, cohort_id, publish_at");
    if (targetCohortIds && targetCohortIds.length > 0) {
      briefsQuery = briefsQuery.in("cohort_id", targetCohortIds);
    }
    const { data: briefs } = await briefsQuery;

    (briefs || []).forEach((b: any) => {
      const info = cohortMap.get(b.cohort_id);
      // Only show published briefs
      if (new Date(b.publish_at) <= new Date()) {
        allEvents.push({
          id: b.id,
          type: "brief",
          title: b.title,
          description: b.description,
          date: new Date(b.deadline),
          cohort_id: b.cohort_id,
          cohort_name: info?.name,
          formation_id: info?.formation_id,
          formation_name: info?.formation_name,
        });
      }
    });

    // Fetch masterclass sessions
    let mcQuery = supabase.from("masterclass_sessions").select("id, title, description, scheduled_at, duration_minutes, cohort_id");
    if (targetCohortIds && targetCohortIds.length > 0) {
      mcQuery = mcQuery.in("cohort_id", targetCohortIds);
    }
    const { data: masterclasses } = await mcQuery;

    (masterclasses || []).forEach((m: any) => {
      const info = cohortMap.get(m.cohort_id);
      allEvents.push({
        id: m.id,
        type: "masterclass",
        title: m.title,
        description: m.description,
        date: new Date(m.scheduled_at),
        cohort_id: m.cohort_id,
        cohort_name: info?.name,
        formation_id: info?.formation_id,
        formation_name: info?.formation_name,
        duration_minutes: m.duration_minutes,
      });
    });

    // Fetch research sessions
    let rsQuery = supabase.from("research_sessions").select("id, title, description, scheduled_at, cohort_id");
    if (targetCohortIds && targetCohortIds.length > 0) {
      rsQuery = rsQuery.in("cohort_id", targetCohortIds);
    }
    const { data: researchSessions } = await rsQuery;

    (researchSessions || []).forEach((r: any) => {
      const info = cohortMap.get(r.cohort_id);
      allEvents.push({
        id: r.id,
        type: "research",
        title: r.title,
        description: r.description,
        date: new Date(r.scheduled_at),
        cohort_id: r.cohort_id,
        cohort_name: info?.name,
        formation_id: info?.formation_id,
        formation_name: info?.formation_name,
      });
    });

    setEvents(allEvents);
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, [cohortIds?.join(","), formationFilter]);

  return { events, loading, formations, refetch: fetchEvents };
}
