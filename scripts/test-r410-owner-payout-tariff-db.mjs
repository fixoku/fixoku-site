import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import pg from 'pg';
import {saveOwnerPayoutTariff,readOwnerPayoutTariff} from '../src/server/domain/r410-owner-payout-tariff-store.js';
const url=new URL(process.env.TEST_DATABASE_URL||'');
if(url.hostname!=='127.0.0.1'||url.port!=='51880'||url.pathname!=='/postgres')throw Error('LOCAL_ONLY_DATABASE_GUARD');
const name='fixoku_test_r410_d8b_'+crypto.randomBytes(6).toString('hex');
const admin=new pg.Pool({connectionString:url.toString()});let db,created=false;
try{
  await admin.query(`create database "${name}" template "r404_payment_schema_20261119_164712"`);created=true;
  url.pathname='/'+name;db=new pg.Pool({connectionString:url.toString()});
  const identity=(await db.query('select current_database() as name')).rows[0].name;
  assert.equal(identity,name);console.log('D8B_ISOLATED_CLONE=PASS');
  await db.query(fs.readFileSync('drizzle/controlled-migrations/r410/R410_03_OWNER_PAYOUT_TARIFF.sql','utf8'));
  console.log('D8B_CONTROLLED_MIGRATION=PASS');
  const user=(await db.query(`insert into platform_users(auth_user_id,email,display_name,email_verified) values($1,$2,'D8B Owner',true) returning id`,[name,name+'@example.invalid'])).rows[0].id;
  const tariff={individualMinor:500000,groupMinor:[400000,300000,200000,150000,100000]};
  const c=await db.connect();try{
    await c.query('begin');const t=await saveOwnerPayoutTariff(c,{tariff,ownerId:user,expectedVersion:0});await c.query('commit');assert.equal(t.version,1);
  }catch(e){await c.query('rollback');throw e;}finally{c.release();}
  const read=await readOwnerPayoutTariff(db);assert.equal(read.groupMinor[3],150000);console.log('D8B_OWNER_READ_AND_SAVE=PASS');
  await assert.rejects(()=>db.query('update r410_owner_payout_tariffs set individual_minor=1 where version=1'),e=>e.code==='P0001');
  await assert.rejects(()=>db.query('delete from r410_owner_payout_tariffs where version=1'),e=>e.code==='P0001');
  console.log('D8B_IMMUTABLE_HISTORY=PASS');
  await assert.rejects(()=>db.query('insert into r410_owner_payout_tariffs(version,individual_minor,group_1_minor,group_2_minor,group_3_minor,group_4_minor,group_5_minor,created_by) values(2,1,1,0,1,1,1,$1)',[user]),e=>e.code==='23514');
  console.log('D8B_DATABASE_AMOUNT_GUARD=PASS');
}finally{
 if(db)await db.end();
 if(created){await admin.query('select pg_terminate_backend(pid) from pg_stat_activity where datname=$1 and pid<>pg_backend_pid()',[name]);await admin.query(`drop database "${name}"`);console.log('D8B_TEST_CLONE_CLEANUP=PASS');}
 await admin.end();
}
console.log('R410_D8B_POSTGRES=PASS');
