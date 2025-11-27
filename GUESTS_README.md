# Birthday Pages - Guest Management

This project includes a guest management system using Cloudflare Workers KV storage.

## Features

- **KV Namespace**: Store guest list in Cloudflare KV storage
- **Worker Functions**: RESTful API endpoints for managing guests
- **Web Interface**: Interactive HTML page to view and add guests

## Setup

### 1. Create KV Namespace

Before deploying, create a KV namespace in your Cloudflare account:

```bash
wrangler kv:namespace create "BIRTHDAY_KV"
```

Update the `wrangler.jsonc` file with the actual namespace ID:

```jsonc
"kv_namespaces": [
    {
        "binding": "BIRTHDAY_KV",
        "id": "your-namespace-id-here",
        "preview_id": "your-preview-id-here"
    }
]
```

### 2. Development

Run the development server:

```bash
npm run dev
```

### 3. Deploy

Deploy to Cloudflare Workers:

```bash
npm run deploy
```

## API Endpoints

### GET /api/guests

Retrieve the list of guests.

**Response:**
```json
{
  "guests": ["Alice", "Bob", "Charlie"]
}
```

### POST /api/guests

Add one or more guests to the list.

**Add a single guest:**
```json
{
  "name": "John Doe"
}
```

**Add multiple guests:**
```json
{
  "names": ["John Doe", "Jane Smith", "Bob Johnson"]
}
```

**Response:**
```json
{
  "guests": ["Alice", "Bob", "Charlie", "John Doe", "Jane Smith", "Bob Johnson"]
}
```

**Notes:**
- Duplicate names are automatically filtered out
- Empty names are ignored
- Use either `name` (string) for single guest or `names` (array) for multiple guests

## Web Interface

Visit `/guests.html` to access the interactive guest management page where you can:
- View all guests
- Add multiple guests using dynamic input fields
  - Start typing in the first field
  - A new input field automatically appears when you fill the current one
  - Press Enter to move to the next field
  - Click "Add Guests" to submit all filled fields at once
- The list persists in KV storage
- Duplicate names are automatically prevented

## Implementation Details

The implementation uses:
- **Worker Functions**: 
  - `getGuests()`: Retrieves guest list from KV
  - `addGuest()`: Adds a single guest
  - `addMultipleGuests()`: Adds multiple guests efficiently in one operation
- **KV Storage**: Guests are stored as a JSON array under the key "guests"
- **Static Assets**: The HTML page is served from the `public` directory
- **API Routes**: The worker intercepts `/api/guests` requests and handles them before falling back to static assets
- **Duplicate Prevention**: Both single and bulk operations automatically filter out duplicates

## Data Structure

Guests are stored in KV as a JSON array of strings:

```json
["Guest 1", "Guest 2", "Guest 3"]
```

The key used is: `guests`
