sh
# River Business: Smart Water Management Platform

River Business is a comprehensive B2B management platform designed for water refilling businesses and their clients. It provides a dual-interface system: a client-facing dashboard for end-users to manage their water consumption, and a powerful admin panel for business owners to oversee operations, manage users, and ensure compliance.

The platform is built on a modern, serverless architecture using Next.js and Firebase, making it scalable, secure, and easy to maintain.

## Key Features

### Client Dashboard (`/dashboard`)
- **Consumption Analytics:** Visualize water usage with weekly and monthly charts.
- **Real-time Balance:** Track remaining water credits (liters) for the current billing cycle.
- **Delivery Management:** View delivery history, schedule one-time deliveries, and manage auto-refill settings.
- **Invoice & Payments:** Access a full history of invoices and submit proof-of-payment through a multi-option payment portal (GCash, BPI, etc.).
- **Account Management:** Update personal and business details, change passwords, and upload a profile photo.
- **Support & Feedback:** Contact support, submit feedback, and request to switch water providers.
- **Compliance & Quality:** View water quality compliance reports and sanitation visit schedules for their assigned station.
- **Multi-Branch Functionality:**
    - **Parent Accounts:** Manage a central, top-up balance of water credits for all linked branches. View a detailed transaction history of all top-ups and branch consumption deductions. Oversee all associated branch accounts from a single dashboard.
    - **Branch Accounts:** Enjoy the full standard dashboard experience for managing their own deliveries and consumption, with a billing history that is view-only and clearly marked as "Covered by Parent Account".

### Admin Panel (`/admin`)
- **User Management:** View, search, and manage all client accounts, with clear indicators for 'Parent' and 'Branch' account types.
- **Multi-Branch Management:** Create and link 'Parent' and 'Branch' accounts. Top-up water credits (liters) to a Parent account's central balance. View linked branches and transaction histories for any Parent account.
- **Detailed User View:** Access a comprehensive profile for each user, including their plan, consumption details, and assigned station.
- **Administrative Actions:** Assign water stations to users, adjust water balances (add/deduct liters), and attach contracts.
- **Delivery Oversight:** Create, edit, and delete delivery records for any user. Upload proof of delivery on behalf of the team.
- **Station Management:** Create and manage water refilling stations, upload partnership agreements, and manage compliance documents.
- **Refill Requests:** View and manage one-time refill requests from clients.

## Technology Stack

- **Frontend:** Next.js, React, TypeScript
- **UI:** ShadCN UI, Tailwind CSS
- **Backend & Database:** Firebase (Authentication, Firestore, Cloud Storage, Cloud Functions for Firebase)
- **Generative AI:** Google's Genkit for AI-powered features like consumption prediction.
- **Deployment:** Firebase App Hosting

## Getting Started

### Prerequisites
- Node.js (v20 or later)
- npm or yarn
- Firebase CLI (`npm install -g firebase-tools`)

### 1. Installation
Install the project dependencies:
```bash
npm install
```

### 2. Running the Development Server
To run the application locally for development:
```bash
npm run dev
```
The application will be available at `http://localhost:9002`.

The Genkit AI flows can be run in watch mode simultaneously with:
```bash
npm run genkit:watch
```

### 3. Deploying Cloud Functions
The project includes server-side Cloud Functions written in TypeScript. To deploy them, you first need to be authenticated with Firebase.

**Build and Deploy:**
The provided script handles both compiling the TypeScript to JavaScript and deploying the functions.
```bash
npm run deploy:functions
```
This command will:
1. Navigate to the `functions` directory.
2. Compile the TypeScript source from `functions/src` into JavaScript in `functions/lib`.
3. Deploy the compiled functions to your Firebase project.
---
*This project was prototyped in Firebase Studio.*
