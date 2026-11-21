import assert from "node:assert/strict";
import {
  decimalMinor,
  validatePaytrFinance
} from "../src/server/payments/paytr-finance-r410.js";

const a = {
  environment:"LIVE",
  status:"SUCCEEDED",
  review_required:false,
  verified_at:"2026-11-20T10:00:00Z",
  succeeded_at:"2026-11-20T10:00:00Z",
  order_kind:"STUDENT_ORDER",
  merchant_oid:"a".repeat(32),
  currency:"TRY",
  amount_minor:1000000,
  collected_amount_minor:1000000,
  installment_count:1,
  installment_difference_minor:0
};

const p = {
  status:"success",
  test_mode:"0",
  currency:"TL",
  odeme_tipi:"KART",
  payment_amount:"10000.00",
  payment_total:"10000.00",
  kesinti_tutari:"300.00",
  net_tutar:"9700.00",
  taksit:"0",
  returns:[]
};

const calculate = (aa={},pp={}) =>
  validatePaytrFinance({
    attempt:{...a,...aa},
    providerStatus:{...p,...pp}
  });

const single = calculate();
assert.equal(single.deductionMinor,30000);
assert.equal(single.providerNetMinor,970000);
assert.equal(single.merchantPaymentCostMinor,30000);
assert.equal(single.installmentCategory,"SINGLE");
assert.equal(single.bankTransferConfirmed,false);
console.log("SINGLE_PAYMENT=PASS");

const two = calculate(
  {installment_count:2},
  {
    taksit:"2",
    kesinti_tutari:"500.00",
    net_tutar:"9500.00"
  }
);

assert.equal(two.merchantPaymentCostMinor,50000);
assert.equal(two.installmentCategory,
  "TWO_NO_CUSTOMER_SURCHARGE");
console.log("TWO_INSTALLMENT_NO_SURCHARGE=PASS");

const surcharge = calculate(
  {
    collected_amount_minor:1060000,
    installment_count:3,
    installment_difference_minor:60000
  },
  {
    payment_total:"10600.00",
    taksit:"3",
    kesinti_tutari:"700.00",
    net_tutar:"9900.00"
  }
);

assert.equal(
  surcharge.customerInstallmentDifferenceMinor,60000
);

assert.equal(surcharge.merchantPaymentCostMinor,10000);
assert.equal(surcharge.installmentCategory,"CUSTOMER_SURCHARGE");
console.log("CUSTOMER_SURCHARGE_SEPARATED=PASS");

const trainer = calculate({
  order_kind:"TRAINER_PACKAGE_ORDER"
});

assert.equal(trainer.orderKind,"TRAINER_PACKAGE_ORDER");
console.log("TRAINER_PAYMENT=PASS");

assert.equal(decimalMinor("0,24"),24);
assert.equal(decimalMinor("0.24"),24);
assert.equal(decimalMinor("9.76"),976);
assert.equal(decimalMinor("10"),1000);
console.log("EXACT_MINOR_UNIT_PARSING=PASS");

for (const [name,aa,pp] of [
  ["TEST_ATTEMPT",{environment:"TEST"},{}],
  ["TEST_PROVIDER",{}, {test_mode:"1"}],
  ["UNVERIFIED_ATTEMPT",{verified_at:null},{}],
  ["FAILED_ATTEMPT",{status:"FAILED"},{}],
  ["REVIEW_REQUIRED",{review_required:true},{}],
  ["WRONG_CURRENCY",{}, {currency:"USD"}],
  ["WRONG_REFERENCE",{}, {merchant_oid:"b".repeat(32)}],
  ["MISSING_DEDUCTION",{}, {kesinti_tutari:null}],
  ["NEGATIVE_DEDUCTION",{}, {kesinti_tutari:"-1.00"}],
  ["INVALID_DECIMAL",{}, {kesinti_tutari:"3e2"}],
  ["WRONG_NET",{}, {net_tutar:"9800.00"}],
  ["WRONG_ORDER_AMOUNT",{}, {payment_amount:"9999.00"}],
  ["WRONG_COLLECTED_AMOUNT",{}, {payment_total:"9999.00"}],
  ["WRONG_INSTALLMENT",{}, {taksit:"2"}],
  ["REFUND_REVIEW",{}, {returns:[{amount:"100"}]}],
  ["AMBIGUOUS_PROVIDER",{}, {status:"error"}],
  ["OWNER_TEST_REFERENCE",{merchant_oid:"FIXOKUR408TEST"},{}],
  ["WRONG_PAYMENT_TYPE",{}, {odeme_tipi:"EFT"}],
  ["WRONG_SURCHARGE",{installment_difference_minor:1},{}]
]) {
  assert.throws(()=>calculate(aa,pp));
  console.log("GUARD=PASS:"+name);
}

console.log("R410_PAYTR_FINANCE_OFFLINE=PASS");
console.log("PAYTR_NETWORK=NO");
console.log("DATABASE_WRITE=NO");