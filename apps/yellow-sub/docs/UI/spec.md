# Yellow Sub Admin UI — Spec

## 1. Context

**Current state:** Single-page admin at `/admin/` showing a flat customer list. No create/edit forms, no navigation, no entity management. API has full CRUD for the entity hierarchy — UI does not surface it.

**Stack:** React 19, React Router 7, Tanstack Query 5, Tailwind 4, Vite 6, Firebase auth.

**Goal:** Multi-page admin console with clean shadcn-style UI for managing the full Customer → Tenant → Product/Plan hierarchy.

---

## 2. Entity Hierarchy (from Prisma schema)

```
Customer
 ├── Brand
 └── Tenant
      ├── BillingProviderAccount
      ├── TenantApiKey
      ├── ProductFamily
      │    └── Plan
      │         ├── PlanPrice
      │         ├── PlanFeature
      │         └── PlanQuota
      ├── Feature
      ├── ExternalUser
      ├── Subscription
      └── ManualEntitlementOverride
```

---

## 3. Pages & Routes

| # | Route | Page | Description |
|---|-------|------|-------------|
| 1 | `/` | Customers List | All customers, create button, active/inactive badge |
| 2 | `/customers/:id` | Customer Detail | Name, slug, active toggle. Child brands & tenants lists |
| 3 | `/customers/:id/tenants/:tenantId` | Tenant Detail | Tabbed view into tenant sub-entities |
| 4 | `/customers/:id/tenants/:tenantId/plans/:planId` | Plan Detail | Plan config: prices, features, quotas |

All routes relative to `/admin` basename.

---

## 4. Screen Requirements

### 4.1 Customers List (`/`)

| # | Requirement |
|---|-------------|
| 1 | Table with columns: Name, Slug, Status (active/inactive badge), Created |
| 2 | "New Customer" button → inline dialog with Name + Slug fields |
| 3 | Click row → navigate to Customer Detail |
| 4 | Empty state when no customers |

### 4.2 Customer Detail (`/customers/:id`)

| # | Requirement |
|---|-------------|
| 1 | Header with customer name, slug, active toggle (calls `PUT /customers/:id`) |
| 2 | **Brands section** — list + "Add Brand" dialog (name, slug) |
| 3 | **Tenants section** — list + "Add Tenant" dialog (name, slug, defaultCurrency, optional brandId select) |
| 4 | Click tenant row → navigate to Tenant Detail |
| 5 | Breadcrumb: Customers > {customer name} |

### 4.3 Tenant Detail (`/customers/:id/tenants/:tenantId`)

Tabbed layout with these tabs:

| # | Tab | Content |
|---|-----|---------|
| 1 | **Overview** | Tenant name, slug, currency, app name. Provider accounts list + add form |
| 2 | **Products & Plans** | Product families list + add. Per-family: plans list + add. Click plan → Plan Detail |
| 3 | **Features** | Tenant-level features list + add (key, name, description) |
| 4 | **API Keys** | Keys list (prefix, name, active, last used). "Create Key" → show key once |
| 5 | **Subscribers** | External users table (email, externalUserId, lastSeen). Search box |
| 6 | **Subscriptions** | Subscriptions table (user, plan, status, period). Resync button per row |
| 7 | **Events** | Provider event log table (type, status, timestamp). Read-only |

Breadcrumb: Customers > {customer} > {tenant name}

### 4.4 Plan Detail (`/customers/:id/tenants/:tenantId/plans/:planId`)

| # | Requirement |
|---|-------------|
| 1 | Plan header: name, key, status badge (DRAFT/ACTIVE/ARCHIVED), description |
| 2 | **Prices section** — list + add (provider account, externalPriceId, currency, amount, interval) |
| 3 | **Features section** — link existing tenant features to plan (toggle enabled) |
| 4 | **Quotas section** — list + add (key, name, limit, period, rollover toggle) |

Breadcrumb: Customers > {customer} > {tenant} > {plan name}

---

## 5. UI Components Needed

