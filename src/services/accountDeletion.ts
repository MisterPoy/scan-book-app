import { deleteUser, getIdTokenResult, type User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  type DocumentReference,
} from 'firebase/firestore';
import { db } from '../firebase';

const MAX_BATCH_SIZE = 400;
const RECENT_LOGIN_MAX_AGE_SECONDS = 5 * 60;

const requiresRecentLoginError = () => {
  const error = new Error('Une reconnexion récente est nécessaire.');
  return Object.assign(error, { code: 'auth/requires-recent-login' });
};

const assertRecentAuthentication = async (user: User) => {
  const token = await getIdTokenResult(user, true);
  const authenticationTime = Number(token.claims.auth_time);
  const now = Math.floor(Date.now() / 1000);

  if (!authenticationTime || now - authenticationTime > RECENT_LOGIN_MAX_AGE_SECONDS) {
    throw requiresRecentLoginError();
  }
};

const deleteReferences = async (references: DocumentReference[]) => {
  for (let offset = 0; offset < references.length; offset += MAX_BATCH_SIZE) {
    const batch = writeBatch(db);
    references
      .slice(offset, offset + MAX_BATCH_SIZE)
      .forEach((reference) => batch.delete(reference));
    await batch.commit();
  }
};

export const deleteCurrentUserAccount = async (user: User): Promise<void> => {
  await assertRecentAuthentication(user);

  const [books, libraries, consents, legacyNotificationHistory] = await Promise.all([
    getDocs(collection(db, `users/${user.uid}/collection`)),
    getDocs(collection(db, `users/${user.uid}/libraries`)),
    getDocs(query(collection(db, 'user_consents'), where('userId', '==', user.uid))),
    getDocs(
      query(collection(db, 'notification_history'), where('userId', '==', user.uid)),
    ),
  ]);

  await deleteReferences([
    ...books.docs.map((snapshot) => snapshot.ref),
    ...libraries.docs.map((snapshot) => snapshot.ref),
    ...consents.docs.map((snapshot) => snapshot.ref),
    ...legacyNotificationHistory.docs.map((snapshot) => snapshot.ref),
  ]);

  await Promise.all([
    deleteDoc(doc(db, 'users', user.uid)),
    deleteDoc(doc(db, 'user_profiles', user.uid)),
  ]);

  await deleteUser(user);
};
