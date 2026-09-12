# Implementation Summary: Registration, Login, JWT, and Logging

## Files Created/Modified

### Core Application Files
- ✅ `src/server.js` - Server entry point with MongoDB connection
- ✅ `src/app.js` - Express application setup
- ✅ `package.json` - Project dependencies
- ✅ `.env.example` - Environment configuration template
- ✅ `.gitignore` - Git ignore rules (includes logs/)

### Configuration Files
- ✅ `src/config/db.js` - MongoDB connection configuration
- ✅ `src/config/logger.js` - Winston logger setup with file and console transports

### Middleware
- ✅ `src/middleware/httpLogger.js` - HTTP request logging middleware

### Controllers
- ✅ `src/controllers/manufacturingCompany.controller.js` - Registration logic
- ✅ `src/controllers/auth.controller.js` - Login and JWT logic

### Routes
- ✅ `src/routes/manufacturingCompany.routes.js` - Registration endpoint
- ✅ `src/routes/auth.routes.js` - Login endpoint

### Documentation
- ✅ `README.md` - Setup and usage instructions
- ✅ `IMPLEMENTATION.md` - This file

## Endpoints Implemented

### 1. Manufacturing Company Registration
**Endpoint:** `POST /api/manufacturing-companies/register`

**Request:**
```json
{
  "name": "ABC Chemicals",
  "location": "Ahmedabad, Gujarat",
  "address": "123 Industrial Area",
  "contactNum": "9876543210",
  "email": "company@example.com",
  "password": "somePassword"
}
```

**Response (201 Created):**
```json
{
  "message": "Company registered successfully",
  "companyId": "507f1f77bcf86cd799439011"
}
```

**Features:**
- ✅ Validates all required fields (400 Bad Request if missing)
- ✅ Normalizes email (trim + lowercase)
- ✅ Checks for duplicate email (409 Conflict if exists)
- ✅ Creates ManufacturingCompany with trimmed fields
- ✅ Hashes password using bcrypt (10 salt rounds)
- ✅ Creates CompanyAccount with normalized email and passwordHash
- ✅ Links account to company via manufacturingCompanyId
- ✅ Never returns password or passwordHash
- ✅ Logs registration events (attempt, success, duplicate, error)

### 2. Login
**Endpoint:** `POST /api/auth/login`

**Request:**
```json
{
  "email": "company@example.com",
  "password": "somePassword"
}
```

**Response (200 OK):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "companyId": "507f1f77bcf86cd799439011"
}
```

**Features:**
- ✅ Validates email and password are provided (400 Bad Request if missing)
- ✅ Normalizes email (trim + lowercase)
- ✅ Finds account by normalized email
- ✅ Compares supplied password with bcrypt hash
- ✅ Returns generic error for both email-not-found and wrong-password (401 Unauthorized)
- ✅ Creates JWT with payload: { accountId, manufacturingCompanyId }
- ✅ JWT expires in 7 days (configurable via JWT_EXPIRES_IN)
- ✅ Never returns password or passwordHash
- ✅ Logs login events (attempt, success, failure)

## Company/Account Relationship

```
CompanyAccount (email, passwordHash, manufacturingCompanyId)
        │
        │ manufacturingCompanyId (ObjectId, unique)
        ▼
ManufacturingCompany (name, location, address, contactNum)
```

**Relationship Type:** One-to-One

**Registration Flow:**
1. Create ManufacturingCompany with company details
2. Hash password using bcrypt
3. Create CompanyAccount with normalized email, passwordHash, and company ID

**Enforcement:**
- CompanyAccount.manufacturingCompanyId is unique (one account per company)
- CompanyAccount.email is unique (one email per account)
- No duplicate company information in CompanyAccount

## Password Hashing

**Implementation:** bcrypt with 10 salt rounds

**Flow:**
```
plaintext password
        ↓
bcrypt.hash(password, 10)
        ↓
passwordHash (stored in MongoDB)
        ↓
Never returned in API responses
```

**Verification:**
```
supplied password + stored hash
        ↓
bcrypt.compare(password, hash)
        ↓
