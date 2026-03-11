import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

/** Column mapping: Excel header → DB field */
const FIELD_MAP: Record<string, string> = {
  "Order Type": "order_type",
  "Order Name": "order_name",
  "Order Owner": "dealer_name",
  "Quotation No": "quote_no",
  "Colour Shade": "colour_shade",
  "Salesperson": "salesperson",
  "Product Type": "product_type",
  "No of Windows": "total_windows",
  "Sqft": "sqft",
  "Order Value": "order_value",
  "Receipt": "advance_received",
  "Commercial Status": "commercial_status",
};

const IMPORT_HEADERS = Object.keys(FIELD_MAP);

const EXPORT_HEADERS = [
  "Order Type", "Order Name", "Commercial Status", "Order Owner", "Quotation No", "SO No",
  "Colour Shade", "Salesperson", "Product Type", "No of Windows", "Avl to Work",
  "Sqft", "Order Value", "Receipt", "Balance",
  "Rework Qty", "Rework Issue",
];

interface ImportResult {
  created: number;
  updated: number;
  errors: string[];
}

export async function importOrdersFromFile(file: File): Promise<ImportResult> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

  const result: ImportResult = { created: 0, updated: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const record: Record<string, any> = {};

    for (const [excelHeader, dbField] of Object.entries(FIELD_MAP)) {
      const val = row[excelHeader];
      if (val !== undefined && val !== null && val !== "") {
        if (["total_windows", "rework_qty"].includes(dbField)) {
          record[dbField] = Math.round(Number(val) || 0);
        } else if (["sqft", "order_value", "advance_received"].includes(dbField)) {
          record[dbField] = Number(val) || 0;
        } else {
          record[dbField] = String(val).trim();
        }
      }
    }

    // Validate advance doesn't exceed order value
    if (record.advance_received && record.order_value && record.advance_received > record.order_value) {
      result.errors.push(`Row ${i + 2}: Receipt exceeds Order Value`);
      continue;
    }

    // Rework validation
    if (record.rework_qty && record.rework_qty > 0 && !record.rework_issue) {
      result.errors.push(`Row ${i + 2}: Rework Issue required when Rework Qty > 0`);
      continue;
    }

    if (!record.order_name && !record.quote_no) {
      result.errors.push(`Row ${i + 2}: Missing Order Name and Quotation No`);
      continue;
    }

    if (!record.product_type) {
      result.errors.push(`Row ${i + 2}: Product Type is required`);
      continue;
    }

    // Check if order exists by quote_no
    if (record.quote_no) {
      const { data: existing } = await supabase
        .from("orders")
        .select("id")
        .eq("quote_no", record.quote_no)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("orders")
          .update(record)
          .eq("id", existing.id);
        if (error) result.errors.push(`Row ${i + 2}: ${error.message}`);
        else result.updated++;
        continue;
      }
    }

    // Create new
    if (!record.order_name) {
      result.errors.push(`Row ${i + 2}: Order Name is required for new orders`);
      continue;
    }
    if (!record.dealer_name) record.dealer_name = "";
    if (!record.order_type) record.order_type = "Retail";
    if (!record.commercial_status) record.commercial_status = "Pipeline";

    const { error } = await supabase.from("orders").insert(record);
    if (error) result.errors.push(`Row ${i + 2}: ${error.message}`);
    else result.created++;
  }

  return result;
}

/** Export orders to an .xlsx file download */
export function exportOrdersToExcel(orders: Record<string, any>[], filename = "orders.xlsx") {
  const exportRows = orders.map((o) => ({
    "Order Type": o.order_type || "Retail",
    "Order Name": o.order_name || "",
    "Commercial Status": o.commercial_status || "",
    "Order Owner": o.dealer_name || "",
    "Quotation No": o.quote_no || "",
    "SO No": o.sales_order_no || "",
    "Colour Shade": o.colour_shade || "",
    "Salesperson": o.salesperson || "",
    "Product Type": o.product_type || "",
    "No of Windows": o.total_windows || 0,
    "Avl to Work": o.windows_released || 0,
    "Sqft": o.sqft || 0,
    "Order Value": o.order_value || 0,
    "Receipt": o.advance_received || 0,
    "Balance": o.balance_amount || 0,
    "Rework Qty": o.rework_qty || 0,
    "Rework Issue": o.rework_issue || "",
  }));

  const ws = XLSX.utils.json_to_sheet(exportRows, { header: EXPORT_HEADERS });

  const colWidths = EXPORT_HEADERS.map((h) => ({
    wch: Math.max(h.length, ...exportRows.map((r) => String((r as any)[h]).length)),
  }));
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Orders");
  XLSX.writeFile(wb, filename);
}

/** Generate a blank template */
export function downloadImportTemplate() {
  const ws = XLSX.utils.json_to_sheet([], { header: IMPORT_HEADERS });
  ws["!cols"] = IMPORT_HEADERS.map((h) => ({ wch: h.length + 4 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Orders");
  XLSX.writeFile(wb, "orders_import_template.xlsx");
}
