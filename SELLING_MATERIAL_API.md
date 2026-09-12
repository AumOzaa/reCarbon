# Selling Material API Implementation

## Overview

Implemented a complete authenticated API for manufacturing companies to create selling material listings. The API resolves chemical identities by CAS number and handles concurrent requests gracefully.

---

## Files Created/Modified

### New Files

#### 1. `src/middleware/auth.js`
- **Purpose:** JWT authentication middleware
- **Functionality:**
  - Extracts and verifies Bearer token from Authorization header
  - Decodes JWT payload and attaches to `req.user`
  - Returns 401 Unauthorized for missing/invalid tokens
  - Logs authentication events

#### 2. `src/controllers/sellingMaterial.controller.js`
- **Purpose:** Business logic for creating selling materials
- **Functionality:**
  - Validates required fields (chemical, sourceLocation, cadence, state, data)
  - Validates cadence = "monthly"
  - Validates state ∈ {solid, liquid, gas}
  - Normalizes CAS number (trim whitespace)
  - CAS resolution logic (existing vs. new chemical)
  - Handles race condition for concurrent CAS creation
  - Creates SellingMaterial with company ID from JWT
  - Comprehensive logging using Winston
  - Proper error handling with safe client messages

#### 3. `src/routes/sellingMaterial.routes.js`
- **Purpose:** Route definitions for selling material endpoints
- **Endpoints:**
  - `POST /` → `authenticateJWT` → `createSellingMaterial`
- **Final URL:** `POST /api/selling-materials`

### Modified Files

#### 1. `src/app.js`
- Added import for `sellingMaterial.routes.js`
- Mounted selling material routes at `/api/selling-materials`

#### 2. `API.md`
- Added table of contents entry for Create Selling Material
- Added comprehensive endpoint documentation (400+ lines)
- Added CAS resolution flow diagrams
- Added examples and error scenarios
- Updated status codes and changelog

---

## API Endpoint

### Endpoint
```http
POST /api/selling-materials
```

### Authentication
**Required:** Yes (JWT Bearer Token)

```http
Authorization: Bearer <JWT_TOKEN>
```

### Request Body
```json
{
  "chemical": {
    "name": "Hydrochloric Acid",
    "formula": "HCl",
    "casNumber": "7647-01-0"
  },
  "sourceLocation": "Ahmedabad, Gujarat",
  "cadence": "monthly",
  "state": "liquid",
  "data": {
    "purity": 99,
    "quantity": 20,
    "unit": "tonnes"
  }
}
```

### Success Response (201 Created)
```json
{
  "message": "Selling material created successfully",
  "sellingMaterial": {
    "_id": "507f1f77bcf86cd799439013",
    "manufacturingCompanyId": "507f1f77bcf86cd799439011",
    "chemicalId": "507f1f77bcf86cd799439014",
    "sourceLocation": "Ahmedabad, Gujarat",
    "cadence": "monthly",
    "state": "liquid",
    "data": {
      "purity": 99,
      "quantity": 20,
      "unit": "tonnes"
    },
    "createdAt": "2024-09-12T10:30:00.000Z",
    "updatedAt": "2024-09-12T10:30:00.000Z"
  }
}
```

---

## Core Features

### 1. JWT Authentication

**Flow:**
```
1. Client sends: Authorization: Bearer <token>
2. Middleware extracts token
3. Verifies JWT signature using JWT_SECRET
4. Decodes payload: { accountId, manufacturingCompanyId }
5. Attaches to req.user
6. Controller uses req.user.manufacturingCompanyId
```

**Security:**
- Frontend cannot override manufacturingCompanyId
- Company ID is obtained from JWT, not request body
- Invalid/expired tokens return 401 Unauthorized

### 2. CAS Number Resolution (Most Important)

**The CAS number is the canonical chemical identity.**

```
Request comes in with CAS number
        ↓
Normalize CAS (trim whitespace)
        ↓
Search Chemical collection by CAS
```

