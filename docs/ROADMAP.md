# Financials — product development and release gates

## Approved
South African accounting practices; browser-based; per-entity-per-financial-year pricing; multiple independently validated framework packs at commercial launch; CSV/Excel/PDF and additional format adapters; opt-in separately priced OCR/AI interpretation with human acceptance; PDF, Word, Excel and browser output; shared AWS with strict client isolation.

## Current deliverable
A **local, synthetic-data-only, dependency-free web prototype** with CSV import, manual mapping review, fixed-point monetary calculations, source lineage, validations and HTML preview. No credentials, hosting or external services. It is not a statutory statements compiler.

## Upcoming, in sequence
1. Typed canonical trial-balance contract; uploaded-file safety; Excel/CSV adapters; adjustments; period snapshots; comparatives.
2. Accountant-reviewed framework packs and disclosure rules; licence assessment; cash-flow supporting schedules; notes; preparer/reviewer approvals.
3. Single canonical report model rendered into verified PDF, Word and Excel files.
4. Authentication, firm/client isolation, permissions, logging, backups and restore, AWS deployment, per-entity billing. Dedicated dev/UAT/production.
5. Premium PDF/image OCR/AI with explicit opt-in, pricing, confidence/evidence display, approval, non-invention and cost guardrails.
6. Quality/security/performance penetration tests, qualified accountant sign-off, pilot rollout.

## Mandatory launch gates
- Two truly distinct, explicitly named and professionally validated reporting frameworks (not two unvalidated placeholders).
- Correct monetary precision, reconciliations, cash flow and disclosures for supported accounting situations.
- No invented accounting data. Accountant review and sign-off. Immutable final releases and provenance.
- Permission-denial and cross-tenant isolation tests across APIs, background work, exports, object storage and caches.
- Tested restore, retention/deletion, incident response, data location and POPIA review.
- Versioned standards and authorised licensed disclosure content where needed.

## Explicitly unresolved
Client workflow questionnaire; which frameworks and editions; entity types; disclosure scenarios; necessary professional/licensing arrangements; budget and price points; PDF/Excel/Word presentation; AWS final service sizing; OCR model/region; integrations and payment processor.
