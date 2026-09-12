# reCarbon — Functional Requirements

## 1. Product Definition

reCarbon is a B2B marketplace for captured CO₂. It connects companies that capture CO₂ with companies that can use it, enables price discovery through bidding, matches compatible logistics providers, verifies pickup and delivery using QR codes, tracks shipments, and maintains transaction/reliability records.

Core lifecycle:

**Registration → CO₂ Supply Listing → Buyer Discovery → Bidding → Bid Acceptance → Logistics Matching → Logistics Selection → Pickup QR Verification → Live Tracking → Delivery QR Verification → Proof of Delivery → Transaction Completion → Reliability Update**

---

# 2. User Roles

## FR-001 — Company Registration
Organizations can register as:
- CO₂ Supplier
- CO₂ Buyer/Utilizer
- Logistics Provider
- Regulator/Auditor
- Platform Administrator

Registration collects organization name, type, industry, address/location, contact details, credentials, and optional business/website information.

## FR-002 — Authentication
Support registration, login, logout, password hashing, JWT/session authentication, protected APIs, and password recovery.

## FR-003 — Role-Based Access Control
Supplier, buyer, logistics, regulator, and admin roles shall have separate permissions and dashboards.

---

# 3. Organization and Facility Management

## FR-004 — Organization Profile
Profiles shall show organization information, industry, location, verification status, reliability score, transaction history, and active listings/orders.

## FR-005 — Facility Management
Organizations may register multiple plants/facilities with name, address, coordinates, industry, operating status, and capture capacity where applicable.

## FR-006 — Organization Verification
Support Pending, Under Review, Verified, Rejected, and Suspended states. Verified organizations receive a visible badge.

---

# 4. CO₂ Supply Management

## FR-007 — Create CO₂ Supply Listing
Suppliers can list captured CO₂ with:
- Quantity
- Available/reserved quantity
- Purity
- Pressure
- Temperature
- Physical state
- Contaminants
- Capture source
- Availability window
- Asking price/currency
- Minimum order quantity
- Pickup location
- Expiry
- Status

## FR-008 — CO₂ Physical State
Record and use CO₂ form/state when determining logistics compatibility.

## FR-009 — CO₂ Quality Specification
Support purity, moisture, pressure, temperature, SOx, NOx, O₂, CO, H₂S, hydrocarbons, particulates, and configurable additional quality fields.

## FR-010 — CO₂ Batch Management
Represent actual captured CO₂ as batches with batch ID/number, facility, capture timestamp, quantity, quality characteristics, quality status, and ownership status.

## FR-011 — Supply Quantity Management
Track total, available, reserved, sold, and delivered quantities.

## FR-012 — Partial CO₂ Selling
A single supply pool can be allocated to multiple buyers without overselling.

Example:
```text
500 t available
Buyer A → 100 t
Buyer B → 150 t
Buyer C → 200 t
Remaining → 50 t
```

## FR-013 — Supply Listing Lifecycle
Support Draft, Active, Partially Reserved, Sold Out, Expired, and Cancelled.

---

# 5. Buyer Requirements

## FR-014 — Create CO₂ Requirement
Buyers can specify quantity, minimum purity, required state, pressure/temperature constraints, maximum price, maximum distance, delivery location, dates, deadline, and intended application.

## FR-015 — Utilization/Application
Support applications such as concrete/mineralization, synthetic fuels, greenhouses, algae cultivation, and configurable other uses.

---

# 6. Marketplace Discovery

## FR-016 — CO₂ Marketplace
Buyers can browse active supply listings showing supplier, verification, quantity, purity, state, price, location, distance, reliability, and match score.

## FR-017 — Marketplace Filters
Filter by quantity, purity, price, distance, availability, physical state, pressure, verified supplier, industry, and utilization compatibility.

## FR-018 — Marketplace Sorting
Sort by best match, lowest price, lowest estimated delivered cost, closest supplier, highest reliability, highest carbon benefit, and fastest availability.

---

# 7. AI Natural-Language Search

## FR-019 — Natural-Language Search
Users can search naturally, e.g.:
> Find me 100 tonnes of CO₂ with at least 90% purity near Ahmedabad.

## FR-020 — AI Query Parsing
Convert natural-language requests into validated structured parameters.

Example:
```json
{
  "intent": "find_co2_supply",
  "quantity_tonnes": 100,
  "minimum_purity": 90,
  "location": "Ahmedabad",
  "max_distance_km": 200,
  "sort_by": "best_match"
}
```