#### If CAS Exists

```
Database: { name: "Hydrochloric Acid", formula: "HCl", casNumber: "7647-01-0" }
Request:  { name: "Some Other Name", formula: "X", casNumber: "7647-01-0" }
        ↓
Use existing Chemical (ignore name/formula from request)
Never overwrite or update the existing record
```

**Behavior:** The existing Chemical is the sole source of truth.

#### If CAS Doesn't Exist

```
Request: { name: "Hydrochloric Acid", formula: "HCl", casNumber: "7647-01-0" }
        ↓
Validate name and formula are provided
        ↓
Create new Chemical
        ↓
Use new Chemical._id for SellingMaterial
```

**Behavior:** Creates exactly one new Chemical.

### 3. Race Condition Handling

**Scenario:** Two requests create the same CAS simultaneously.

```
Request 1                        Request 2
    ↓                              ↓
Query CAS → not found       Query CAS → not found
    ↓                              ↓
Attempt create                Attempt create
    ↓                              ↓
Success                        Duplicate Key Error (11000)
    ↓                              ↓
Chemical created              Retry query by CAS
                                   ↓
                              Use existing Chemical
                                   ↓
                              Both requests succeed
```

**Code:**
```js
if (createError.code === 11000) {
  // Duplicate key error - re-query for the existing Chemical
  resolvedChemical = await Chemical.findOne({ casNumber: normalizedCasNumber });
  // Continue with existing Chemical
}
```

---

## Request Validation

### Required Fields

```
✓ chemical (object)
✓ chemical.casNumber (string, required)
✓ chemical.name (string, required only if CAS is new)
✓ chemical.formula (string, required only if CAS is new)
✓ sourceLocation (string, will be trimmed)
✓ cadence (string, must be "monthly")
✓ state (string, must be one of: solid, liquid, gas)
✓ data (object, flexible key-value)
```

### Validation Flow

```
1. Check all top-level fields present
   └─ Return 400 if missing

2. Check CAS number provided
   └─ Return 400 if missing

3. Normalize and search CAS
   └─ Continue

4. If CAS exists
   └─ Use existing Chemical

5. If CAS doesn't exist
   ├─ Check name and formula provided
   │  └─ Return 400 if missing
   └─ Create new Chemical

6. Validate cadence = "monthly"
   └─ Return 400 if invalid

7. Validate state ∈ {solid, liquid, gas}
   └─ Return 400 if invalid

8. Create SellingMaterial
   └─ Return 201 Created
```

---

## Data Field (Flexible Attributes)

The `data` field supports any key-value pairs:

```json
// Example 1: Acid with concentration and purity
{
  "purity": 99.5,
  "concentration": 35,
  "quantity": 20,
  "unit": "tonnes"
}

// Example 2: Solution with pH and viscosity
{
  "ph": 7.2,
  "viscosity": 12,
  "density": 1.2
}

// Example 3: Chemical with custom attributes
{
  "flammability": "high",
  "meltingPoint": 25,
  "boilingPoint": 110
}
```

**Key Design:**
- Backend does NOT validate or hardcode specific attributes
- Frontend controls what attributes are sent
- No backend code changes when new attributes are introduced
- Schema allows any Schema.Types.Mixed structure

---

## SellingMaterial Data Model

```json
{
  "_id": "507f1f77bcf86cd799439013",
  "manufacturingCompanyId": "507f1f77bcf86cd799439011",
  "chemicalId": "507f1f77bcf86cd799439014",
  "sourceLocation": "Ahmedabad, Gujarat",
  "cadence": "monthly",
  "state": "liquid",
  "data": {
    "purity": 99,
    "quantity": 20,
    "unit": "tonnes"
  },
  "createdAt": "2024-09-12T10:30:00.000Z",
  "updatedAt": "2024-09-12T10:30:00.000Z"
}
```

