# Audit Apply Note — AIAerospaceMRO

## Audit recommendations (from batch_00.md)

Substantive aerospace MRO platform: 22 route files, 14 AI endpoints, deep compliance & regulatory infrastructure.

### Missing AI counterparts
- AI training path recommendation (technician upskilling)
- AI supply chain disruption forecasting
- AI cross-fleet asset reallocation

### Missing non-AI features
- OEM data integration (Boeing, Airbus, Bombardier)
- Environmental impact reporting
- Mobile technician app

### Custom feature suggestions
- Real-time ACARS health monitoring
- Regulatory intelligence feed (FAA ADs, Service Bulletins)
- Supply chain risk via geopolitical monitoring
- Technician training simulator (VR/AR)
- OEM integrations

## Implemented in this pass

None. Project is substantive (14 AI endpoints, full-featured). Remaining recommendations are external integrations (OEM, ACARS, regulatory feeds) needing creds, or large new subsystems (training path, supply chain disruption forecasting needing third-party data) — not MECHANICAL.

## Backlog (not implemented)

| Item | Category | Reason |
|---|---|---|
| AI training path recommendation | NEEDS-PRODUCT-DECISION | Skill matrix design |
| AI supply chain disruption forecasting | NEEDS-CREDS | Geopolitical event feed |
| AI cross-fleet asset reallocation | TOO-RISKY | Multi-aircraft optimization solver |
| OEM integrations | NEEDS-CREDS | Boeing/Airbus APIs |
| ACARS streaming | NEEDS-CREDS | ACARS data feed |
| Regulatory intelligence feed | NEEDS-CREDS | FAA/EASA APIs |
| Mobile app | TOO-RISKY | New project surface |
| VR/AR training simulator | TOO-RISKY | Heavy frontend lift |

## Apply pass 3 (frontend)

**Action:** LEFT-AS-IS — FE already wired.

Verified `frontend/src/pages/AITools.js` exposes a tool-switcher across 9 AI endpoints (compliance-check, parts-analysis, safety-analysis, fleet-optimization, mel-analysis, document-review, purchase-analysis, anomaly-detect, optimize-shifts) with field-driven forms. `AIHistory.js` lists persisted results across all `/ai/*` endpoints with pagination + endpoint filter. Dedicated standalone pages exist for the additional endpoints: `PredictiveMaintenance.js` (`/ai/predict-maintenance`), `TechnicianMatcher.js` (`/ai/match-technician`), `CostEstimator.js` (`/ai/repair-cost-estimate` + `/ai/downtime-prediction`), `ComponentReliability.js`. Auth uses `localStorage.getItem('mro_token')` → `Authorization: Bearer ...` matching the backend `authMiddleware`. Routes registered in `App.js` under `/ai-tools` and `/ai-history`.

No FE files modified.

## Apply pass 4 (mechanical backlog)

**Action:** SKIPPED — backlog is entirely NEEDS-CREDS / NEEDS-PRODUCT-DECISION / TOO-RISKY (OEM/ACARS/regulatory feeds, supply-chain disruption forecasting, cross-fleet asset reallocation, mobile/VR app). No mechanical work remains within scope.

## Apply pass 5 (all backlog)

Promoted two PRODUCT-DECISION items to advisory implementations.

**Backend** (`backend/routes/ai.js`, reuses `callAI` + `auth` + `aiRateLimiter`; both 503 when `OPENROUTER_API_KEY` missing):
- `POST /api/ai/training-path` — PRODUCT-DECISION: skill-gap signal sourced from `work_orders` joined to `technicians`; no external skill matrix.
- `POST /api/ai/fleet-reallocation` — PRODUCT-DECISION: advisory LLM-recommended moves only, NOT a heavy multi-aircraft optimization solver.

**Frontend** (`frontend/src/pages/AITools.js`):
- Added `training-path` and `fleet-reallocation` entries to TOOLS map (auto-renders form + result via existing tool-switcher).

**Smoke test:** Started backend on port 4111 with `OPENROUTER_API_KEY=""`; login admin@aeromro.com/password123 → 200; both new endpoints → 503 with `missing: OPENROUTER_API_KEY`. Server cleaned up.

Backlog updated:
- AI training path → done.
- AI cross-fleet asset reallocation → done (as advisory).
- Remaining: OEM integrations, ACARS streaming, regulatory feeds (NEEDS-CREDS); mobile + VR/AR (TOO-RISKY).
