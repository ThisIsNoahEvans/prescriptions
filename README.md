# Prescription Tracker

A web application to help you keep track of your prescriptions and never miss a re-order date. Built with React, TypeScript, and Firebase.

## Features

- **Track Multiple Prescriptions**: Add prescriptions with different pack sizes and daily doses
- **Automatic Calculations**: Automatically calculates when you'll run out and when to reorder
- **Delivery Logging**: Log deliveries to track your supply accurately
- **Smart Supply Tracking**: Accounts for overlapping supplies when new deliveries arrive before old ones run out
- **10-Day Reorder Buffer**: Reminds you to order 10 days before running out
- **Real-time Updates**: Uses Firebase for real-time data synchronization

## How It Works

The app tracks your prescription supply by:

1. **Starting Supply**: You specify how many tablets you have when you start tracking
2. **Daily Consumption**: Calculates consumption based on your daily dose
3. **Delivery Logging**: When you log a delivery, it adds to your total supply
4. **Supply Calculation**: Current supply = (Start supply + All deliveries) - (Days passed × Daily dose)
5. **Reorder Date**: Calculated as Run Out Date - 10 days

The system automatically accounts for overlapping supplies. For example, if you have 5 tablets left from an old pack when a new delivery arrives, both are counted in your total supply.

## Setup

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- A Firebase project

### Installation

1. Clone this repository:
```bash
git clone <repository-url>
cd prescriptions
```

2. Install dependencies:
```bash
npm install
```

3. Set up Firebase:
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication (Google sign-in provider)
   - Create a Firestore database
   - Get your Firebase configuration

