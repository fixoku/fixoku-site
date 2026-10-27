import { useEffect, useMemo, useRef, useState } from "react";

const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value));

const MODULE_BLUEPRINTS = [
  {
    key: "odak",
    label: "Odak",
    color: "yellow",
    title: "Odaklanma Egzersizleri",
    primaryField: "activeCount",
    unit: "aktif öğrenci",
    sub: "Odaklanma çalışmaları öğrencinin seviyesine göre ilerler.",
    bounds: { activeMin: 82, activeMax: 116, completedMax: 260 },
    initial: {
      activeCount: 96,
      completedCount: 148,
      successfulCount: 116,
      progressSeries: [62, 65, 64, 68, 72, 74, 76, 79],
    },
    feedItems: [
      { text: "Odaklanma turu tamamlandı", value: "+12 puan", tone: "yellow" },
      { text: "Kesintisiz çalışma süresi arttı", value: "+2 dk.", tone: "green" },
      { text: "Yeni odak egzersizi açıldı", value: "Yeni", tone: "blue" },
      { text: "Günlük hedef tamamlandı", value: "%100", tone: "green" },
    ],
  },
  {
    key: "okuma",
    label: "Okuma",
    color: "green",
    title: "Hızlı Okuma Çalışmaları",
    primaryField: "activeCount",
    unit: "aktif okuma oturumu",
    sub: "Okuma hızı ve anlama performansı birlikte ölçülür.",
    bounds: { activeMin: 34, activeMax: 58, completedMax: 340 },
    initial: {
      activeCount: 41,
      completedCount: 214,
      successfulCount: 177,
      progressSeries: [66, 69, 71, 70, 75, 78, 81, 83],
    },
    feedItems: [
      { text: "Okuma egzersizi tamamlandı", value: "286 K/D", tone: "green" },
      { text: "Anlama soruları yanıtlandı", value: "%84", tone: "blue" },
      { text: "Yeni hız hedefi oluşturuldu", value: "+18", tone: "yellow" },
      { text: "Günlük okuma serisi sürdü", value: "7 gün", tone: "green" },
    ],
  },
  {
    key: "dikkat",
    label: "Dikkat",
    color: "blue",
    title: "Dikkat Gelişim Çalışmaları",
    primaryField: "completedCount",
    unit: "tamamlanan görev",
    sub: "Doğruluk ve tamamlama sonuçları düzenli olarak izlenir.",
    bounds: { activeMin: 26, activeMax: 46, completedMax: 180 },
    initial: {
      activeCount: 34,
      completedCount: 73,
      successfulCount: 51,
      progressSeries: [55, 58, 61, 60, 64, 67, 69, 70],
    },
    feedItems: [
      { text: "Dikkat görevi başarıyla bitti", value: "+9 puan", tone: "blue" },
      { text: "Tepki süresi iyileşti", value: "-0,4 sn.", tone: "green" },
      { text: "Yeni dikkat seviyesi açıldı", value: "Seviye 4", tone: "yellow" },
      { text: "Doğru yanıt serisi tamamlandı", value: "8/10", tone: "blue" },
    ],
  },
  {
    key: "duello",
    label: "Düello",
    color: "red",
    title: "Okuma Düelloları",
    primaryField: "activeCount",
    unit: "aktif karşılaşma",
    sub: "Seviyeye uygun karşılaşmalarla hız ve anlama pratiği yapılır.",
    bounds: { activeMin: 24, activeMax: 42, completedMax: 190 },
    initial: {
      activeCount: 30,
      completedCount: 86,
      successfulCount: 66,
      progressSeries: [61, 63, 66, 65, 69, 72, 75, 77],
    },
    feedItems: [
      { text: "Yeni okuma düellosu başladı", value: "2 öğrenci", tone: "red" },
      { text: "Karşılaşma başarıyla tamamlandı", value: "+16 puan", tone: "green" },
      { text: "Yeni kişisel rekor oluştu", value: "+21 K/D", tone: "yellow" },
      { text: "Düello seviyesi yükseldi", value: "Seviye 3", tone: "blue" },
    ],
  },
];

