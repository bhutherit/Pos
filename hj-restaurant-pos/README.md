# HJ Restaurant POS

Advanced restaurant point-of-sale and management starter built with HTML, CSS, JavaScript, Firebase Authentication and Cloud Firestore.

## Included
- Email/password sign-up and sign-in
- Per-account restaurant workspace
- Dashboard with sales overview
- POS cart, tax calculation and checkout
- Menu CRUD and stock tracking
- Orders and kitchen status workflow
- Table management
- Reports and CSV export
- Printable receipts
- Restaurant settings
- Responsive dark glassmorphism UI
- Internal-page navigation

## 1. Create Firebase project
1. Open https://console.firebase.google.com/
2. Create a project.
3. Add a Web App and copy its Firebase configuration.
4. In **Authentication → Sign-in method**, enable **Email/Password**.
5. In **Firestore Database**, create a database.
6. Replace the placeholder values in `app.js` under `firebaseConfig`.

## 2. Firestore security rules
Publish these rules in Firestore → Rules. They ensure each signed-in account can access only its own restaurant workspace.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /restaurants/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

These rules are owner-only. For multiple staff accounts, implement an invitation and role-membership model before granting staff access. Do not make the database public.

## 3. Run locally
Because `app.js` uses JavaScript modules, do not open `index.html` with `file://`.
Use a local web server:
- VS Code: install Live Server and open `index.html`.
- Android: use a local server app or a development server.
- Or deploy the folder to Firebase Hosting.

## 4. Deploy to Firebase Hosting
Install Firebase CLI on a computer, then run:
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
```
Choose the project, set the public directory to this folder, configure it as a single-page app if prompted, then:
```bash
firebase deploy
```

## Important production notes
- This is a functional starter, not a certified tax/accounting system.
- Tax rate is configurable; confirm applicable GST rules with a qualified professional.
- Cash is the default payment method. No real payment gateway is connected.
- Stock is reduced when an order is created. Review cancelled-order stock handling before production.
- Receipt printing uses the browser print dialog.
- Add proper staff roles, audit logs, backups, input validation and server-side trusted calculations before commercial deployment.
- Never paste service-account credentials into browser JavaScript. Only the Firebase Web App config belongs in `app.js`.


## Advanced add-ons included in this edition

### QR receipt references
Receipts now include a QR code containing a compact receipt reference (order ID, order number, total and currency). This QR is **not** a bank payment confirmation and does not expose a public Firestore document. A public verification endpoint can be added with a server-side Cloud Function if you want customers to scan and verify receipts online.

### UPI and payment-provider configuration
The Settings page now stores a merchant UPI ID, payee name and selected provider placeholder. UPI transactions remain pending until verified outside the app. Never treat a generated UPI QR or UPI app launch as proof of payment.
For automatic settlement verification, create a merchant account with a supported provider (for example Razorpay or Cashfree), keep secret keys only in Cloud Functions/your trusted server, and validate signed webhooks server-side. Do not put secret keys in `app.js`.

### Staff roles
The Settings page includes a staff UID + role assignment form. It calls the included Firebase callable function `setRestaurantStaffRole`. Staff must first create their own Firebase Authentication account. The restaurant owner then assigns their Firebase UID. Deploy the function and use the hardened rules below before enabling staff accounts.

### Kitchen updates
The kitchen screen refreshes when the user revisits or reloads the page. For true instant cross-device updates, use Firestore `onSnapshot` listeners. The current project uses read-after-write refreshes; the Cloud Function and rules are separate from this starter.

### Thermal printing
Receipt print styling is optimized for narrow receipt output; select an 80 mm receipt printer in the browser print dialog. Actual printer discovery / silent printing is browser- and device-dependent.

### Scheduled backups
The `functions/` folder contains a scheduled backup Cloud Function scaffold. It exports each restaurant's Firestore subcollections as JSON into a configured Cloud Storage bucket. Deploy it after configuring the bucket and required permissions.

## Hardened Firestore rules for owner + staff
The starter rules in the earlier section are owner-only. If you deploy staff role claims, replace them with the following rules. Owner access remains tied to the restaurant UID. Staff claims must be issued by the callable function.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() { return request.auth != null; }
    function isOwner(restaurantId) {
      return signedIn() && request.auth.uid == restaurantId;
    }
    function isStaff(restaurantId) {
      return signedIn()
        && request.auth.token.restaurantId == restaurantId
        && request.auth.token.role in ['manager', 'cashier', 'kitchen'];
    }
    function canManage(restaurantId) {
      return isOwner(restaurantId)
        || (isStaff(restaurantId) && request.auth.token.role == 'manager');
    }
    match /restaurants/{restaurantId}/settings/{docId} {
      allow read: if isOwner(restaurantId) || (isStaff(restaurantId) && docId == 'profile');
      allow write: if isOwner(restaurantId);
    }
    match /restaurants/{restaurantId}/products/{docId} {
      allow read: if isOwner(restaurantId) || isStaff(restaurantId);
      allow write: if canManage(restaurantId);
    }
    match /restaurants/{restaurantId}/orders/{docId} {
      allow read: if isOwner(restaurantId) || isStaff(restaurantId);
      allow create: if isOwner(restaurantId) || (isStaff(restaurantId) && request.auth.token.role in ['manager','cashier']);
      allow update: if isOwner(restaurantId) || (isStaff(restaurantId) && request.auth.token.role in ['manager','cashier','kitchen']);
      allow delete: if isOwner(restaurantId) || (isStaff(restaurantId) && request.auth.token.role == 'manager');
    }
    match /restaurants/{restaurantId}/tables/{docId} {
      allow read, update: if isOwner(restaurantId) || isStaff(restaurantId);
      allow create, delete: if canManage(restaurantId);
    }
    match /restaurants/{restaurantId}/staff/{docId} {
      allow read: if isOwner(restaurantId);
      allow write: if isOwner(restaurantId);
    }
  }
}
```

The app's current data path is based on the signed-in user's UID. Staff workspace routing must be switched to the `restaurantId` custom claim before staff can use shared restaurant data. Do not enable staff logins until that routing change is completed and tested. The included callable function issues claims; it does not by itself change the browser app's workspace routing.

## Deploy Cloud Functions and scheduled backups
From the project directory:
```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```
Set the `HJ_BACKUP_BUCKET` environment parameter as described in `functions/README.md`. Scheduled functions may require the Blaze billing plan and incur Cloud Scheduler / storage costs. Test backup restoration before relying on backups.

## Project structure
- `index.html` — application shell and internal-page navigation
- `styles.css` — responsive premium dark glassmorphism design
- `app.js` — Firebase-connected application logic
- `functions/` — callable staff-role function and daily backup scaffold
