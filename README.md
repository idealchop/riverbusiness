# River Business - Water Consumption Management Platform

Welcome to the River Business application, a comprehensive B2B SaaS platform designed to help businesses manage, track, and optimize their water consumption. This application provides separate, feature-rich dashboards for both administrative staff and business clients.

## Tech Stack

This project is built with a modern, robust, and scalable tech stack:

- **Framework**: [Next.js](https://nextjs.org/) (using the App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Backend & Database**: [Firebase](https://firebase.google.com/) (Firestore, Firebase Authentication, Cloud Storage)
- **Deployment**: [Firebase App Hosting](https://firebase.google.com/docs/app-hosting)
- **UI Components**: [ShadCN UI](https://ui.shadcn.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Generative AI**: [Genkit](https://firebase.google.com/docs/genkit) (with Google's Gemini models)
- **Forms**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/) for validation
- **Charts & Analytics**: [Recharts](https://recharts.org/)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## Core Features

### 1. User Authentication & Onboarding
- **Role-Based Access Control**: Secure login for two distinct roles: **Admin** and **User** (Client).
- **Email/Password Authentication**: Standard and secure login method.
- **Role-based Redirects**: Users are automatically redirected to the `/admin` or `/dashboard` route based on their role.
- **Onboarding Flow**: A multi-step onboarding process for new clients to provide their details and set up their custom water consumption plan.

### 2. Admin Dashboard (`/admin`)
A centralized control panel for managing the entire platform.

- **User Management**:
  - View a sortable list of all business clients.
  - Click a user to open a detailed management modal.
  - Search for users by Client ID or Business Name.
- **Client Account Details**:
  - View user profile information, plan details, and consumption balances.
  - Assign a water refilling station to a client.
  - Manually adjust a client's water liter balance (add or deduct).
  - Attach legal contracts (`.pdf`) to a user's profile.
- **Delivery Management**:
  - View a client's complete delivery history with filtering by date range.
  - Manually create new delivery records.
  - Edit or delete existing delivery records.
  - Upload Proof of Delivery images for each transaction.
- **Water Station Management**:
  - Create and manage water refilling stations.
  - Upload and view compliance documents (e.g., DOH Permit, Bacteriological Tests).
  - Schedule and track sanitation visits for each station.
- **Admin Account Management**: Admins can update their own profile details and change their password.

### 3. Client Dashboard (`/dashboard`)
An intuitive dashboard for business clients to monitor and manage their water services.

- **Consumption Overview**:
  - View monthly water allocation (plan liters + bonus + rollover).
  - Track consumed liters and available balance in real-time with progress bars.
  - Visualize consumption data with a weekly/monthly bar chart.
- **Delivery Management**:
  - View a complete history of all past and pending deliveries.
  - View Proof of Delivery images for completed transactions.
- **Schedule Management**:
  - Toggle "Auto Refill" on or off.
  - Update the recurring delivery schedule (day and time).
  - Schedule a one-time manual delivery.
- **Billing & Payments (`/payments`)**:
  - View a history of all invoices and their payment status (Paid, Upcoming, Overdue).
  - Pay for upcoming invoices by scanning QR codes for various payment methods (GCash, BPI, etc.).
- **Water Quality & Station Info (`/water-stations`)**:
  - View details of the assigned water refilling station.
  - Access and view all compliance reports and sanitation visit records for their assigned station.
- **AI-Powered Support (`/support`)**:
  - **River Assistant**: A Genkit-powered chatbot to answer questions about water consumption and provide helpful tips.
  - Direct contact information for phone and email support.

---

## Getting Started

### Prerequisites
- Node.js and npm/yarn installed.
- A Firebase project with Firestore, Authentication, and Storage enabled.

### Environment Setup

1.  **Create a `.env` file** in the root of the project.
2.  Populate it with your Firebase project credentials. You can find these in your Firebase project settings.

    ```bash
    # Firebase Configuration
    NEXT_PUBLIC_FIREBASE_PROJECT_ID="YOUR_PROJECT_ID"
    NEXT_PUBLIC_FIREBASE_APP_ID="YOUR_APP_ID"
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="YOUR_STORAGE_BUCKET"
    NEXT_PUBLIC_FIREBASE_API_KEY="YOUR_API_KEY"
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="YOUR_AUTH_DOMAIN"
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="YOUR_MESSAGING_SENDER_ID"
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="YOUR_MEASUREMENT_ID"

    # Genkit / Gemini AI Configuration
    GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
    ```

### Installation and Running the App

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Run the development server**:
    The application runs on port `9002`.
    ```bash
    npm run dev
    ```

3.  **Run the Genkit development server**:
    For the AI features to work locally, you need to run the Genkit server in a separate terminal.
    ```bash
    npm run genkit:watch
    ```

Open [http://localhost:9002](http://localhost:9002) in your browser to see the application.

### Default Admin User
- **Email**: `admin@riverph.com`
- **Password**: (You will need to create this user in your Firebase Authentication console)

Any other registered user will be treated as a client and redirected to the user dashboard.

---

© 2024 River Tech Inc. All rights reserved.