function ModuleIcon({ moduleKey }) {
  if (moduleKey === "odak") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M12 2v3M12 19v3M2 12h3M19 12h3"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (moduleKey === "okuma") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 6.5C4 5.7 4.7 5 5.5 5H10c1.4 0 2.7.5 3.7 1.3.9-.8 2.2-1.3 3.6-1.3h1.2c.8 0 1.5.7 1.5 1.5V18c0 .6-.4 1-1 1h-1.7c-1.3 0-2.5.4-3.6 1.1A6.6 6.6 0 0 0 10 19H5.5c-.8 0-1.5-.7-1.5-1.5v-11Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M12.8 6.5V19.8"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (moduleKey === "dikkat") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 3c-3.5 0-6 2.4-6 5.5 0 1.7.7 3 1.8 4.1.7.7 1.2 1.5 1.2 2.4V16h6v-1c0-.9.5-1.7 1.2-2.4C17.3 11.5 18 10.2 18 8.5 18 5.4 15.5 3 12 3Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M9.5 19h5M10 16h4M10.5 21h3"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 4h10M8 4c0 3-2 4-2 7a6 6 0 0 0 12 0c0-3-2-4-2-7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M9 18h6M8 21h8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function createInitialMetrics() {
  return MODULE_BLUEPRINTS.map((blueprint) => ({
    ...blueprint,
    activeCount: blueprint.initial.activeCount,
    completedCount: blueprint.initial.completedCount,
    successfulCount: blueprint.initial.successfulCount,
    progressSeries: [...blueprint.initial.progressSeries],
  }));
}

function calculateSuccessRate(successfulCount, completedCount) {
  if (completedCount <= 0) {
    return 0;
  }

  return clamp(Math.round((successfulCount / completedCount) * 100), 0, 100);
}

function calculateDevelopmentScore(successRate, completedCount) {
  return clamp(
    Math.round(170 + successRate * 2.4 + completedCount * 0.55),
    200,
    500
  );
}

function createChartClipPath(progressSeries) {
  const lastIndex = Math.max(progressSeries.length - 1, 1);
  const points = progressSeries.map((value, index) => {
    const x = Math.round((index / lastIndex) * 100);
    const y = clamp(100 - value, 4, 94);
    return `${x}% ${y}%`;
  });

  return `polygon(${points.join(", ")}, 100% 100%, 0% 100%)`;
}

