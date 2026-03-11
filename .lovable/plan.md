

## Problem

The `/sales` route is missing from `App.tsx`. The sidebar links to `/sales` but no route exists, so the page is blank. This happened when the Orders route was updated — the Sales route was removed.

## Fix

**`src/App.tsx`** — Add the missing `/sales` route using `DepartmentQueuePage`:

```tsx
<Route path="/sales" element={<DepartmentQueuePage />} />
```

This will restore the Sales page using the same `DepartmentQueuePage` component that already has a `"sales"` department config defined (key: `"sales"`, showing pipeline and confirmed orders).

The `DepartmentQueuePage` component reads the current path to determine which department view to render, so pointing `/sales` at it will automatically show the Sales queue with its tabs (Open Orders, Dispatched Orders, All Orders).

No other files need changes — the sidebar nav already points to `/sales` and the `DepartmentQueuePage` already has the sales department configuration.