4. Create a `.env` file in the root directory:
```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

5. Set up Firestore:
   - Create a named database called `prescriptions` in your Firebase project
   - Deploy the security rules from `firestore.rules` file:
     - In Firebase Console, go to Firestore Database
     - Click on the "Rules" tab
     - Copy the contents of `firestore.rules` and paste them into the rules editor
     - Click "Publish" to deploy the rules
   
   The rules ensure that:
   - Users can only access their own prescriptions
   - All operations require authentication
   - Data validation is enforced on create operations

### Development

Run the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

Build for production:
```bash
npm run build
```

The built files will be in the `dist` directory.

## Usage

1. **Add a Prescription**:
   - Enter the medication name
   - Specify the standard pack size (e.g., 30, 56)
   - Set your daily dose (e.g., 1 tablet per day, or 0.5 for half tablets)
   - Choose a tracking start date
   - Enter how many tablets you currently have

2. **Log Deliveries**:
   - Click "Log New Delivery" on any prescription card
   - Enter the delivery date
   - Enter the quantity delivered (defaults to pack size)

3. **Track Reorder Dates**:
   - The app automatically calculates when you'll run out
   - Reorder dates are highlighted:
     - **Red**: Overdue or order today
     - **Yellow**: Within 7 days
     - **Gray**: More than 7 days away

4. **Delete Prescriptions**:
   - Click "Delete" on any prescription card to remove it

## Email Notifications (Firebase Extension)

The app includes automatic email notifications when prescriptions need to be reordered. This uses the [Firebase Extension `firestore-send-email`](https://firebase.google.com/docs/extensions/official/firestore-send-email) to send emails.

### Setup

1. **Install Firebase CLI** (if not already installed):
```bash
npm install -g firebase-tools
```

2. **Login to Firebase**:
```bash
firebase login
```

3. **Install the Firebase Extension**:
   - **Firebase Console**: Go to Extensions → Install extension → Search for "Trigger Email" → Install
   - **CLI**: Run `firebase ext:install firebase/firestore-send-email --project=your-project-id`

4. **Configure the Extension**:
   When installing, you'll be prompted to configure:
   - **SMTP connection details**: Provide your email service credentials (Gmail, SendGrid, Mailgun, etc.)
   - **Mail collection**: Use `mail` (default) or specify a custom collection name
   - **Default FROM address**: Your sender email address
   - **Default REPLY-TO address**: Optional reply-to email address

5. **Setup Firebase Functions** (if not already done):
```bash
firebase init functions
cd functions
npm install
cd ..
```

6. **Deploy the function**:
```bash
firebase deploy --only functions
```

### How It Works

- The Cloud Function runs daily at 9:00 AM UTC
- It checks all users' prescriptions
- Calculates reorder dates (10 days before running out)
- When prescriptions need reordering, it adds a document to the `mail` collection in Firestore
- The `firestore-send-email` extension automatically detects the new document and sends the email
- Combines multiple prescriptions into a single email when applicable

### Email Service Options

The extension supports various email services:
- **Gmail**: Requires an App Password (not your regular password)
- **SendGrid**: Requires an API key
- **Mailgun**: Requires API credentials
- **Custom SMTP**: Any SMTP server

See the [extension documentation](https://firebase.google.com/docs/extensions/official/firestore-send-email) for detailed setup instructions.

### Testing Locally

You can test the function locally:
```bash
cd functions
npm run serve
```

Then trigger it manually or use the Firebase emulator.

## Deployment (Firebase Hosting)

The app can be deployed to Firebase Hosting for free with a global CDN.

### Setup Firebase Hosting

1. **Install Firebase CLI** (if not already installed):
```bash
npm install -g firebase-tools
```

2. **Login to Firebase**:
```bash
firebase login
```

3. **Initialize Firebase in your project** (if not already done):
```bash
firebase init
```

   When prompted:
   - Select **Hosting** (and any other services you need)
   - Choose your Firebase project
   - Set public directory to `dist` (Vite's build output)
   - Configure as single-page app: **Yes**
   - Set up automatic builds and deploys with GitHub: **No** (or Yes if you want CI/CD)

4. **Build your app**:
```bash
npm run build
```

5. **Deploy to Firebase Hosting**:
```bash
firebase deploy --only hosting
```

   Or deploy everything (hosting + functions + firestore rules):
```bash
firebase deploy
```

### Custom Domain (Optional)

1. Go to [Firebase Console](https://console.firebase.google.com/) → Your Project → Hosting
2. Click "Add custom domain"
3. Follow the instructions to verify your domain
4. Firebase will provide DNS records to add to your domain registrar

### Preview Deployments

You can preview your site before deploying:
```bash
firebase hosting:channel:deploy preview-channel-name
```

This creates a temporary URL for testing.

## Potential Future Features

Here are some ideas for features that could make this app even more useful:

### Medication Management
- **Medication Photos**: Upload photos of prescription labels or medication boxes for quick reference
- **Prescription Templates**: Save common prescriptions as templates for quick re-adding
- **Medication Categories/Tags**: Organize prescriptions by type (e.g., "Heart Medication", "Pain Relief", "Vitamins")
- **Medication Notes**: Add notes or instructions for each prescription (e.g., "Take with food", "Avoid alcohol")
- **Prescription Expiry Dates**: Track when prescriptions expire and get warnings before expiry
- **Refill Count Tracking**: Track how many refills you have left on a prescription
- **Dosage Variations**: Handle prescriptions with varying doses (e.g., "Take 2 tablets for first week, then 1 tablet")

### Notifications & Reminders
- **Push Notifications**: Browser push notifications for reorder reminders (in addition to email)
- **SMS Notifications**: Text message alerts for urgent reorder dates
- **Take Medication Reminders**: Daily reminders to take medications at specific times
- **Customizable Alert Thresholds**: Adjust the reorder buffer (currently 10 days) per prescription
- **Multiple Alert Levels**: Different urgency levels (e.g., "Order soon", "Order now", "Urgent")

### Data & Analytics
- **Export Data**: Export prescription history to PDF or CSV for records
- **Prescription History**: View archived/discontinued prescriptions
- **Statistics Dashboard**: Charts showing medication usage patterns, supply trends, etc.
- **Cost Tracking**: Track prescription costs and spending over time
- **Supply Analytics**: Visualize supply levels and consumption rates

### Sharing & Collaboration
- **Family Accounts**: Share prescriptions with family members or caregivers
- **Caregiver Access**: Grant limited access to family members to help manage medications
- **Prescription Sharing**: Share prescription details with doctors or pharmacists
- **Multi-User Support**: Track prescriptions for multiple people in one account

### Integration & Automation
- **Pharmacy Integration**: Connect with pharmacy APIs to automatically track deliveries
- **Delivery Tracking**: Integration with delivery services (e.g., Royal Mail, UPS) for automatic delivery logging
- **Calendar Integration**: Sync reorder dates with Google Calendar, Apple Calendar, etc.
- **Medication Interaction Checker**: Warn about potential drug interactions
- **Prescription Scanning**: Scan prescription labels using OCR to auto-fill information

### User Experience
- **Search & Filter**: Search prescriptions by name, filter by category, urgency, etc.
- **Sorting Options**: Sort prescriptions by name, reorder date, run-out date, etc.
- **Bulk Actions**: Select multiple prescriptions for bulk operations (delete, archive, etc.)
- **Dark Mode**: Already implemented! 🌙
- **Mobile App**: Native iOS/Android apps for on-the-go access
- **Offline Support**: Work offline and sync when connection is restored
- **Prescription Duplicates**: Detect and warn about duplicate prescriptions

### Advanced Features
- **Medication Schedule**: Create daily/weekly medication schedules with specific times
- **Missed Dose Tracking**: Log when doses are missed and adjust calculations
- **Prescription Backup**: Automatic backup to cloud storage or export
- **Multiple Delivery Addresses**: Track deliveries to different addresses
- **Prescription Strength Tracking**: Track different strengths of the same medication
- **Batch/Expiry Tracking**: Track medication batch numbers and expiry dates
- **Prescription Renewal Reminders**: Remind when prescriptions need to be renewed with doctor

### Reporting
- **Monthly Reports**: Generate monthly summaries of medication usage
- **Doctor Visit Reports**: Prepare reports for doctor visits showing medication history
- **Insurance Reports**: Generate reports for insurance claims
- **Compliance Reports**: Track medication adherence and compliance

## Technical Details

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Backend**: Firebase (Firestore + Auth + Functions)
- **Hosting**: Firebase Hosting (Global CDN)
- **State Management**: React Hooks
- **Email Service**: Firebase Extension `firestore-send-email` (supports Gmail, SendGrid, Mailgun, or custom SMTP)

## License

See LICENSE file for details.