export default function LiveEducationEngine({ variant = "desktop" }) {
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [feedStart, setFeedStart] = useState(0);
  const [metrics, setMetrics] = useState(createInitialMetrics);
  const [reducedMotion, setReducedMotion] = useState(false);
  const tickRef = useRef(0);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setReducedMotion(motionQuery.matches);

    updateMotionPreference();

    if (motionQuery.addEventListener) {
      motionQuery.addEventListener("change", updateMotionPreference);
    } else {
      motionQuery.addListener(updateMotionPreference);
    }

    return () => {
      if (motionQuery.removeEventListener) {
        motionQuery.removeEventListener("change", updateMotionPreference);
      } else {
        motionQuery.removeListener(updateMotionPreference);
      }
    };
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      return undefined;
    }

    const moduleInterval = window.setInterval(() => {
      setActiveModuleIndex(
        (current) => (current + 1) % MODULE_BLUEPRINTS.length
      );
      setFeedStart(0);
    }, 4400);

    const feedInterval = window.setInterval(() => {
      setFeedStart((current) => current + 1);
    }, 2800);

    const metricInterval = window.setInterval(() => {
      tickRef.current += 1;
      const tick = tickRef.current;

      setMetrics((currentMetrics) =>
        currentMetrics.map((metric, index) => {
          const phase = (tick + index) % 6;
          const activeDelta = phase === 0 ? 1 : phase === 3 ? -1 : 0;
          const completedDelta = phase === 1 || phase === 4 ? 1 : 0;
          const successDelta =
            completedDelta === 1 && (tick + index) % 5 !== 0 ? 1 : 0;

          const activeCount = clamp(
            metric.activeCount + activeDelta,
            metric.bounds.activeMin,
            metric.bounds.activeMax
          );
          const completedCount = clamp(
            metric.completedCount + completedDelta,
            metric.initial.completedCount,
            metric.bounds.completedMax
          );
          const successfulCount = clamp(
            metric.successfulCount + successDelta,
            0,
            completedCount
          );
          const successRate = calculateSuccessRate(
            successfulCount,
            completedCount
          );
          const previousPoint =
            metric.progressSeries[metric.progressSeries.length - 1];
          const trendAdjustments = [1, 2, 0, -1, 1, 0];
          const blendedPoint = Math.round(
            (previousPoint * 2 + successRate) / 3 + trendAdjustments[phase]
          );

          return {
            ...metric,
            activeCount,
            completedCount,
            successfulCount,
            progressSeries: [
              ...metric.progressSeries.slice(1),
              clamp(blendedPoint, 45, 96),
            ],
          };
        })
      );
    }, 3600);

    return () => {
      window.clearInterval(moduleInterval);
      window.clearInterval(feedInterval);
      window.clearInterval(metricInterval);
    };
  }, [reducedMotion]);

  const activeModule = useMemo(() => {
    const metric = metrics[activeModuleIndex] || metrics[0];
    const successRate = calculateSuccessRate(
      metric.successfulCount,
      metric.completedCount
    );

    return {
      ...metric,
      successRate,
      developmentScore: calculateDevelopmentScore(
        successRate,
        metric.completedCount
      ),
      primaryValue:
        metric.primaryField === "completedCount"
          ? metric.completedCount
          : metric.activeCount,
    };
  }, [activeModuleIndex, metrics]);

  const visibleFeed = useMemo(() => {
    const itemCount = 2;

    return Array.from({ length: itemCount }, (_, index) => {
      return activeModule.feedItems[
        (feedStart + index) % activeModule.feedItems.length
      ];
    });
  }, [activeModule.feedItems, feedStart]);

  const selectModule = (index) => {
    setActiveModuleIndex(index);
    setFeedStart(0);
  };

  return (
    <section
      className={`live-education-engine live-education-engine--${variant}`}
      aria-label="Fixoku eğitim motoru simülasyonu"
    >
      <header className="lee-header">
        <div className="lee-brand">
          <span className="lee-brand-icon">
            <ModuleIcon moduleKey="dikkat" />
          </span>
          <span>
            <span className="lee-eyebrow">Fixoku Eğitim Sistemi</span>
            <strong className="lee-title">{variant === "mobile" ? "Gelişim Paneli" : "Eğitim Motoru"}</strong>
          </span>
        </div>

        <span className="lee-live-badge">
          <span className="lee-live-dot" aria-hidden="true" />
          Anlık Simülasyon
        </span>
      </header>

      <div className="lee-tabs" aria-label="Eğitim motoru modülleri">
        {metrics.map((module, index) => (
          <button
            key={module.key}
            type="button"
            className={`lee-tab lee-tab--${module.color} ${
              index === activeModuleIndex ? "is-active" : ""
            }`}
            onClick={() => selectModule(index)}
            aria-pressed={index === activeModuleIndex}
          >
            <span className="lee-tab-icon">
              <ModuleIcon moduleKey={module.key} />
            </span>
            <span>{module.label}</span>
          </button>
        ))}
      </div>

      <div className="lee-main-card">
        <div className="lee-main-top">
          <div>
            <span className="lee-module-label">{activeModule.label}</span>
            <h3>{activeModule.title}</h3>
          </div>
          <span className="lee-status">Anlık Görünüm</span>
        </div>

        <div className="lee-metrics">
          <div className="lee-primary-metric">
            <strong aria-live="polite">{activeModule.primaryValue}</strong>
            <span>{activeModule.unit}</span>
          </div>

          <div className="lee-success-summary">
            <span>Başarı oranı</span>
            <strong aria-live="polite">%{activeModule.successRate}</strong>
          </div>
        </div>

        <p className="lee-description">{activeModule.sub}</p>

        <div
          className="lee-chart"
          role="img"
          aria-label={`${activeModule.label} gelişim grafiği, başarı oranı yüzde ${activeModule.successRate}`}
        >
          <div className="lee-chart-grid" />
          <div
            className="lee-chart-fill"
            style={{
              clipPath: createChartClipPath(activeModule.progressSeries),
            }}
          />
          <span className="lee-chart-score">
            {activeModule.developmentScore} puan
          </span>
        </div>
      </div>

      <div className="lee-bottom-grid">
        <div className="lee-flow-card">
          <div className="lee-card-heading">Öğrenme Akışı</div>
          <div className="lee-flow-list">
            {visibleFeed.map((item, index) => (
              <div
                key={`${activeModule.key}-${feedStart}-${index}`}
                className="lee-flow-item"
              >
                <span
                  className={`lee-flow-dot lee-flow-dot--${item.tone}`}
                  aria-hidden="true"
                />
                <span className="lee-flow-text">{item.text}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="lee-result-card">
          <span>Başarı</span>
          <strong>%{activeModule.successRate}</strong>
          <small>
            {activeModule.successfulCount} başarılı /{" "}
            {activeModule.completedCount} görev
          </small>
        </div>
      </div>
    </section>
  );
}
