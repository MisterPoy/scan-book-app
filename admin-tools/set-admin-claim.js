const admin = require('firebase-admin');

const [uid, requestedValue = 'true'] = process.argv.slice(2);
if (!uid || !['true', 'false'].includes(requestedValue)) {
  console.error('Usage: npm run admin:set -- <uid> [true|false]');
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.applicationDefault() });

const updateAdminClaim = async () => {
  const user = await admin.auth().getUser(uid);
  const customClaims = { ...(user.customClaims || {}) };

  if (requestedValue === 'true') customClaims.admin = true;
  else delete customClaims.admin;

  await admin.auth().setCustomUserClaims(uid, customClaims);
  console.log(`Droit administrateur ${requestedValue === 'true' ? 'accordé' : 'retiré'} pour ${uid}.`);
  console.log("L'utilisateur doit renouveler sa session pour obtenir le nouveau jeton.");
};

updateAdminClaim().catch((error) => {
  console.error('Impossible de modifier les droits administrateur:', error.message);
  process.exit(1);
});
