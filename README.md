# ReCarbon - B2B Chemical Marketplace

A Node.js + Express + MongoDB chemical marketplace backend for manufacturing companies to buy and sell chemicals.

## Project Structure

```
src/
├── models/              # Mongoose schemas
├── controllers/         # Business logic for routes
├── routes/             # Express route definitions
├── middleware/         # Express middleware
├── config/             # Configuration (DB, logger)
└── server.js           # Entry point

logs/                   # Application logs (auto-created)
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Update `.env` with your configuration:
```
MONGODB_URI=mongodb://localhost:27017/recarbon
JWT_SECRET=your_secret_key_here
JWT_EXPIRES_IN=7d
NODE_ENV=development
PORT=5000
LOG_LEVEL=info
```

## Running the Application

### Development (with auto-reload)
```bash
npm run dev
```

### Production
```bash
npm start
```

The server will start on `http://localhost:5000` (or the port in `.env`).

## API Endpoints

### Health Check
- **GET** `/api/health`

### Manufacturing Company Registration
- **POST** `/api/manufacturing-companies/register`

Request:
```json
{
  "name": "ABC Chemicals",
  "location": "Ahmedabad, Gujarat",
  "address": "123 Industrial Area",
  "contactNum": "9876543210",
  "email": "company@example.com",
  "password": "securePassword"
}
```

Response (201 Created):
```json
{
  "message": "Company registered successfully",
  "companyId": "..."
}
```

### Login
- **POST** `/api/auth/login`

Request:
```json
{
  "email": "company@example.com",
  "password": "securePassword"
}
```

Response (200 OK):
```json
{
  "message": "Login successful",
  "token": "...",
  "companyId": "..."
}
```

## Logging

All application logs are stored in `logs/`:
- `combined.log` - All application logs
- `error.log` - Error-level logs only

Logs are automatically created and rotated (max 5MB per file, 5 files retained).

## Authentication

The login endpoint returns a JWT token that should be used for authenticated requests in future endpoints.

JWT payload contains:
- `accountId` - CompanyAccount ID
- `manufacturingCompanyId` - ManufacturingCompany ID

## Models

### ManufacturingCompany
- name (required)
- location (required)
- address (required)
- contactNum (required)
- timestamps

### CompanyAccount
- email (required, unique)
- passwordHash (required)
- manufacturingCompanyId (required, unique, references ManufacturingCompany)
- timestamps

### Chemical
- name (required)
- formula (required)
- casNumber (required, unique)
- timestamps

### BuyingMaterial
- manufacturingCompanyId (required, references ManufacturingCompany)
- chemicalId (required, references Chemical)
- reqLocation (required)
- data (flexible object)
- timestamps

### SellingMaterial
- manufacturingCompanyId (required, references ManufacturingCompany)
- chemicalId (required, references Chemical)
- sourceLocation (required)
- cadence (enum: 'monthly')
- state (enum: 'solid', 'liquid', 'gas')
- data (flexible object)
- timestamps

## Notes

- Passwords are hashed using bcrypt and never stored in plaintext
- JWT tokens are valid for 7 days by default (configurable)
- Email addresses are normalized (trimmed and lowercased) before storage
- All sensitive information (passwords, hashes, tokens) is never returned in API responses
- The logs directory is gitignored to prevent committing generated logs
