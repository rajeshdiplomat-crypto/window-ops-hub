import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

/** Column mapping: Excel header → DB field */
const FIELD_MAP: Record<string, string> = {
  "Quote Number": "quote_no",
  "Sales Order Number": "sales_order_no",
  "Order Name": "order_name",
  "Salesperson": "salesperson",
  "Dealer Name": "dealer_name",
  "Colour Shade": "colour_shade",
  "Number of Windows": "total_windows",
  "Windows Released": "windows_released",
  "Square Footage": "sqft",
  "Order Value": "order_value",
};

const EXPORT_HEADERS = Object.keys(FIELD_MAP);
const DB_FIELDS = Object.values(FIELD_MAP);

interface ImportResult {
  created: number;
  updated: number;
  errors: string[];
}

/**
 * Parse an Excel file and upsert orders.
 * - If `sales_order_no` matches an existing order → update
 * - Otherwise → create new
 */
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
        if (["total_windows", "windows_released"].includes(dbField)) {
          record[dbField] = Math.round(Number(val) || 0);
        } else if (["sqft", "order_value"].includes(dbField)) {
          record[dbField] = Number(val) || 0;
        } else {
          record[dbField] = String(val).trim();
        }
      }
    }

    if (!record.order_name && !record.sales_order_no) {
      result.errors.push(`Row ${i + 2}: Missing Order Name and Sales Order Number`);
      continue;
    }

    // Check if order exists by sales_order_no
    if (record.sales_order_no) {
      const { data: existing } = await supabase
        .from("orders")
        .select("id")
        .eq("sales_order_no", record.sales_order_no)
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

    const { error } = await supabase.from("orders").insert(record);
    if (error) result.errors.push(`Row ${i + 2}: ${error.message}`);
    else result.created++;
  }

  return result;
}

/** Export orders to an .xlsx file download */
export function exportOrdersToExcel(orders: Record<string, any>[], filename = "orders.xlsx") {
  const exportRows = orders.map((o) => {
    const row: Record<string, any> = {};
    for (const [excelHeader, dbField] of Object.entries(FIELD_MAP)) {
      row[excelHeader] = o[dbField] ?? "";
    }
    return row;
  });

  const ws = XLSX.utils.json_to_sheet(exportRows, { header: EXPORT_HEADERS });

  // Auto-width columns
  const colWidths = EXPORT_HEADERS.map((h) => ({
    wch: Math.max(h.length, ...exportRows.map((r) => String(r[h]).length)),
  }));
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Orders");
  XLSX.writeFile(wb, filename);
}

/** Generate a blank template */
export function downloadImportTemplate() {
  const ws = XLSX.utils.json_to_sheet([], { header: EXPORT_HEADERS });
  ws["!cols"] = EXPORT_HEADERS.map((h) => ({ wch: h.length + 4 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Orders");
  XLSX.writeFile(wb, "orders_import_template.xlsx");
}
