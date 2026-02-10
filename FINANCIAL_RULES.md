# 💰 FINANCIAL_RULES.md (The Bible)

> **Authority**: This document is managed by **Agent 2 (CFO)**. Any code violating these rules implies a standard violation.

---

## 1. Data Types & Precision
- **Currency**: ALWAYS store as `DECIMAL(19,4)` or Integer (Cents). NEVER `Float`.
- **Rounding**: 
  - Final Tax: Round Half Up (Standard).
  - Intermediate Calculations: Keep full precision until final aggregation.
  - Rounding Differences: Allocated to "Account 688/788" (Diffs Arredondamento).

## 2. Revenue Recognition
- **Criteria**: Revenue is recognized when the Service is Delivered (not just Invoiced).
- **Deferrals**: Invoices for future years must be split (Periodização).

## 3. Cost Allocation (COGS)
- **Method**: FIFO (First-In, First-Out) or Specific Identification.
- **Rejection**: "Average Cost" is NOT accepted without explicit written approval.

## 4. Tax Compliance (PT)
- **IVA**: Valid rates are [6%, 13%, 23%] (Mainland).
- **Stamp Duty**: 0.8% on Bank Transfers (generic rule, verify specific).
- **SAFT**: Must allow export of standard XML structure.

## 5. Audit Trail
- Every transaction modification requires: `user_id`, `timestamp`, `reason`.
- **Hard Deletes**: FORBIDDEN. Use `soft_delete` (deleted_at timestamp).

---
*(This document is a living artifact. CFO adds new rules here as they are decided.)*
