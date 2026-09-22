# Dashboard + CRM Dynamic Data Fix

## Dashboard
- Recent Leads & Quotes now reads live CRM inquiries through `/api/admin/inquiries` instead of the old local seeded `catalogStore` inquiry list.
- Recent leads are sorted by creation time and refreshed every 15 seconds.
- Demo/local seeded leads no longer appear on the admin dashboard unless they actually exist in the live CRM source.
- The Leads & Inquiries quick-action count uses the live CRM status values.

## CRM bulk actions
When one or more leads are selected, the bulk toolbar provides:
- Select all filtered leads
- Change status for all selected leads
- Assign selected leads to a team member
- Export selected leads as CSV
- Delete selected leads
- Clear selection

Bulk mutations use the existing authenticated admin inquiry API, so changes are persisted to the same live CRM data source used by the CRM table.
