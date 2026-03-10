import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export interface RoleQueueDef {
  role: AppRole;
  label: string;
  description: string;
  /** Field on orders table to filter */
  filterField: string;
  /** Values that mean "needs action" */
  filterValues: string[];
}

export const ROLE_QUEUES: RoleQueueDef[] = [
  {
    role: "finance",
    label: "Finance Queue",
    description: "Orders waiting for payment approval",
    filterField: "finance_status",
    filterValues: ["Pending Approval"],
  },
  {
    role: "survey",
    label: "Survey Queue",
    description: "Orders waiting for site survey",
    filterField: "survey_status",
    filterValues: ["Pending"],
  },
  {
    role: "design",
    label: "Design Queue",
    description: "Orders waiting for design release",
    filterField: "design_status",
    filterValues: ["Pending"],
  },
  {
    role: "procurement",
    label: "Procurement Queue",
    description: "Orders waiting for materials",
    filterField: "design_status",
    filterValues: ["Released"], // orders with design released need procurement
  },
  {
    role: "production",
    label: "Production Queue",
    description: "Orders ready for cutting",
    filterField: "design_status",
    filterValues: ["Released"],
  },
  {
    role: "quality",
    label: "Quality Queue",
    description: "Orders awaiting quality inspection",
    filterField: "design_status",
    filterValues: ["Released"],
  },
  {
    role: "dispatch",
    label: "Dispatch Queue",
    description: "Orders packed and ready for dispatch",
    filterField: "dispatch_status",
    filterValues: ["Not Dispatched", "Partially Dispatched"],
  },
  {
    role: "installation",
    label: "Installation Queue",
    description: "Orders awaiting installation",
    filterField: "installation_status",
    filterValues: ["Pending", "Planned"],
  },
];
