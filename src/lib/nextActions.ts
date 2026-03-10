import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

/**
 * Compute a "Next Action" hint for a given role queue and order data.
 * For procurement, we also accept materialStatus.
 */
export function getNextAction(
  role: AppRole,
  order: Record<string, any>,
  materialStatus?: Record<string, any> | null,
  productionStatus?: Record<string, any>[] | null,
): string {
  switch (role) {
    case "finance": {
      if (order.finance_status === "Pending Approval") {
        const advPct = order.order_value > 0
          ? ((order.advance_received / order.order_value) * 100).toFixed(0)
          : "0";
        return `Review payment (${advPct}% advance received)`;
      }
      return "—";
    }

    case "survey":
      if (order.survey_status === "Pending") return "Schedule & complete site survey";
      return "—";

    case "design":
      if (order.design_status === "Pending") return "Release design drawings";
      return "—";

    case "procurement": {
      if (!materialStatus) return "Initialize material tracking";
      const actions: string[] = [];
      if (materialStatus.aluminium_status === "Not Procured") actions.push("Release Aluminium PO");
      else if (materialStatus.aluminium_status === "PO Released") actions.push("Follow up Aluminium delivery");
      else if (materialStatus.aluminium_status === "Received") actions.push("Send Aluminium for Coating");
      else if (materialStatus.aluminium_status === "Sent for Coating") actions.push("Follow up coating completion");
      if (materialStatus.glass_status === "Not Procured") actions.push("Release Glass PO");
      else if (materialStatus.glass_status === "PO Released") actions.push("Follow up Glass delivery");
      if (materialStatus.hardware_status === "Not Procured") actions.push("Release Hardware PO");
      else if (materialStatus.hardware_status === "PO Released") actions.push("Follow up Hardware delivery");
      return actions.length > 0 ? actions[0] : "All materials received";
    }

    case "production": {
      const prods = productionStatus || [];
      if (prods.length === 0) return "Add production unit & start cutting";
      const totalCutting = prods.reduce((s, p) => s + (p.cutting || 0), 0);
      const totalAssembly = prods.reduce((s, p) => s + (p.assembly || 0), 0);
      const totalGlazing = prods.reduce((s, p) => s + (p.glazing || 0), 0);
      const totalQc = prods.reduce((s, p) => s + (p.qc || 0), 0);
      const totalPacking = prods.reduce((s, p) => s + (p.packing || 0), 0);
      const tw = order.total_windows || 1;
      if (totalCutting < tw) return `Continue cutting (${totalCutting}/${tw})`;
      if (totalAssembly < tw) return `Continue assembly (${totalAssembly}/${tw})`;
      if (totalGlazing < tw) return `Continue glazing (${totalGlazing}/${tw})`;
      if (totalQc < tw) return `QC inspection (${totalQc}/${tw})`;
      if (totalPacking < tw) return `Complete packing (${totalPacking}/${tw})`;
      return "Production complete";
    }

    case "quality": {
      const prods2 = productionStatus || [];
      const totalQc2 = prods2.reduce((s, p) => s + (p.qc || 0), 0);
      const tw2 = order.total_windows || 1;
      if (totalQc2 < tw2) return `Inspect quality (${totalQc2}/${tw2} done)`;
      return "QC complete";
    }

    case "dispatch":
      if (order.dispatch_status === "Not Dispatched") return "Plan first shipment";
      if (order.dispatch_status === "Partially Dispatched") return "Dispatch remaining windows";
      return "—";

    case "installation":
      if (order.installation_status === "Pending") return "Plan installation date";
      if (order.installation_status === "Planned") return "Complete installation";
      return "—";

    default:
      return "—";
  }
}

/**
 * Check if material dependencies are met for a given production stage.
 * Returns null if OK, or an error message if blocked.
 */
export function checkMaterialDependency(
  stage: string,
  materialStatus: Record<string, any> | null,
): string | null {
  if (!materialStatus) return "Material tracking not initialized";

  // Core dependency: Aluminium must be at least "Received" (coating completed ideally) before cutting
  if (stage === "cutting") {
    if (!["Received", "Sent for Coating", "Coating Completed"].includes(materialStatus.aluminium_status)) {
      return "Aluminium must be Received before Cutting can begin";
    }
  }

  // Glass must be received before glazing
  if (stage === "glazing") {
    if (materialStatus.glass_status !== "Received") {
      return "Glass must be Received before Glazing can begin";
    }
  }

  // Hardware must be received before assembly
  if (stage === "assembly") {
    if (materialStatus.hardware_status !== "Received") {
      return "Hardware must be Received before Assembly can begin";
    }
  }

  return null;
}