## FR-021 — Deterministic Database Search
The LLM shall parse intent, but the backend shall perform the actual database search and matching. The LLM must not invent database results.

Flow:
```text
Natural Language
↓
AI Query Parser
↓
Structured JSON
↓
Validation
↓
Database Query
↓
Matching Engine
↓
Ranked Results
```

## FR-022 — Seller-Side AI Search
Suppliers can search for compatible buyers naturally.

## FR-023 — Logistics-Side AI Search
Logistics providers can search for transport jobs naturally.

---

# 8. CO₂ Matching Engine

## FR-024 — Technical Compatibility
Match based on purity, quantity, pressure, temperature, state, contaminants, and application requirements.

## FR-025 — Geographic Compatibility
Consider supplier/buyer locations, distance, travel time, and transport availability.

## FR-026 — Economic Compatibility
Consider CO₂ price, transportation, handling, compression/storage where applicable, and estimated delivered cost.

## FR-027 — Temporal Compatibility
Compare supply windows, buyer demand windows, delivery deadlines, and recurring requirements.

## FR-028 — Hard Constraints
Distinguish hard constraints such as minimum purity, required state, minimum quantity, regulatory requirements, and availability. Hard failures should be marked incompatible.

## FR-029 — Match Score
Calculate an explainable score from technical, quantity, geographic, economic, availability, and reliability factors.

## FR-030 — Explainable Match
Show why a match was recommended:
```text
94% Match
✓ Purity requirement satisfied
✓ Required quantity available
✓ Availability compatible
✓ Transport route available
✓ Delivered cost within budget
✓ Reliable supplier
```

## FR-031 — Alternative Matches
Return near matches when no perfect match exists and explain the failed constraint.

---

# 9. Bidding and Price Discovery

## FR-032 — Place Bid
Buyers can bid on listings with quantity, price/tonne, total value, delivery requirement, contract duration, expiry, and optional terms.

## FR-033 — Bid Status
Support Pending, Accepted, Rejected, Countered, Expired, and Withdrawn.

## FR-034 — Seller Bid Dashboard
Show buyer, quantity, bid price, total value, buyer reliability, delivery requirement, contract duration, bid score, and status.

## FR-035 — Bid Ranking
Rank bids using configurable price, buyer reliability, quantity fit, delivery compatibility, and contract-value factors. Allow sorting by highest price, best overall score, reliability, quantity, and speed.

## FR-036 — Accept Bid
Seller can accept all or part of the bid quantity.

## FR-037 — Counter Offer
Buyer and seller can negotiate quantity, price, delivery date, duration, and terms.

## FR-038 — Bid Quantity Validation
Prevent accepted quantities from exceeding available supply.

---

# 10. Order and Transaction Management

## FR-039 — Create Order
An accepted bid creates an order containing seller, buyer, listing, batch, quantity, agreed price, total amount, and delivery requirements.

## FR-040 — Order Lifecycle
Support:
```text
ORDER_CREATED
LOGISTICS_PENDING
LOGISTICS_ASSIGNED
PICKUP_PENDING
PICKUP_VERIFIED
IN_TRANSIT
DELIVERY_PENDING
DELIVERY_VERIFIED
QUANTITY_CONFIRMED
COMPLETED
DISPUTED
CANCELLED
```

## FR-041 — Transaction History
Buyer and seller dashboards show active, completed, cancelled, and disputed orders with quantities and transaction values.

---

# 11. Logistics Provider Management

## FR-042 — Logistics Company Registration
Logistics providers register company details, operating regions, verification status, fleet, and reliability score.

## FR-043 — Vehicle Registration
Vehicles shall include registration number, type, capacity, supported CO₂ states/forms, container types, regions, availability, and pricing model.

## FR-044 — Container Management
Containers shall include ID, type, capacity, supported CO₂ states, pressure/temperature ranges, and availability.

## FR-045 — Vehicle/Container Compatibility
Determine whether a vehicle/container can handle the shipment's CO₂ characteristics and quantity.

## FR-046 — Logistics Availability
Providers specify available dates, regions, vehicles, containers, and capacity.

---

# 12. Logistics Matching

## FR-047 — Generate Logistics Shortlist
After order creation, automatically identify compatible logistics providers.

## FR-048 — Logistics Compatibility
Consider vehicle/container capacity, CO₂ state, pressure/temperature, route, region, availability, cost, and reliability.

