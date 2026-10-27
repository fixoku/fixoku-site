import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import StatCard from "../components/StatCard";
import ProgressCircle from "../components/ProgressCircle";
import AreaChartCard from "../components/AreaChartCard";
import CategoryCard from "../components/CategoryCard";
import {
  challengeCards,
  dailyTasks,
  freeExercises,
  liveFeed,
  studentCategories,
  studentTrend,
} from "../data/mockData";

const studentMenu = [
  { key: "dashboard", icon: "home", label: "Panelim" },
  { key: "kronometre", icon: "stopwatch", label: "Kronometre" },
  { key: "profil", icon: "users", label: "Profilim" },
  { key: "egzersizler", icon: "book", label: "21 Günlük Egzersizler" },
  { key: "serbest", icon: "settings", label: "Serbest Çalışma" },
  { key: "meydan", icon: "trophy", label: "Meydan Okuma" },
  { key: "istatistik", icon: "chart", label: "İstatistikler" },
];

function Bee() {
  return <div className="fx-bee">🐝</div>;
}

function ScoreBadge() {
  return (
    <div className="fx-score-badge">
      <div className="fx-score-ring">
        <span>TOPLAM<br />PUAN</span>
        <strong>0</strong>
      </div>
      <Bee />
    </div>
  );
}

