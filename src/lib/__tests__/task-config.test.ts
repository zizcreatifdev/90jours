import { describe, it, expect } from "vitest";
import { resolveStatus, isTaskOverdue, STATUS_ORDER, STATUS_CONFIG, PRIORITY_CONFIG } from "@/lib/task-config";

describe("task-config", () => {
  it("expose exactement 3 colonnes dans l'ordre todo, in_progress, done", () => {
    expect(STATUS_ORDER).toEqual(["todo", "in_progress", "done"]);
  });

  it("a une config de libelle pour chaque statut et chaque priorite", () => {
    expect(STATUS_CONFIG.todo.label).toBe("À faire");
    expect(STATUS_CONFIG.in_progress.label).toBe("En cours");
    expect(STATUS_CONFIG.done.label).toBe("Terminé");
    expect(PRIORITY_CONFIG.high.label).toBe("Haute");
    expect(PRIORITY_CONFIG.medium.label).toBe("Moyenne");
    expect(PRIORITY_CONFIG.low.label).toBe("Basse");
  });

  it("resolveStatus replie sur todo pour une valeur inconnue", () => {
    expect(resolveStatus("in_progress")).toBe("in_progress");
    expect(resolveStatus("done")).toBe("done");
    expect(resolveStatus("n_importe_quoi")).toBe("todo");
    expect(resolveStatus("")).toBe("todo");
  });

  it("isTaskOverdue : vrai seulement si deadline passee et statut non termine", () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const future = new Date(Date.now() + 86400000).toISOString();
    expect(isTaskOverdue(past, "todo")).toBe(true);
    expect(isTaskOverdue(past, "in_progress")).toBe(true);
    expect(isTaskOverdue(past, "done")).toBe(false);
    expect(isTaskOverdue(future, "todo")).toBe(false);
    expect(isTaskOverdue(null, "todo")).toBe(false);
  });
});
