/* global process */
import { tryQueueOwnerManagementEmail as queueOwnerManagementEmail } from "./owner-management-notifications-r390.js";
const enabled = () => process.env.FIXOKU_OWNER_NOTIFICATIONS_ENABLED === "1";
const date = value => new Intl.DateTimeFormat("tr-TR", {timeZone:"Europe/Istanbul",dateStyle:"short",timeStyle:"short"}).format(value);
const month = value => new Intl.DateTimeFormat("tr-TR", {timeZone:"Europe/Istanbul",month:"long",year:"numeric"}).format(value);
export async function ownerEducationCompletion(client,{completionId,enrollmentId,trainerUserId,completedAt,earningId,amountMinor,currency}) {
  if (!enabled()) return;
  const row = (await client.query(`select coalesce(nullif(trim(concat_ws(' ',c.first_name,c.last_name)),''),u.display_name) as "studentName",t.display_name as "trainerName",p.title as "programName"
    from enrollments e join platform_users u on u.id=e.student_user_id join platform_users t on t.id=$2 join training_programs p on p.id=e.training_program_id
    left join r6_student_child_profiles c on c.id=(to_jsonb(e)->>'beneficiary_child_profile_id')::uuid and c.owner_user_id=e.student_user_id where e.id=$1`,[enrollmentId,trainerUserId])).rows[0];
  if (!row || !row.studentName || !row.trainerName || !row.programName) throw new Error("OWNER_COMPLETION_METADATA_MISSING");
  const metadata={...row,date:date(completedAt)};
  await queueOwnerManagementEmail(client,{templateKey:"owner-completion",eventId:completionId,metadata});
  if (earningId && Number.isSafeInteger(amountMinor) && amountMinor>0) await ownerEducationEarning(client,{earningId,amountMinor,currency,completedAt,...row});
}
export async function ownerEducationEarning(client,{earningId,amountMinor,currency,completedAt,trainerName,studentName,programName,trainerUserId}) {
  if (!enabled() || !earningId || !Number.isSafeInteger(amountMinor) || amountMinor<=0) return;
  if (currency!=="TRY") throw new Error("OWNER_EARNING_CURRENCY_INVALID");
  if (!trainerName && trainerUserId) trainerName=(await client.query("select display_name from platform_users where id=$1",[trainerUserId])).rows[0]?.display_name;
  if (!trainerName) throw new Error("OWNER_EARNING_TRAINER_MISSING");
  const amount=new Intl.NumberFormat("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2}).format(amountMinor/100)+" ₺";
  await queueOwnerManagementEmail(client,{templateKey:"owner-earning",eventId:earningId,metadata:{trainerName,studentName,programName,amount,earningPeriod:month(completedAt),date:date(completedAt)}});
}
export async function ownerQualificationCreated(client,{grantId,trainerUserId,qualificationId}) {
  if (!enabled() || !grantId) return;
  const row=(await client.query(`select u.display_name as "trainerName",q.title as "qualificationName" from platform_users u cross join r6_qualification_definitions q where u.id=$1 and q.id=$2`,[trainerUserId,qualificationId])).rows[0];
  if (!row?.trainerName || !row?.qualificationName) throw new Error("OWNER_QUALIFICATION_METADATA_MISSING");
  await queueOwnerManagementEmail(client,{templateKey:"owner-qualification",eventId:grantId,metadata:{...row,date:date(new Date()),status:"Uzmanlık etkinleşti"}});
}

