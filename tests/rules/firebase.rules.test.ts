// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { afterAll, beforeAll, describe, it } from 'vitest';

let environment: RulesTestEnvironment;

beforeAll(async () => {
  environment = await initializeTestEnvironment({
    projectId: 'kodeks-test',
    firestore: {
      rules: readFileSync(resolve('firestore.rules'), 'utf8'),
    },
  });
});

afterAll(async () => {
  await environment.cleanup();
});

describe('Firestore security rules', () => {
  it('allows an owner to write private data but rejects another user', async () => {
    const ownerDb = environment.authenticatedContext('owner').firestore();
    const intruderDb = environment.authenticatedContext('intruder').firestore();
    const book = doc(ownerDb, 'users/owner/collection/book-1');

    await assertSucceeds(setDoc(book, { title: 'Dune' }));
    await assertFails(
      setDoc(doc(intruderDb, 'users/owner/collection/book-2'), { title: '1984' }),
    );
  });

  it('does not grant administration through a writable user field', async () => {
    const userDb = environment.authenticatedContext('user').firestore();
    await assertSucceeds(setDoc(doc(userDb, 'users/user'), { isAdmin: true }));
    await assertFails(
      setDoc(doc(userDb, 'announcements/forbidden'), { title: 'No' }),
    );
  });

  it('accepts the signed admin claim', async () => {
    const adminDb = environment
      .authenticatedContext('admin', { admin: true })
      .firestore();
    await assertSucceeds(
      setDoc(doc(adminDb, 'announcements/allowed'), { title: 'Info' }),
    );
  });

  it('lets an owner erase their profile without exposing it to another user', async () => {
    const ownerDb = environment.authenticatedContext('owner').firestore();
    const intruderDb = environment.authenticatedContext('intruder').firestore();
    const profile = doc(ownerDb, 'user_profiles/owner');

    await assertSucceeds(setDoc(profile, { uid: 'owner', displayName: 'Owner' }));
    await assertFails(deleteDoc(doc(intruderDb, 'user_profiles/owner')));
    await assertSucceeds(deleteDoc(profile));
  });

  it('keeps consent records immutable but lets their owner erase them', async () => {
    const userDb = environment.authenticatedContext('user').firestore();
    const consent = doc(userDb, 'user_consents/consent-1');
    await assertSucceeds(setDoc(consent, { userId: 'user', granted: true }));
    await assertFails(updateDoc(consent, { granted: false }));
    await assertSucceeds(deleteDoc(consent));
    await assertFails(
      setDoc(doc(userDb, 'user_consents/consent-2'), {
        userId: 'another-user',
        granted: true,
      }),
    );
  });

  it('allows the complete client-side account cleanup only for its owner', async () => {
    const ownerDb = environment.authenticatedContext('eraser').firestore();
    const intruderDb = environment.authenticatedContext('intruder').firestore();

    await assertSucceeds(setDoc(doc(ownerDb, 'users/eraser'), { active: true }));
    await assertSucceeds(
      setDoc(doc(ownerDb, 'users/eraser/collection/book-1'), { title: 'Dune' }),
    );
    await assertSucceeds(
      setDoc(doc(ownerDb, 'users/eraser/libraries/library-1'), { name: 'SF' }),
    );

    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'notification_history/legacy-1'), {
        userId: 'eraser',
      });
    });

    const legacyQuery = query(
      collection(ownerDb, 'notification_history'),
      where('userId', '==', 'eraser'),
    );

    await assertSucceeds(getDocs(legacyQuery));
    await assertFails(
      deleteDoc(doc(intruderDb, 'users/eraser/collection/book-1')),
    );
    await assertFails(
      deleteDoc(doc(intruderDb, 'notification_history/legacy-1')),
    );
    await assertSucceeds(deleteDoc(doc(ownerDb, 'users/eraser/collection/book-1')));
    await assertSucceeds(deleteDoc(doc(ownerDb, 'users/eraser/libraries/library-1')));
    await assertSucceeds(deleteDoc(doc(ownerDb, 'notification_history/legacy-1')));
    await assertSucceeds(deleteDoc(doc(ownerDb, 'users/eraser')));
  });
});
