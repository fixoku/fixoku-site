

function fail(code, status = 400) {
  throw Object.assign(new Error(code), { code, status });
}

/**
 * Refund one participant from a completed R6 group.
 *
 * The caller owns the surrounding transaction and group lock. Unpaid
 * completion earnings may be recalculated in place; a PAID earning is never
 * edited and receives an append-only debit adjustment instead.
 */
export async function refundR6GroupParticipant(client, { groupId, participantId, actorUserId, reason = "R6_PARTICIPANT_REFUNDED" }) {
  const participant = (await client.query(
    "select id,training_group_id,status,billable,student_user_id from r6_training_group_participants where id=$1 and training_group_id=$2 for update",
    [participantId, groupId],
  )).rows[0];
  if (!participant) fail("R6_PARTICIPANT_NOT_FOUND", 404);
  if (!["ACTIVE", "COMPLETED"].includes(String(participant.status))) fail("R6_PARTICIPANT_NOT_REFUNDABLE", 409);

  const group = (await client.query("select * from r6_training_groups where id=$1 for update", [groupId])).rows[0];
  if (!group) fail("R6_GROUP_NOT_FOUND", 404);
  if (!group.trainer_user_id) fail("R6_GROUP_TRAINER_REQUIRED", 409);

  await client.query(
    "update r6_training_group_participants set status='REFUNDED',billable=false,refund_at=coalesce(refund_at,now()),updated_at=now() where id=$1",
    [participant.id],
  );

  const countRow = (await client.query(
    "select count(*) filter(where status in ('ACTIVE','COMPLETED') and billable=true)::int as count from r6_training_group_participants where training_group_id=$1",
    [groupId],
  )).rows[0];
  const billableStudentCount = Number(countRow?.count || 0);
  const totals=(await client.query("select sum(compensation_minor)::bigint as amount,count(*) filter(where compensation_minor is null)::int as missing from r6_training_group_participants where training_group_id=$1 and status in ('ACTIVE','COMPLETED') and billable=true",[groupId])).rows[0];
  if(totals.missing) fail('GROUP_COMPENSATION_MISSING',409);
  const recalculatedAmountMinor=Number(totals.amount||0);
  if(group.status!=='COMPLETED') {
    await client.query("update r6_training_groups set projected_payout_minor=$1,updated_at=now() where id=$2",[recalculatedAmountMinor,groupId]);
    return {participantId:participant.id,groupId,billableStudentCount,recalculatedAmountMinor};
  }
  const earning = (await client.query(
    "select * from trainer_earning_ledger where source_type='R6_TRAINING_GROUP_COMPLETION' and source_id=$1 order by created_at desc limit 1 for update",
    [groupId],
  )).rows[0];
  if (!earning) fail("R6_GROUP_EARNING_NOT_FOUND", 409);

  const originalAmountMinor = Number(earning.amount_minor || 0);
  let adjustment = null;
  if (String(earning.status) === "PAID") {
    const delta = recalculatedAmountMinor - Number(group.projected_payout_minor);
    if (delta !== 0) {
      const adjustmentKey = `R6_REFUND_ADJUSTMENT:${participant.id}`;
      adjustment = (await client.query(
        `insert into trainer_earning_ledger(trainer_user_id,entry_type,status,amount_minor,currency,description,source_type,source_id,idempotency_key,adjustment_of_id,billable_student_count,occurred_at)
         values($1,'ADJUSTMENT','EARNED',$2,$3,$4,'R6_PARTICIPANT_REFUND',$5,$6,$7,$8,now())
         on conflict(idempotency_key) do nothing returning id,amount_minor,currency,status,adjustment_of_id,billable_student_count`,
        [earning.trainer_user_id, delta, earning.currency, reason, participant.id, adjustmentKey, earning.id, billableStudentCount],
      )).rows[0] || (await client.query("select id,amount_minor,currency,status,adjustment_of_id,billable_student_count from trainer_earning_ledger where idempotency_key=$1", [adjustmentKey])).rows[0];
      if (adjustment) adjustment = { ...adjustment, amountMinor: Number(adjustment.amount_minor), adjustmentOfId: adjustment.adjustment_of_id, billableStudentCount: adjustment.billable_student_count };
    }
  } else {
    await client.query(
      "update trainer_earning_ledger set amount_minor=$1,billable_student_count=$2 where id=$3 and status in ('PENDING','EARNED','PAYABLE','HELD')",
      [recalculatedAmountMinor, billableStudentCount, earning.id],
    );
  }
  const updatedEarning = (await client.query(
    "select id,amount_minor as \"amountMinor\",currency,status,billable_student_count as \"billableStudentCount\",adjustment_of_id as \"adjustmentOfId\" from trainer_earning_ledger where id=$1",
    [earning.id],
  )).rows[0];
  await client.query(
    "update r6_training_groups set projected_payout_minor=$1,updated_at=now() where id=$2",
    [recalculatedAmountMinor, groupId],
  );
  await client.query(
    "insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'r6.training_participant.refunded','r6_training_group_participant',$2,'SUCCESS',gen_random_uuid(),$3)",
    [actorUserId, participant.id, JSON.stringify({ groupId, billableStudentCount, originalAmountMinor, recalculatedAmountMinor, adjustmentId: adjustment?.id || null })],
  );
  return {
    participantId: participant.id,
    groupId,
    billableStudentCount,
    originalAmountMinor,
    recalculatedAmountMinor,
    earning: updatedEarning,
    adjustment,
    paidHistoryImmutable: String(earning.status) === "PAID",
  };
}