## FR-049 — Logistics Match Score
Show an explainable compatibility score.

## FR-050 — Logistics Ranking
Allow sorting by best match, lowest cost, fastest delivery, highest reliability, and shortest route.

## FR-051 — Logistics Selection
Buyer selects a compatible logistics provider and the provider receives a transport job.

---

# 13. Shipment Management

## FR-052 — Create Shipment
Shipment contains order, seller, buyer, logistics provider, vehicle, container, quantity, pickup/delivery locations, estimated distance, estimated cost, ETA, and status.

## FR-053 — Shipment Assignment
Logistics provider assigns driver, vehicle, and container.

## FR-054 — Shipment Status
Logistics providers can update shipment status according to permitted state transitions.

---

# 14. Logistics Cost Estimation

## FR-055 — Distance Calculation
Calculate estimated distance between pickup and delivery.

## FR-056 — Transport Cost
Estimate cost using distance, vehicle, capacity, number of trips, rate, handling, and configurable logistics assumptions.

## FR-057 — Delivered Cost
Calculate:
```text
CO₂ price
+ transportation
+ handling
+ compression/storage where applicable
= estimated delivered cost
```

## FR-058 — Multi-Trip Calculation
If quantity exceeds capacity, calculate required trips and estimated total transport cost.

---

# 15. QR-Based Chain of Custody

## FR-059 — Pickup QR Generation
After logistics assignment, generate a unique shipment-specific pickup QR.

## FR-060 — Pickup QR Scan
Driver scans at seller location. Backend verifies shipment, driver, provider, seller, state, QR validity, one-time usage, and location where available.

## FR-061 — Pickup Confirmation
Successful verification records timestamp, actor, location, shipment event, and moves shipment to IN_TRANSIT.

## FR-062 — Delivery QR Generation
Generate a unique buyer-side delivery QR associated with the shipment.

## FR-063 — Delivery QR Scan
Driver scans at buyer location. Backend verifies shipment, driver, provider, buyer, state, QR validity, one-time usage, and location where available.

## FR-064 — One-Time QR Tokens
QR tokens shall be unique, shipment/checkpoint-specific, time-limited where appropriate, and invalidated after successful use.

---

# 16. Live Shipment Tracking

## FR-065 — Location Updates
After pickup verification, logistics side can send periodic GPS/location updates.

## FR-066 — Buyer Live Tracking
Buyer sees current shipment location, route, destination, status, and ETA.

## FR-067 — Seller Tracking
Seller can also view shipment progress.

## FR-068 — Tracking Event History
Retain shipment/location events. Simulated GPS may be used for the hackathon if clearly identified as simulated.

---

# 17. Proof of Delivery

## FR-069 — Delivery Verification
Successful delivery QR scan creates a verified delivery event.

## FR-070 — Proof of Delivery Record
Generate a POD containing shipment/order, seller, buyer, logistics provider, vehicle, ordered/delivered quantity, pickup/delivery timestamps and locations, QR status, driver/actor, and shipment events.

## FR-071 — Delivery Confirmation
Buyer confirms received quantity.

## FR-072 — Partial Delivery
Support delivery quantities below the ordered quantity.

## FR-073 — Delivery Discrepancy
Flag delivery differences beyond configured tolerance for review/dispute.

---

# 18. Reliability and Reputation

## FR-074 — Reliability Score
Calculate scores for sellers, buyers, and logistics providers.

## FR-075 — Seller Reliability
Consider on-time fulfillment, quantity accuracy, quality consistency, cancellation rate, completed transactions, and disputes.

## FR-076 — Buyer Reliability
Consider payment reliability, order completion, cancellation rate, disputes, and completed transactions.

## FR-077 — Logistics Reliability
Consider on-time delivery, shipment completion, GPS compliance, quantity handling, cancellations, and discrepancies.

## FR-078 — Explainable Reliability
Users can inspect the components behind a score.

---

# 19. Reporting and Disputes

## FR-079 — Report Company
Users can report fraud, false information, misconduct, or repeated failures.

## FR-080 — Report Listing
Users can report incorrect quantity, purity, price, or other false information.

## FR-081 — Report Delivery
Users can report quantity mismatch, late delivery, incorrect CO₂, damage, GPS discrepancy, or other issues.

## FR-082 — Dispute Management
Disputes contain reporter, reported party, order/shipment, reason, evidence, status, and resolution.

---

# 20. Documents and Verification

