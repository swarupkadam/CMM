# UI Change Log (February 25, 2026)

This file tracks UI/UX updates made today across the dashboard, virtual machines, and scheduler experiences.

## Scheduler

- Removed seeded/dummy upcoming schedules.
- Upcoming Schedules now starts empty by default.
- A schedule appears in Upcoming Schedules only after the user creates one.

## Virtual Machines Page

- Added reusable `VMSkeletonCard` loading UI with `animate-pulse`.
- Replaced plain loading text with card skeletons (4 placeholders) to match the card grid.
- Added proper 3-state rendering:
  - Loading: skeleton cards
  - Data available: real VM cards
  - Empty: "No virtual machines found."
- Implemented delayed empty-state behavior:
  - Skeletons show immediately on load.
  - If API returns VMs quickly, real cards render immediately.
  - If API returns empty quickly, skeletons continue until minimum 1000ms, then empty state appears.
  - If API takes longer than 1000ms, skeletons remain until response completes.
- Added cleanup-safe timeout handling to prevent flicker and memory leaks.

## Dashboard Page

- Converted VM section to read-only (view only):
  - Removed Start/Stop controls from dashboard VM cards.
  - Dashboard now displays VM info/status only.
- Implemented same delayed empty-state logic used on Virtual Machines page.
- Added a dedicated `DashboardSkeletonCard` component that matches dashboard VM card structure exactly.
- Dashboard skeletons no longer include button placeholders, preventing size/layout mismatch.

## Components Added/Updated

- Added `src/components/shared/DashboardSkeletonCard.tsx`
- Updated `src/components/shared/VMCard.tsx` (includes reusable `VMSkeletonCard`)
- Updated:
  - `src/pages/VirtualMachinesPage.tsx`
  - `src/pages/DashboardPage.tsx`
  - `src/data/schedules.ts`

