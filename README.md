# Trade Data Management System

A Next.js application with MongoDB backend for managing trade data with user authentication.

## Features

- User authentication (login/register)
- Public landing page
- Protected dashboard with product list
- Searchable data table with pagination
- Manual data entry form
- CSV data upload functionality

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

The application uses a single MongoDB collection `tradedatas` with the following fields:
- HS CODE, Product Name, Product Category, Item Description, Grade, Grade Category
- Origin, Origin2, Actual LC Date, LC Date, No. of Days - Shipment
- Importer Category, Actual Importer Name, Importer Name, Imp Group, Importer Address
- Agent Name, Actual Consignor Name, Consignor Name, Consignor Group, Consignor Group 12 Words
- Assessed Value, Assessed Unit, DCL Unit, DCL Val, Qty (Kg), Price/Kg, QTY (Mts), Price/Mt
- PT DUTY, PT STAX, PTSTAX, ITAXAT, Machine No., Cash No, Cash Date, Month, Year, BE Type, Port, Port Name

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

## Technologies Used

- Next.js 16
- React 19
- MongoDB with Mongoose
- NextAuth.js for authentication
- Tailwind CSS for styling
- TypeScript
- PapaParse for CSV processing
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