## FR-083 — Document Upload
Support business verification documents, CO₂ quality certificates, laboratory reports, capture documentation, delivery documents, and contracts.

## FR-084 — Document Association
Documents can be associated with organizations, facilities, batches, listings, orders, and shipments.

## FR-085 — Quality Certificate
Suppliers can associate quality certificates with CO₂ batches/listings and users can see verification status.

---

# 21. Carbon Passport

## FR-086 — CO₂ Batch Passport
Each batch can have a digital passport showing batch ID, origin, capture timestamp, quantity, purity, state, ownership, transaction history, shipment history, and delivery status.

## FR-087 — QR Batch Verification
A QR can optionally expose an authorized/public verification page for the batch passport.

---

# 22. Transaction Audit Trail

## FR-088 — Audit Logging
Record listing, bid, order, logistics, shipment, QR, location, delivery, dispute, and completion events.

## FR-089 — Historical Event Preservation
Preserve transaction/shipment history rather than overwriting historical events when status changes.

---

# 23. Dashboards

## FR-090 — Seller Dashboard
Show CO₂ available/sold, active listings, bids, accepted bids, shipments, completed transactions, transaction value, reliability, and recommended buyers.

## FR-091 — Buyer Dashboard
Show requirements, matches, bids, accepted purchases, shipments, completed purchases, spending, supplier reliability, and recommended suppliers.

## FR-092 — Logistics Dashboard
Show available jobs, assigned jobs, active shipments, fleet availability, current deliveries, completed deliveries, revenue/transport value, and reliability.

## FR-093 — Admin Dashboard
Show organizations, verification, listings, bids, shipments, transactions, reports, disputes, platform CO₂ traded, and transaction value.

---

# 24. Marketplace Analytics

## FR-094 — Supply Analytics
Show available, listed, sold, and unmatched CO₂.

## FR-095 — Demand Analytics
Show active demand, regional demand, utilization demand, and unfulfilled demand.

## FR-096 — Market Price Analytics
Calculate average listing/accepted bid price and price trends from platform transaction data.

---

# 25. Carbon and Environmental Intelligence

## FR-097 — Net Carbon Benefit
Optionally estimate:
```text
CO₂ utilized
− transportation emissions
− processing/compression emissions
= estimated net carbon benefit
```
Assumptions must be transparent.

## FR-098 — Transport Emissions
Estimate transport emissions using configurable distance, mode, vehicle, and emission-factor assumptions.

## FR-099 — Carbon Impact Dashboard
Show CO₂ traded, delivered, estimated net benefit, transport emissions, and completed carbon loops.

---

# 26. Optimization and Decision Support

## FR-100 — Best Use Recommendation
Recommend potential buyers/uses using compatibility, price, distance, logistics, reliability, and environmental impact.

## FR-101 — Multi-Buyer Allocation
Optimize allocation of one supply pool among multiple buyers while considering revenue, utilization, carbon benefit, transport cost, and transport emissions.

## FR-102 — What-If Simulation
Allow changes to distance, price, purity, and transportation assumptions and recalculate recommendations.

---

# 27. Notifications

## FR-103 — Marketplace Notifications
Notify users of new matches, bids, accepted/rejected bids, counter-offers, and listing expiry.

## FR-104 — Shipment Notifications
Notify users of logistics assignment, pickup scheduling, pickup verification, departure, delays, arrival, delivery verification, and discrepancies.

---

# 28. Security and Data Integrity

## FR-105 — Authorization
Every protected operation must verify authenticated user, organization ownership, and role.

## FR-106 — Ownership Validation
Users cannot modify other organizations' listings, bids, orders, or shipments unless authorized.

## FR-107 — Input Validation
Validate quantity, purity, pressure, temperature, prices, dates, coordinates, IDs, and status transitions.

## FR-108 — Transaction Integrity
Prevent CO₂ overselling, double allocation, QR reuse, unauthorized shipment updates, and invalid state transitions.

---

# 29. API Requirements

## FR-109 — REST API
Expose API groups for:
```text
/api/auth
/api/organizations
/api/facilities
/api/co2/supply
/api/co2/batches
/api/co2/requirements
/api/matches
/api/bids
/api/orders
/api/logistics
/api/vehicles
/api/containers
/api/shipments
/api/shipments/:id/location
/api/shipments/:id/qr
/api/reports
/api/reliability
/api/admin
```

