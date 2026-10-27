import { useState } from "react";

const BANK_NAME = "Akbank";
const ACCOUNT_NAME = "ERSİN USTA MAVİ YEŞİL AJANS";
const IBAN = "TR84 0004 6006 1688 8000 0889 81";

export function BankTransferPayment({
  reference,
}: {
  reference?: string | null;
}) {
  const [copied, setCopied] = useState<
    "account" | "iban" | "reference" | null
  >(null);

  const copy = async (
    value: string,
    field: "account" | "iban" | "reference",
  ) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(field);

      window.setTimeout(() => {
        setCopied((current) =>
          current === field ? null : current,
        );
      }, 1600);
    } catch {
      setCopied(null);
    }
  };

  return (
    <div className="fixoku-bank-transfer">
      <div className="fixoku-bank-transfer__head">
        <div className="fixoku-bank-transfer__bank-name">
          AKBANK
        </div>

        <div>
          <strong>Havale / EFT ile ödeme</strong>
          <p>
            Ödemenizi aşağıdaki Fixoku firma hesabına
            gönderebilirsiniz.
          </p>
        </div>
      </div>

      <div className="fixoku-bank-transfer__rows">
        <div className="fixoku-bank-transfer__row">
          <div>
            <small>Banka</small>
            <strong>{BANK_NAME}</strong>
          </div>
        </div>

        <div className="fixoku-bank-transfer__row">
          <div>
            <small>Hesap adı</small>
            <strong>{ACCOUNT_NAME}</strong>
          </div>

          <button
            type="button"
            onClick={() =>
              void copy(ACCOUNT_NAME, "account")
            }
          >
            {copied === "account"
              ? "Kopyalandı"
              : "Tıkla kopyala"}
          </button>
        </div>

        <div className="fixoku-bank-transfer__row">
          <div>
            <small>IBAN</small>
            <strong className="fixoku-bank-transfer__iban">
              {IBAN}
            </strong>
          </div>

          <button
            type="button"
            onClick={() =>
              void copy(
                IBAN.replace(/\s+/g, ""),
                "iban",
              )
            }
          >
            {copied === "iban"
              ? "Kopyalandı"
              : "Tıkla kopyala"}
          </button>
        </div>

        {reference && (
          <div className="fixoku-bank-transfer__row">
            <div>
              <small>
                Ödeme açıklaması / sipariş referansı
              </small>
              <strong>{reference}</strong>
            </div>

            <button
              type="button"
              onClick={() =>
                void copy(reference, "reference")
              }
            >
              {copied === "reference"
                ? "Kopyalandı"
                : "Tıkla kopyala"}
            </button>
          </div>
        )}
      </div>

      <p className="fixoku-bank-transfer__note">
        Havale/EFT seçildiğinde siparişiniz, ödeme
        onaylanana kadar <strong>Ödeme Bekliyor</strong>{" "}
        durumunda kalır. Banka transferi tek başına paket
        erişimini açmaz.
      </p>
    </div>
  );
}