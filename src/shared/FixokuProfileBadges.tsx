import { TrainerQualificationBadgeR5 } from "./FixokuTrainerBadgeR5";

type Badge = { id: string; label: string };

const BASE_CODES = [
  "PRIMARY_FAST",
  "MIDDLE_FAST",
  "HIGH_FAST",
  "ADULT_FAST",
  "MIDDLE_PARAGRAPH",
  "HIGH_PARAGRAPH"
];

const SENIOR_CODE = "FIX_OKU_KIDEMLI_UZMAN";

export function FixokuProfileBadges({
  badges
}: { badges: readonly Badge[] }) {
  const byCode = new Map(
    badges.map(b => [String(b.id).toUpperCase(), b])
  );

  const base = BASE_CODES.filter(code => byCode.has(code));
  const senior = base.length === 6 && byCode.has(SENIOR_CODE);

  if (!base.length) return null;

  return (
    <div
      className="fixoku-profile-badge-group-r385"
      aria-label="Aktif uzmanlik rozetleri"
    >
      <div className="fixoku-profile-badge-row-r385">
        {base.map(code => (
          <TrainerQualificationBadgeR5
            key={code}
            title={code}
            fallback={null}
            size={76}
            zoomSize={180}
          />
        ))}
      </div>

      {senior && (
        <div className="fixoku-profile-badge-senior-r385">
          <TrainerQualificationBadgeR5
            title={SENIOR_CODE}
            fallback={null}
            size={76}
            zoomSize={180}
          />
        </div>
      )}
    </div>
  );
}