## FR-110 — Core API Operations
The backend should support operations equivalent to:
```text
POST/GET/PATCH   CO₂ supply
POST/GET         CO₂ requirements
POST/GET         matches
POST/GET/PATCH   bids
POST             bid counter/accept/reject
POST/GET         orders
POST             logistics providers
POST             vehicles/containers
GET              logistics matches
POST/PATCH       shipments
POST             pickup/delivery QR
POST             QR verification
POST/GET         shipment location/tracking
GET              proof of delivery
POST             reports
```

---

# 30. Recommended Core Data Model

The project should evolve toward these primary entities:

```text
User
Organization
Facility

CO2Batch
CO2Supply
CO2Requirement

Bid
Order

LogisticsProvider
Vehicle
Container

Shipment
ShipmentEvent
GPSLocation

QRVerification
ProofOfDelivery

ReliabilityScore
Report
Document
AuditLog
Notification
```

---

# 31. Feature Priority

## P0 — Core Winning MVP

1. Company registration/login
2. Supplier dashboard
3. Buyer dashboard
4. Logistics dashboard
5. CO₂ supply listing
6. Buyer CO₂ requirement
7. Marketplace
8. AI natural-language search
9. Matching engine
10. Explainable match score
11. Partial CO₂ selling
12. Bidding
13. Bid ranking
14. Bid acceptance
15. Order creation
16. Logistics provider registration
17. Vehicle registration
18. Container registration
19. Logistics matching
20. Logistics selection
21. Shipment creation
22. Pickup QR
23. Delivery QR
24. QR verification
25. Live shipment tracking
26. Proof of delivery
27. Reliability scores

## P1 — Strong Differentiators

28. Counter-offers
29. Logistics cost estimation
30. Delivered-cost calculation
31. Multi-trip logistics
32. Shipment event timeline
33. Partial delivery
34. Quantity discrepancy detection
35. Company verification
36. Quality certificates
37. Carbon batch passport
38. QR batch verification
39. Reporting
40. Dispute management
41. Notifications
42. Seller-side AI buyer search
43. Logistics-side AI job search
44. Market analytics
45. Carbon impact dashboard

## P2 — Advanced / If Time Allows

46. Best-use recommendation
47. Multi-buyer allocation optimization
48. What-if simulator
49. Dynamic market pricing
50. Supply/demand forecasting
51. Carbon liquidity score
52. Transport emissions estimation
53. Net carbon benefit
54. Regional supply/demand heatmap
55. Infrastructure opportunity detection
56. AI deal negotiation
57. Recurring contracts
58. Escrow/payment simulation
59. Advanced anomaly detection
60. Regulatory dashboard
61. External API ecosystem

---

# 32. Hackathon Demo-Critical Flow

The finished prototype should support this complete scenario:

```text
1. Supplier logs in
2. Creates 500-tonne CO₂ listing
3. Buyer searches naturally
4. AI converts query to structured filters
5. Matching engine returns ranked suppliers
6. Buyer opens listing
7. Buyer places bid
8. Seller receives multiple bids
9. Seller compares bid scores
10. Seller accepts a partial quantity
11. Available listing quantity updates automatically
12. Platform finds compatible logistics providers
13. Buyer selects logistics provider
14. Shipment is created
15. Seller receives pickup QR
16. Driver scans pickup QR
17. Pickup is verified
18. Shipment changes to IN_TRANSIT
19. Buyer sees live/simulated location
20. Driver reaches buyer
21. Driver scans delivery QR
22. Delivery is verified
23. Buyer confirms delivered quantity
24. Proof of Delivery is generated
25. Transaction becomes COMPLETED
26. Reliability scores update
27. Transaction/shipment history is updated
```

---

# 33. Product Principle

reCarbon should not remain a generic chemical marketplace.

It should treat **captured CO₂ as a traceable, divisible, tradeable industrial commodity**.

The core system is:

```text
CAPTURE
↓
CHARACTERIZE
↓
LIST
↓
DISCOVER
↓
MATCH
↓
BID
↓
ALLOCATE
↓
TRANSPORT
↓
VERIFY
↓
DELIVER
↓
PROVE
↓
COMPLETE
```

The primary differentiators are:

- Partial CO₂ allocation
- Price discovery through bidding
- Technical + economic + logistics matching
- AI natural-language discovery
- Vehicle/container compatibility
- Two-stage QR chain of custody
- Live shipment tracking
- Digital Proof of Delivery
- Reliability/reputation system
- Traceable CO₂ batches
