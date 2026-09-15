import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  COMPLETED_FREE_TEST_COUNT,
  formatSocialProofCount,
} from "../../data/socialProof.js";

const ReadingSpeedTest = lazy(() => import("../../ReadingSpeedTest.jsx"));
const AttentionFocusTest = lazy(() => import("../../AttentionFocusTest.jsx"));

const subscribeToHydration = () => () => {};
const getClientHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

function TestModalLoading({ label }) {
  return (
    <div className="reading-test-overlay test-modal-loading" role="status" aria-live="polite">
      <div className="reading-test-modal test-modal-loading-card">
        <span className="test-modal-loading-spinner" aria-hidden="true" />
        <p>{label} yükleniyor…</p>
      </div>
    </div>
  );
}

export function AssessmentTestExperience({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const hasHydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );
  const [manualTest, setManualTest] = useState(null);
  const queryTest = hasHydrated
    ? new URLSearchParams(location.search).get("test")
    : null;
  const activeTest = manualTest ?? (["attention", "reading"].includes(queryTest) ? queryTest : null);

  const closeTest = useCallback(() => {
    setManualTest(null);

    const searchParams = new URLSearchParams(location.search);
    if (!searchParams.has("test")) return;

    searchParams.delete("test");
    const nextSearch = searchParams.toString();
    navigate(
      {
        pathname: location.pathname,
        search: nextSearch ? `?${nextSearch}` : "",
        hash: location.hash,
      },
      { replace: true },
    );
  }, [location.hash, location.pathname, location.search, navigate]);

  useEffect(() => {
    if (!activeTest) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") closeTest();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTest, closeTest]);

  return (
    <>
      {activeTest === "reading" && (
        <Suspense fallback={<TestModalLoading label="Okuma testi" />}>
          <ReadingSpeedTest isOpen onClose={closeTest} />
        </Suspense>
      )}
      {activeTest === "attention" && (
        <Suspense fallback={<TestModalLoading label="Dikkat testi" />}>
          <AttentionFocusTest isOpen onClose={closeTest} />
        </Suspense>
      )}
      {children({ activeTest, openTest: setManualTest })}
    </>
  );
}

export function AssessmentTestCards({
  className = "",
  id = "testler",
  onStartTest,
  showCounter = true,
  showDurationNotes = false,
  showHeading = true,
}) {
  const [testCounter, setTestCounter] = useState(0);

  useEffect(() => {
    if (!showCounter) return undefined;

    const target = COMPLETED_FREE_TEST_COUNT;
    const duration = 3000;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let animationFrameId;

    if (prefersReducedMotion) {
      animationFrameId = requestAnimationFrame(() => setTestCounter(target));
      return () => cancelAnimationFrame(animationFrameId);
    }

    const startedAt = performance.now();
    const updateCounter = (timestamp) => {
      const progress = Math.min((timestamp - startedAt) / duration, 1);
      setTestCounter(Math.floor(target * progress));

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(updateCounter);
      } else {
        setTestCounter(target);
      }
    };

    animationFrameId = requestAnimationFrame(updateCounter);
    return () => cancelAnimationFrame(animationFrameId);
  }, [showCounter]);

  return (
    <section className={`free-tests-section ${className}`.trim()} id={id}>
      <div className="free-tests-bg" />

      <div className="free-tests-container">
        {showHeading && (
          <h2 className="free-tests-title">
            Okuma ve Dikkat Seviyesini
            <br />
            <span>Ücretsiz Testlerle</span> Ölçün
          </h2>
        )}

        <div className="free-tests-cards">
          <div className="free-test-card free-test-card-purple">
            <div className="free-test-card-head">Ücretsiz Dikkat Testi</div>

            <div className="free-test-card-body">
              <div className="free-test-pattern free-test-pattern-focus" />

              <div className="free-test-icon free-test-icon-purple" aria-hidden="true">
                <svg viewBox="0 0 128 128" fill="none">
                  <circle cx="64" cy="64" r="42" fill="#f4d8f2" stroke="#5a1480" strokeWidth="5" />
                  <circle cx="64" cy="64" r="26" fill="#ffffff" stroke="#8f55a8" strokeWidth="5" />
                  <circle cx="64" cy="64" r="10" fill="#ff9a1f" stroke="#5a1480" strokeWidth="4" />
                  <path d="M64 12v17M64 99v17M12 64h17M99 64h17" stroke="#5a1480" strokeWidth="6" strokeLinecap="round" />
                  <path d="m70 58 26-26" stroke="#ef6418" strokeWidth="7" strokeLinecap="round" />
                  <path d="m86 31 12-1-1 12" stroke="#ef6418" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              <p className="free-test-desc">
                Çocuğunuzun dikkat ve odaklanma seviyesini 2 dakikada ölçün, gelişim
                alanlarını uzman eğitmenimizle değerlendirin.
              </p>

              <button
                type="button"
                className="free-test-btn free-test-btn-purple"
                onClick={() => onStartTest("attention")}
              >
                <span className="free-test-btn-check" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M20 7L10 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span>Dikkat Testini Başlat</span>
              </button>
            </div>
          </div>

          <div className="free-test-card free-test-card-orange">
            <div className="free-test-card-head">Ücretsiz Okuma ve Anlama Testi</div>

            <div className="free-test-card-body">
              <div className="free-test-pattern free-test-pattern-reading" />

              <div className="free-test-icon free-test-icon-orange" aria-hidden="true">
                <svg viewBox="0 0 128 128" fill="none">
                  <path d="M20 34c15-6 29-5 44 4v58c-15-9-29-10-44-4V34Z" fill="#ffffff" stroke="#43115d" strokeWidth="5" strokeLinejoin="round" />
                  <path d="M108 34c-15-6-29-5-44 4v58c15-9 29-10 44-4V34Z" fill="#fff8ed" stroke="#43115d" strokeWidth="5" strokeLinejoin="round" />
                  <path d="M32 50h20M32 62h20M76 50h20M76 62h20" stroke="#8d73a2" strokeWidth="4" strokeLinecap="round" />
                  <path d="M78 86a28 28 0 1 0-28-28" stroke="#ef6418" strokeWidth="7" strokeLinecap="round" />
                  <path d="m78 86 16 9M78 86l5-17" stroke="#ef6418" strokeWidth="6" strokeLinecap="round" />
                  <circle cx="78" cy="86" r="5" fill="#ffb11a" stroke="#43115d" strokeWidth="3" />
                </svg>
              </div>

              <p className="free-test-desc">
                Çocuğunuzun okuma hızını ve anlama becerisini ölçün, sonuçları uzman
                eğitmenimizle değerlendirin.
              </p>

              <button
                type="button"
                className="free-test-btn free-test-btn-orange"
                onClick={() => onStartTest("reading")}
              >
                <span className="free-test-btn-check" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M20 7L10 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span>Okuma Ölçümünü Başlat</span>
              </button>
            </div>
          </div>
        </div>

        {showDurationNotes && (
          <ul className="assessment-duration-notes" aria-label="Test süreleri ve güven bilgileri">
            <li>Dikkat testi yaklaşık 2 dakika</li>
            <li>Okuma ve anlama testi yaklaşık 5 dakika</li>
            <li>Kayıt gerektirmez</li>
            <li>Ücretsizdir</li>
          </ul>
        )}

        {showCounter && (
          <div
            className="trusted-users-box"
            aria-label={`${formatSocialProofCount(COMPLETED_FREE_TEST_COUNT)} Fixoku öğrencisi bu testleri çözdü`}
            data-counter-target={COMPLETED_FREE_TEST_COUNT}
          >
            <div className="trusted-avatar-stack" aria-hidden="true">
              {["/egitici1.jpeg", "/egitici2.jpeg", "/egitici3.jpeg", "/egitici4.jpeg", "/egitici1.jpeg"].map((avatar, index) => (
                <span className={`trusted-avatar trusted-avatar-${index + 1}`} key={avatar + index}>
                  <img src={avatar} alt="" loading="lazy" />
                </span>
              ))}
            </div>

            <div className="trusted-users-content">
              <div className="trusted-stars" role="img" aria-label="5 yıldız değerlendirme">
                {Array.from({ length: 5 }).map((_, index) => (
                  <svg key={index} viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 2.4l2.9 6 6.6.9-4.8 4.7 1.1 6.6L12 17.5l-5.8 3.1 1.1-6.6-4.8-4.7 6.6-.9L12 2.4Z" />
                  </svg>
                ))}
              </div>

              <p className="trusted-users-text">
                <strong className="trusted-counter-fixed">
                  {formatSocialProofCount(testCounter)}
                </strong>
                <span>Fixoku Öğrencisi Bu Testleri Çözdü</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
