import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import pg from 'pg';
import {saveOwnerProductCost,readOwnerProductCosts} from '../src/server/domain/r410-product-cost-store.js';
import {recordOrderProductCostSnapshots} from '../src/server/domain/r410-order-cost-snapshot.js';
const url=new URL(process.env.TEST_DATABASE_URL||'');
if(url.hostname!=='127.0.0.1'||url.port!=='51880'||url.pathname!=='/postgres')throw Error('LOCAL_ONLY_DATABASE_GUARD');
const name='fixoku_test_r410_d8h_r1_'+crypto.randomBytes(5).toString('hex');
const admin=new pg.Pool({connectionString:url.toString()});let db,created=false;
const uuid=()=>crypto.randomUUID();
try{
 await admin.query(`create database "${name}" template "r404_payment_schema_20261119_164712"`);created=true;
 url.pathname='/'+name;db=new pg.Pool({connectionString:url.toString()});
 assert.equal((await db.query('select current_database() as db')).rows[0].db,name);
 console.log('D8H_ISOLATED_CLONE=PASS');
 await db.query(fs.readFileSync('drizzle/controlled-migrations/r410/R410_04_PRODUCT_COST_HISTORY.sql','utf8'));
 console.log('D8H_COST_MIGRATION=PASS');
 const owner=(await db.query('insert into platform_users(auth_user_id,email,display_name,email_verified) values($1,$2,$3,true) returning id',[name,name+'@example.invalid','D8H owner'])).rows[0].id;
 // The isolated template may intentionally contain schema only. Never depend on catalog seed data.
 // Create a distinct synthetic book and software ONLY inside the disposable cloned database.
 const suffix=crypto.randomBytes(6).toString('hex');
 const book=(await db.query(`insert into public.physical_products
   (sku,title,description,product_type,is_active,list_gross_minor,vat_rate_bps,r6_product_type,currency)
   values($1,'R410 test book','Disposable clone only','PHYSICAL',true,55000,0,'BOOK','TRY') returning id`,
   ['R410-D8HR1-BOOK-'+suffix])).rows[0];
 const software=(await db.query(`insert into public.physical_products
   (sku,title,description,product_type,is_active,list_gross_minor,vat_rate_bps,default_access_days,r6_product_type,currency)
   values($1,'R410 test AI software','Disposable clone only','SOFTWARE',true,450000,2000,365,'SOFTWARE','TRY') returning id`,
   ['R410-D8HR1-AI-'+suffix])).rows[0];
 assert.ok(book?.id && software?.id);
 console.log('D8H_SYNTHETIC_BOOK_AND_SOFTWARE=PASS');
 const productId=book.id;
 const c=await db.connect();let v1;
 try {await c.query('begin');v1=await saveOwnerProductCost(c,{productId,costMinor:12875,expectedVersion:0,note:'D8H isolated test'},owner);await c.query('commit');}
 catch(e){await c.query('rollback');throw e;}finally{c.release();}
 assert.equal(v1.version,1);
 assert.equal((await readOwnerProductCosts(db)).find(x=>x.id===productId)?.costVersion,1);
 console.log('D8H_OWNER_COST_SAVE_READ=PASS');
 await assert.rejects(()=>db.query('update r410_product_cost_versions set unit_cost_minor=1 where product_id=$1 and version=1',[productId]),e=>e.code==='P0001');
 await assert.rejects(()=>db.query('delete from r410_product_cost_versions where product_id=$1 and version=1',[productId]),e=>e.code==='P0001');
 console.log('D8H_APPEND_ONLY_GUARD=PASS');
 const orderId=uuid(),orderItemId=uuid();
 const lines=[{orderItemId,productId,quantity:2}];
 const first=await recordOrderProductCostSnapshots(db,{orderKind:'STUDENT_ORDER',orderId,lines});
 assert.equal(first.status,'COMPLETE');assert.equal(first.totalCostMinor,25750);
 const stored=(await db.query('select * from r410_order_product_cost_snapshots where order_id=$1',[orderId])).rows;
 assert.equal(stored.length,1);assert.equal(Number(stored[0].total_cost_minor),25750);
 console.log('D8H_SQL_ORDER_COST_SNAPSHOT=PASS');
 const repeat=await recordOrderProductCostSnapshots(db,{orderKind:'STUDENT_ORDER',orderId,lines});
 assert.equal(repeat.status,'COMPLETE');assert.equal((await db.query('select count(*)::int as n from r410_order_product_cost_snapshots where order_id=$1',[orderId])).rows[0].n,1);
 console.log('D8H_REPLAY_IDEMPOTENT_SAME_VERSION=PASS');
 const c2=await db.connect();try{await c2.query('begin');await saveOwnerProductCost(c2,{productId,costMinor:24000,expectedVersion:1,note:'D8H v2'},owner);await c2.query('commit');}
 catch(e){await c2.query('rollback');throw e;}finally{c2.release();}
 const unchanged=(await db.query('select cost_version,total_cost_minor from r410_order_product_cost_snapshots where order_id=$1',[orderId])).rows[0];
 assert.equal(Number(unchanged.cost_version),1);assert.equal(Number(unchanged.total_cost_minor),25750);
 console.log('D8H_HISTORIC_SNAPSHOT_PRESERVED=PASS');
 // Explicitly record current replay semantics, without accidentally claiming a successful replay across cost versions.
 await assert.rejects(()=>recordOrderProductCostSnapshots(db,{orderKind:'STUDENT_ORDER',orderId,lines}),e=>e.code==='COST_REPLAY_CONFLICT');
 console.log('D8H_VERSION_CHANGED_REPLAY_FAIL_CLOSED=PASS');
 await assert.rejects(()=>db.query('update r410_order_product_cost_snapshots set total_cost_minor=1 where order_id=$1',[orderId]),e=>e.code==='P0001');
 console.log('D8H_SNAPSHOT_IMMUTABLE=PASS');
 await assert.rejects(()=>db.query('insert into r410_product_cost_versions(product_id,version,unit_cost_minor,currency,zero_cost_confirmed,created_by) values($1,3,0,\'TRY\',false,$2)',[productId,owner]),e=>e.code==='23514');
 console.log('D8H_UNCONFIRMED_ZERO_BLOCKED=PASS');
 // Unknown AI software cost is never silently counted as zero; it must remain incomplete.
 const aiOrder=uuid(),aiItem=uuid();
 const unknown=await recordOrderProductCostSnapshots(db,{orderKind:'TRAINER_PACKAGE_ORDER',orderId:aiOrder,
    lines:[{orderItemId:aiItem,productId:software.id,quantity:1}]});
 assert.equal(unknown.status,'INCOMPLETE');
 assert.equal(unknown.totalCostMinor,null);
 assert.deepEqual(unknown.missingProductIds,[software.id]);
 assert.equal((await db.query('select count(*)::int as n from r410_order_product_cost_snapshots where order_id=$1',[aiOrder])).rows[0].n,0);
 console.log('D8H_UNKNOWN_AI_COST_NOT_ZERO=PASS');
 const aiClient=await db.connect();
 try{await aiClient.query('begin');await saveOwnerProductCost(aiClient,{productId:software.id,costMinor:3500,expectedVersion:0,note:'AI clone cost'},owner);await aiClient.query('commit');}
 catch(e){await aiClient.query('rollback');throw e;}finally{aiClient.release();}
 const aiRecorded=await recordOrderProductCostSnapshots(db,{orderKind:'TRAINER_PACKAGE_ORDER',orderId:aiOrder,
    lines:[{orderItemId:aiItem,productId:software.id,quantity:1}]});
 assert.equal(aiRecorded.status,'COMPLETE');assert.equal(aiRecorded.totalCostMinor,3500);
 console.log('D8H_SOFTWARE_ORDER_COST_SNAPSHOT=PASS');
}finally{
 if(db)await db.end();
 if(created){await admin.query('select pg_terminate_backend(pid) from pg_stat_activity where datname=$1 and pid<>pg_backend_pid()',[name]);await admin.query(`drop database "${name}"`);console.log('D8H_TEST_CLONE_CLEANUP=PASS');}
 await admin.end();
}
console.log('R410_D8H_ISOLATED_POSTGRES=PASS');
