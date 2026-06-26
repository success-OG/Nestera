# Design Document: Dashboard Export Functionality

## Overview

Export functionality is added to the dashboard via an `ExportPanel` dropdown and a lightweight `Toast` component. PDF export uses `jsPDF`. CSV export uses a native `Blob`. Email and scheduling are UI stubs. No backend changes are required.

---

## Architecture

```
frontend/app/
├── components/dashboard/
│   ├── ExportPanel.tsx        ← new: dropdown with 4 export options
│   └── Toast.tsx              ← new: auto-dismiss toast
├── hooks/
│   └── useToast.ts            ← new: toast state management
└── dashboard/
    └── page.tsx               ← modified: add ExportPanel + Toast
```

New dependency: `jspdf` (PDF generation, ~300KB gzipped).

---

## Component Design

### `ExportPanel`

```tsx
interface ExportPanelProps {
  onClose: () => void;
  userEmail?: string;
}
```

State:
```ts
const [activeSection, setActiveSection] = useState<'menu' | 'email' | 'schedule'>('menu');
const [emailInput, setEmailInput] = useState(userEmail ?? '');
const [pdfLoading, setPdfLoading] = useState(false);
const [scheduleFreq, setScheduleFreq] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
```

Positioned as `absolute top-full right-0 mt-2 w-72 z-50` relative to the Export button wrapper.

Backdrop: `fixed inset-0 z-40` transparent div that calls `onClose` on click.

#### PDF export handler

```ts
async function handlePdfExport() {
  setPdfLoading(true);
  try {
    const { jsPDF } = await import('jspdf');  // dynamic import to keep initial bundle small
    const doc = new jsPDF();
    const date = new Date().toISOString().split('T')[0];
    doc.setFontSize(18);
    doc.text('Nestera Dashboard Report', 14, 22);
    doc.setFontSize(11);
    doc.text(`Generated: ${date}`, 14, 30);
    // Net Worth section
    doc.text('Net Worth: $0.00', 14, 45);
    // Transactions table (autoTable or manual rows)
    MOCK_TRANSACTIONS.forEach((tx, i) => {
      doc.text(`${tx.date}  ${tx.type}  ${tx.description}  ${tx.amount}`, 14, 60 + i * 8);
    });
    doc.save(`nestera-dashboard-${date}.pdf`);
    toast.success('PDF downloaded');
  } catch {
    toast.error('PDF generation failed');
  } finally {
    setPdfLoading(false);
  }
}
```

#### CSV export handler

```ts
function handleCsvExport() {
  const date = new Date().toISOString().split('T')[0];
  const header = 'Date,Type,Description,Amount,Status';
  const rows = MOCK_TRANSACTIONS.map(tx =>
    `${tx.date},${tx.type},"${tx.description}",${tx.amount},${tx.status}`
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nestera-transactions-${date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success('CSV downloaded');
}
```

### `Toast` component

```tsx
interface ToastMessage { id: string; message: string; type: 'success' | 'error'; }
```

Positioned `fixed bottom-4 right-4 z-[100] flex flex-col gap-2`.

Each toast: `px-4 py-3 rounded-xl text-sm font-semibold shadow-lg` with:
- Success: `bg-[rgba(6,110,110,0.9)] text-[#8ef4ef] border border-[rgba(6,110,110,0.3)]`
- Error: `bg-[rgba(80,20,20,0.9)] text-[#ff9999] border border-[rgba(120,30,30,0.3)]`

Auto-dismiss via `setTimeout(3000)` in `useToast`.

### `useToast` hook

```ts
export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  function add(message: string, type: 'success' | 'error') {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }
  return { toasts, success: (m: string) => add(m, 'success'), error: (m: string) => add(m, 'error') };
}
```

### Mock transaction data

```ts
const MOCK_TRANSACTIONS = [
  { date: '2026-04-25', type: 'deposit',  description: 'Deposit USDC',    amount: '+$500.00', status: 'completed' },
  { date: '2026-04-25', type: 'yield',    description: 'Yield Earned',     amount: '+$12.45',  status: 'completed' },
  { date: '2026-04-24', type: 'withdraw', description: 'Withdraw DAI',     amount: '-$250.00', status: 'completed' },
];
```

---

## Dashboard Page Integration

```tsx
// dashboard/page.tsx
"use client";
const [exportOpen, setExportOpen] = useState(false);
const toast = useToast();

// In JSX, near the top:
<div className="relative">
  <button onClick={() => setExportOpen(v => !v)}
    className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[rgba(6,110,110,0.2)] text-[#9bb7b7] hover:text-[#8ef4ef] text-sm">
    <Download size={16} /> Export
  </button>
  {exportOpen && <ExportPanel onClose={() => setExportOpen(false)} />}
</div>
<Toast toasts={toast.toasts} />
```

---

## Correctness Properties

### Property 1: CSV header row always present
Generated CSV string should always start with `Date,Type,Description,Amount,Status\n`.

### Property 2: PDF filename includes today's date
The `doc.save()` call should use `nestera-dashboard-{YYYY-MM-DD}.pdf` where the date matches `new Date().toISOString().split('T')[0]`.

### Property 3: Toast auto-dismisses after 3 seconds
After `toast.success(...)`, the toast should be removed from the array after 3000ms.

### Property 4: Schedule persists to localStorage
After "Save Schedule", `localStorage.getItem('nestera_report_schedule')` should equal the selected frequency string.
