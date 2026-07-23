# Property Pro KPI and Data Structure Inventory

This document is the maintained inventory of persisted inputs and derived KPIs.

## Source-of-truth rule

Each Firestore `properties/{documentId}` record represents one house:

```text
id: "001"                       business house ID
houseId: "001"                  backward-compatible alias
houseNumber, name
userId, archived, archivedAt
collaboration, memberUids
scenario: { ...all user inputs } single financial source of truth
createdAt, updatedAt, lastOpenedAt
```

- Only user-entered assumptions belong in `scenario`.
- KPIs, schedules, projections, stress results, and report values are derived by
  `deriveScenario()` and are never stored as competing copies.
- Tabs and reusable panels patch the same scenario properties.
- UI preferences (tab, collapse state, widget layout, compare selection) remain local.

Canonical implementation:

- Schema and migration: `src/storage/mortgageState.ts`
- House envelope: `src/storage/houseTree.ts`
- Firestore persistence: `src/storage/firestoreProperties.ts`
- Derived pipeline: `src/lib/deriveScenario.ts`
- Exports: `src/lib/scenarioExport.ts`, `src/lib/scenarioExcelExport.ts`
- Canonical validation: `src/storage/scenarioValidation.ts`
- Import preview/application: `src/lib/scenarioImport.ts`
- Round-trip verification: `src/lib/dataConsistency.ts`

## Import, validation, and verification ownership

- Supported JSON roots include `house.scenario` exports, raw scenarios, legacy
  top-level `scenario` envelopes, Firestore-like house roots, and legacy category maps.
- Import applies only a validated/repaired `scenario`. Source IDs and names are preview
  data; owner, archive, collaboration, revision, and current-house metadata are preserved.
- `validatePropertyProScenario()` is the canonical field/type/range/relationship validator.
  Blocking or ambiguous issues prevent Apply; deterministic migrations are warnings.
- Future-version scenarios can be inspected but are not rewritten by an older client.
  Unknown fields on supported/current schemas are retained.
- `verifyScenarioRoundTrip()` checks export → import → normalization without mutating state.
- Downloadable JSON, Firestore, Excel, PDF, Compare, and UI all read the same scenario.
  `formulas` and `calculated` are audit outputs and never imported into persisted inputs.
- Read-only consistency verifier/importer: `src/lib/dataConsistency.ts`

## Persisted scenario inventory

### Financing and affordability

| Property | Meaning |
| --- | --- |
| `v` | Scenario schema version |
| `homePrice` | Purchase price |
| `downPayment`, `downPaymentPercent` | Synchronized down-payment amount and percent |
| `interestRateApr`, `termYears` | Base note rate and term |
| `propertyTaxAnnual`, `propertyTaxPercent` | Synchronized property-tax amount and percent |
| `insuranceAnnual`, `hoaMonthly`, `pmiMonthly` | Housing carrying costs |
| `extraPrincipalMonthly` | Recurring principal prepayment |
| `annualGrossIncome`, `monthlyNonMortgageDebt` | DTI inputs |
| `customHousingBudgetMonthly` | User housing-payment target |
| `refi` | Refinance balance, current P&I, new rate/term/costs, loan-year position |
| `growth` | Annual rent and operating-expense growth assumptions |
| `paymentPlan` | Monthly/biweekly cadence and principal lump sums |
| `loan` | Conventional/FHA/VA/USDA, rate type, ARM, points, buydown and MI assumptions |
| `offerTargets` | DSCR, cash-flow, CoC and payment targets used by max-offer solvers |

### Upfront cash

| Property | Meaning |
| --- | --- |
| `closingCosts` | Total lender/buyer closing costs |
| `miscInitialCash` | Other one-time cash invested |
| `upfront` | Earnest money, seller/lender credits and rehab cash-in |
| `earnestMoney`, `sellerCredit`, `lenderCredit`, `rehabCashIn` | Legacy-compatible credit aliases |
| `buyingCostLineOverrides` | User overrides keyed by buyer-cost line ID |

### Property and location

| Property | Meaning |
| --- | --- |
| `propertyAddress`, `propertyPlaceId` | Address and Google Place identity |
| `propertyLatitude`, `propertyLongitude` | WGS84 coordinates |
| `propertyState`, `propertyPostalCode` | Location-estimate inputs |

### Rental

| Property | Meaning |
| --- | --- |
| `monthlyRent`, `otherMonthlyIncome` | Canonical rental income inputs |
| `vacancyRatePercent` | Vacancy allowance |
| `propertyMgmtPercent`, `maintenancePercent`, `capexPercent` | Operating reserves |
| `rentalProFormaInclude` | Included/excluded pro-forma cost lines |
| `rentalIncome` | Simple, multifamily unit, or STR detail; synchronized into canonical rent fields |
| `stressTestDeltas` | Rate, rent, vacancy, appreciation, expense and price stress assumptions |
| `dealStrategy` | BRRRR and flip assumptions |
| `research` | Diligence notes, links, comps, document URL refs, and tax issue references (federal / state / county) |

### Exit and tax

| Property | Meaning |
| --- | --- |
| `currentHomeValue`, `yearsOwned` | Present-value/appreciation inputs |
| `sellAnnualAppreciationPercent` | Annual appreciation used by projections |
| `sellClosingCostPercent` | Sale costs |
| `sellRentalYieldInclude` | Rental cash-flow lines included in exit analysis |
| `rentVsBuy` | Comparable rent, investment return and horizon |
| `tax` | Optional land basis, improvements, QBI, tax rates and 1031 assumptions |

