# Trade Data Management System

A Next.js application with MongoDB backend for managing trade data with user authentication.

## Features

- User authentication (login/register)
- Public landing page
- Protected dashboard with product list
- Searchable data table with pagination
- Manual data entry form
- CSV data upload functionality
- **Grade extraction and normalization** - Automatically extracts polymer type and grade codes from Item Descriptions

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up MongoDB:**
   - Install MongoDB locally or use MongoDB Atlas
   - Update `MONGODB_URI` in `.env.local` if needed

3. **Set up environment variables:**
   - Copy `.env.local` and update the values:
     ```
     MONGODB_URI=mongodb://localhost:27017/trade-data
     NEXTAUTH_SECRET=your-secret-key-here
     NEXTAUTH_URL=http://localhost:3000
     ```

4. **Start MongoDB:**
   ```bash
   # On Windows with MongoDB installed
   mongod
   ```

5. **Run the development server:**
   ```bash
   npm run dev
   ```

6. **Access the application:**
   - Open [http://localhost:3000](http://localhost:3000)
   - Register a new account or use existing credentials

## Database Schema

The application uses a MongoDB collection `tradedatas` with the following fields:

### Original CSV Fields
- HS CODE, Item Description, Origin
- Importer Name, Importer ADDRESS
- Consignor Name, Consignor Address
- Agent Name, CASH DATE, IGM Date
- Curr, USA RATE, USA VAL, DECL CURR, DECL RATE, DECL VAL
- ASSESSED RATE, TOTAL PKR VALU ASSESSED
- Cash NO, Quantity, Unit, Agent NO
- PAID A STAX, PAID STAX, PAID DUTY
- Additional Customs Duty, INCOME TAX, Federal Excise Duty, AntiDumping Duty
- SRO-1, SRO-2, SRO-3, SRO-4, Regulatory Duty
- Gross Weight, Net Weight
- LC No, LC Date, BL Number, BL Date
- PORT, B/E TYPE, Machine No, GD Number, BE DATE
- Item No, IGM NO, INDEX NO, NTN
- Port of Shipment, Terminal/Sheds, Vessel Name, ShippingLines

### Extracted/Normlized Fields (for reliable grouping)
- `polymerType` - Extracted polymer type (LLDPE | LDPE | HDPE | MDPE | PP)
- `gradeCode` - Extracted grade code (e.g., "Q1018H")
- `normalizedGrade` - Combined normalized grade (e.g., "LLDPE Q1018H")
- `gradeExtractionConfidence` - Confidence level of extraction (high | medium | low)
- `parsedIGMDate` - Parsed IGM Date as proper Date object
- `parsedCashDate` - Parsed Cash Date as proper Date object

## Grade Extraction System

The system automatically extracts polymer type and grade codes from free-text Item Descriptions to enable reliable grouping and aggregation.

### How It Works

1. **Polymer Type Detection** - Detects LLDPE, LDPE, HDPE, MDPE, PP from text
2. **Grade Code Extraction** - Uses priority-based detection:
   - Explicit "GRADE:" labels (highest confidence)
   - Codes following quoted brand names (e.g., `"LOTRENE" Q1018H`)
   - Pattern matching for alphanumeric tokens
3. **Normalization** - Produces consistent `normalizedGrade` field for grouping

### Running Backfill on Existing Data

To populate grade fields on existing documents:

```bash
# Process all documents without normalizedGrade
npm run backfill-grades

# Reprocess all documents (force mode)
npm run backfill-grades -- --force

# Preview changes without making them
npm run backfill-grades -- --dry-run

# Limit processing (for testing)
npm run backfill-grades -- --limit=100
```

The script outputs:
- Summary statistics by confidence level
- `reports/low-confidence-grades-TIMESTAMP.json` - Records needing manual review

### Building the Grades Reference Collection

After running backfill, build the reference collection:

```bash
# Build grades collection from existing data
npm run build-grades-reference

# Preview without making changes
npm run build-grades-reference -- --dry-run
```

This creates the `grades` collection with:
- One document per unique `normalizedGrade`
- All description variants with occurrence counts
- Total records, quantity, and value aggregates
- First/last seen timestamps

### Manual Grade Overrides

When automatic extraction fails or produces incorrect results, you can add manual overrides:

#### Via MongoDB Shell

```javascript
db.gradeoverrides.insertOne({
  matchPattern: "LOTRENE Q1018H",
  matchType: "substring",
  normalizedGrade: "LLDPE Q1018H",
  note: "Brand name followed by grade code"
})
```

#### Via Application Code

```typescript
import { addGradeOverride } from '@/lib/resolveGrade';

await addGradeOverride(
  "specific description text",  // Pattern to match
  "substring",                   // or "regex"
  "LLDPE Q1018H",               // Corrected grade
  "Optional note explaining why"
);
```

#### Override Types

- **substring** - Matches if the pattern appears anywhere in the description (case-insensitive)
- **regex** - Uses full regex matching against the description

Override matching takes priority over automatic extraction and always produces `high` confidence results.

## API Endpoints

- `GET /api/products` - Get list of unique product names
- `GET /api/data` - Get trade data with search and pagination
- `POST /api/data` - Add new trade data record
- `POST /api/upload-csv` - Upload CSV data
- `POST /api/register` - Register new user
- `POST /api/auth/[...nextauth]` - NextAuth authentication

## Usage

1. **Landing Page:** Public page with link to login
2. **Authentication:** Register/login to access protected routes
3. **Dashboard:** View product list, access data management features
4. **Data View:** Search and browse trade data with pagination
5. **Add Data:** Manually enter new records
6. **Upload CSV:** Bulk upload data from CSV format
7. **Admin Panel:** Manage users and temp CSV data

## Technologies Used

- Next.js 16
- React 19
- MongoDB with Mongoose
- NextAuth.js for authentication
- Tailwind CSS for styling
- TypeScript
- PapaParse for CSV processing

## Scripts

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
npm run backfill-grades  # Backfill grade extraction fields
npm run build-grades-reference  # Build grades reference collection
npm run test             # Run tests
npm run test:watch       # Run tests in watch mode
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