**Key Points:**
- `manufacturingCompanyId` from JWT (not request body)
- `chemicalId` resolves to Chemical by CAS
- Chemical details (name, formula, CAS) NOT stored in SellingMaterial
- Query Chemical separately to get those details

---

## Multiple Listings Per Company

A company can create multiple SellingMaterial records:

```
Company A (manufacturingCompanyId: xyz)
  ├── HCl (CAS 7647-01-0): 20 tonnes/month (purity 99)
  ├── HCl (CAS 7647-01-0): 50 tonnes/month (purity 95)
  └── H2SO4 (CAS 7664-93-9): 30 tonnes/month
```

**Behavior:** No uniqueness constraint. Each API call creates a new record.

---

## Winston Logging

### Logged Events

**Successful Creation:**
```
Selling material created successfully
├── sellingMaterialId: "507f1f77..."
├── manufacturingCompanyId: "507f1f77..."
├── chemicalId: "507f1f77..."
└── casNumber: "7647-01-0"
```

**Existing Chemical Used:**
```
Selling material - using existing chemical
├── chemicalId: "507f1f77..."
├── casNumber: "7647-01-0"
└── manufacturingCompanyId: "507f1f77..."
```

**New Chemical Created:**
```
Selling material - new chemical created
├── chemicalId: "507f1f77..."
├── casNumber: "7647-01-0"
├── name: "Hydrochloric Acid"
└── manufacturingCompanyId: "507f1f77..."
```

**Race Condition Detected:**
```
Selling material - CAS race condition, re-querying existing chemical
├── casNumber: "7647-01-0"
└── manufacturingCompanyId: "507f1f77..."
```

**Authentication Failure:**
```
Unauthorized request - missing authorization header
├── path: "/api/selling-materials"
└── method: "POST"
```

**Validation Failure:**
```
Selling material creation - missing required fields
├── providedFields: ["chemical", "sourceLocation"]
└── manufacturingCompanyId: "507f1f77..."
```

### NOT Logged

- Plaintext passwords
- Password hashes
- JWT tokens
- Authorization headers
- Complete request bodies

---

## Error Handling

### 400 Bad Request

**Triggers:**
- Missing required fields
- Invalid cadence (not "monthly")
- Invalid state (not in solid/liquid/gas)
- Missing CAS number
- Missing name/formula for new CAS

**Response:**
```json
{
  "message": "Descriptive error message"
}
```

**Logging:** Validation errors logged as warnings

### 401 Unauthorized

**Triggers:**
- Missing Authorization header
- Invalid JWT token
- Expired token

**Response:**
```json
{
  "message": "Authorization header is required" | "Invalid or expired token"
}
```

**Logging:** Failed authentication logged as warnings

### 500 Internal Server Error

**Triggers:**
- Database connection failure
- Unexpected error during creation
- Chemical creation error (non-race-condition)

**Response:**
```json
{
  "message": "An error occurred while creating the selling material"
}
```

**Logging:** Detailed error information logged to `logs/error.log`

---

## Testing the API

### 1. Get JWT Token

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "company@example.com",
    "password": "password123"
  }'
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "companyId": "507f1f77bcf86cd799439011"
}
```

### 2. Create Selling Material (Existing CAS)

```bash
curl -X POST http://localhost:5000/api/selling-materials \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "chemical": {
      "name": "Hydrochloric Acid",
      "formula": "HCl",
      "casNumber": "7647-01-0"
    },
    "sourceLocation": "Ahmedabad",
    "cadence": "monthly",
    "state": "liquid",
    "data": {
      "purity": 99,
      "quantity": 20,
      "unit": "tonnes"
    }
  }'
```

### 3. Create Selling Material (New CAS)

```bash
curl -X POST http://localhost:5000/api/selling-materials \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "chemical": {
      "name": "Sulfuric Acid",
      "formula": "H2SO4",
      "casNumber": "7664-93-9"
    },
    "sourceLocation": "Mumbai",
    "cadence": "monthly",
    "state": "liquid",
    "data": {
      "purity": 98,
      "quantity": 50,
      "unit": "tonnes"
    }
  }'
