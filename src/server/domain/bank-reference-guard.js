const fail = (code,status=409) =>
  Object.assign(new Error(code),{code,status});

export function normalizeBankReference(value) {
  const reference=String(value || "")
    .normalize("NFKC")
    .replace(/\s+/gu,"")
    .toUpperCase();

  if (
    reference.length<3 ||
    reference.length>160 ||
    ([...reference].some((character) => character.charCodeAt(0) <= 31 || character.charCodeAt(0) === 127) || reference.includes(";"))
  ) {
    throw fail("BANK_TRANSFER_REFERENCE_INVALID",400);
  }

  return reference;
}

export async function assertUniqueBankReference(
  client,
  {orderId,reference}
) {
  const normalized=normalizeBankReference(reference);

  await client.query(
    "select pg_advisory_xact_lock(hashtextextended($1,0))",
    [`fixoku-bank-reference:${normalized}`]
  );

  const student=(await client.query(`
    select subject_id
    from platform_audit_events
    where action='student.commerce.bank_transfer.review.approved'
      and result='SUCCESS'
      and upper(regexp_replace(
        metadata_json::jsonb->>'bankTransactionReference',
        '[[:space:]]+','','g'
      ))=$1
      and subject_id::text<>$2
    limit 1
  `,[normalized,String(orderId)])).rows;

  if(student.length)
    throw fail("BANK_TRANSFER_REFERENCE_ALREADY_USED");

  const trainer=(await client.query(`
    select order_id
    from trainer_bank_transfer_notifications
    where status='APPROVED'
      and upper(regexp_replace(
        substring(
          review_note from 'BankReference=([^;]+)'
        ),
        '[[:space:]]+','','g'
      ))=$1
      and order_id::text<>$2
    limit 1
  `,[normalized,String(orderId)])).rows;

  if(trainer.length)
    throw fail("BANK_TRANSFER_REFERENCE_ALREADY_USED");

  return normalized;
}