# Next Level Events Backup System

The Admin Settings page now includes a Complete Backup & Restore section.

A complete backup contains:
- CRM leads and bookings
- Clients
- Quotations and invoices
- Invoice payment history and write-offs
- Catalog products, packages and services
- Categories and nested category hierarchy
- Media metadata, galleries, videos and image URLs
- Accessible media files when the administrator enables media embedding
- Coupons, cities, availability and other catalog state
- Admin resources used by operational modules
- Business settings and document numbering settings
- Site navigation and page hierarchy metadata
- Search index and public asset references
- Current local cache and cloud catalog state

The backup intentionally excludes login sessions, authentication tokens and the shopping cart.

For a production disaster-recovery plan, keep regular Supabase database backups in addition to application-level backups. Application backups are portable snapshots of the data the admin application can access; they are not a replacement for Supabase's database and storage backup facilities.