boolean result (true/false)
```

## JWT Setup

**Configuration (via .env):**
```
JWT_SECRET=your_secret_key_here
JWT_EXPIRES_IN=7d
```

**Payload:**
```js
{
  accountId: "507f1f77bcf86cd799439012",
  manufacturingCompanyId: "507f1f77bcf86cd799439011",
  iat: 1234567890,
  exp: 1235000000
}
```

**Features:**
- ✅ Uses jsonwebtoken library
- ✅ Secret configured via environment variable (never hardcoded)
- ✅ Expiration time configurable (default 7 days)
- ✅ Payload contains only identifiers (no sensitive data)
- ✅ Can be used to verify subsequent API requests (future implementation)

## Winston Logging Setup

### Configuration
**File:** `src/config/logger.js`

### Log Levels
- ✅ error - Error events
- ✅ warn - Warning events
- ✅ info - Informational messages
- ✅ http - HTTP request logs
- ✅ debug - Debug information

### Log Files
**Location:** `logs/` (created automatically)

- ✅ `combined.log` - All logs (info, warn, error, http, debug)
- ✅ `error.log` - Only error-level logs

### Log File Management
- Max file size: 5MB
- Max files retained: 5 per log type
- Automatic rotation when size limit exceeded

### Console Output (Development)
- Colored output for readability
- Timestamp, level, message, and metadata
- Only enabled when NODE_ENV !== 'production'

### Metadata
Each log entry includes:
- timestamp (YYYY-MM-DD HH:mm:ss)
- level (error, warn, info, http, debug)
- message
- service: "recarbon-api"
- Custom metadata (error details, IDs, etc.)

## HTTP Logging Middleware

**File:** `src/middleware/httpLogger.js`

**Logged Information:**
- HTTP method (GET, POST, etc.)
- Request path
- Response status code
- Response time (milliseconds)

**Example Log:**
```
POST /api/auth/login 200 - 142ms
GET /api/health 200 - 5ms
POST /api/manufacturing-companies/register 400 - 87ms
```

**Log Levels by Status:**
- 5xx errors → logger.error()
- 4xx errors → logger.warn()
- Success (2xx, 3xx) → logger.http()

## Sensitive Data Handling

**Never Logged:**
- ✅ Plaintext passwords
- ✅ Password hashes
- ✅ JWT tokens
- ✅ Full request bodies (HTTP middleware excludes them)

**Safe Logging:**
- Email addresses (logged for audit trail)
- User IDs and company IDs (needed for debugging)
- Error messages (generic to client, detailed in logs)

## Error Handling

### Registration Errors

**400 Bad Request** - Missing required fields
```json
{
  "message": "All fields are required: name, location, address, contactNum, email, password"
}
```

**409 Conflict** - Duplicate email
```json
{
  "message": "An account with this email already exists"
}
```

**500 Internal Server Error** - Unexpected error
```json
{
  "message": "An error occurred during registration. Please try again later."
}
```

### Login Errors

**400 Bad Request** - Missing email or password
```json
{
  "message": "Email and password are required"
}
```

**401 Unauthorized** - Invalid credentials (generic)
```json
{
  "message": "Invalid email or password"
}
```

**500 Internal Server Error** - Unexpected error
```json
{
  "message": "An error occurred during login. Please try again later."
}
```

### Error Logging
- Actual error details logged with Winston
- Generic error returned to client
- Stack traces not exposed in production responses

## Validation

### Registration
- ✅ name - Required, trimmed by schema
- ✅ location - Required, trimmed by schema
- ✅ address - Required, trimmed by schema
- ✅ contactNum - Required
- ✅ email - Required, normalized (trim + lowercase)
- ✅ password - Required, not stored as plaintext

### Login
- ✅ email - Required, normalized (trim + lowercase)
- ✅ password - Required

## Status Codes

### Registration
- 201 Created - Successful registration
- 400 Bad Request - Missing/invalid input
- 409 Conflict - Duplicate email
- 500 Internal Server Error - Server error

### Login
- 200 OK - Successful login
- 400 Bad Request - Missing required fields
- 401 Unauthorized - Invalid credentials
- 500 Internal Server Error - Server error

## Dependencies

**Production Dependencies:**
- express ^4.18.2 - Web framework
- mongoose ^7.5.0 - MongoDB ODM
- bcrypt ^5.1.1 - Password hashing
- jsonwebtoken ^9.1.0 - JWT creation/verification
- dotenv ^16.3.1 - Environment variables
- winston ^3.11.0 - Logging

**Development Dependencies:**
- nodemon ^3.0.1 - Auto-reload during development

## Environment Variables (.env)

```
MONGODB_URI=mongodb://localhost:27017/recarbon
JWT_SECRET=your_super_secret_key_change_this_in_production
JWT_EXPIRES_IN=7d
NODE_ENV=development
PORT=5000
LOG_LEVEL=info
```

## Verification Checklist

✅ Project structure follows conventions  
✅ All imports and paths are correct  
✅ Express mounts both route files  
✅ MongoDB connection works  
✅ Registration creates both ManufacturingCompany and CompanyAccount  
✅ CompanyAccount.manufacturingCompanyId references the newly created company  
✅ CompanyAccount.manufacturingCompanyId is unique (one account per company)  
✅ Duplicate emails are rejected (409 Conflict)  
✅ Passwords are bcrypt hashed (10 rounds)  
✅ Login verifies passwords correctly using bcrypt.compare()  
✅ JWT contains only accountId and manufacturingCompanyId  
✅ Passwords/hashes/tokens never returned in responses  
✅ Passwords/hashes/tokens never logged  
✅ Winston logging works for all components  
✅ HTTP requests are logged with method, path, status, and duration  
✅ Log files created in logs/ directory (combined.log, error.log)  
✅ logs/ directory in .gitignore  
✅ Configuration via environment variables  
✅ Generic error messages returned to client  
✅ Detailed error information logged to files  

## Next Steps

Future implementations (out of scope for this task):
- JWT middleware for protecting routes
- Buying material endpoints
- Selling material endpoints
- Chemical endpoints
- Search and matching logic
- Vector DB integration
- Email verification
- Password reset
- Refresh tokens
- API documentation (Swagger/OpenAPI)