| # | Component | Notes |
|---|-----------|-------|
| 1 | `AppShell` | Sidebar nav (collapsed icon rail or full), header with sign-out |
| 2 | `DataTable` | Reusable table with column defs, empty state, loading skeleton |
| 3 | `Dialog` | Modal for create/edit forms. Trigger button + form content |
| 4 | `Badge` | Status pills (active/inactive, plan status, subscription status) |
| 5 | `Breadcrumb` | Route-aware breadcrumb trail |
| 6 | `Tabs` | For Tenant Detail tabbed layout |
| 7 | `Input` / `Select` / `Textarea` | Form primitives with label + error state |
| 8 | `Button` | Primary, secondary, destructive variants |
| 9 | `Toast` | Success/error feedback on mutations |
| 10 | `Skeleton` | Loading placeholders for tables and detail sections |
| 11 | `EmptyState` | Illustration-free empty state with CTA |

---

## 6. Styling Approach

| # | Decision |
|---|----------|
| 1 | **No shadcn/ui package install** — hand-roll components in shadcn visual style (zinc palette, subtle borders, rounded-lg, ring focus states) to keep deps minimal |
| 2 | Dark theme only (matches existing `bg-zinc-950` / `text-white` palette) |
| 3 | Tailwind utility classes — no CSS modules or styled-components |
| 4 | Consistent spacing: `p-6` page padding, `gap-4` between sections |

---

## 7. Data Layer

| # | Decision |
|---|----------|
| 1 | All data fetching via Tanstack Query (`useQuery` / `useMutation`) |
| 2 | Shared `adminFetch` helper already exists — extend with typed wrappers |
| 3 | Mutations invalidate parent queries on success (e.g., create customer → invalidate `['admin', 'customers']`) |
| 4 | Optimistic updates not required for v1 — wait for server response |

---

## 8. API Coverage

All endpoints below exist in `AdminController` — no new backend work needed.

| # | Entity | List (GET) | Create (POST) | Update (PUT) |
|---|--------|-----------|---------------|--------------|
| 1 | Customer | ✅ | ✅ | ✅ |
| 2 | Brand | ✅ | ✅ | — |
| 3 | Tenant | ✅ | ✅ | — |
| 4 | API Key | ✅ | ✅ | — |
| 5 | Provider Account | ✅ | ✅ | — |
| 6 | Product Family | — | ✅ | — |
| 7 | Plan | — | ✅ | — |
| 8 | Plan Price | — | ✅ | — |
| 9 | Feature | — | ✅ | — |
| 10 | Plan Feature | — | ✅ | — |
| 11 | External User | ✅ | — | — |
| 12 | Subscription | ✅ | — | — |
| 13 | Event Log | ✅ | — | — |
| 14 | Manual Override | — | ✅ | — |
| 15 | Resync | — | ✅ | — |

**Gaps to add to API (GET list needed for UI):**

| # | Missing endpoint | Needed for |
|---|-----------------|------------|
| 1 | `GET tenants/:tenantId/product-families` | Products & Plans tab |
| 2 | `GET tenants/:tenantId/plans` (or by product family) | Plans list |
| 3 | `GET tenants/:tenantId/features` | Features tab |
| 4 | `GET plans/:planId` (with prices, features, quotas) | Plan Detail page |

---

## 9. Implementation Phases

| Phase | Scope | Deliverable |
|-------|-------|-------------|
| **1 — Routing + Shell** | React Router routes, AppShell layout, breadcrumbs | Navigable skeleton |
| **2 — Customers** | List page, create dialog, detail page with active toggle | Full customer CRUD |
| **3 — Tenants** | Tenant list on customer detail, create dialog, tenant detail with Overview tab | Tenant management |
| **4 — Products & Plans** | Product families, plans, plan detail (prices, features, quotas) | Subscription catalog |
| **5 — Remaining Tabs** | Features, API keys, subscribers, subscriptions, events tabs | Full tenant management |
| **6 — Polish** | Toast notifications, loading skeletons, empty states, error handling | Production-ready feel |

---

## 10. Out of Scope (v1)

1. Pagination / infinite scroll (lists capped at ~100 by API)
2. Bulk operations (multi-select delete, etc.)
3. Role-based UI restrictions (all admin users see everything)
4. Light theme
5. Responsive / mobile layout
6. Delete operations (not in current API)
7. Inline editing (use dialogs)
