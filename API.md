# ReCarbon API Documentation

Complete API reference for the ReCarbon B2B Chemical Marketplace.

---

## Table of Contents

1. [Health Check](#health-check)
2. [Manufacturing Company Registration](#manufacturing-company-registration)
3. [Company Profile](#company-profile)
4. [Check Listings](#check-listings)
5. [Login](#login)
6. [Create Selling Material](#create-selling-material)
7. [Delete Selling Material](#delete-selling-material)
8. [Create Buying Material](#create-buying-material)
9. [Delete Buying Material](#delete-buying-material)
10. [Search Selling Materials](#search-selling-materials)
11. [Personalized Feed](#personalized-feed)
12. [Logistics Company Registration](#logistics-company-registration)
13. [Logistics Company Login](#logistics-company-login)
14. [Logistics Company Profile](#logistics-company-profile)
15. [Add Serviceable Pincodes](#add-serviceable-pincodes)
16. [Get Serviceable Pincodes](#get-serviceable-pincodes)
17. [Remove Serviceable Pincode](#remove-serviceable-pincode)
18. [Lookup Logistics Companies](#lookup-logistics-companies)
19. [Error Responses](#error-responses)
20. [Status Codes](#status-codes)

---

## Health Check

Check if the API is running.

### Endpoint

```http
GET /api/health
```

### Request

No request body required.

```bash
curl -X GET http://localhost:5000/api/health
```

### Response

**Status Code:** `200 OK`

```json
{
  "message": "API is running"
}
```

---

## Manufacturing Company Registration

Register a new manufacturing company and create a login account.

### Endpoint

```http
POST /api/manufacturing-companies/register
```

### Request Headers

```http
Content-Type: application/json
```

### Request Body

**Required Fields:** All fields are mandatory.

```json
{
  "name": "ABC Chemicals Inc.",
  "location": "Ahmedabad, Gujarat",
  "address": "123 Industrial Area, Phase 1",
  "contactNum": "9876543210",
  "email": "company@example.com",
  "password": "securePassword123"
}
```

#### Field Descriptions

| Field | Type | Description | Constraints |
|-------|------|-------------|------------|
| `name` | String | Company name | Required, will be trimmed |
| `location` | String | City/Region where company is located | Required, will be trimmed |
| `address` | String | Physical address of company | Required, will be trimmed |
| `contactNum` | String | Contact phone number | Required, stored as string |
| `email` | String | Company email for login | Required, will be normalized (trimmed + lowercased), must be unique |
| `password` | String | Login password (plaintext) | Required, will be hashed with bcrypt before storage |

### Request Example

```bash
curl -X POST http://localhost:5000/api/manufacturing-companies/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ABC Chemicals Inc.",
    "location": "Ahmedabad, Gujarat",
    "address": "123 Industrial Area, Phase 1",
    "contactNum": "9876543210",
    "email": "company@example.com",
    "password": "securePassword123"
  }'
```

### Success Response

**Status Code:** `201 Created`

```json
{
  "message": "Company registered successfully",
  "companyId": "507f1f77bcf86cd799439011"
}
```

#### Response Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `message` | String | Success message |
| `companyId` | String | MongoDB ObjectId of the created ManufacturingCompany |

### Error Responses

#### Missing Required Fields

**Status Code:** `400 Bad Request`

```json
{
  "message": "All fields are required: name, location, address, contactNum, email, password"
}
```

**Triggers when:**
- Any of the 6 required fields are missing or empty
- Request body is malformed

#### Duplicate Email

**Status Code:** `409 Conflict`

```json
{
  "message": "An account with this email already exists"
}
```

**Triggers when:**
- The email (after normalization) already exists in the database
- A company is already registered with this email

#### Server Error

**Status Code:** `500 Internal Server Error`

```json
{
  "message": "An error occurred during registration. Please try again later."
}
```

**Triggers when:**
- Database connection fails
- Unexpected error occurs during processing
- Stack trace will be logged in `logs/error.log`

### Registration Flow

```
1. Validate all required fields are present
   ↓
2. Normalize email (trim + lowercase)
   ↓
3. Check if email already exists in CompanyAccount
   ├─ If yes: Return 409 Conflict
   └─ If no: Continue
   ↓
4. Create ManufacturingCompany document
   ├─ Name: trimmed
   ├─ Location: trimmed
   ├─ Address: trimmed
   └─ ContactNum: as provided
   ↓
5. Hash password using bcrypt (10 salt rounds)
   ↓
6. Create CompanyAccount document
   ├─ Email: normalized
   ├─ PasswordHash: bcrypt hash
   └─ ManufacturingCompanyId: references new company
   ↓
7. Log success with company and account IDs
   ↓
8. Return 201 with companyId
```

---

## Company Profile

Retrieve the authenticated company's complete profile including all company details and listings.

This endpoint returns the authenticated company's information (name, location, address, contact), email, and all selling/buying materials with their chemical details.

### Endpoint

```http
GET /api/manufacturing-companies/me
```

### Authentication

**Required:** Yes (JWT Bearer Token)

```http
Authorization: Bearer <JWT_TOKEN>
```

The JWT token is obtained from the [Login](#login) endpoint and contains:
- `accountId` — Company account ID
- `manufacturingCompanyId` — Company ID (used to fetch this company's data)

### Request Headers

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Request Example

```bash
curl -X GET http://localhost:5000/api/manufacturing-companies/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Success Response

**Status Code:** `200 OK`

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "ABC Chemicals Inc.",
  "location": "Ahmedabad, Gujarat",
  "address": "123 Industrial Area, Phase 1",
  "contactNum": "9876543210",
  "email": "company@example.com",
  "createdAt": "2024-09-12T08:00:00.000Z",
  "updatedAt": "2024-09-12T08:00:00.000Z",
  "sellingMaterials": [
    {
      "_id": "507f1f77bcf86cd799439016",
      "sourceLocation": "Ahmedabad, Gujarat",
      "cadence": "monthly",
      "state": "liquid",
      "data": {
        "purity": 99,
        "quantity": 20,
        "unit": "tonnes"
      },
      "embeddingId": "sellingMaterial:507f1f77bcf86cd799439016",
      "createdAt": "2024-09-12T10:35:00.000Z",
      "updatedAt": "2024-09-12T10:35:00.000Z",
      "chemical": {
        "_id": "507f1f77bcf86cd799439014",
        "name": "Hydrochloric Acid",
        "formula": "HCl",
        "casNumber": "7647-01-0",
        "createdAt": "2024-09-12T09:00:00.000Z",
        "updatedAt": "2024-09-12T09:00:00.000Z"
      }
    }
  ],
  "buyingMaterials": [
    {
      "_id": "507f1f77bcf86cd799439020",
      "reqLocation": "Ahmedabad, Gujarat",
      "data": {
        "minPurity": 98,
        "maxPrice": 500
      },
      "createdAt": "2024-09-12T11:00:00.000Z",
      "updatedAt": "2024-09-12T11:00:00.000Z",
      "chemical": {
        "_id": "507f1f77bcf86cd799439014",
        "name": "Hydrochloric Acid",
        "formula": "HCl",
        "casNumber": "7647-01-0",
        "createdAt": "2024-09-12T09:00:00.000Z",
        "updatedAt": "2024-09-12T09:00:00.000Z"
      }
    }
  ]
}
```

#### Response Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `_id` | String | MongoDB ObjectId of the ManufacturingCompany |
| `name` | String | Company name |
| `location` | String | City/Region where company is located |
| `address` | String | Physical address of the company |
| `contactNum` | String | Company phone number |
| `email` | String | Company email address |
| `createdAt` | String | ISO timestamp when company was created |
| `updatedAt` | String | ISO timestamp of last update |
| `sellingMaterials` | Array | All SellingMaterial listings created by this company |
| `sellingMaterials[].` | Object | Full SellingMaterial with all fields and chemical details |
| `buyingMaterials` | Array | All BuyingMaterial requests created by this company |
| `buyingMaterials[].` | Object | Full BuyingMaterial with all fields and chemical details |

### Error Responses

#### Missing Authentication

**Status Code:** `401 Unauthorized`

```json
{
  "message": "Authorization header is required"
}
```

**Triggers when:**
- `Authorization` header is missing
- No Bearer token is provided

#### Invalid Token

**Status Code:** `401 Unauthorized`

```json
{
  "message": "Invalid or expired token"
}
```

**Triggers when:**
- JWT token is malformed
- JWT token has expired
- JWT token signature is invalid

#### Company Not Found

**Status Code:** `404 Not Found`

```json
{
  "message": "Company not found"
}
```

**Triggers when:**
- The company referenced in the JWT token does not exist in the database
- This is rare and typically indicates data inconsistency

### Important Notes

1. **Complete Profile:** This endpoint returns everything except the password hash. It includes all company details plus all selling and buying materials.

2. **No Pagination:** All listings are returned without pagination. If the company has many listings, all will be included.

3. **Chemical Details Included:** Each selling/buying material includes full chemical information (name, formula, CAS number) populated from the Chemical collection.

4. **Timestamps:** All objects include creation and update timestamps for audit trails.

5. **Flattened Structure:** All company details and listings are in a single flattened response (no nested company/account separation).

---

## Check Listings

Check if the authenticated company has at least one selling or buying material listing.

This endpoint performs a lightweight check to verify if the company has created any listings without returning the full details.

### Endpoint

```http
GET /api/manufacturing-companies/has-listings
```

### Authentication

**Required:** Yes (JWT Bearer Token)

```http
Authorization: Bearer <JWT_TOKEN>
```

The JWT token is obtained from the [Login](#login) endpoint and contains:
- `accountId` — Company account ID
- `manufacturingCompanyId` — Company ID (used to check this company's listings)

### Request Headers

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Request Example

```bash
curl -X GET http://localhost:5000/api/manufacturing-companies/has-listings \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Success Response

**Status Code:** `200 OK`

When company has at least one listing (selling or buying):

```json
{
  "hasListings": true
}
```

When company has no listings:

```json
{
  "hasListings": false
}
```

#### Response Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `hasListings` | Boolean | `true` if company has at least one SellingMaterial or BuyingMaterial, `false` otherwise |

### Error Responses

#### Missing Authentication

**Status Code:** `401 Unauthorized`

```json
{
  "message": "Authorization header is required"
}
```

**Triggers when:**
- `Authorization` header is missing
- No Bearer token is provided

#### Invalid Token

**Status Code:** `401 Unauthorized`

```json
{
  "message": "Invalid or expired token"
}
```

**Triggers when:**
- JWT token is malformed
- JWT token has expired
- JWT token signature is invalid

### Important Notes

1. **Lightweight Check:** This endpoint only counts listings, not returns them, making it fast even with many listings.

2. **Boolean Only:** The response is a simple boolean flag, not a count or list of items.

3. **Checks Both Types:** Returns `true` if the company has ANY selling OR ANY buying material (inclusive OR logic).

4. **No Data Returned:** Unlike the [Company Profile](#company-profile) endpoint, this returns only the presence check, not the actual listing details.

---

## Login

Authenticate a company and receive a JWT token.

### Endpoint

```http
POST /api/auth/login
```

### Request Headers

```http
Content-Type: application/json
```

### Request Body

**Required Fields:** Both fields are mandatory.

```json
{
  "email": "company@example.com",
  "password": "securePassword123"
}
```

#### Field Descriptions

| Field | Type | Description | Constraints |
|-------|------|-------------|------------|
| `email` | String | Company email | Required, will be normalized (trimmed + lowercased) |
| `password` | String | Login password (plaintext) | Required, will be verified against bcrypt hash |

### Request Example

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "company@example.com",
    "password": "securePassword123"
  }'
```

### Success Response

**Status Code:** `200 OK`

```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2NvdW50SWQiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLCJtYW51ZmFjdHVyaW5nQ29tcGFueUlkIjoiNTA3ZjFmNzdiY2Y4NmNkNzk5NDM5MDExIiwiaWF0IjoxNjk0NDcyODAwLCJleHAiOjE2OTUwNzc2MDB9.abcdefghijklmnopqrstuvwxyz",
  "companyId": "507f1f77bcf86cd799439011"
}
```

#### Response Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `message` | String | Success message |
| `token` | String | JWT token for authenticated requests (valid for 7 days by default) |
| `companyId` | String | MongoDB ObjectId of the ManufacturingCompany |

#### JWT Token Payload

```json
{
  "accountId": "507f1f77bcf86cd799439012",
  "manufacturingCompanyId": "507f1f77bcf86cd799439011",
  "iat": 1694472800,
  "exp": 1695077600
}
```

| Field | Type | Description |
|-------|------|-------------|
| `accountId` | String | MongoDB ObjectId of the CompanyAccount |
| `manufacturingCompanyId` | String | MongoDB ObjectId of the ManufacturingCompany |
| `iat` | Number | Issued at timestamp (seconds since epoch) |
| `exp` | Number | Expiration timestamp (seconds since epoch) |

### Error Responses

#### Missing Required Fields

**Status Code:** `400 Bad Request`

```json
{
  "message": "Email and password are required"
}
```

**Triggers when:**
- `email` field is missing or empty
- `password` field is missing or empty
- Request body is malformed

#### Invalid Credentials

**Status Code:** `401 Unauthorized`

```json
{
  "message": "Invalid email or password"
}
```

**Triggers when:**
- Email is not found in database
- Password does not match the stored bcrypt hash
- **Note:** Same generic message for both cases for security (no email enumeration)

### Server Error

**Status Code:** `500 Internal Server Error`

```json
{
  "message": "An error occurred during login. Please try again later."
}
```

**Triggers when:**
- Database connection fails
- Unexpected error occurs during processing
- Stack trace will be logged in `logs/error.log`

### Login Flow

```
1. Validate email and password are provided
   ├─ If missing: Return 400 Bad Request
   └─ If present: Continue
   ↓
2. Normalize email (trim + lowercase)
   ↓
3. Find CompanyAccount by normalized email
   ├─ If not found: Return 401 Unauthorized
   └─ If found: Continue
   ↓
4. Compare supplied password with stored bcrypt hash
   ├─ If mismatch: Return 401 Unauthorized
   └─ If match: Continue
   ↓
5. Create JWT token with:
   ├─ accountId: from CompanyAccount._id
   ├─ manufacturingCompanyId: from CompanyAccount.manufacturingCompanyId
   └─ expiration: JWT_EXPIRES_IN (default: 7 days)
   ↓
6. Log successful login
   ↓
7. Return 200 with token and companyId
```

---

## Create Selling Material

Create a selling material listing for an authenticated manufacturing company.

This endpoint allows a company to list a chemical material that it can supply to buyers.

### Endpoint

```http
POST /api/selling-materials
```

### Authentication

**Required:** Yes (JWT Bearer Token)

```http
Authorization: Bearer <JWT_TOKEN>
```

The JWT token is obtained from the [Login](#login) endpoint and contains:
- `accountId` — Company account ID
- `manufacturingCompanyId` — Company ID (automatically used for the listing)

### Request Headers

```http
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
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

#### Field Descriptions

| Field | Type | Description | Constraints |
|-------|------|-------------|------------|
| `chemical` | Object | Chemical information | Required |
| `chemical.name` | String | Chemical name | Required only if CAS number is new (doesn't exist in database) |
| `chemical.formula` | String | Chemical formula | Required only if CAS number is new |
| `chemical.casNumber` | String | CAS Registry Number | Required, unique identifier for the chemical |
| `sourceLocation` | String | Where the chemical is sourced from | Required, will be trimmed |
| `cadence` | String | Supply frequency | Required, must be "monthly" (currently the only option) |
| `state` | String | Physical state of the chemical | Required, must be one of: "solid", "liquid", "gas" |
| `data` | Object | Flexible key-value attributes | Required, can contain any chemical-specific properties (e.g., purity, quantity, concentration, pH, etc.) |

#### CAS Number Resolution

**The CAS number is the canonical chemical identity.**

- **If CAS number exists:** Uses the existing Chemical record. The `name` and `formula` from the request are ignored.
- **If CAS number is new:** Creates a new Chemical record with the provided name and formula.
- **Race condition handling:** If two requests create the same CAS simultaneously, the system detects it and reuses the existing record.

Example:

```
Request 1: CAS 7647-01-0 (new) → Creates Chemical with name "Hydrochloric Acid"
Request 2: CAS 7647-01-0 (new) → Reuses the Chemical created by Request 1
Request 3: CAS 7647-01-0 (exists) → Uses the existing Chemical (never overwrites name/formula)
```

#### Data Field (Flexible Attributes)

The `data` field is intentionally flexible to support different chemical-specific attributes:

```json
// Example 1: Acid with purity and quantity
{
  "purity": 99.5,
  "quantity": 20,
  "unit": "tonnes"
}

// Example 2: Solution with concentration and pH
{
  "concentration": 40,
  "ph": 7.2,
  "temperature": 25
}

// Example 3: Specialized chemical with custom attributes
{
  "viscosity": 12,
  "density": 1.2,
  "flammability": "high"
}
```

The backend does NOT hardcode or validate specific attributes. The frontend controls what data is sent.

### Request Example

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
    "sourceLocation": "Ahmedabad, Gujarat",
    "cadence": "monthly",
    "state": "liquid",
    "data": {
      "purity": 99,
      "quantity": 20,
      "unit": "tonnes"
    }
  }'
```

### Success Response

**Status Code:** `201 Created`

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

#### Response Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `message` | String | Success message |
| `sellingMaterial._id` | String | MongoDB ObjectId of the created SellingMaterial |
| `sellingMaterial.manufacturingCompanyId` | String | Company ID (from JWT) |
| `sellingMaterial.chemicalId` | String | MongoDB ObjectId of the Chemical (resolved or created) |
| `sellingMaterial.sourceLocation` | String | Source location (trimmed) |
| `sellingMaterial.cadence` | String | Supply frequency |
| `sellingMaterial.state` | String | Physical state |
| `sellingMaterial.data` | Object | Flexible attributes |
| `sellingMaterial.createdAt` | String | ISO timestamp |
| `sellingMaterial.updatedAt` | String | ISO timestamp |

### Error Responses

#### Missing Authentication

**Status Code:** `401 Unauthorized`

```json
{
  "message": "Authorization header is required"
}
```

**Triggers when:**
- `Authorization` header is missing
- No Bearer token is provided

#### Invalid Token

**Status Code:** `401 Unauthorized`

```json
{
  "message": "Invalid or expired token"
}
```

**Triggers when:**
- JWT token is malformed
- JWT token has expired
- JWT secret verification fails

#### Missing Required Fields

**Status Code:** `400 Bad Request`

```json
{
  "message": "All fields are required: chemical, sourceLocation, cadence, state, data"
}
```

**Triggers when:**
- Any of the required top-level fields are missing

#### Missing CAS Number

**Status Code:** `400 Bad Request`

```json
{
  "message": "chemical.casNumber is required"
}
```

**Triggers when:**
- `chemical.casNumber` is missing or empty

#### Missing Chemical Details for New Chemical

**Status Code:** `400 Bad Request`

```json
{
  "message": "For a new chemical, chemical.name and chemical.formula are required"
}
```

**Triggers when:**
- CAS number doesn't exist in database
- `chemical.name` or `chemical.formula` is missing

#### Invalid Cadence

**Status Code:** `400 Bad Request`

```json
{
  "message": "cadence must be \"monthly\""
}
```

**Triggers when:**
- `cadence` is not "monthly"

#### Invalid State

**Status Code:** `400 Bad Request`

```json
{
  "message": "state must be one of: solid, liquid, gas"
}
```

**Triggers when:**
- `state` is not one of the allowed values

#### Server Error

**Status Code:** `500 Internal Server Error`

```json
{
  "message": "An error occurred while creating the selling material"
}
```

**Triggers when:**
- Database connection fails
- Unexpected error during processing
- Detailed error logged in `logs/error.log`

### Creation Flow

```
1. Verify JWT token in Authorization header
   ├─ If invalid/missing: Return 401 Unauthorized
   └─ If valid: Extract manufacturingCompanyId
   ↓
2. Validate all required fields
   ├─ If missing: Return 400 Bad Request
   └─ If present: Continue
   ↓
3. Validate CAS number provided
   ├─ If missing: Return 400 Bad Request
   └─ If present: Continue
   ↓
4. Normalize CAS number (trim whitespace)
   ↓
5. Validate cadence is "monthly"
   ├─ If invalid: Return 400 Bad Request
   └─ If valid: Continue
   ↓
6. Validate state is one of: solid, liquid, gas
   ├─ If invalid: Return 400 Bad Request
   └─ If valid: Continue
   ↓
7. Search for existing Chemical by CAS number
   ├─ If found: Use existing Chemical
   └─ If not found: Continue
   ↓
8. If Chemical not found:
   ├─ Validate chemical.name and chemical.formula provided
   │  ├─ If missing: Return 400 Bad Request
   │  └─ If present: Continue
   ├─ Attempt to create new Chemical
   │  ├─ If success: Use new Chemical
   │  ├─ If race condition (duplicate CAS): Retry query and use existing
   │  └─ If other error: Return 500 Internal Server Error
   └─ Continue
   ↓
9. Create SellingMaterial document
   ├─ manufacturingCompanyId: from JWT
   ├─ chemicalId: resolved/created Chemical ID
   ├─ sourceLocation: from request (trimmed)
   ├─ cadence: from request
   ├─ state: from request
   └─ data: from request
   ↓
10. Log success with IDs
    ↓
11. Return 201 Created with SellingMaterial details
```

### Multiple Listings

A manufacturing company can create multiple SellingMaterial records for:
- **The same chemical** with different quantities/qualities
- **Different chemicals**

Example:

```
Company A
  ├── HCl: 20 tonnes/month (purity 99)
  ├── HCl: 50 tonnes/month (purity 95)
  └── H2SO4: 30 tonnes/month
```

Each API call creates a separate SellingMaterial record.

### Important Notes

1. **CAS is Canonical:** The CAS number is the single source of truth for chemical identity. Different requests with the same CAS will reference the same Chemical record.

2. **Company ID from JWT:** The `manufacturingCompanyId` is extracted from the JWT token. The frontend cannot specify a different company ID.

3. **No Data in Chemical:** The SellingMaterial stores only `chemicalId`, not the chemical's name, formula, or CAS number. Query the Chemical separately to get those details.

4. **Flexible Data Field:** The `data` field supports any key-value pairs. The backend doesn't validate or hardcode specific attributes.

5. **Race Conditions Handled:** If two requests create the same new CAS simultaneously, the system detects the duplicate-key error and reuses the existing Chemical.

---

## Delete Selling Material

Delete a selling material listing owned by the authenticated manufacturing company.

This endpoint removes a SellingMaterial record from MongoDB and its corresponding vector from Pinecone.

### Endpoint

```http
DELETE /api/selling-materials/:id
```

### Authentication

**Required:** Yes (JWT Bearer Token)

```http
Authorization: Bearer <JWT_TOKEN>
```

The authenticated company may only delete its own selling materials. The system verifies ownership using the `manufacturingCompanyId` from the JWT.

### Request Headers

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### URL Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | String | MongoDB ObjectId of the SellingMaterial to delete |

### Request Example

```bash
curl -X DELETE http://localhost:5000/api/selling-materials/507f1f77bcf86cd799439013 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Success Response

**Status Code:** `200 OK`

```json
{
  "message": "Selling material deleted successfully",
  "sellingMaterialId": "507f1f77bcf86cd799439013"
}
```

#### Response Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `message` | String | Success message |
| `sellingMaterialId` | String | MongoDB ObjectId of the deleted SellingMaterial |

### Error Responses

#### Missing Authentication

**Status Code:** `401 Unauthorized`

```json
{
  "message": "Authorization header is required"
}
```

**Triggers when:**
- `Authorization` header is missing
- No Bearer token is provided

#### Invalid Token

**Status Code:** `401 Unauthorized`

```json
{
  "message": "Invalid or expired token"
}
```

**Triggers when:**
- JWT token is malformed
- JWT token has expired
- JWT token signature is invalid

#### Invalid Selling Material ID Format

**Status Code:** `400 Bad Request`

```json
{
  "message": "Invalid selling material ID"
}
```

**Triggers when:**
- The `id` parameter is not a valid MongoDB ObjectId (24 hex characters)

#### Selling Material Not Found

**Status Code:** `404 Not Found`

```json
{
  "message": "Selling material not found"
}
```

**Triggers when:**
- The SellingMaterial with the given ID does not exist
- The SellingMaterial belongs to a different company (ownership check)

**Note:** This response is identical for both "not found" and "wrong company" cases to prevent leaking information about other companies' records.

#### Pinecone Deletion Failure

**Status Code:** `500 Internal Server Error`

```json
{
  "message": "An error occurred while deleting the selling material"
}
```

**Triggers when:**
- Pinecone vector deletion fails (network error, API unavailable, etc.)

**Important:** When Pinecone deletion fails, the MongoDB record is NOT deleted. This ensures data consistency — the SellingMaterial record remains and the request can be retried. The vector will be cleaned up on the next successful deletion attempt.

#### MongoDB Deletion Failure

**Status Code:** `500 Internal Server Error`

```json
{
  "message": "An error occurred while deleting the selling material"
}
```

**Triggers when:**
- MongoDB deletion fails after Pinecone deletion succeeds
- Database connection issues occur during deletion

### Deletion Flow

The deletion process follows this sequence to ensure data consistency:

1. **Validate the ID** — Check that it's a valid MongoDB ObjectId
2. **Find the Record** — Query MongoDB for the SellingMaterial with both ID and company ownership check
3. **Delete from Pinecone** — Delete the vector using the stored `embeddingId` (or fallback to deterministic ID)
4. **Delete from MongoDB** — Remove the SellingMaterial document from the database

**Key Design Decisions:**

- **Pinecone deletion happens BEFORE MongoDB deletion** — If Pinecone deletion fails, the MongoDB record is preserved. If MongoDB deletion fails, the vector is already gone but the record remains. Either way, the request can be retried.
- **Vector already gone is idempotent** — If the vector doesn't exist in Pinecone, deletion succeeds and continues to MongoDB deletion. This handles cases where vectors were manually deleted or already cleaned up.
- **Deterministic ID fallback** — If the `embeddingId` field is not set (e.g., from older records), the system uses the deterministic vector ID: `sellingMaterial:<SellingMaterial._id>`

### Important Notes

1. **Ownership Verification:** The request must include a valid JWT. The authenticated company ID is extracted and used to verify that the SellingMaterial belongs to that company.

2. **Idempotent Vector Deletion:** If the Pinecone vector is already missing (either previously deleted or manually removed), the deletion still succeeds. This prevents cascading failures.

3. **Atomic Deletion is Not Used:** MongoDB transactions are not used. Instead, the order of operations (Pinecone first, then MongoDB) ensures that the authoritative MongoDB record survives any partial failure.

4. **No Information Leakage:** The API does not distinguish between "not found" and "wrong company" — both return 404. This prevents attackers from enumerating SellingMaterial IDs that belong to other companies.

5. **Logging Included:** Deletion operations are fully logged with relevant IDs (`sellingMaterialId`, `embeddingId`, `manufacturingCompanyId`) for audit trails and troubleshooting.

---

## Create Buying Material

Create a buying material request for an authenticated manufacturing company.

This endpoint allows a company to indicate that it is seeking a specific chemical material to purchase.

### Endpoint

```http
POST /api/buying-materials
```

### Authentication

**Required:** Yes (JWT Bearer Token)

```http
Authorization: Bearer <JWT_TOKEN>
```

The JWT token is obtained from the [Login](#login) endpoint and contains:
- `accountId` — Company account ID
- `manufacturingCompanyId` — Company ID (automatically used for the request)

### Request Headers

```http
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Request Body

```json
{
  "chemical": {
    "name": "Hydrochloric Acid",
    "formula": "HCl",
    "casNumber": "7647-01-0"
  },
  "reqLocation": "Ahmedabad, Gujarat",
  "data": {
    "purity": 99,
    "quantity": 10,
    "unit": "tonnes"
  }
}
```

#### Field Descriptions

| Field | Type | Description | Constraints |
|-------|------|-------------|------------|
| `chemical` | Object | Chemical information | Required |
| `chemical.name` | String | Chemical name | Required only if CAS number is new |
| `chemical.formula` | String | Chemical formula | Required only if CAS number is new |
| `chemical.casNumber` | String | CAS Registry Number | Required, unique identifier for the chemical |
| `reqLocation` | String | Where the company needs the chemical delivered | Required, will be trimmed |
| `data` | Object | Flexible key-value attributes | Optional, can contain any chemical-specific properties |

#### CAS Number Resolution

**The CAS number is the canonical chemical identity.**

- **If CAS number exists:** Uses the existing Chemical record. The `name` and `formula` from the request are ignored.
- **If CAS number is new:** Creates a new Chemical record with the provided name and formula.
- **Race condition handling:** If two requests create the same CAS simultaneously, the system detects it and reuses the existing record.

#### Duplicate Prevention

**Only ONE buying material request per company-chemical pair.**

If a company already has a buying-material request for a specific chemical, attempting to create another will be rejected with `409 Conflict`.

The existing request must be explicitly deleted before a new one can be created for the same chemical.

#### Data Field (Flexible Attributes)

The `data` field is intentionally flexible and OPTIONAL:

```json
// Example 1: With data
{
  "purity": 99,
  "quantity": 10,
  "unit": "tonnes"
}

// Example 2: Empty or minimal data
{}
```

The backend does NOT hardcode or validate specific attributes.

### Request Example

```bash
curl -X POST http://localhost:5000/api/buying-materials \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "chemical": {
      "name": "Hydrochloric Acid",
      "formula": "HCl",
      "casNumber": "7647-01-0"
    },
    "reqLocation": "Ahmedabad, Gujarat",
    "data": {
      "purity": 99,
      "quantity": 10,
      "unit": "tonnes"
    }
  }'
```

### Success Response

**Status Code:** `201 Created`

```json
{
  "message": "Buying material created successfully",
  "buyingMaterial": {
    "_id": "507f1f77bcf86cd799439015",
    "manufacturingCompanyId": "507f1f77bcf86cd799439011",
    "chemicalId": "507f1f77bcf86cd799439014",
    "reqLocation": "Ahmedabad, Gujarat",
    "data": {
      "purity": 99,
      "quantity": 10,
      "unit": "tonnes"
    },
    "createdAt": "2024-09-12T10:35:00.000Z",
    "updatedAt": "2024-09-12T10:35:00.000Z"
  }
}
```

#### Response Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `message` | String | Success message |
| `buyingMaterial._id` | String | MongoDB ObjectId of the created BuyingMaterial |
| `buyingMaterial.manufacturingCompanyId` | String | Company ID (from JWT) |
| `buyingMaterial.chemicalId` | String | MongoDB ObjectId of the Chemical (resolved or created) |
| `buyingMaterial.reqLocation` | String | Required location (trimmed) |
| `buyingMaterial.data` | Object | Flexible attributes |
| `buyingMaterial.createdAt` | String | ISO timestamp |
| `buyingMaterial.updatedAt` | String | ISO timestamp |

### Error Responses

#### Missing Authentication

**Status Code:** `401 Unauthorized`

```json
{
  "message": "Authorization header is required"
}
```

**Triggers when:**
- `Authorization` header is missing
- No Bearer token is provided

#### Invalid Token

**Status Code:** `401 Unauthorized`

```json
{
  "message": "Invalid or expired token"
}
```

**Triggers when:**
- JWT token is malformed
- JWT token has expired
- JWT secret verification fails

#### Missing Required Fields

**Status Code:** `400 Bad Request`

```json
{
  "message": "All fields are required: chemical, reqLocation"
}
```

**Triggers when:**
- `chemical` or `reqLocation` is missing

#### Missing CAS Number

**Status Code:** `400 Bad Request`

```json
{
  "message": "chemical.casNumber is required"
}
```

**Triggers when:**
- `chemical.casNumber` is missing or empty

#### Missing Chemical Details for New Chemical

**Status Code:** `400 Bad Request`

```json
{
  "message": "For a new chemical, chemical.name and chemical.formula are required"
}
```

**Triggers when:**
- CAS number doesn't exist in database
- `chemical.name` or `chemical.formula` is missing

#### Duplicate Buying Material

**Status Code:** `409 Conflict`

```json
{
  "message": "A buying material for this chemical already exists. Delete the existing request before creating a new one."
}
```

**Triggers when:**
- Company already has a buying-material request for this chemical
- Enforced at both application and database level

#### Server Error

**Status Code:** `500 Internal Server Error`

```json
{
  "message": "An error occurred while creating the buying material"
}
```

**Triggers when:**
- Database connection fails
- Unexpected error during processing
- Detailed error logged in `logs/error.log`

### Creation Flow

```
1. Verify JWT token in Authorization header
   ├─ If invalid/missing: Return 401 Unauthorized
   └─ If valid: Extract manufacturingCompanyId
   ↓
2. Validate required fields (chemical, reqLocation)
   ├─ If missing: Return 400 Bad Request
   └─ If present: Continue
   ↓
3. Validate CAS number provided
   ├─ If missing: Return 400 Bad Request
   └─ If present: Continue
   ↓
4. Normalize CAS number (trim whitespace)
   ↓
5. Search for existing Chemical by CAS number
   ├─ If found: Use existing Chemical
   └─ If not found: Continue
   ↓
6. If Chemical not found:
   ├─ Validate chemical.name and chemical.formula provided
   │  ├─ If missing: Return 400 Bad Request
   │  └─ If present: Continue
   ├─ Attempt to create new Chemical
   │  ├─ If success: Use new Chemical
   │  ├─ If race condition (duplicate CAS): Retry query and use existing
   │  └─ If other error: Return 500 Internal Server Error
   └─ Continue
   ↓
7. Check for existing buying material (company + chemical)
   ├─ If exists: Return 409 Conflict
   └─ If not exists: Continue
   ↓
8. Create BuyingMaterial document
   ├─ manufacturingCompanyId: from JWT
   ├─ chemicalId: resolved/created Chemical ID
   ├─ reqLocation: from request (trimmed)
   └─ data: from request (optional, defaults to empty object)
   ↓
9. Log success with IDs
   ↓
10. Return 201 Created with BuyingMaterial details
```

### Duplicate Prevention

Each manufacturing company can have ONLY ONE buying-material request for each specific chemical.

**Database Constraint:** Unique compound index on `(manufacturingCompanyId, chemicalId)` ensures this at the database level.

Example:

```
Company A cannot have two buying requests for HCl
Company A can have one HCl request and one H2SO4 request
Company B can have a separate HCl request
```

To create a new buying request for the same chemical, the existing one must be deleted first.

### Important Notes

1. **CAS is Canonical:** The CAS number is the single source of truth for chemical identity.

2. **Company ID from JWT:** The `manufacturingCompanyId` is extracted from the JWT token. The frontend cannot specify a different company ID.

3. **No Data in Chemical:** The BuyingMaterial stores only `chemicalId`, not the chemical's name, formula, or CAS number.

4. **Flexible Data Field:** The `data` field is OPTIONAL and supports any key-value pairs.

5. **Duplicate Prevention:** Enforced at both application level (409 response) and database level (unique index).

6. **Race Conditions Handled:** If two requests create the same new CAS simultaneously, the system detects the duplicate-key error and reuses the existing Chemical.

---

## Delete Buying Material

Delete a buying material request owned by the authenticated manufacturing company.

This endpoint removes a BuyingMaterial record from MongoDB.

### Endpoint

```http
DELETE /api/buying-materials/:id
```

### Authentication

**Required:** Yes (JWT Bearer Token)

```http
Authorization: Bearer <JWT_TOKEN>
```

The authenticated company may only delete its own buying materials. The system verifies ownership using the `manufacturingCompanyId` from the JWT.

### Request Headers

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### URL Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | String | MongoDB ObjectId of the BuyingMaterial to delete |

### Request Example

```bash
curl -X DELETE http://localhost:5000/api/buying-materials/507f1f77bcf86cd799439013 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Success Response

**Status Code:** `200 OK`

```json
{
  "message": "Buying material deleted successfully",
  "buyingMaterialId": "507f1f77bcf86cd799439013"
}
```

#### Response Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `message` | String | Success message |
| `buyingMaterialId` | String | MongoDB ObjectId of the deleted BuyingMaterial |

### Error Responses

#### Missing Authentication

**Status Code:** `401 Unauthorized`

```json
{
  "message": "Authorization header is required"
}
```

**Triggers when:**
- `Authorization` header is missing
- No Bearer token is provided

#### Invalid Token

**Status Code:** `401 Unauthorized`

```json
{
  "message": "Invalid or expired token"
}
```

**Triggers when:**
- JWT token is malformed
- JWT token has expired
- JWT token signature is invalid

#### Invalid Buying Material ID Format

**Status Code:** `400 Bad Request`

```json
{
  "message": "Invalid buying material ID"
}
```

**Triggers when:**
- The `id` parameter is not a valid MongoDB ObjectId (24 hex characters)

#### Buying Material Not Found

**Status Code:** `404 Not Found`

```json
{
  "message": "Buying material not found"
}
```

**Triggers when:**
- The BuyingMaterial with the given ID does not exist
- The BuyingMaterial belongs to a different company (ownership check)

**Note:** This response is identical for both "not found" and "wrong company" cases to prevent leaking information about other companies' records.

#### MongoDB Deletion Failure

**Status Code:** `500 Internal Server Error`

```json
{
  "message": "An error occurred while deleting the buying material"
}
```

**Triggers when:**
- MongoDB deletion fails
- Database connection issues occur during deletion

### Deletion Flow

The deletion process follows this sequence:

1. **Validate the ID** — Check that it's a valid MongoDB ObjectId
2. **Find the Record** — Query MongoDB for the BuyingMaterial with both ID and company ownership check
3. **Delete from MongoDB** — Remove the BuyingMaterial document from the database

**Key Design Decisions:**

- **Ownership Verification:** The request must include a valid JWT. The authenticated company ID is extracted and used to verify that the BuyingMaterial belongs to that company.
- **No Information Leakage:** The API does not distinguish between "not found" and "wrong company" — both return 404. This prevents attackers from enumerating BuyingMaterial IDs that belong to other companies.
- **Logging Included:** Deletion operations are fully logged with relevant IDs (`buyingMaterialId`, `manufacturingCompanyId`) for audit trails and troubleshooting.

### Important Notes

1. **Ownership Verification:** The request must include a valid JWT. The authenticated company ID is extracted and used to verify that the BuyingMaterial belongs to that company.

2. **No Vector Cleanup:** Unlike SellingMaterial deletion, BuyingMaterial deletion does not involve Pinecone or vector cleanup (BuyingMaterials are not indexed).

3. **Duplicate Prevention Reset:** After deleting a buying material request, the company can create a new buying material request for the same chemical.

4. **No Information Leakage:** The API does not distinguish between "not found" and "wrong company" — both return 404.

5. **Logging Included:** Deletion operations are fully logged with relevant IDs for audit trails and troubleshooting.

---

## Search Selling Materials

Search for selling material listings using natural language query with automatic CAS number extraction.

This endpoint accepts a buyer's natural-language query, automatically extracts the chemical CAS number using gpt-oss:120b-cloud via Ollama Cloud, generates an embedding of the full query using embeddinggemma:latest via local Ollama, searches Pinecone for semantically similar listings filtered by CAS number, and returns matching SellingMaterial records from MongoDB.

### Endpoint

```http
POST /api/search/selling-materials
```

### Authentication

**Not required** for this first version.

### Request Headers

```http
Content-Type: application/json
```

### Request Body

```json
{
  "query": "I need hydrochloric acid CAS 7647-01-0 with purity around 99%",
  "topK": 10
}
```

#### Field Descriptions

| Field | Type | Description | Constraints |
|-------|------|-------------|------------|
| `query` | String | Natural language search query | Required, non-empty |
| `topK` | Number | Number of top results to return | Optional, default 10, max 50, positive integer |

### Request Example

```bash
curl -X POST http://localhost:5000/api/search/selling-materials \
  -H "Content-Type: application/json" \
  -d '{
    "query": "I need hydrochloric acid CAS 7647-01-0 with purity around 99%",
    "topK": 5
  }'
```

### Success Response

**Status Code:** `200 OK`

```json
{
  "query": "I need hydrochloric acid CAS 7647-01-0 with purity around 99%",
  "casNumber": "7647-01-0",
  "topK": 5,
  "results": [
    {
      "score": 0.92,
      "sellingMaterial": {
        "_id": "507f1f77bcf86cd799439016",
        "manufacturingCompanyId": "507f1f77bcf86cd799439011",
        "sourceLocation": "Ahmedabad, Gujarat",
        "cadence": "monthly",
        "state": "liquid",
        "data": {
          "purity": 99,
          "quantity": 20,
          "unit": "tonnes"
        },
        "embeddingId": "sellingMaterial:507f1f77bcf86cd799439016",
        "createdAt": "2024-09-12T10:35:00.000Z",
        "updatedAt": "2024-09-12T10:35:00.000Z",
        "chemical": {
          "_id": "507f1f77bcf86cd799439014",
          "name": "Hydrochloric Acid",
          "formula": "HCl",
          "casNumber": "7647-01-0"
        },
        "company": {
          "_id": "507f1f77bcf86cd799439011",
          "name": "ABC Chemicals Inc.",
          "location": "Ahmedabad, Gujarat",
          "address": "123 Industrial Area, Phase 1",
          "contactNum": "9876543210",
          "email": "company@example.com"
        }
      }
    },
    {
      "score": 0.89,
      "sellingMaterial": {
        "_id": "507f1f77bcf86cd799439017",
        "manufacturingCompanyId": "507f1f77bcf86cd799439012",
        "sourceLocation": "Mumbai, Maharashtra",
        "cadence": "monthly",
        "state": "liquid",
        "data": {
          "purity": 98.5,
          "quantity": 50,
          "unit": "tonnes"
        },
        "embeddingId": "sellingMaterial:507f1f77bcf86cd799439017",
        "createdAt": "2024-09-12T10:40:00.000Z",
        "updatedAt": "2024-09-12T10:40:00.000Z",
        "chemical": {
          "_id": "507f1f77bcf86cd799439014",
          "name": "Hydrochloric Acid",
          "formula": "HCl",
          "casNumber": "7647-01-0"
        },
        "company": {
          "_id": "507f1f77bcf86cd799439012",
          "name": "XYZ Pharmaceuticals Ltd.",
          "location": "Mumbai, Maharashtra",
          "address": "456 Business Park, Tower B",
          "contactNum": "9123456789",
          "email": "sales@xyzpharma.com"
        }
      }
    }
  ]
}
```

#### Response Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `query` | String | The original search query |
| `casNumber` | String | Extracted CAS number (from LLM) |
| `topK` | Number | Number of results requested |
| `results` | Array | Array of matching SellingMaterials |
| `results[].score` | Number | Pinecone similarity score (0-1, higher is better) |
| `results[].sellingMaterial` | Object | Full SellingMaterial document with company details |
| `results[].sellingMaterial._id` | String | MongoDB ObjectId of the SellingMaterial |
| `results[].sellingMaterial.manufacturingCompanyId` | String | MongoDB ObjectId of the ManufacturingCompany |
| `results[].sellingMaterial.sourceLocation` | String | Where the chemical is sourced from |
| `results[].sellingMaterial.cadence` | String | Supply frequency (e.g., "monthly") |
| `results[].sellingMaterial.state` | String | Physical state of the chemical ("solid", "liquid", "gas") |
| `results[].sellingMaterial.data` | Object | Flexible attributes (purity, quantity, etc.) |
| `results[].sellingMaterial.embeddingId` | String | Vector ID in Pinecone |
| `results[].sellingMaterial.createdAt` | String | ISO timestamp of creation |
| `results[].sellingMaterial.updatedAt` | String | ISO timestamp of last update |
| `results[].sellingMaterial.chemical` | Object | Populated Chemical reference (name, formula, CAS) |
| `results[].sellingMaterial.chemical._id` | String | MongoDB ObjectId of the Chemical |
| `results[].sellingMaterial.chemical.name` | String | Chemical name |
| `results[].sellingMaterial.chemical.formula` | String | Chemical formula |
| `results[].sellingMaterial.chemical.casNumber` | String | CAS Registry Number |
| `results[].sellingMaterial.company` | Object | Full ManufacturingCompany details (flattened) |
| `results[].sellingMaterial.company._id` | String | MongoDB ObjectId of the ManufacturingCompany |
| `results[].sellingMaterial.company.name` | String | Company name |
| `results[].sellingMaterial.company.location` | String | City/Region where company is located |
| `results[].sellingMaterial.company.address` | String | Physical address of the company |
| `results[].sellingMaterial.company.contactNum` | String | Company phone number |
| `results[].sellingMaterial.company.email` | String | Company email address |

### Empty Results Response

When no seller listings match the CAS number:

**Status Code:** `200 OK`

```json
{
  "query": "I need sulfuric acid CAS 7664-93-9",
  "casNumber": "7664-93-9",
  "topK": 10,
  "results": []
}
```

### Error Responses

#### Missing Query

**Status Code:** `400 Bad Request`

```json
{
  "message": "Search query is required"
}
```

**Triggers when:**
- `query` field is missing
- `query` is empty or contains only whitespace

#### CAS Not Extracted

**Status Code:** `400 Bad Request`

```json
{
  "message": "Please provide the CAS number of the chemical you want to search for."
}
```

**Triggers when:**
- LLM cannot extract a CAS number from the query
- The query does not contain a recognizable CAS number

#### Invalid topK

**Status Code:** `400 Bad Request`

```json
{
  "message": "topK must be a positive integer"
}
```

**Triggers when:**
- `topK` is not an integer
- `topK` is less than 1

#### Chemical Not Found

**Status Code:** `404 Not Found`

```json
{
  "message": "No chemical with this CAS number exists in the marketplace."
}
```

**Triggers when:**
- Extracted CAS number does not match any Chemical in MongoDB
- No seller listings are available for this chemical

#### LLM Error

**Status Code:** `500 Internal Server Error`

```json
{
  "message": "Unable to process the search query."
}
```

**Triggers when:**
- Ollama Cloud API call fails
- LLM response is invalid/malformed
- CAS extraction logic fails

#### Embedding Error

**Status Code:** `500 Internal Server Error`

```json
{
  "message": "Unable to process the search query."
}
```

**Triggers when:**
- Local Ollama embedding generation fails
- Embedding dimension is invalid

#### Pinecone Error

**Status Code:** `500 Internal Server Error`

```json
{
  "message": "Unable to search seller listings."
}
```

**Triggers when:**
- Pinecone vector search fails
- Pinecone is not ready or configured

### Search Pipeline

```
1. Validate query (required, non-empty)
   ├─ If invalid: Return 400 Bad Request
   └─ If valid: Continue

2. Validate topK (if provided)
   ├─ If invalid: Return 400 Bad Request
   ├─ If > 50: Clamp to 50
   └─ If valid: Continue

3. Extract CAS number using LLM (gpt-oss:120b-cloud)
   ├─ If LLM fails: Return 500 Internal Server Error
   ├─ If CAS not found: Return 400 Bad Request
   └─ If CAS found: Continue

4. Normalize CAS number (trim whitespace)
   ↓

5. Verify Chemical exists in MongoDB
   ├─ If not found: Return 404 Not Found
   └─ If found: Continue

6. Generate embedding using embeddinggemma:latest
   ├─ If fails: Return 500 Internal Server Error
   └─ If succeeds: Continue

7. Search Pinecone with CAS metadata filter
   ├─ Vector: Generated query embedding
   ├─ Filter: casNumber = extracted CAS (hard filter)
   ├─ topK: Requested or default
   ├─ If fails: Return 500 Internal Server Error
   └─ If succeeds: Get matches with scores

8. For each Pinecone match:
   ├─ Extract sellingMaterialId from metadata
   ├─ Fetch from MongoDB
   ├─ Populate Chemical reference
   ├─ If stale/not found: Skip (log warning)
   └─ If valid: Add to results (preserving score order)

9. Return 200 OK with results (Pinecone order preserved)
```

### Important Notes

1. **CAS is Hard Filter:** Only sellers with matching CAS number appear in results. Different chemicals are never shown regardless of semantic similarity.

2. **LLM Extracts CAS:** The query must contain a CAS number. Chemical-name-only searches are rejected for this first iteration.

3. **Semantic Ranking:** Results are ranked by Pinecone similarity (cosine distance) of embeddings. The full buyer query is embedded, not just the CAS number.

4. **No Hardcoded Filters:** Only CAS number is filtered. Location, purity, quantity, and other attributes are not hard-filtered (future enhancement).

5. **Stale Vector Handling:** If Pinecone returns a vector for a deleted SellingMaterial, that result is skipped and logged. The search continues successfully with valid results.

6. **MongoDB Source of Truth:** Pinecone provides ranking. MongoDB provides authoritative seller data returned to the buyer.

7. **topK Clamping:** If client requests more than 50 results, the request is either rejected or the value is clamped to 50 on the server.

---

## Personalized Feed

Get a personalized marketplace feed based on the authenticated company's buying and selling interests.

The feed automatically recommends SellingMaterial listings that are relevant to the company's existing interests without requiring manual preference configuration.

### Endpoint

```http
GET /api/feed?page=1&limit=20
```

### Authentication

**Required:** Yes (JWT Bearer Token)

```http
Authorization: Bearer <JWT_TOKEN>
```

The JWT token is obtained from the [Login](#login) endpoint and contains:
- `accountId` — Company account ID
- `manufacturingCompanyId` — Used to derive company interests and exclude own listings

### Request Headers

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Query Parameters

| Parameter | Type | Default | Constraints |
|-----------|------|---------|------------|
| `page` | Number | 1 | Must be >= 1, integer |
| `limit` | Number | 20 | Must be 1-50, integer |

### Request Example

```bash
curl -X GET "http://localhost:5000/api/feed?page=1&limit=20" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Success Response

**Status Code:** `200 OK`

```json
{
  "page": 1,
  "limit": 20,
  "hasMore": true,
  "results": [
    {
      "score": 0.87,
      "relevanceScore": 0.91,
      "freshnessScore": 0.71,
      "sellingMaterial": {
        "_id": "507f1f77bcf86cd799439016",
        "manufacturingCompanyId": "507f1f77bcf86cd799439011",
        "sourceLocation": "Ahmedabad, Gujarat",
        "cadence": "monthly",
        "state": "liquid",
        "data": {
          "purity": 99,
          "quantity": 20,
          "unit": "tonnes"
        },
        "embeddingId": "sellingMaterial:507f1f77bcf86cd799439016",
        "createdAt": "2024-09-12T10:35:00.000Z",
        "updatedAt": "2024-09-12T10:35:00.000Z",
        "chemical": {
          "_id": "507f1f77bcf86cd799439014",
          "name": "Hydrochloric Acid",
          "formula": "HCl",
          "casNumber": "7647-01-0"
        }
      },
      "company": {
        "_id": "507f1f77bcf86cd799439011",
        "name": "ABC Chemicals Inc.",
        "location": "Ahmedabad, Gujarat",
        "address": "123 Industrial Area, Phase 1",
        "contactNum": "9876543210",
        "email": "company@example.com",
        "createdAt": "2024-09-12T08:00:00.000Z",
        "updatedAt": "2024-09-12T08:00:00.000Z",
        "accountCreatedAt": "2024-09-12T08:00:00.000Z",
        "accountUpdatedAt": "2024-09-12T08:00:00.000Z"
      }
    }
  ]
}
```

#### Response Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `page` | Number | Current page number (1-indexed) |
| `limit` | Number | Number of results per page |
| `hasMore` | Boolean | `true` if there are more results on next page |
| `results` | Array | Array of feed items for this page |
| `results[].score` | Number | Combined relevance and freshness score (0-1) |
| `results[].relevanceScore` | Number | Similarity score to company interests (0-1) |
| `results[].freshnessScore` | Number | Freshness decay score based on listing age (0-1) |
| `results[].sellingMaterial` | Object | Full SellingMaterial listing with chemical details |
| `results[].company` | Object | Complete seller company information (all fields except password hash) |
| `results[].company._id` | String | MongoDB ObjectId of the seller company |
| `results[].company.name` | String | Company name |
| `results[].company.location` | String | City/Region where company is located |
| `results[].company.address` | String | Physical address of the seller company |
| `results[].company.contactNum` | String | Company phone number |
| `results[].company.email` | String | Company email address |
| `results[].company.createdAt` | String | ISO timestamp when company was created |
| `results[].company.updatedAt` | String | ISO timestamp of last company update |
| `results[].company.accountCreatedAt` | String | ISO timestamp when company account was created |
| `results[].company.accountUpdatedAt` | String | ISO timestamp of last account update |

### How the Feed Works

#### 1. Interest Derivation

The feed extracts company interests from:

- All **BuyingMaterials** the company is requesting
- All **SellingMaterials** the company is offering

Example:

```
Company A interests:
  Buying: Hydrochloric Acid, Acetone
  Selling: Methanol
  Total: 3 interests
```

#### 2. Interest Representations

Each interest is converted to a text representation containing:

- Chemical name, formula, CAS number
- Location (required location for buying, source for selling)
- Physical state, cadence (for selling materials)
- All flexible data fields

#### 3. Embedding Generation

Each interest representation is embedded using the Ollama `embeddinggemma:300m` model, creating a vector representation of the company's interests.

#### 4. Pinecone Search

Each interest embedding is used to search Pinecone for similar SellingMaterial listings (top 20 per interest).

Results from all interests are combined and deduplicated.

#### 5. Scoring

**Relevance Score:**
- Highest Pinecone similarity score across all matching interests
- Range: 0-1

**Freshness Score:**
- Exponential decay based on listing age
- `freshnessScore = exp(-ageInDays / 30)`
- Range: 0-1

**Final Score:**
- `finalScore = 0.8 × relevanceScore + 0.2 × freshnessScore`
- Emphasizes relevance while allowing freshness to influence ranking
- Sorted descending

#### 6. Exclusions

- Company's own SellingMaterial listings are excluded
- Only shows opportunities from other sellers

### Special Cases

#### New Company (No Interests)

If the authenticated company has no BuyingMaterials or SellingMaterials yet:

```json
{
  "page": 1,
  "limit": 20,
  "hasMore": true,
  "results": [
    {
      "score": 0.45,
      "relevanceScore": 0,
      "freshnessScore": 0.45,
      "sellingMaterial": { ... }
    }
  ]
}
```

The feed returns the newest SellingMaterials from the marketplace sorted by creation date, giving new companies immediate value.

#### No Matching Results

If the company has interests but no matching results are found:

```json
{
  "page": 1,
  "limit": 20,
  "hasMore": false,
  "results": []
}
```

This is a valid response (HTTP 200), not an error.

### Error Responses

#### Missing Authentication

**Status Code:** `401 Unauthorized`

```json
{
  "message": "Authorization header is required"
}
```

**Triggers when:**
- `Authorization` header is missing
- No Bearer token is provided

#### Invalid Token

**Status Code:** `401 Unauthorized`

```json
{
  "message": "Invalid or expired token"
}
```

**Triggers when:**
- JWT token is malformed
- JWT token has expired
- JWT token signature is invalid

#### Invalid Pagination

**Status Code:** `400 Bad Request`

```json
{
  "message": "Invalid pagination. page must be >= 1, limit must be between 1 and 50"
}
```

**Triggers when:**
- `page` is not a positive integer
- `limit` is not an integer between 1 and 50

#### Feed Generation Error

**Status Code:** `500 Internal Server Error`

```json
{
  "message": "Unable to generate feed recommendations."
}
```

**Triggers when:**
- Embedding generation fails (Ollama issue)
- Pinecone search fails (connectivity issue)
- MongoDB fetch fails (database issue)

### Important Notes

1. **Dynamic Interests:** The feed derives interests from current BuyingMaterial and SellingMaterial records. No separate interest configuration needed.

2. **Real-time:** The feed is generated on-demand each time it's requested. Interest changes (new buy/sell requests) are reflected immediately.

3. **Performance:** Interest embeddings are generated on-request (not cached). Subsequent requests generate fresh embeddings to capture changes.

4. **No Own Listings:** A company will never see its own SellingMaterials in the feed, even if they match the company's other interests.

5. **Pagination:** Results are paginated after ranking and deduplication. The full candidate pool is scored before pagination to ensure quality results.

6. **Score Interpretation:**
   - `relevanceScore` = How similar to company interests (0-1)
   - `freshnessScore` = How recent the listing is (0-1)
   - `score` (final) = Combined metric for ranking (0-1)

7. **Freshness Decay:** Listings decay in freshness over time. A 30-day-old listing has a freshness score of ~0.37. Adjust via `FEED_FRESHNESS_DECAY_DAYS` environment variable.

---

## Logistics Company Registration

Register a new logistics company on the marketplace.

### Endpoint

```http
POST /api/logistics-companies/register
```

### Request Headers

```http
Content-Type: application/json
```

### Request Body

```json
{
  "name": "Express Logistics Ltd.",
  "location": "Ahmedabad, Gujarat",
  "address": "456 Logistics Park, Phase 2",
  "contactNum": "9988776655",
  "email": "admin@expresslogistics.com",
  "password": "securePassword123"
}
```

#### Field Descriptions

| Field | Type | Description | Constraints |
|-------|------|-------------|------------|
| `name` | String | Logistics company name | Required, will be trimmed |
| `location` | String | City/Region where company is located | Required, will be trimmed |
| `address` | String | Physical address of company | Required, will be trimmed |
| `contactNum` | String | Contact phone number | Required, stored as string |
| `email` | String | Company email for login | Required, will be normalized (trimmed + lowercased), must be unique |
| `password` | String | Login password (plaintext) | Required, will be hashed with bcrypt before storage |

### Success Response

**Status Code:** `201 Created`

```json
{
  "message": "Logistics company registered successfully",
  "logisticsCompanyId": "507f1f77bcf86cd799439031"
}
```

### Error Responses

#### Missing Fields

**Status Code:** `400 Bad Request`

```json
{
  "message": "All fields are required: name, location, address, contactNum, email, password"
}
```

#### Duplicate Email

**Status Code:** `409 Conflict`

```json
{
  "message": "An account with this email already exists"
}
```

#### Server Error

**Status Code:** `500 Internal Server Error`

```json
{
  "message": "An error occurred during registration. Please try again later."
}
```

---

## Logistics Company Login

Authenticate a logistics company and receive a JWT token.

### Endpoint

```http
POST /api/logistics-auth/login
```

### Request Headers

```http
Content-Type: application/json
```

### Request Body

```json
{
  "email": "admin@expresslogistics.com",
  "password": "securePassword123"
}
```

### Success Response

**Status Code:** `200 OK`

```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "logisticsCompanyId": "507f1f77bcf86cd799439031"
}
```

### Error Responses

#### Missing Fields

**Status Code:** `400 Bad Request`

```json
{
  "message": "Email and password are required"
}
```

#### Invalid Credentials

**Status Code:** `401 Unauthorized`

```json
{
  "message": "Invalid email or password"
}
```

#### Server Error

**Status Code:** `500 Internal Server Error`

```json
{
  "message": "An error occurred during login. Please try again later."
}
```

---

## Logistics Company Profile

Get the authenticated logistics company's profile information.

### Endpoint

```http
GET /api/logistics-companies/me
```

### Authentication

**Required:** Yes (JWT Bearer Token)

```http
Authorization: Bearer <JWT_TOKEN>
```

### Request Headers

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Request Example

```bash
curl -X GET http://localhost:5000/api/logistics-companies/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Success Response

**Status Code:** `200 OK`

```json
{
  "_id": "507f1f77bcf86cd799439031",
  "name": "Express Logistics Ltd.",
  "location": "Ahmedabad, Gujarat",
  "address": "456 Logistics Park, Phase 2",
  "contactNum": "9988776655",
  "email": "admin@expresslogistics.com",
  "createdAt": "2024-09-13T10:00:00.000Z",
  "updatedAt": "2024-09-13T10:00:00.000Z"
}
```

### Error Responses

#### Missing Authentication

**Status Code:** `401 Unauthorized`

```json
{
  "message": "Authorization header is required"
}
```

#### Invalid Token

**Status Code:** `401 Unauthorized`

```json
{
  "message": "Invalid or expired token"
}
```

#### Company Not Found

**Status Code:** `404 Not Found`

```json
{
  "message": "Logistics company not found"
}
```

---

## Add Serviceable Pincodes

Add one or multiple serviceable pincodes for the authenticated logistics company. Supports bulk addition with automatic deduplication.

### Endpoint

```http
POST /api/logistics/serviceability/pincodes
```

### Authentication

**Required:** Yes (JWT Bearer Token)

```http
Authorization: Bearer <JWT_TOKEN>
```

### Request Headers

```http
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
```

### Request Body

```json
{
  "pincodes": [
    "380001",
    "380002",
    "380003",
    "380004"
  ]
}
```

#### Field Descriptions

| Field | Type | Description | Constraints |
|-------|------|-------------|------------|
| `pincodes` | Array | Array of pincode strings | Required, must be non-empty array |
| `pincodes[]` | String | Individual pincode | Must be exactly 6 digits, duplicates are handled automatically |

### Request Example

```bash
curl -X POST http://localhost:5000/api/logistics/serviceability/pincodes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "pincodes": [
      "380001",
      "380002",
      "380003"
    ]
  }'
```

### Success Response

**Status Code:** `201 Created`

```json
{
  "message": "Serviceable pincodes added successfully",
  "added": 3,
  "duplicates": 0,
  "totalProcessed": 3
}
```

#### Response Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `message` | String | Success message |
| `added` | Number | Number of new pincodes added |
| `duplicates` | Number | Number of pincodes that already exist |
| `totalProcessed` | Number | Total pincodes provided in request |

### Error Responses

#### Invalid Pincodes

**Status Code:** `400 Bad Request`

```json
{
  "message": "Invalid pincodes: 38000, abc123. Pincodes must be exactly 6 digits."
}
```

#### Empty Array

**Status Code:** `400 Bad Request`

```json
{
  "message": "pincodes array cannot be empty"
}
```

#### Invalid Request Format

**Status Code:** `400 Bad Request`

```json
{
  "message": "pincodes must be an array"
}
```

#### Company Not Found

**Status Code:** `404 Not Found`

```json
{
  "message": "Logistics company not found"
}
```

#### Missing Authentication

**Status Code:** `401 Unauthorized`

```json
{
  "message": "Authorization header is required"
}
```

---

## Get Serviceable Pincodes

Retrieve all serviceable pincodes for the authenticated logistics company with pagination support.

### Endpoint

```http
GET /api/logistics/serviceability/pincodes?page=1&limit=100
```

### Authentication

**Required:** Yes (JWT Bearer Token)

```http
Authorization: Bearer <JWT_TOKEN>
```

### Query Parameters

| Parameter | Type | Default | Constraints |
|-----------|------|---------|------------|
| `page` | Number | 1 | Must be >= 1, integer |
| `limit` | Number | 100 | Must be 1-500, integer |

### Request Example

```bash
curl -X GET "http://localhost:5000/api/logistics/serviceability/pincodes?page=1&limit=50" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Success Response

**Status Code:** `200 OK`

```json
{
  "page": 1,
  "limit": 50,
  "total": 150,
  "hasMore": true,
  "pincodes": [
    {
      "pincode": "380001",
      "addedAt": "2024-09-13T10:30:00.000Z"
    },
    {
      "pincode": "380002",
      "addedAt": "2024-09-13T10:30:00.000Z"
    }
  ]
}
```

#### Response Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `page` | Number | Current page number (1-indexed) |
| `limit` | Number | Number of results per page |
| `total` | Number | Total pincodes for this company |
| `hasMore` | Boolean | `true` if there are more results on next page |
| `pincodes` | Array | Array of pincode objects for this page |
| `pincodes[].pincode` | String | The 6-digit pincode |
| `pincodes[].addedAt` | String | ISO timestamp when pincode was added |

### Error Responses

#### Invalid Pagination

**Status Code:** `400 Bad Request`

```json
{
  "message": "Invalid pagination parameters. page and limit must be positive integers."
}
```

#### Limit Too High

**Status Code:** `400 Bad Request`

```json
{
  "message": "limit must be <= 500"
}
```

#### Company Not Found

**Status Code:** `404 Not Found`

```json
{
  "message": "Logistics company not found"
}
```

---

## Remove Serviceable Pincode

Remove a single serviceable pincode from the authenticated logistics company.

### Endpoint

```http
DELETE /api/logistics/serviceability/pincodes/:pincode
```

### Authentication

**Required:** Yes (JWT Bearer Token)

```http
Authorization: Bearer <JWT_TOKEN>
```

### URL Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `pincode` | String | The 6-digit pincode to remove |

### Request Example

```bash
curl -X DELETE http://localhost:5000/api/logistics/serviceability/pincodes/380001 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Success Response

**Status Code:** `200 OK`

```json
{
  "message": "Pincode removed successfully",
  "pincode": "380001"
}
```

### Error Responses

#### Invalid Pincode Format

**Status Code:** `400 Bad Request`

```json
{
  "message": "Invalid pincode format. Pincode must be exactly 6 digits."
}
```

#### Pincode Not Found

**Status Code:** `404 Not Found`

```json
{
  "message": "Pincode not found for this company"
}
```

#### Company Not Found

**Status Code:** `404 Not Found`

```json
{
  "message": "Logistics company not found"
}
```

---

## Lookup Logistics Companies

Public endpoint to find logistics companies that service a specific pincode. No authentication required.

### Endpoint

```http
GET /api/logistics/serviceability/lookup?pincode=380001
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pincode` | String | Yes | The 6-digit pincode to look up |

### Request Example

```bash
curl -X GET "http://localhost:5000/api/logistics/serviceability/lookup?pincode=380001"
```

### Success Response

**Status Code:** `200 OK`

```json
{
  "pincode": "380001",
  "availableLogisticsCompanies": [
    {
      "_id": "507f1f77bcf86cd799439031",
      "name": "Express Logistics Ltd.",
      "location": "Ahmedabad, Gujarat",
      "address": "456 Logistics Park, Phase 2",
      "contactNum": "9988776655"
    },
    {
      "_id": "507f1f77bcf86cd799439032",
      "name": "Swift Delivery Services",
      "location": "Ahmedabad, Gujarat",
      "address": "789 Business Hub, Suite 5",
      "contactNum": "9876543210"
    }
  ]
}
```

#### Response Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `pincode` | String | The requested pincode |
| `availableLogisticsCompanies` | Array | List of logistics companies servicing this pincode |
| `availableLogisticsCompanies[].\_id` | String | MongoDB ObjectId of the logistics company |
| `availableLogisticsCompanies[].name` | String | Company name |
| `availableLogisticsCompanies[].location` | String | City/Region where company is located |
| `availableLogisticsCompanies[].address` | String | Physical address |
| `availableLogisticsCompanies[].contactNum` | String | Contact phone number |

### Empty Results Response

When no logistics companies service the requested pincode:

```json
{
  "pincode": "999999",
  "availableLogisticsCompanies": []
}
```

### Error Responses

#### Missing Pincode

**Status Code:** `400 Bad Request`

```json
{
  "message": "Invalid pincode. Pincode must be exactly 6 digits."
}
```

#### Invalid Pincode Format

**Status Code:** `400 Bad Request`

```json
{
  "message": "Invalid pincode. Pincode must be exactly 6 digits."
}
```

### Important Notes

1. **Public Endpoint:** No authentication required. Buyers can look up logistics availability without login.

2. **No Private Data Exposed:** Only basic company information is returned. Account credentials and internal details are never exposed.

3. **Efficient Lookup:** Pincode index ensures fast queries even with thousands of pincodes across many companies.

4. **Empty Results OK:** Returns 200 OK even if no companies service the pincode. This is not an error state.

---

## Error Responses

### Error Response Format

All error responses follow this format:

```json
{
  "message": "Error description"
}
```

### Common Error Status Codes

| Status Code | Meaning | Use Case |
|------------|---------|----------|
| `400` | Bad Request | Missing or invalid fields in request |
| `401` | Unauthorized | Authentication failed (invalid credentials) |
| `409` | Conflict | Resource already exists (duplicate email) |
| `500` | Internal Server Error | Server-side error during processing |

### Error Handling Strategy

1. **Client receives generic error message** — Safe, doesn't expose implementation details
2. **Detailed error logged in `logs/error.log`** — Useful for debugging
3. **No stack traces in responses** — Prevents information leakage
4. **No sensitive data exposed** — Passwords, hashes, tokens never in error messages

---

## Status Codes

### Success Status Codes

| Code | Endpoint | Meaning |
|------|----------|---------|
| `200` | Login | Authentication successful, token returned |
| `200` | Company Profile | Profile retrieved successfully |
| `200` | Check Listings | Listings check completed (true or false) |
| `200` | Search Selling Materials | Search completed (results may be empty) |
| `200` | Personalized Feed | Feed retrieved successfully (may be empty) |
| `200` | Delete Selling Material | Selling material deleted successfully |
| `200` | Delete Buying Material | Buying material deleted successfully |
| `200` | Logistics Company Login | Authentication successful, token returned |
| `200` | Logistics Company Profile | Profile retrieved successfully |
| `200` | Get Serviceable Pincodes | Pincodes retrieved successfully |
| `200` | Remove Serviceable Pincode | Pincode removed successfully |
| `200` | Lookup Logistics Companies | Lookup completed (results may be empty) |
| `201` | Registration | Company registered successfully |
| `201` | Create Selling Material | Selling material created successfully |
| `201` | Create Buying Material | Buying material created successfully |
| `201` | Logistics Company Registration | Logistics company registered successfully |
| `201` | Add Serviceable Pincodes | Pincodes added successfully |

### Client Error Status Codes

| Code | Endpoint | Meaning |
|------|----------|---------|
| `400` | Registration, Login, Create Selling Material, Create Buying Material, Search, Delete Selling Material, Delete Buying Material, Personalized Feed, Add/Remove Serviceable Pincodes, Get Serviceable Pincodes | Required fields missing or invalid (or invalid pagination/pincode format) |
| `401` | Login | Invalid email or password |
| `401` | Logistics Company Login | Invalid email or password |
| `401` | Create Selling Material, Create Buying Material, Delete Selling Material, Delete Buying Material, Company Profile, Check Listings, Personalized Feed, Add/Remove/Get Serviceable Pincodes | Missing or invalid JWT token |
| `404` | Search Selling Materials | Chemical with CAS number not found in marketplace |
| `404` | Delete Selling Material | Selling material not found or belongs to different company |
| `404` | Delete Buying Material | Buying material not found or belongs to different company |
| `404` | Company Profile | Company not found in database |
| `404` | Logistics Company Profile, Add/Remove/Get Serviceable Pincodes | Logistics company not found in database |
| `404` | Remove Serviceable Pincode | Pincode not found for this company |
| `409` | Registration | Email already registered |
| `409` | Logistics Company Registration | Email already registered |
| `409` | Create Buying Material | Buying material for this chemical already exists |

### Server Error Status Codes

| Code | Endpoint | Meaning |
|------|----------|---------|
| `500` | Registration, Login | Unexpected server error |
| `500` | Logistics Company Registration, Logistics Company Login | Unexpected server error |
| `500` | Delete Selling Material | Pinecone or MongoDB deletion failure |
| `500` | Delete Buying Material | MongoDB deletion failure |
| `500` | Personalized Feed | Embedding generation, Pinecone search, or MongoDB fetch failure |
| `500` | Add/Remove/Get Serviceable Pincodes, Lookup Logistics Companies | MongoDB operation or unexpected server error |
| `500` | Logistics Company Profile | Database or unexpected server error |

---

## Authentication

### Using JWT Token

For future authenticated endpoints, include the JWT token in the Authorization header:

```http
Authorization: Bearer <token>
```

Example:

```bash
curl -X GET http://localhost:5000/api/protected-endpoint \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Token Expiration

- **Default expiration:** 7 days (configurable via `JWT_EXPIRES_IN`)
- **When expired:** Token will be rejected with `401 Unauthorized`
- **Refresh:** Must log in again to get a new token

---

## Data Models

### ManufacturingCompany Document

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "ABC Chemicals Inc.",
  "location": "Ahmedabad, Gujarat",
  "address": "123 Industrial Area, Phase 1",
  "contactNum": "9876543210",
  "createdAt": "2024-09-12T07:30:00.000Z",
  "updatedAt": "2024-09-12T07:30:00.000Z"
}
```

### CompanyAccount Document

```json
{
  "_id": "507f1f77bcf86cd799439012",
  "email": "company@example.com",
  "passwordHash": "$2b$10$abcdefghijklmnopqrstuvwxyz...",
  "manufacturingCompanyId": "507f1f77bcf86cd799439011",
  "createdAt": "2024-09-12T07:30:00.000Z",
  "updatedAt": "2024-09-12T07:30:00.000Z"
}
```

**Note:** 
- `passwordHash` is bcrypt hashed and **never returned in API responses**
- `manufacturingCompanyId` creates a one-to-one relationship with ManufacturingCompany
- Both models have automatic timestamps

---

## Constraints & Validation

### Registration Constraints

| Field | Constraint | Notes |
|-------|----------|-------|
| `name` | Required, String | Trimmed before storage, NOT globally unique |
| `location` | Required, String | Trimmed before storage |
| `address` | Required, String | Trimmed before storage |
| `contactNum` | Required, String | Stored as string, not number |
| `email` | Required, String, Unique | Normalized (trim + lowercase), unique across all accounts |
| `password` | Required, String | Min recommended: 8 characters, will be bcrypt hashed |

### Login Constraints

| Field | Constraint | Notes |
|-------|----------|-------|
| `email` | Required, String | Will be normalized (trim + lowercase) for lookup |
| `password` | Required, String | Must match original plaintext that was hashed during registration |

---

## Example Workflows

### Complete Registration & Login Workflow

#### Step 1: Register Company

```bash
curl -X POST http://localhost:5000/api/manufacturing-companies/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Chemical Corp",
    "location": "Mumbai, Maharashtra",
    "address": "456 Business Park",
    "contactNum": "8765432109",
    "email": "admin@chemcorp.com",
    "password": "SecurePass123!"
  }'
```

**Response:**
```json
{
  "message": "Company registered successfully",
  "companyId": "507f1f77bcf86cd799439011"
}
```

#### Step 2: Login with Same Credentials

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@chemcorp.com",
    "password": "SecurePass123!"
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

#### Step 3: Use Token for Authenticated Requests

```bash
curl -X GET http://localhost:5000/api/protected-endpoint \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Rate Limiting

**Currently:** No rate limiting implemented (planned for future releases)

---

## Versioning

**Current API Version:** 1.0.0

API endpoints use `/api/` prefix. Future versions may use `/api/v2/` etc.

---

## Support

For issues or questions:

1. Check `logs/combined.log` for detailed request/response information
2. Check `logs/error.log` for error details
3. Verify `.env` configuration (MONGODB_URI, JWT_SECRET)
4. Ensure MongoDB is running and accessible

---

## Changelog

### Version 1.3.0 (Current)

- ✅ Natural-language search API (buyer-side)
- ✅ LLM CAS extraction (gpt-oss-120b via Ollama Cloud)
- ✅ Query embedding generation (embeddinggemma:300m)
- ✅ Pinecone vector search with CAS metadata filter
- ✅ MongoDB result retrieval and ranking preservation
- ✅ Stale vector handling (skip unmatched results)

### Version 1.2.0

- ✅ Create buying material request (authenticated)
- ✅ Duplicate prevention (one buying material per company/chemical)
- ✅ Database-level unique compound index
- ✅ Optional flexible data field
- ✅ CAS number resolution for buying materials

### Version 1.1.0

- ✅ Create selling material listing (authenticated)
- ✅ Seller embedding generation and Pinecone indexing
- ✅ CAS number resolution (existing vs. new chemicals)
- ✅ JWT authentication middleware
- ✅ Race condition handling for concurrent CAS creation
- ✅ Flexible data field for chemical-specific attributes

### Version 1.0.0

- ✅ Manufacturing company registration
- ✅ Company login with JWT
- ✅ Health check endpoint
- ✅ Winston logging
- ✅ Error handling

---

*Last Updated: September 12, 2024*
