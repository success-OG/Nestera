# Requirements Document

## Introduction

This feature adds export functionality to the Nestera dashboard, allowing users to download their dashboard data as a PDF or CSV, send a report via email, and schedule automated reports. All export operations are client-side for PDF and CSV; email and scheduling are UI-only stubs for the initial implementation.

## Glossary

- **ExportPanel**: The UI panel (dropdown or modal) from which users initiate exports.
- **PDFExport**: A client-side generated PDF snapshot of the dashboard's key data.
- **CSVExport**: A comma-separated values file containing the user's transaction and savings data.
- **EmailReport**: A UI flow allowing the user to enter an email address and trigger a report send (stubbed — no actual email sent in initial implementation).
- **ScheduledReport**: A UI flow allowing the user to configure a recurring report schedule (stubbed — stored in `localStorage` only in initial implementation).
- **ExportData**: The in-memory data object assembled from mock/context data before export.
- **MockData**: Static placeholder data used until real API integration is implemented.

---

## Requirements

### Requirement 1: Export Panel Entry Point

**User Story:** As a user, I want a clearly visible export button on the dashboard, so that I can access export options without hunting through menus.

#### Acceptance Criteria

1. THE dashboard page SHALL include an "Export" button in the top area of the page.
2. WHEN the "Export" button is clicked, THE ExportPanel SHALL open as a dropdown menu directly below the button.
3. THE ExportPanel SHALL list four options: "Export as PDF", "Export as CSV", "Email Report", "Schedule Reports".
4. THE ExportPanel SHALL close when the user clicks outside it or presses Escape.
5. THE "Export" button SHALL use the Lucide `Download` icon and match the existing dashboard button style.

---

### Requirement 2: Export as PDF

**User Story:** As a user, I want to download my dashboard data as a PDF, so that I can share or archive a snapshot of my savings performance.

#### Acceptance Criteria

1. WHEN the user selects "Export as PDF", THE dashboard SHALL generate a PDF document client-side and trigger a browser download.
2. THE PDF SHALL include: a header with "Nestera Dashboard Report" and the current date, a Net Worth summary section, a savings pools summary table, and a recent transactions table.
3. THE PDF SHALL be generated using the `jsPDF` library (to be added as a dependency).
4. THE downloaded file SHALL be named `nestera-dashboard-{YYYY-MM-DD}.pdf`.
5. WHILE the PDF is being generated, THE "Export as PDF" option SHALL show a loading spinner and be non-interactive.
6. IF PDF generation fails, THE dashboard SHALL display a brief toast error message.

---

### Requirement 3: Export as CSV

**User Story:** As a user, I want to download my transaction data as a CSV file, so that I can import it into a spreadsheet for analysis.

#### Acceptance Criteria

1. WHEN the user selects "Export as CSV", THE dashboard SHALL generate a CSV string from the mock transaction data and trigger a browser download via a `Blob` URL.
2. THE CSV SHALL include columns: `Date`, `Type`, `Description`, `Amount`, `Status`.
3. THE downloaded file SHALL be named `nestera-transactions-{YYYY-MM-DD}.csv`.
4. THE CSV generation SHALL be synchronous and require no external library.
5. THE CSV SHALL use UTF-8 encoding and include a header row.

---

### Requirement 4: Email Report (UI Stub)

**User Story:** As a user, I want to send a dashboard report to my email, so that I can receive a copy without downloading a file.

#### Acceptance Criteria

1. WHEN the user selects "Email Report", THE ExportPanel SHALL expand to show an email input field and a "Send" button.
2. THE email input SHALL validate that the entered value is a valid email format before enabling the "Send" button.
3. WHEN the "Send" button is clicked, THE dashboard SHALL show a success toast: "Report sent to {email}" (no actual email is sent in the initial implementation).
4. THE email input SHALL pre-fill with the connected user's email address if available from context.

---

### Requirement 5: Schedule Reports (UI Stub)

**User Story:** As a user, I want to schedule automated reports, so that I receive regular updates without manual action.

#### Acceptance Criteria

1. WHEN the user selects "Schedule Reports", THE ExportPanel SHALL expand to show a frequency selector (Daily, Weekly, Monthly) and a "Save Schedule" button.
2. WHEN "Save Schedule" is clicked, THE dashboard SHALL save the selected frequency to `localStorage` under `nestera_report_schedule` and show a success toast.
3. IF a schedule is already saved, THE Schedule Reports section SHALL display the current schedule and a "Cancel Schedule" button.
4. WHEN "Cancel Schedule" is clicked, THE dashboard SHALL remove the schedule from `localStorage` and update the UI.

---

### Requirement 6: Toast Notifications

**User Story:** As a user, I want brief feedback messages after export actions, so that I know whether the operation succeeded or failed.

#### Acceptance Criteria

1. THE dashboard SHALL display a toast notification for: PDF download success, PDF generation failure, CSV download success, email report sent (stub), schedule saved, schedule cancelled.
2. Each toast SHALL auto-dismiss after 3 seconds.
3. Success toasts SHALL use a green-tinted style; error toasts SHALL use a red-tinted style.
4. THE toast SHALL appear in the bottom-right corner of the viewport.
