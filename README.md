# Property Valuation

A Node.js and GraphQL-based property valuation query system that scrapes Australian real estate website data to retrieve property valuation information.

## Features

- **Address Search** - Support autocomplete and address selection
- **Property Valuation** - Retrieve property low price, high price, and confidence score
- **GraphQL API** - Provides GraphQL interface for querying property information
- **Request Queue** - Support concurrent request control (maximum 3 concurrent requests)
- **Session Management** - Session-based user data isolation

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
npx ts-node .\graphql\server.ts
```

The server runs on `http://localhost:4000` by default.

### 2. Send GraphQL Queries

#### Search Address

```graphql
query {
    symbol(code: "52 walker st") {
        code
        name
        currency
    }
}
```

#### Query Property Valuation

```graphql
query {
    references(symbol: "52 WALKER ST, TURRELLA, NSW 2205") {
        total
        info {
            cursor
            hasNext
        }
        nodes {
            symbol {
                code
                name
                currency
            }
            rate
            date
        }
    }
}
```

