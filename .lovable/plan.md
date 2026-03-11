

## Restore Sales Page

The Sales page currently uses the generic `DepartmentQueuePage` which only shows 6 basic columns. We need a dedicated `SalesPage.tsx` matching the pattern of `SurveyPage.tsx` and `FinancePage.tsx`.

### What will be built

**New file: `src/pages/SalesPage.tsx`** — A dedicated Sales module page with:

**Tabs** (per memory):
- **Open Orders** — orders where `dispatch_status !== "Fully Dispatched"`
- **Dispatched Orders** — `dispatch_status === "Fully Dispatched"`
- **All Orders**

**Columns:**
Quotation No, SO No, Order Name (linked), Dealer, Salesperson, Product Type, Shade, Windows, Order Value, Advance, Balance, Commercial Status, Rework Total, Latest Rework Issue

**Features:**
- Search by Order Name, Dealer, Quotation No
- Filters: Salesperson, Order Owner (Dealer), Commercial Status
- Color-coded commercial status badges
- Rework data aggregated from `rework_logs` table (total qty + latest issue)

**Route update: `src/App.tsx`** — Change `/sales` from `DepartmentQueuePage` to `SalesPage`.

### Technical details

- Follows exact same code structure as `FinancePage.tsx` (imports, state, fetch, filter, render)
- Fetches orders + rework_logs in parallel, builds a map of `order_id -> { totalQty, latestIssue }`
- Uses `FilterSelect` helper component (same pattern as other pages)
- Commercial status badge colors: "Closed" = green, "Pending" = yellow, default = muted