## KPI inventory

### Workspace and Compare

| KPI | Definition / source |
| --- | --- |
| Price | `homePrice` |
| Payment | P&I + tax + insurance + HOA + MI |
| Cash in | Canonical initial cash invested after credits |
| Rent | Canonical monthly rent |
| Cash flow | NOI − debt service − MI |
| Cash-on-cash | Annual pre-tax cash flow ÷ initial cash invested |
| Loan | Effective APR and term |
| DSCR | Annual NOI ÷ annual debt service |
| GRM | Purchase price ÷ annual gross scheduled income |
| 1% rule | Monthly base rent ÷ purchase price |
| After-tax cash flow | Tax-modeled annual rental cash flow |
| After-tax five-year gain | Five-year net gain after estimated sale tax |

### Financing

| KPI | Definition / source |
| --- | --- |
| Loan amount | Price − down payment + financed program fees |
| LTV | Loan amount ÷ property value |
| P&I / PITI | Principal/interest and full housing payment |
| Payment composition | Principal, interest, tax, insurance, HOA and MI |
| Life principal / interest | Totals from amortization |
| Prepayment savings | Interest and months saved by extra/biweekly/lump-sum payments |
| Front-end DTI | Housing payment ÷ gross monthly income |
| Back-end DTI | Housing + non-housing debt ÷ gross monthly income |
| Affordable/max offer | Binary-search price cap for budget, DTI, DSCR, CF or CoC target |
| Refi savings | Current P&I − proposed P&I |
| Refi breakeven | Refi costs ÷ monthly savings |
| PMI drop month | Projection month when configured LTV threshold is reached |

### Upfront

| KPI | Definition / source |
| --- | --- |
| Down payment | Cash equity at purchase |
| Buyer costs | Modeled/overridden lender, title, inspection and prepaid lines |
| Credits | Earnest money plus seller/lender credits |
| Rehab cash | Initial improvements/repair cash |
| Net cash to close | Down + costs + other/rehab cash − credits |
| Financed amount | Effective program loan including financed fees |

### Rental and strategies

| KPI | Definition / source |
| --- | --- |
| GSI | Rent + other income before vacancy |
| Vacancy loss | GSI × vacancy rate |
| EGI | GSI − vacancy loss |
| Operating expenses | Management + maintenance + capex + tax + insurance + HOA |
| NOI | EGI − operating expenses |
| Cap rate | Annual NOI ÷ purchase price |
| Cash flow | NOI − P&I − MI |
| Cash-on-cash, DSCR, GRM, 1% rule | Definitions above |
| STR EGI | Nightly/occupancy/cleaning income less platform and vacancy assumptions |
| Multifamily income | Aggregated unit rent/other income after vacancy |
| BRRRR cash left | Total acquisition/rehab cash − refinance proceeds |
| Flip profit / ROI | Net sale proceeds − acquisition/rehab/holding/financing cash |
| Stress delta | Stressed KPI − baseline KPI using the same derivation pipeline |

### Projection, exit, and tax

| KPI | Definition / source |
| --- | --- |
| Projected value | Purchase/value basis grown by appreciation |
| Remaining balance | Month/year amortization balance |
| Equity | Projected value − remaining loan balance |
| Net sale proceeds | Sale price − selling costs − loan payoff |
| Total gain | Sale proceeds + cumulative operating cash flow − initial cash |
| IRR | Annualized return from initial, monthly and terminal cash flows |
| Equity multiple | Total positive distributions ÷ initial cash |
| Rent-vs-buy advantage | Buy terminal wealth − renter/investment terminal wealth |
| Depreciation | Depreciable building basis ÷ 27.5 years |
| QBI estimate | Simplified eligible rental-income deduction |
| Recapture / capital-gains tax | Estimated federal sale tax components |
| 1031 deferred gain | Gain deferred after boot/replacement-property assumptions |
| After-tax proceeds / gain | Net proceeds and total gain after modeled tax |

## Empty and unavailable states

- A missing denominator, zero price/rent/income, or all-cash debt service displays `—`;
  it must never render `Infinity` or `NaN`.
- Optional feature blocks are omitted until enabled or edited.
- External estimates are suggestions with confidence/source labels and never auto-apply.
- Google Maps external links work from an address or coordinates without requiring the
  embedded Maps API.

## Maintenance checklist

The header’s **Verify data** action is non-destructive: it checks the current in-memory
scenario and never saves its report or patches scenario values. It reports source-of-truth
shape, schema version, inventory coverage, rejected values, duplicate aliases/category maps,
and an export → import → normalize deep path comparison.

When adding or changing a financial input or KPI:

1. Add persisted inputs to `AppPersisted`, its parser/normalizer, reset/default behavior,
   migration fixtures, and this inventory.
2. Add derived outputs to `deriveScenario()` or a pure library; do not persist them.
3. Reuse the same output in tab UI, Compare, Excel/PDF/CSV and shared reports.
4. Define empty/zero behavior and mobile presentation.
5. Add formula tests and scenario round-trip/no-field-loss tests.
6. Update this document in the same pull request.
7. Add canonical validation rules for every new optional block or persisted property.
8. Keep current, reset, legacy, malformed, and future-version import fixtures passing.

Run `npm run verify:data` to enforce the fixture, schema, defaults/reset, parser,
export/import, and documented-field inventory contract in CI.