function DashboardHome() {
  return (
    <section className="fx-dashboard-grid">
      <div className="fx-left-stack">
        <section className="fx-hero-card">
          <div className="fx-hero-content">
            <span>Bugünkü Eğitim Durumu</span>
            <h2>3. gün odaklanma egzersizi devam ediyor.</h2>
            <p>Hedef: 30 dakika çalışma, 4 egzersiz ve 1 anlama testi.</p>
            <div className="fx-hero-actions">
              <button>Çalışmaya Devam Et</button>
              <button className="ghost">Raporu Gör</button>
            </div>
          </div>
          <ProgressCircle value={64} label="Bugün" />
        </section>

        <section className="fx-stats-grid">
          <StatCard title="İlk Okuma Hızı" value="186" sub="kelime/dk" />
          <StatCard title="Son Okuma Hızı" value="412" sub="+%121 gelişim" accent="purple" />
          <StatCard title="İlk Anlama" value="%54" sub="başlangıç" accent="blue" />
          <StatCard title="Son Anlama" value="%86" sub="+%32 artış" accent="green" />
        </section>

        <AreaChartCard title="Okuma & Anlama Gelişimi" subtitle="Son 12 ölçüm" data={studentTrend} />

        <section className="fx-category-grid">
          {studentCategories.map((item) => (
            <CategoryCard key={item.title} item={item} />
          ))}
        </section>
      </div>

      <aside className="fx-right-stack">
        <article className="fx-rank-card">
          <span>Türkiye Sıralaması</span>
          <strong>128</strong>
          <p>3.280 öğrenci içinde</p>
        </article>

        <article className="fx-task-card">
          <div className="fx-card-head">
            <div>
              <span>21 Günlük Plan</span>
              <h3>Günlük Görevler</h3>
            </div>
            <p>5 adım</p>
          </div>

          <div className="fx-task-list">
            {dailyTasks.map((task) => (
              <div className={`fx-task-item ${task.status}`} key={task.day}>
                <b>{task.day}</b>
                <div>
                  <strong>{task.title}</strong>
                  <span>{task.status === "locked" ? "Kilitli" : `Puan: ${task.score}`}</span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="fx-feed-card">
          <div className="fx-card-head">
            <div>
              <span>Canlı Akış</span>
              <h3>Son Hareketler</h3>
            </div>
          </div>

          <div className="fx-feed-list">
            {liveFeed.map((item, index) => (
              <div className="fx-feed-item" key={item}>
                <i>{index + 1}</i>
                <p>{item}</p>
              </div>
            ))}
          </div>
        </article>
      </aside>
    </section>
  );
}

function KronometrePage() {
  const [words, setWords] = useState(420);
  const [seconds, setSeconds] = useState(60);
  const [target, setTarget] = useState(350);
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const safeSeconds = Math.max(Number(seconds) || 0, 1);
  const safeWords = Math.max(Number(words) || 0, 0);
  const speed = Math.round((safeWords * 60) / safeSeconds);
  const targetProgress = Math.min(Math.round((speed / Math.max(target, 1)) * 100), 140);
  const displayProgress = Math.min(targetProgress, 100);
  const improvement = speed - 186;

  const motivation =
    speed >= target
      ? "Harika! Hedefi geçtin, şimdi anlama oranını koruyarak devam et."
      : speed >= target * 0.8
        ? "Çok yaklaştın. Bir sonraki turda göz sıçramalarını daha ritmik yap."
        : "Başlangıç güzel. Metne odaklan, kelime kelime değil blok blok görmeye çalış.";

  const badge =
    speed >= 450 ? "Hız Ustası" : speed >= 350 ? "Hedef Avcısı" : speed >= 250 ? "Gelişimde" : "Başlangıç";

  const handleTraining = () => {
    setIsRunning(true);
    window.setTimeout(() => {
      setIsRunning(false);
      setLastResult({
        speed,
        target,
        date: "Bugünkü ölçüm",
      });
    }, 650);
  };

  return (
    <section className="chrono-pro-page">
      <div className="chrono-pro-hero">
        <div className="chrono-pro-copy">
          <span className="chrono-pro-kicker">Okuma Hızı Antrenmanı</span>
          <h2>Bugünkü hızını ölç, hedefini geç ve gelişimini takip et.</h2>
          <p>
            Kelime sayısı ve süreyi gir. Sistem okuma hızını hesaplar, hedefinle
            karşılaştırır ve sana bir sonraki çalışma için akıllı öneri verir.
          </p>

          <div className="chrono-pro-badges">
            <div>
              <strong>186</strong>
              <span>İlk hız</span>
            </div>
            <div>
              <strong>{speed}</strong>
              <span>Şu anki hız</span>
            </div>
            <div>
              <strong>{target}</strong>
              <span>Hedef</span>
            </div>
          </div>
        </div>

        <div className="chrono-pro-orbit">
          <div className="chrono-pro-ring" style={{ "--chrono-progress": `${displayProgress}%` }}>
            <div>
              <span>{badge}</span>
              <strong>{speed}</strong>
              <small>kelime / dakika</small>
            </div>
          </div>
          <div className="chrono-pro-bee">🐝</div>
        </div>
      </div>

      <div className="chrono-pro-grid">
        <article className="chrono-control-card">
          <div className="chrono-card-heading">
            <div>
              <span>Ölçüm Bilgileri</span>
              <h3>Kronometreyi Hazırla</h3>
            </div>
            <b>{isRunning ? "Ölçülüyor..." : "Hazır"}</b>
          </div>

          <div className="chrono-input-grid">
            <label>
              Metindeki kelime sayısı
              <input
                type="number"
                min="0"
                value={words}
                onChange={(e) => setWords(e.target.value)}
              />
            </label>

            <label>
              Okuma süresi / saniye
              <input
                type="number"
                min="1"
                value={seconds}
                onChange={(e) => setSeconds(e.target.value)}
              />
            </label>

            <label>
              Bugünkü hedef / kelime-dk
              <input
                type="number"
                min="1"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </label>
          </div>

          <button className="chrono-start-btn" type="button" onClick={handleTraining}>
            {isRunning ? "Hesaplanıyor..." : "Hızımı Hesapla"}
          </button>
        </article>

        <article className="chrono-result-card">
          <div className="chrono-card-heading">
            <div>
              <span>Canlı Sonuç</span>
              <h3>Performans Özeti</h3>
            </div>
          </div>

          <div className="chrono-result-main">
            <strong>{speed}</strong>
            <span>kelime / dakika</span>
          </div>

          <div className="chrono-progress-track">
            <i style={{ width: `${displayProgress}%` }} />
          </div>

          <div className="chrono-result-row">
            <span>Hedefe ulaşma</span>
            <b>%{displayProgress}</b>
          </div>

          <div className="chrono-result-row">
            <span>İlk ölçüme göre</span>
            <b className={improvement >= 0 ? "positive" : "negative"}>
              {improvement >= 0 ? "+" : ""}{improvement} kelime
            </b>
          </div>

          <p className="chrono-motivation">{motivation}</p>
        </article>

        <article className="chrono-coach-card">
          <span>Fixoku Koç Önerisi</span>
          <h3>Bir sonraki turda şunu dene:</h3>
          <ul>
            <li>Satır başına dönerken gözünü metnin ortasına sabitle.</li>
            <li>İç sesle okuma yerine kelime gruplarını görmeye çalış.</li>
            <li>Hızın artarken anlama oranını da not et.</li>
          </ul>
        </article>

        <article className="chrono-history-card">
          <span>Son Ölçüm</span>
          {lastResult ? (
            <>
              <h3>{lastResult.speed} kelime/dk</h3>
              <p>{lastResult.date} · Hedef: {lastResult.target}</p>
            </>
          ) : (
            <>
              <h3>Henüz kayıt yok</h3>
              <p>İlk ölçümden sonra sonuç burada görünecek.</p>
            </>
          )}

          <div className="chrono-mini-chart">
            {[42, 50, 56, 62, 68, displayProgress].map((value, index) => (
              <i key={index} style={{ height: `${value}%` }} />
            ))}
          </div>
        </article>
      </div>

      <div className="chrono-formula-pro">
        <div>
          <span>Formül</span>
          <h3>Okuma hızı nasıl hesaplanır?</h3>
        </div>
        <p>
          <b>Kelime Sayısı × 60</b> / <b>Okunan Süre</b> = kelime / dakika
        </p>
      </div>
    </section>
  );
}

function ProfilePage({ user }) {
  return (
    <section className="fx-profile-page">
      <Bee />
      <form className="fx-profile-form">
        {[
          ["ADI-SOYADI :", user.name],
          ["EĞİTİM DURUMU :", ""],
          ["E-POSTA :", user.email],
          ["TELEFON :", ""],
        ].map(([label, value]) => (
          <label key={label}>
            <b>{label}</b>
            <input defaultValue={value} />
          </label>
        ))}

        <label>
          <b>ŞEHİR :</b>
          <select defaultValue="">
            <option value="">Seçiniz</option>
            <option>İstanbul</option>
            <option>Ankara</option>
            <option>İzmir</option>
          </select>
        </label>

        <label>
          <b>İLÇE :</b>
          <select defaultValue="">
            <option value="">Seçiniz</option>
          </select>
        </label>

        <button type="button">Güncelle ▶</button>
      </form>
    </section>
  );
}



function BasketSortGame({ onBack }) {
  const rounds = [
    {
      base: "🚗",
      stream: ["🚙", "🚗", "🚕", "🚗", "🚙", "🚕"],
      left: ["🚗"],
      right: ["🚕"],
    },
    {
      base: "🍎",
      stream: ["🍏", "🍎", "🍐", "🍎", "🍏", "🍐"],
      left: ["🍎"],
      right: ["🍐"],
    },
    {
      base: "⭐",
      stream: ["✨", "⭐", "🌟", "⭐", "✨", "🌟"],
      left: ["⭐"],
      right: ["🌟"],
    },
    {
      base: "🔵",
      stream: ["🟢", "🔵", "🟣", "🔵", "🟢", "🟣"],
      left: ["🔵"],
      right: ["🟣"],
    },
  ];

  const [screen, setScreen] = useState("notice");
  const [countdown, setCountdown] = useState(3);
  const [roundIndex, setRoundIndex] = useState(0);
  const [remainingTime, setRemainingTime] = useState(120);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [empty, setEmpty] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [paused, setPaused] = useState(false);

  const round = rounds[roundIndex % rounds.length];
  const target = round.stream[round.stream.length - 1];
  const shouldGoLeft = target === round.base;
  const totalAnswered = correct + wrong;
  const accuracy = totalAnswered ? Math.round((correct / totalAnswered) * 100) : 0;

  const formatTime = (value) => {
    const min = String(Math.floor(value / 60)).padStart(2, "0");
    const sec = String(value % 60).padStart(2, "0");
    return `${min}:${sec}`;
  };

  const startCountdown = () => {
    setScreen("countdown");
    setCountdown(3);

    let value = 3;
    const countdownTimer = window.setInterval(() => {
      value -= 1;
      if (value <= 0) {
        window.clearInterval(countdownTimer);
        setScreen("playing");
        setRemainingTime(120);
      } else {
        setCountdown(value);
      }
    }, 1000);
  };

  useEffect(() => {
    if (screen !== "playing" || paused) return;

    const timer = window.setInterval(() => {
      setRemainingTime((time) => {
        if (time <= 1) {
          window.clearInterval(timer);
          setScreen("result");
          return 0;
        }
        return time - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [screen, paused]);

  const sendToBasket = (side) => {
    if (screen !== "playing" || paused || feedback) return;

    const isCorrect = (side === "left" && shouldGoLeft) || (side === "right" && !shouldGoLeft);
    setFeedback(isCorrect ? "correct" : "wrong");

    if (isCorrect) setCorrect((value) => value + 1);
    else setWrong((value) => value + 1);

    window.setTimeout(() => {
      setRoundIndex((value) => value + 1);
      setFeedback(null);
    }, 700);
  };

  const finishGame = () => setScreen("result");

  const restartGame = () => {
    setScreen("notice");
    setCountdown(3);
    setRoundIndex(0);
    setRemainingTime(120);
    setCorrect(0);
    setWrong(0);
    setEmpty(0);
    setFeedback(null);
    setPaused(false);
  };

  if (screen === "notice") {
    return (
      <section className="basket-stage">
        <div className="basket-start-card">
          <div className="basket-start-badge">🧺</div>
          <h2>Gün 1 - Egzersiz 3</h2>
          <h3>Sepete Gönder</h3>
          <span>(Serbest Çalışma)</span>
          <b>Süre: 120 Saniye</b>

          <p>
            <strong>AMAÇ:</strong> Bu egzersiz dikkat, odaklanma, konsantrasyon
            ve hızlı karar verme becerisini güçlendirmek için hazırlanmıştır.
          </p>

          <p>
            <strong>OYNAMA ŞEKLİ:</strong> Ekranda akan nesneleri en alttaki
            hedef nesneye göre doğru sepete gönder. Klavyede sol ve sağ yön
            tuşlarını da kullanabilirsin.
          </p>

          <div className="basket-start-actions">
            <button type="button" className="ghost" onClick={onBack}>Listeye Dön</button>
            <button type="button" onClick={startCountdown}>BAŞLA</button>
          </div>
        </div>
      </section>
    );
  }

  if (screen === "countdown") {
    return (
      <section className="basket-countdown-screen">
        <div className="basket-countdown-card">
          <span>Hazırlan</span>
          <strong>{countdown}</strong>
          <p>Hedef nesneyi aklında tut ve doğru sepete gönder.</p>
        </div>
      </section>
    );
  }

  if (screen === "result") {
    return (
      <section className="basket-stage">
        <div className="basket-result-card">
          <div className="basket-result-medal">🏆</div>
          <h2>Oyun Bitti!</h2>

          <div className="basket-result-grid">
            <span>Skorun</span><b>{correct}</b>
            <span>Doğru Cevap Yüzdesi</span><b>%{accuracy}</b>
            <span>Doğru</span><b>{correct}</b>
            <span>Yanlış</span><b>{wrong}</b>
            <span>Boş</span><b>{empty}</b>
          </div>

          <p>
            {accuracy >= 70
              ? "Harika! Görsel ayırt etme ve hızlı karar verme becerin güçlü."
              : "Tekrar dene. Hedef nesneyi önce zihninde sabitle, sonra hızlı karar ver."}
          </p>

          <div className="basket-result-actions">
            <button type="button" onClick={restartGame}>Tekrar Oyna</button>
            <button type="button" className="ghost" onClick={onBack}>Egzersizlere Git</button>
          </div>
        </div>
      </section>
    );
  }

  if (paused) {
    return (
      <section className="basket-pause-screen" onClick={() => setPaused(false)}>
        <div className="basket-pause-card">
          <div className="basket-pause-icon">Ⅱ</div>
          <h2>Egzersiz duraklatıldı.</h2>
          <p>Devam etmek için tıklayın</p>
        </div>
      </section>
    );
  }

  return (
    <section className="basket-game-page">
      <div className="basket-game-header">
        <div><strong>Kalan Süre</strong><span>{formatTime(remainingTime)}</span></div>
        <i />
        <div><strong>Doğru</strong><span>{correct}</span></div>
        <i />
        <div><strong>Yanlış</strong><span>{wrong}</span></div>
        <i />
        <div><strong>Boş</strong><span>{empty}</span></div>
      </div>

      <div className={`basket-arena ${feedback || ""}`}>
        <div className="basket-target-strip">
          <span>Hedef Nesne</span>
          <strong>{round.base}</strong>
        </div>

        <div className="basket-stream">
          {round.stream.map((item, index) => (
            <span key={`${item}-${index}`} className={index === round.stream.length - 1 ? "active" : ""}>
              {item}
            </span>
          ))}
        </div>

        <div className="basket-feedback">
          {feedback === "correct" && <span className="ok">✓ Doğru</span>}
          {feedback === "wrong" && <span className="bad">✕ Yanlış</span>}
        </div>

        <div className="basket-zone">
          <button
            type="button"
            className="basket-bin left"
            onClick={() => sendToBasket("left")}
          >
            <span className="basket-handle" />
            <div className="basket-body">
              {round.left.map((item, index) => <b key={index}>{item}</b>)}
            </div>
            <em>Sol Sepet</em>
          </button>

          <button
            type="button"
            className="basket-bin right"
            onClick={() => sendToBasket("right")}
          >
            <span className="basket-handle" />
            <div className="basket-body">
              {round.right.map((item, index) => <b key={index}>{item}</b>)}
            </div>
            <em>Sağ Sepet</em>
          </button>
        </div>
      </div>

      <div className="basket-bottom">
        <div className="basket-total-progress">
          <i style={{ width: `${Math.min((remainingTime / 120) * 100, 100)}%` }} />
        </div>

        <button type="button" onClick={() => setPaused(true)}>Ⅱ Duraklat</button>
        <button type="button" className="finish" onClick={finishGame}>Bitir</button>
      </div>
    </section>
  );
}


function NumberFindGame({ onBack }) {
  const createQuestion = (seed) => {
    const answer = 6 + ((seed * 3) % 11);
    const columns = [];
    let remaining = answer;

    while (remaining > 0) {
      const next = Math.min(remaining, 2 + ((seed + remaining) % 4));
      columns.push(next);
      remaining -= next;
    }

    const options = Array.from(
      new Set([
        answer,
        Math.max(1, answer - 2),
        answer + 2,
        answer + ((seed % 2) + 3),
      ])
    ).slice(0, 4);

    while (options.length < 4) options.push(answer + options.length + 4);

    return {
      answer,
      dots: columns,
      options: options.sort(() => 0.5 - Math.random()),
    };
  };

  const [screen, setScreen] = useState("notice");
  const [countdown, setCountdown] = useState(3);
  const [questionIndex, setQuestionIndex] = useState(1);
  const [question, setQuestion] = useState(() => createQuestion(1));
  const [remainingTime, setRemainingTime] = useState(120);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [empty, setEmpty] = useState(0);
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [paused, setPaused] = useState(false);

  const totalAnswered = correct + wrong;
  const score = correct;
  const accuracy = totalAnswered ? Math.round((correct / totalAnswered) * 100) : 0;

  const formatTime = (value) => {
    const min = String(Math.floor(value / 60)).padStart(2, "0");
    const sec = String(value % 60).padStart(2, "0");
    return `${min}:${sec}`;
  };

  const startCountdown = () => {
    setScreen("countdown");
    setCountdown(3);

    let value = 3;
    const countdownTimer = window.setInterval(() => {
      value -= 1;
      if (value <= 0) {
        window.clearInterval(countdownTimer);
        setScreen("playing");
        setRemainingTime(120);
      } else {
        setCountdown(value);
      }
    }, 1000);
  };

  useEffect(() => {
    if (screen !== "playing" || paused) return;

    const timer = window.setInterval(() => {
      setRemainingTime((time) => {
        if (time <= 1) {
          window.clearInterval(timer);
          setScreen("result");
          return 0;
        }
        return time - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [screen, paused]);

  const nextQuestion = () => {
    setQuestionIndex((index) => {
      const next = index + 1;
      setQuestion(createQuestion(next));
      return next;
    });
    setSelected(null);
    setFeedback(null);
  };

  const selectAnswer = (option) => {
    if (selected !== null || paused || screen !== "playing") return;

    const isCorrect = option === question.answer;
    setSelected(option);
    setFeedback(isCorrect ? "correct" : "wrong");

    if (isCorrect) setCorrect((value) => value + 1);
    else setWrong((value) => value + 1);

    window.setTimeout(nextQuestion, 650);
  };

  const finishGame = () => {
    setScreen("result");
  };

  const restartGame = () => {
    setQuestionIndex(1);
    setQuestion(createQuestion(1));
    setRemainingTime(120);
    setCorrect(0);
    setWrong(0);
    setEmpty(0);
    setSelected(null);
    setFeedback(null);
    setPaused(false);
    setScreen("notice");
  };

  if (screen === "notice") {
    return (
      <section className="number-game-stage">
        <div className="number-start-card">
          <div className="number-start-icon">●</div>
          <h2>Gün 1 - Egzersiz 1</h2>
          <h3>Say Bakalım</h3>
          <span>(Serbest Çalışma)</span>
          <b>Süre: 120 Saniye</b>

          <p>
            <strong>AMAÇ:</strong> Bu çalışma dikkat ve odaklanmayı artırmaya,
            zihinsel işlem hızını güçlendirmeye yönelik hazırlanmıştır.
          </p>

          <p>
            <strong>OYNAMA ŞEKLİ:</strong> Ekranda çıkan tüm noktaları sayın ve
            doğru cevabı 5 saniye içinde işaretleyin. Mümkün olduğunca doğru ve
            hızlı cevap vermeye çalışın.
          </p>

          <div className="number-start-actions">
            <button type="button" className="ghost" onClick={onBack}>Listeye Dön</button>
            <button type="button" onClick={startCountdown}>BAŞLA</button>
          </div>
        </div>
      </section>
    );
  }

  if (screen === "countdown") {
    return (
      <section className="number-countdown-screen">
        <div className="number-countdown-card">
          <span>Hazırlan</span>
          <strong>{countdown}</strong>
          <p>Noktaları grup halinde görmeye çalış.</p>
        </div>
      </section>
    );
  }

  if (screen === "result") {
    return (
      <section className="number-game-stage">
        <div className="number-result-card">
          <div className="number-result-medal">🏆</div>
          <h2>Oyun Bitti!</h2>

          <div className="number-result-grid">
            <span>Skorun</span><b>{score}</b>
            <span>Doğru Cevap Yüzdesi</span><b>%{accuracy}</b>
            <span>Doğru</span><b>{correct}</b>
            <span>Yanlış</span><b>{wrong}</b>
            <span>Boş</span><b>{empty}</b>
          </div>

          <p>
            {accuracy >= 70
              ? "Harika! Hızlı algılama ve dikkat performansın güçlü görünüyor."
              : "Gelişim için tekrar dene. Noktaları tek tek saymak yerine gruplar halinde görmeye çalış."}
          </p>

          <div className="number-result-actions">
            <button type="button" onClick={restartGame}>Tekrar Oyna</button>
            <button type="button" className="ghost" onClick={onBack}>Egzersizlere Git</button>
          </div>
        </div>
      </section>
    );
  }

  if (paused) {
    return (
      <section className="number-pause-screen" onClick={() => setPaused(false)}>
        <div className="number-pause-card">
          <div className="pause-icon">Ⅱ</div>
          <h2>Egzersiz duraklatıldı.</h2>
          <p>Devam etmek için tıklayın</p>
        </div>
      </section>
    );
  }

  return (
    <section className="number-game-page">
      <div className="number-game-header">
        <div><strong>Kalan Süre</strong><span>{formatTime(remainingTime)}</span></div>
        <i />
        <div><strong>Doğru</strong><span>{correct}</span></div>
        <i />
        <div><strong>Yanlış</strong><span>{wrong}</span></div>
        <i />
        <div><strong>Boş</strong><span>{empty}</span></div>
      </div>

      <div className={`number-game-card ${feedback || ""}`}>
        <div className="number-round-indicator">
          <span>⏱</span>
          <strong>{questionIndex}</strong>
        </div>

        <div className="number-question-timer">
          <i style={{ width: `${Math.max(15, 100 - ((questionIndex % 5) * 18))}%` }} />
        </div>

        <div className="number-dot-pattern">
          {question.dots.map((count, columnIndex) => (
            <div className="number-dot-column" key={columnIndex}>
              {Array.from({ length: count }).map((_, dotIndex) => (
                <span key={dotIndex} />
              ))}
            </div>
          ))}
        </div>

        <div className="number-divider" />

        <div className="number-options">
          {question.options.map((option) => {
            const isSelected = selected === option;
            const isCorrect = option === question.answer;

            return (
              <button
                type="button"
                key={option}
                onClick={() => selectAnswer(option)}
                className={
                  selected === null
                    ? ""
                    : isSelected && isCorrect
                      ? "correct"
                      : isSelected && !isCorrect
                        ? "wrong"
                        : isCorrect
                          ? "show-correct"
                          : ""
                }
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>

      <div className="number-game-bottom">
        <div className="number-total-progress">
          <i style={{ width: `${Math.min((remainingTime / 120) * 100, 100)}%` }} />
        </div>

        <button type="button" onClick={() => setPaused(true)}>Ⅱ Duraklat</button>
        <button type="button" className="finish" onClick={finishGame}>Bitir</button>
      </div>
    </section>
  );
}


function ExerciseMapPage() {
  const [activeExercise, setActiveExercise] = useState(null);

  const categories = [
    "Okuma Hızı Anlama Oranı",
    "Göz ve Görme Alanı",
    "Kelime Hazinesi",
    "Hafıza Egzersizleri",
    "Dikkat Odaklanma",
    "Konsantrasyon",
    "Sayısal İşlemler",
    "Metin Düzeyinde Egzersizler",
    "Takistoskop",
  ];

  const names = [
    "Sayı Bulma",
    "Okuma ve Anlama Ölçümü",
    "Sepete Gönder",
    "Kare Gör",
    "Karışık Harf",
    "Hafıza Kartları",
    "Açılan Nesneler",
    "Eşleşen Meyveler",
    "Eksik Harfler",
    "Sesleri Eşleştir",
    "Seçili Metin",
    "Yanlış Renk",
    "Takip Et Bul",
    "Görme Açısı",
    "Sayıları Hatırla",
    "Farklı Kelimeler",
    "Noktaları Birleştir",
    "Kelimeyi Hatırla",
    "Ayrımsal Bul",
    "Şekil Takip",
    "Kelime Bulmacası",
    "İki Resim Arasındaki Farklar",
    "İki Kelimeyi Hatırla",
    "Kökün Aksi",
    "Simetrisini Bul",
    "Aynı mı, Farklı mı?",
    "Araba Yarışı",
    "Kareleri Say",
    "Hareketli Okuma",
    "En Küçük Sayıyı Bul",
    "Renkli Hafıza Kartları",
    "Kelime Diyagramı",
    "Topla, Çıkar, Çarp, Böl",
    "Ayır Şekil Aynı Harf",
    "Akan Kelimeler",
    "Satır Başı Sorusu",
  ];

  const exercises = Array.from({ length: 126 }, (_, index) => {
    const day = Math.floor(index / 6) + 1;
    const no = (index % 6) + 1;
    const category = categories[index % categories.length];
    const status = index < 8 ? "completed" : index === 8 ? "active" : "locked";

    return {
      id: index + 1,
      day,
      no,
      name: names[index % names.length],
      category,
      status,
      score: status === "completed" ? 70 + (index % 25) : 0,
      time: status === "completed" ? `${8 + (index % 12)} dk` : "-",
    };
  });

  const [search, setSearch] = useState("");
  const [dayFilter, setDayFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState({ key: "id", direction: "asc" });

  const requestSort = (key) => {
    setSortConfig((current) => {
      if (current.key === key) {
        return {
          key,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }

      return { key, direction: "asc" };
    });
  };

  const sortIcon = (key) => {
    if (sortConfig.key !== key) return "↕";
    return sortConfig.direction === "asc" ? "↑" : "↓";
  };

  if (activeExercise === "Sayı Bulma") {
    return <NumberFindGame onBack={() => setActiveExercise(null)} />;
  }

  if (activeExercise === "Sepete Gönder") {
    return <BasketSortGame onBack={() => setActiveExercise(null)} />;
  }

  const filteredExercises = exercises.filter((exercise) => {
    const matchesSearch =
      exercise.name.toLowerCase().includes(search.toLowerCase()) ||
      exercise.category.toLowerCase().includes(search.toLowerCase());

    const matchesDay = dayFilter === "all" || String(exercise.day) === dayFilter;
    const matchesCategory = categoryFilter === "all" || exercise.category === categoryFilter;
    const effectiveStatus =
      exercise.name === "Sayı Bulma" || exercise.name === "Sepete Gönder"
        ? "playable"
        : exercise.status;
    const matchesStatus = statusFilter === "all" || effectiveStatus === statusFilter;

    return matchesSearch && matchesDay && matchesCategory && matchesStatus;
  }).sort((a, b) => {
    const getValue = (item) => {
      if (sortConfig.key === "status") {
        return item.name === "Sayı Bulma" || item.name === "Sepete Gönder"
          ? "playable"
          : item.status;
      }
      return item[sortConfig.key];
    };

    const aValue = getValue(a);
    const bValue = getValue(b);

    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
    }

    return sortConfig.direction === "asc"
      ? String(aValue).localeCompare(String(bValue), "tr")
      : String(bValue).localeCompare(String(aValue), "tr");
  });

  const completedCount = exercises.filter((item) => item.status === "completed").length;
  const activeCount = exercises.filter((item) => item.status === "active").length;
  const lockedCount = exercises.filter((item) => item.status === "locked").length;
  const progress = Math.round((completedCount / exercises.length) * 100);

  const getStatusLabel = (status) => {
    if (status === "completed") return "Tamamlandı";
    if (status === "active") return "Aktif";
    return "Kilitli";
  };

  return (
    <section className="exercise-list-page">
      <div className="exercise-list-hero">
        <div>
          <span>21 Günlük Eğitim Planı</span>
          <h2>126 egzersizi tek ekrandan takip et.</h2>
          <p>
            Gün, kategori, başarı ve durum bilgilerine göre tüm egzersizleri
            görüntüle. İlk egzersiz olan Sayı Bulma artık oynanabilir.
          </p>
        </div>

        <div className="exercise-list-progress">
          <div className="exercise-progress-ring" style={{ "--exercise-progress": `${progress}%` }}>
            <strong>%{progress}</strong>
            <span>Tamamlandı</span>
          </div>
        </div>
      </div>

      <div className="exercise-summary-grid">
        <article>
          <span>Toplam Egzersiz</span>
          <strong>{exercises.length}</strong>
        </article>
        <article>
          <span>Tamamlanan</span>
          <strong>{completedCount}</strong>
        </article>
        <article>
          <span>Aktif Egzersiz</span>
          <strong>{activeCount}</strong>
        </article>
        <article>
          <span>Kilitli</span>
          <strong>{lockedCount}</strong>
        </article>
      </div>

      <div className="exercise-filter-card">
        <label>
          Egzersiz Ara
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Egzersiz adı veya kategori yaz..."
          />
        </label>

        <label>
          Gün
          <select value={dayFilter} onChange={(event) => setDayFilter(event.target.value)}>
            <option value="all">Tüm Günler</option>
            {Array.from({ length: 21 }, (_, index) => (
              <option key={index + 1} value={index + 1}>
                {index + 1}. Gün
              </option>
            ))}
          </select>
        </label>

        <label>
          Kategori
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value="all">Tüm Kategoriler</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label>
          Durum
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">Tüm Durumlar</option>
            <option value="playable">Oynanabilir</option>
            <option value="completed">Tamamlandı</option>
            <option value="active">Aktif</option>
            <option value="locked">Kilitli</option>
          </select>
        </label>
      </div>

      <div className="exercise-table-card">
        <div className="exercise-table-head">
          <div>
            <span>Egzersiz Listesi</span>
            <h3>{filteredExercises.length} egzersiz gösteriliyor</h3>
          </div>
          <button type="button">Raporu Dışa Aktar</button>
        </div>

        <div className="exercise-table-wrap">
          <table className="exercise-table">
            <thead>
              <tr>
                <th>
                  <button type="button" className="sort-head" onClick={() => requestSort("day")}>
                    Gün <span>{sortIcon("day")}</span>
                  </button>
                </th>
                <th>
                  <button type="button" className="sort-head" onClick={() => requestSort("no")}>
                    No <span>{sortIcon("no")}</span>
                  </button>
                </th>
                <th>
                  <button type="button" className="sort-head" onClick={() => requestSort("name")}>
                    Egzersiz Adı <span>{sortIcon("name")}</span>
                  </button>
                </th>
                <th>
                  <button type="button" className="sort-head" onClick={() => requestSort("category")}>
                    Kategori <span>{sortIcon("category")}</span>
                  </button>
                </th>
                <th>
                  <button type="button" className="sort-head" onClick={() => requestSort("status")}>
                    Durum <span>{sortIcon("status")}</span>
                  </button>
                </th>
                <th>
                  <button type="button" className="sort-head" onClick={() => requestSort("score")}>
                    Puan <span>{sortIcon("score")}</span>
                  </button>
                </th>
                <th>
                  <button type="button" className="sort-head" onClick={() => requestSort("time")}>
                    Süre <span>{sortIcon("time")}</span>
                  </button>
                </th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {filteredExercises.map((exercise) => {
                const playable = exercise.name === "Sayı Bulma" || exercise.name === "Sepete Gönder";

                return (
                  <tr key={exercise.id} className={playable ? "playable-row" : ""}>
                    <td>
                      <b className="day-badge">{exercise.day}</b>
                    </td>
                    <td>{exercise.no}</td>
                    <td>
                      <strong>{exercise.name}</strong>
                    </td>
                    <td>
                      <span className="category-chip">{exercise.category}</span>
                    </td>
                    <td>
                      <span className={`status-chip ${playable ? "active" : exercise.status}`}>
                        {playable ? "Oynanabilir" : getStatusLabel(exercise.status)}
                      </span>
                    </td>
                    <td>{exercise.score || "-"}</td>
                    <td>{playable ? "120 sn" : exercise.time}</td>
                    <td>
                      <button
                        type="button"
                        className="go-exercise-btn"
                        disabled={!playable && exercise.status === "locked"}
                        onClick={() => playable && setActiveExercise(exercise.name)}
                      >
                        {playable ? "Oyuna Başla" : "Egzersize Git"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}


function DotCountingExercise({ onBack }) {
  const questions = [
    { dots: [4, 5, 3, 2], answer: 14, options: [10, 14, 12, 9] },
    { dots: [3, 3, 4, 2], answer: 12, options: [11, 12, 15, 9] },
    { dots: [5, 4, 4, 3], answer: 16, options: [13, 18, 16, 14] },
    { dots: [2, 5, 5, 2], answer: 14, options: [14, 10, 12, 17] },
    { dots: [4, 4, 4, 4], answer: 16, options: [12, 16, 15, 18] },
  ];

  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [empty, setEmpty] = useState(5);
  const [selected, setSelected] = useState(null);
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false);

  const current = questions[index];
  const progress = Math.round(((index + (selected !== null ? 1 : 0)) / questions.length) * 100);

  const selectAnswer = (option) => {
    if (selected !== null || paused || finished) return;

    setSelected(option);
    const isCorrect = option === current.answer;

    if (isCorrect) setCorrect((v) => v + 1);
    else setWrong((v) => v + 1);

    setEmpty((v) => Math.max(v - 1, 0));

    window.setTimeout(() => {
      if (index + 1 >= questions.length) {
        setFinished(true);
      } else {
        setIndex((v) => v + 1);
        setSelected(null);
      }
    }, 650);
  };

  const restart = () => {
    setIndex(0);
    setCorrect(0);
    setWrong(0);
    setEmpty(5);
    setSelected(null);
    setPaused(false);
    setFinished(false);
  };

  return (
    <section className="dot-exercise-page">
      <div className="dot-exercise-top">
        <button type="button" className="exercise-back-btn" onClick={onBack}>
          ← Egzersizlere Dön
        </button>

        <div className="dot-scorebar">
          <div>
            <strong>Kalan Süre</strong>
            <span>01:34</span>
          </div>
          <i />
          <div>
            <strong>Doğru</strong>
            <span>{correct}</span>
          </div>
          <i />
          <div>
            <strong>Yanlış</strong>
            <span>{wrong}</span>
          </div>
          <i />
          <div>
            <strong>Boş</strong>
            <span>{empty}</span>
          </div>
        </div>
      </div>

      <div className="dot-game-shell">
        <div className="dot-game-card">
          {!finished ? (
            <>
              <div className="dot-round-head">
                <div className="dot-timer-badge">
                  <span>⏱</span>
                  <strong>{index + 1}</strong>
                </div>

                <div className="dot-question-progress">
                  <i style={{ width: `${Math.min(progress, 100)}%` }} />
                </div>

                <p>Noktaları hızlıca grupla, toplam sayıyı seç.</p>
              </div>

              <div className="dot-pattern" aria-label="Nokta grubu">
                {current.dots.map((count, columnIndex) => (
                  <div className="dot-column" key={columnIndex}>
                    {Array.from({ length: count }).map((_, dotIndex) => (
                      <span key={dotIndex} />
                    ))}
                  </div>
                ))}
              </div>

              <div className="dot-divider" />

              <div className="dot-options">
                {current.options.map((option) => {
                  const isSelected = selected === option;
                  const isCorrect = option === current.answer;
                  return (
                    <button
                      type="button"
                      key={option}
                      onClick={() => selectAnswer(option)}
                      className={
                        selected === null
                          ? ""
                          : isSelected && isCorrect
                            ? "correct"
                            : isSelected && !isCorrect
                              ? "wrong"
                              : isCorrect
                                ? "show-correct"
                                : ""
                      }
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="dot-result">
              <div className="dot-result-medal">🏆</div>
              <h2>Egzersiz Tamamlandı</h2>
              <p>
                {correct} doğru, {wrong} yanlış yaptın. Bir sonraki turda
                noktaları tek tek saymak yerine gruplar halinde görmeye çalış.
              </p>
              <button type="button" onClick={restart}>Tekrar Başla</button>
            </div>
          )}
        </div>

        <div className="dot-bottom-control">
          <div className="dot-total-progress">
            <i style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>

          <button type="button" onClick={() => setPaused((v) => !v)}>
            {paused ? "▶ Devam Et" : "Ⅱ Duraklat"}
          </button>
        </div>
      </div>

      <aside className="dot-coach-panel">
        <span>Fixoku İpucu</span>
        <h3>Bu egzersiz neyi geliştirir?</h3>
        <p>
          Bu çalışma gözün hızlı algılama, dikkat, kısa süreli hafıza ve sayısal
          işlem becerisini birlikte çalıştırır.
        </p>

        <div className="dot-skill-row">
          <b>Dikkat</b>
          <i><em style={{ width: "82%" }} /></i>
        </div>
        <div className="dot-skill-row">
          <b>Görsel Algı</b>
          <i><em style={{ width: "76%" }} /></i>
        </div>
        <div className="dot-skill-row">
          <b>Hız</b>
          <i><em style={{ width: "68%" }} /></i>
        </div>
      </aside>
    </section>
  );
}


function FreeExercisesPage() {
  const [activeExercise, setActiveExercise] = useState(null);

  if (activeExercise === "Sayısal İşlemler") {
    return <DotCountingExercise onBack={() => setActiveExercise(null)} />;
  }

  return (
    <section className="fx-listing-page">
      <div className="fx-page-title-with-bee">
        <h2><span>SERBEST</span> EGZERSİZLER</h2>
        <Bee />
      </div>

      <div className="fx-exercise-grid">
        {freeExercises.map((item) => (
          <article
            className={`fx-exercise-card ${item.title === "Sayısal İşlemler" ? "is-playable" : ""}`}
            key={item.title}
            onClick={() => item.title === "Sayısal İşlemler" && setActiveExercise(item.title)}
          >
            <div className="fx-exercise-illustration">{item.icon}</div>
            <h3>{item.title}</h3>
            {item.title === "Sayısal İşlemler" && <button type="button">Egzersizi Başlat</button>}
          </article>
        ))}
      </div>
    </section>
  );
}

function ChallengePage() {
  return (
    <section className="fx-listing-page fx-challenge-page">
      <ScoreBadge />
      <h2 className="fx-plain-title">MEYDAN OKUMA</h2>

      <div className="fx-challenge-grid">
        {challengeCards.map((item) => (
          <article className="fx-challenge-card" key={item.title}>
            <div className="fx-challenge-illustration">{item.icon}</div>
            <h3>{item.title}</h3>
            <button>İstatistikleri Gör</button>
          </article>
        ))}
      </div>
    </section>
  );
}

function StatisticsPage() {
  return (
    <section className="fx-statistics-page">
      <ScoreBadge />
      <h2 className="fx-plain-title">İSTATİSTİKLER</h2>

      <div className="fx-statistics-grid">
        {studentCategories.map((item) => (
          <CategoryCard key={item.title} item={item} />
        ))}
      </div>
    </section>
  );
}

export default function StudentPanel({ user, onLogout }) {
  const [activePage, setActivePage] = useState("dashboard");

  const pageTitle = useMemo(() => {
    const item = studentMenu.find((m) => m.key === activePage);
    if (activePage === "dashboard") return "Öğrenci Yazılım Paneli";
    return item?.label || "Öğrenci Yazılım Paneli";
  }, [activePage]);

  const pages = {
    dashboard: <DashboardHome />,
    kronometre: <KronometrePage />,
    profil: <ProfilePage user={user} />,
    egzersizler: <ExerciseMapPage />,
    serbest: <FreeExercisesPage />,
    meydan: <ChallengePage />,
    istatistik: <StatisticsPage />,
  };

  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      title={pageTitle}
      subtitle="Okuma hızı, anlama, dikkat ve 21 günlük gelişim sürecin burada."
      menuItems={studentMenu}
      activeMenu={activePage}
      onMenuChange={setActivePage}
    >
      {pages[activePage]}
    </DashboardLayout>
  );
}
