# Cloud Functions for HJ Restaurant POS

## Role assignment
`setRestaurantStaffRole` is a callable function. A signed-in restaurant owner supplies a staff member's Firebase Auth UID and one of `manager`, `cashier`, or `kitchen`. The function sets custom claims and writes a staff record.

**Important limitation:** the current browser app still uses the signed-in UID as its workspace path. Before staff can share the owner's workspace, update the app to read the `restaurantId` custom claim after sign-in and use it as the Firestore restaurant path. Until then, do not give staff accounts access to the live restaurant data.

## Scheduled backups
The scheduled function serializes each restaurant's top-level subcollections to JSON and stores them in Cloud Storage. It runs daily at 02:15 UTC.

1. Create a private Cloud Storage bucket in the same Firebase/GCP project.
2. Deploy functions and set `HJ_BACKUP_BUCKET` to that bucket name when prompted.
3. Ensure the function service account has permission to create objects in the bucket.
4. Review retention and lifecycle settings; backups contain customer and business data.
5. Perform a test restore before relying on the backups.

Scheduled functions require billing-enabled Google Cloud resources in many Firebase projects. Costs may apply.