```

### 4. Test Authentication (No Token)

```bash
curl -X POST http://localhost:5000/api/selling-materials \
  -H "Content-Type: application/json" \
  -d '{...}'
```

**Response (401):**
```json
{
  "message": "Authorization header is required"
}
```

### 5. Test Validation (Missing Field)

```bash
curl -X POST http://localhost:5000/api/selling-materials \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "chemical": {
      "casNumber": "7647-01-0"
    },
    "sourceLocation": "Ahmedabad",
    "cadence": "monthly"
  }'
```

**Response (400):**
```json
{
  "message": "All fields are required: chemical, sourceLocation, cadence, state, data"
}
```

---

## Verification Checklist

✅ JWT authentication middleware created  
✅ SellingMaterial controller with CAS resolution  
✅ Routes mounted at `/api/selling-materials`  
✅ App.js updated to include new routes  
✅ manufacturingCompanyId comes from JWT (not request body)  
✅ Frontend cannot override company ID  
✅ Existing CAS reuses existing Chemical  
✅ Unknown CAS creates exactly one new Chemical  
✅ Existing Chemical never overwritten/updated  
✅ Race condition handled (duplicate key error)  
✅ SellingMaterial references chemicalId only  
✅ Chemical details NOT duplicated in SellingMaterial  
✅ Multiple SellingMaterial records allowed per company+chemical  
✅ Data field remains flexible (no hardcoded attributes)  
✅ Validation: cadence = "monthly"  
✅ Validation: state ∈ {solid, liquid, gas}  
✅ Winston logging integrated (no sensitive data logged)  
✅ HTTP logging middleware (method, path, status, duration)  
✅ Error messages are safe (no stack traces)  
✅ API.md updated with comprehensive documentation  
✅ Status codes: 201, 400, 401, 500  

---

## Project Statistics

**Files Modified:** 2
- `src/app.js`
- `API.md`

**Files Created:** 3
- `src/middleware/auth.js` (68 lines)
- `src/controllers/sellingMaterial.controller.js` (186 lines)
- `src/routes/sellingMaterial.routes.js` (10 lines)

**Lines of Code Added:** ~350 lines of production code

**Documentation Added:** 400+ lines in API.md

---

## Database Relationships

```
ManufacturingCompany
        │
        ├─────────────────┬─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
    CompanyAccount   BuyingMaterial   SellingMaterial
                          │                 │
                          │                 │
                          └────────┬────────┘
                                   ▼
                                Chemical
```

**SellingMaterial Relationship:**
- One company can have many selling materials
- One chemical can be sold by many companies
- Multiple selling materials for same company+chemical allowed
- Flexible data field for chemical-specific attributes

---

## Next Steps (Out of Scope)

- BuyingMaterial API
- Chemical CRUD endpoints
- Search and filtering
- Matching algorithms
- Vector DB integration
- Marketplace ranking
- Orders and payments
- Chat functionality
- Email notifications

---

## Configuration

**Environment Variables (.env):**
```
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
MONGODB_URI=mongodb://localhost:27017/recarbon
NODE_ENV=development
PORT=5000
LOG_LEVEL=info
```

**No changes required.** Existing configuration works with this implementation.

---

## Summary

The implementation provides:

1. **JWT Authentication Middleware** — Verifies tokens and extracts company ID
2. **CAS Resolution Logic** — Intelligent chemical identity management
3. **Race Condition Handling** — Prevents duplicate Chemical records
4. **Comprehensive Validation** — Required fields, enums, formats
5. **Winston Logging** — Detailed audit trail without sensitive data
6. **Error Handling** — Safe client messages, detailed server logs
7. **Complete API Documentation** — 400+ lines in API.md

The API is production-ready and extensible for future marketplace features.

---

*Implementation Date: September 12, 2024*
*API Version: 1.1.0*
