const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {defineString} = require("firebase-functions/params");
const admin = require("firebase-admin");
const {getStorage} = require("firebase-admin/storage");

admin.initializeApp();
const db = admin.firestore();
const backupBucketName = defineString("HJ_BACKUP_BUCKET");

exports.setRestaurantStaffRole = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in first.");
  const {staffUid, role, restaurantId} = request.data || {};
  if (request.auth.uid !== restaurantId) {
    throw new HttpsError("permission-denied", "Only the restaurant owner can assign staff roles.");
  }
  if (!staffUid || typeof staffUid !== "string" || staffUid === restaurantId) {
    throw new HttpsError("invalid-argument", "Provide a valid staff Firebase UID.");
  }
  if (!["manager", "cashier", "kitchen"].includes(role)) {
    throw new HttpsError("invalid-argument", "Unsupported staff role.");
  }
  const user = await admin.auth().getUser(staffUid);
  await admin.auth().setCustomUserClaims(staffUid, {
    ...(user.customClaims || {}),
    restaurantId,
    role
  });
  await db.doc(`restaurants/${restaurantId}/staff/${staffUid}`).set({
    uid: staffUid,
    email: user.email || "",
    role,
    active: true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, {merge: true});
  return {success: true, staffUid, role};
});

exports.dailyRestaurantBackup = onSchedule("every day 02:15", async () => {
  const bucketName = backupBucketName.value();
  if (!bucketName) throw new Error("Set HJ_BACKUP_BUCKET to a Cloud Storage bucket name.");
  const bucket = getStorage().bucket(bucketName);
  const restaurantDocs = await db.collection("restaurants").get();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  for (const restaurantDoc of restaurantDocs.docs) {
    const restaurantId = restaurantDoc.id;
    const payload = {restaurantId, exportedAt: new Date().toISOString(), collections: {}};
    const subcollections = await restaurantDoc.ref.listCollections();
    for (const sub of subcollections) {
      const snap = await sub.get();
      payload.collections[sub.id] = snap.docs.map(d => ({id: d.id, ...d.data()}));
    }
    const file = bucket.file(`hj-pos-backups/${restaurantId}/${stamp}.json`);
    await file.save(JSON.stringify(payload, null, 2), {
      contentType: "application/json",
      resumable: false,
      metadata: {cacheControl: "private, max-age=0"}
    });
  }
});
