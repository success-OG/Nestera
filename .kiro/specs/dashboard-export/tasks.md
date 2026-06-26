# Implementation Plan: Dashboard Export Functionality

## Tasks

- [ ] 1. Add `jspdf` dependency
  - Run `pnpm add jspdf` in the `frontend/` directory
  - _Requirements: 2.3_

- [ ] 2. Create `useToast` hook
  - Create `frontend/app/hooks/useToast.ts`
  - Define `ToastMessage` interface with `id`, `message`, `type`
  - Implement `add(message, type)` with `setTimeout` auto-dismiss at 3000ms using `crypto.randomUUID()`
  - Export `success` and `error` convenience methods
  - _Requirements: 6.1–6.4_

- [ ] 3. Create `Toast` component
  - Create `frontend/app/components/dashboard/Toast.tsx`
  - Accept `toasts: ToastMessage[]` prop
  - Position `fixed bottom-4 right-4 z-[100] flex flex-col gap-2`
  - Apply success (teal) and error (red) styles per toast type
  - _Requirements: 6.1–6.4_

- [ ] 4. Create `ExportPanel` component
  - Create `frontend/app/components/dashboard/ExportPanel.tsx`
  - Add `"use client"` directive
  - Accept `onClose`, `userEmail?`, `onToast` props
  - Implement transparent backdrop div for click-outside close
  - Add `useEffect` for Escape key listener
  - Implement menu view with 4 options (PDF, CSV, Email, Schedule)
  - _Requirements: 1.1–1.5_

- [ ] 5. Implement PDF export in `ExportPanel`
  - Dynamic import `jspdf` on demand
  - Build PDF with header, date, net worth section, and transactions table
  - Call `doc.save('nestera-dashboard-{date}.pdf')`
  - Show loading spinner on the PDF option while generating
  - Call `onToast.success` on success, `onToast.error` on failure
  - _Requirements: 2.1–2.6_

- [ ] 6. Implement CSV export in `ExportPanel`
  - Build CSV string from `MOCK_TRANSACTIONS` with header row
  - Create `Blob`, `URL.createObjectURL`, trigger `<a>` click, revoke URL
  - Call `onToast.success('CSV downloaded')`
  - _Requirements: 3.1–3.5_

- [ ] 7. Implement Email Report section in `ExportPanel`
  - Show email input + Send button when "Email Report" is selected
  - Validate email format (simple regex) before enabling Send
  - Pre-fill with `userEmail` prop if provided
  - On Send: call `onToast.success('Report sent to {email}')` (stub — no actual send)
  - _Requirements: 4.1–4.4_

- [ ] 8. Implement Schedule Reports section in `ExportPanel`
  - Show frequency selector (Daily / Weekly / Monthly) + Save Schedule button
  - On save: write to `localStorage` under `nestera_report_schedule`, call `onToast.success`
  - On load: read existing schedule from `localStorage` and show current schedule + Cancel button
  - On cancel: remove from `localStorage`, call `onToast.success('Schedule cancelled')`
  - _Requirements: 5.1–5.4_

- [ ] 9. Wire `ExportPanel` and `Toast` into the dashboard page
  - Add `"use client"` to `frontend/app/dashboard/page.tsx` if not already present
  - Import `useToast`, `ExportPanel`, `Toast`, `Download` from lucide
  - Add `exportOpen` state
  - Add Export button near the top of the page
  - Render `<ExportPanel />` conditionally
  - Render `<Toast toasts={toast.toasts} />`
  - _Requirements: 1.1–1.5_

- [ ] 10. Visual QA
  - Verify PDF downloads with correct filename and content
  - Verify CSV downloads with header row and correct columns
  - Verify email stub shows success toast without sending
  - Verify schedule saves to and reads from localStorage
  - Verify toasts auto-dismiss after 3 seconds
  - Verify panel closes on backdrop click and Escape key
