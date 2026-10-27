const fs=require('node:fs');const assert=require('node:assert/strict');const p=x=>fs.readFileSync(x,'utf8');
assert.match(p('api/account-lifecycle.js'),/sendTransactionalEmail/);assert.match(p('api/trainer-candidate.js'),/candidate_user_id/);
assert.match(p('api/trainer-candidate.js'),/status='REVOKED'/);assert.match(p('api/admin/account-lifecycle.js'),/CANDIDATE_PROFILE_INCOMPLETE/);
assert.match(p('src/AppRoutes.jsx'),/panel\/egitmen-aday/);assert.match(p('src/pages/TrainerCandidatePage.jsx'),/Owner onayı/);
assert.match(p('drizzle/migrations/0037_trainer_candidate_activation.sql'),/candidate_user_id/);
console.log('R33_SOURCE_CHECK=PASS');
