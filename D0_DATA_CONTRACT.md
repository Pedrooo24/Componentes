# 🏗️ D0 - Data Contract

**Owner:** Agent 3 (Architect)
**Reviewer:** Agent 2 (CFO)

---

## 1. Core Entities

### Example: `invoices`
- **Definition**: Record of a sale document issued to a client.
- **Source**: TOConline API / Manual Import.
- **Fields**:
  - `id`: UUID (PK)
  - `invoice_no`: String (Unique)
  - `total_amount`: DECIMAL(19,4) -- VALIDATED BY CFO
  - `tax_amount`: DECIMAL(19,4)
  - `status`: ENUM ('draft', 'posted', 'paid', 'cancelled')
  - `client_id`: UUID (FK -> clients.id)

---

## 2. Invariants (Hard Constraints)
- `total_amount >= 0` (Unless Credit Note).
- `tax_amount <= total_amount`.
- Cannot delete if `status == 'posted'`.

---

*(This document defines the schema of truth. Changes here require database migrations.)*
