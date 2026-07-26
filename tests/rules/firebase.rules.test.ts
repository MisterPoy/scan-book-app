// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';
import { afterAll, beforeAll, describe, it } from 'vitest';

let environment: RulesTestEnvironment;

beforeAll(async () => {
  environment = await initializeTestEnvironment({
    projectId: 'kodeks-test',
    firestore: {
      rules: readFileSync(resolve('firestore.rules'), 'utf8'),
    },
    storage: {
      rules: readFileSync(resolve('storage.rules'), 'utf8'),
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

  it('keeps consent records append-only and owned', async () => {
    const userDb = environment.authenticatedContext('user').firestore();
    const consent = doc(userDb, 'user_consents/consent-1');
    await assertSucceeds(setDoc(consent, { userId: 'user', granted: true }));
    await assertFails(updateDoc(consent, { granted: false }));
    await assertFails(
      setDoc(doc(userDb, 'user_consents/consent-2'), {
        userId: 'another-user',
        granted: true,
      }),
    );
  });
});

describe('Storage security rules', () => {
  it('allows small images in the owner cover directory only', async () => {
    const ownerStorage = environment.authenticatedContext('owner').storage();
    const intruderStorage = environment.authenticatedContext('intruder').storage();
    const image = new Uint8Array([1, 2, 3]);

    await assertSucceeds(
      uploadBytes(ref(ownerStorage, 'covers/owner/cover.jpg'), image, {
        contentType: 'image/jpeg',
      }),
    );
    await assertFails(
      uploadBytes(ref(intruderStorage, 'covers/owner/other.jpg'), image, {
        contentType: 'image/jpeg',
      }),
    );
  });
});
