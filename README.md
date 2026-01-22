# Property Valuation

A Node.js and GraphQL-based property valuation query system that scrapes Australian real estate website data to retrieve property valuation information.

## Features

- 🔍 **Address Search** - Support autocomplete and address selection
- 💰 **Property Valuation** - Retrieve property low price, high price, and confidence score
- 🌐 **GraphQL API** - Provides GraphQL interface for querying property information
- ⚙️ **Request Queue** - Support concurrent request control (maximum 3 concurrent requests)
- 🔐 **Session Management** - Session-based user data isolation

## Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Web Scraper**: Playwright
- **API**: Apollo GraphQL
- **Package Manager**: npm

## Project Structure

```
property valuation/
├── src/
│   └── property.ts           # Web scraper core logic
├── graphql/
│   ├── schema.ts             # GraphQL Schema definition
│   ├── resolvers.ts          # GraphQL Resolvers
│   └── queue.ts              # Request queue management
├── package.json
└── README.md
```

## Installation

```bash
npm install
```

## Usage

### 1. Start GraphQL Server

```bash
npm start
```

The server runs on `http://localhost:4000` by default.

### 2. Send GraphQL Queries

#### Search Address

```graphql
query {
  search(address: "302/14 THRUPP ST NEUTRAL BAY NSW 2089") {
    id
    address
  }
}
```

#### Query Property Valuation

```graphql
query {
  valuation(address: "302/14 THRUPP ST NEUTRAL BAY NSW 2089") {
    address
    low
    high
    confidence
  }
}
```

## API Documentation

### Query

#### `search(address: String!): [Address!]!`

Search for an address and return a list of matching candidate addresses.

**Parameters:**
- `address` (String): The address to search

**Returns:**
- `id` (String): Address ID
- `address` (String): Formatted address

#### `valuation(address: String!): Valuation`

Get property valuation information for a specified address.

**Parameters:**
- `address` (String): Property address

**Returns:**
- `address` (String): Property address
- `low` (String): Valuation lower bound
- `high` (String): Valuation upper bound
- `confidence` (String): Confidence score or error message

## Configuration

Edit the following parameters in `property.ts`:

```typescript
// Browser settings
const browser = await chromium.launch({ 
  headless: true  // true: hide window, false: show window
});

// Timeout settings
{ timeout: 8000 }  // unit: milliseconds
```

## Error Handling

When a property has no valuation information, the system returns:

```json
{
  "data": {
    "valuation": {
      "address": "302/14 THRUPP ST NEUTRAL BAY NSW 2089",
      "low": null,
      "high": null,
      "confidence": "No valuation available for the specified address"
    }
  }
}
```

## Limitations

- Maximum 3 concurrent requests supported
- Single request timeout: 15 seconds
- Australian addresses only

## Important Notes

- ⚠️ This project is for learning and research purposes only
- Please comply with the target website's `robots.txt` and terms of service
- Avoid frequent requests that may result in IP bans

## License

MIT