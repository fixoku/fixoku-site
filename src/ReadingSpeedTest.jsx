import { useEffect, useState } from "react";
import { getNextReadingText } from "./utils/readingTextRotation.js";

function getReadingGradeKey(level, subLevel) {
  if (level === "ilkokul" && subLevel === "3-sinif") return "3";
  if (level === "ilkokul" && subLevel === "4-sinif") return "4";
  if (level === "ortaokul" && subLevel === "5-6-sinif") return "5-6";
  if (level === "ortaokul" && subLevel === "7-8-sinif") return "7-8";
  if (level === "lise") return "lise";
  return null;
}

function adaptReadingText(text) {
  return {
    id: text.id,
    title: text.title,
    wordCount: text.wordCount,
    text: text.content || text.paragraphs?.join("\n\n") || "",
    questions: text.questions.map((question) => ({
      id: question.id,
      question: question.question,
      options: question.options.map((option) => option.text),
      correctIndex: question.options.findIndex(
        (option) => option.key === question.correctAnswer
      ),
    })),
  };
}

const readingLevelAverages = {
  "3-sinif": { label: "3. Sınıf Ortalaması", speed: "70 - 100", comprehension: "%60 - %80" },
  "4-sinif": { label: "4. Sınıf Ortalaması", speed: "100 - 120", comprehension: "%60 - %80" },
  "5-6-sinif": { label: "5-6. Sınıf Ortalaması", speed: "120 - 150", comprehension: "%80" },
  "7-8-sinif": { label: "7-8. Sınıf Ortalaması", speed: "150 - 180", comprehension: "%80" },
  lise: { label: "Lise Ortalaması", speed: "180 - 250+", comprehension: "%80" },
};

function getReadingLevelLabel(level, subLevel) {
  if (level === "ilkokul") return subLevel === "3-sinif" ? "İlkokul / 3. Sınıf" : "İlkokul / 4. Sınıf";
  if (level === "ortaokul") return subLevel === "5-6-sinif" ? "Ortaokul / 5-6. Sınıf" : "Ortaokul / 7-8. Sınıf";
  if (level === "lise") return "Lise";
  return "";
}

function getSelectedAverage(level, subLevel) {
  const key = level === "lise" ? "lise" : subLevel;
  return readingLevelAverages[key];
}

function getResultComment(speed, comprehension) {
  if (speed >= 180 && comprehension >= 80) return { title: "Dengeli ve güçlü okuyucu", text: "Okuma hızı ve anlama oranı birlikte iyi görünüyor. Düzenli egzersizlerle seviye daha da güçlenebilir." };
  if (speed >= 180) return { title: "Hız iyi, anlama desteklenmeli", text: "Öğrenci hızlı okuyor; ancak metindeki ayrıntıları yakalama ve paragraf anlama becerisi güçlendirilebilir." };
  if (comprehension >= 80) return { title: "Anlama iyi, hız geliştirilebilir", text: "Öğrenci metni dikkatli anlıyor. Okuma akıcılığı ve göz egzersizleriyle hız tarafı geliştirilebilir." };
  return { title: "Gelişim planı önerilir", text: "Okuma hızı ve anlama oranı birlikte desteklenmeli. Uzman eğitmen değerlendirmesiyle daha doğru bir yol haritası hazırlanabilir." };
}

export default function ReadingSpeedTest({ isOpen, onClose }) {
  const [step, setStep] = useState("level");
  const [level, setLevel] = useState("");
  const [subLevel, setSubLevel] = useState("");
  const [selectedText, setSelectedText] = useState(null);
  const [startedAt, setStartedAt] = useState(null);
  const [readingSeconds, setReadingSeconds] = useState(0);
  const [answers, setAnswers] = useState({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [formData, setFormData] = useState({ parentName: "", phone: "", studentClass: "", city: "" });
  const [readingWarning, setReadingWarning] = useState("");
  const [showPhoneNumber, setShowPhoneNumber] = useState(false);
  const [readingFontSize, setReadingFontSize] = useState(18);

  useEffect(() => {
    if (!isOpen || step !== "reading" || !startedAt) return undefined;
    const timer = setInterval(() => {
      setReadingSeconds(Math.max(1, Math.floor((Date.now() - startedAt) / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, step, startedAt]);

  if (!isOpen) return null;

  const totalQuestions = selectedText?.questions?.length || 0;
  const correctCount = selectedText ? selectedText.questions.reduce((total, item, index) => total + (answers[index] === item.correctIndex ? 1 : 0), 0) : 0;
  const comprehension = totalQuestions ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const speed = selectedText && readingSeconds ? Math.round(selectedText.wordCount / (readingSeconds / 60)) : 0;
  const resultComment = getResultComment(speed, comprehension);
  const activeQuestion = selectedText?.questions?.[questionIndex];
  const selectedAverage = getSelectedAverage(level, subLevel);
  const canContinueFromLevel = level === "lise" || ((level === "ilkokul" || level === "ortaokul") && subLevel);

  const resetPreparedTest = () => {
    setSelectedText(null);
    setStartedAt(null);
    setReadingSeconds(0);
    setAnswers({});
    setQuestionIndex(0);
    setReadingWarning("");
  };

  const selectLevel = (nextLevel) => {
    setLevel(nextLevel);
    setSubLevel("");
    resetPreparedTest();
  };

  const selectSubLevel = (nextSubLevel) => {
    setSubLevel(nextSubLevel);
    resetPreparedTest();
  };


  const resetTest = () => {
    setStep("level");
    setLevel("");
    setSubLevel("");
    setSelectedText(null);
    setStartedAt(null);
    setReadingSeconds(0);
    setAnswers({});
    setQuestionIndex(0);
    setFormData({ parentName: "", phone: "", studentClass: "", city: "" });
    setReadingWarning("");
    setShowPhoneNumber(false);
    setReadingFontSize(18);
  };

  const closeTest = () => {
    resetTest();
    onClose();
  };

  const goBack = () => {
    if (step === "info") setStep("level");
    if (step === "reading") {
      setStartedAt(null);
      setReadingSeconds(0);
      setStep("info");
    }
    if (step === "questions") {
      setQuestionIndex(0);
      setStep("reading");
    }
    if (step === "result") setStep("questions");
  };

  const prepareTest = () => {
    const gradeKey = getReadingGradeKey(level, subLevel);
    if (!gradeKey) return;

    const picked = adaptReadingText(getNextReadingText(gradeKey));
    setSelectedText(picked);
    setAnswers({});
    setQuestionIndex(0);
    setReadingSeconds(0);
    setStartedAt(null);
    setStep("info");
  };

  const startReading = () => {
    setStartedAt(Date.now());
    setReadingSeconds(0);
    setStep("reading");
  };

  const finishReading = () => {
  const seconds = Math.max(1, Math.floor((Date.now() - startedAt) / 1000));

  if (seconds < 40) {
    setReadingWarning("Lütfen okumayı tamamlayın.");
    return;
  }

  setReadingWarning("");
  setReadingSeconds(seconds);
  setStep("questions");
};

  return (
    <div className="reading-test-overlay" role="dialog" aria-modal="true">
      <div className="reading-test-modal">
        <button className="reading-test-close" type="button" onClick={closeTest} aria-label="Testi kapat">×</button>

        <div className="reading-test-top">
          {step !== "level" && <button type="button" className="reading-test-back" onClick={goBack}>← Önceki</button>}
          <div className="reading-test-progress">
            {["level", "info", "reading", "questions", "result"].map((item, index) => (
              <span key={item} className={index <= ["level", "info", "reading", "questions", "result"].indexOf(step) ? "active" : ""} />
            ))}
          </div>
        </div>

        {step === "level" && (
          <div className="reading-test-screen">
            <div className="reading-test-kicker">Ücretsiz Okuma ve Anlama Testi</div>
            <h2>Öğrencinin seviyesini seçin</h2>
            <p>Seçime göre metin rastgele belirlenir. Okuma süresi ve anlama oranı birlikte ölçülür.</p>

            <div className="reading-level-grid">
              {[{ key: "ilkokul", label: "İlkokul", icon: "🎒" }, { key: "ortaokul", label: "Ortaokul", icon: "📚" }, { key: "lise", label: "Lise", icon: "🎓" }].map((item) => (
                <button key={item.key} type="button" className={`reading-level-card ${level === item.key ? "selected" : ""}`} onClick={() => selectLevel(item.key)}>
                  <span>{item.icon}</span>
                  <strong>{item.label}</strong>
                </button>
              ))}
            </div>

            {(level === "ilkokul" || level === "ortaokul") && (
              <div className="reading-sublevel-box">
                <strong>{level === "ilkokul" ? "İlkokul için sınıf seçin" : "Ortaokul için sınıf seçin"}</strong>
                <div>
                  {level === "ilkokul" ? (
                    <>
                      <button type="button" className={subLevel === "3-sinif" ? "selected" : ""} onClick={() => selectSubLevel("3-sinif")}>3. Sınıf</button>
                      <button type="button" className={subLevel === "4-sinif" ? "selected" : ""} onClick={() => selectSubLevel("4-sinif")}>4. Sınıf</button>
                    </>
                  ) : (
                    <>
                      <button type="button" className={subLevel === "5-6-sinif" ? "selected" : ""} onClick={() => selectSubLevel("5-6-sinif")}>5-6. Sınıf</button>
                      <button type="button" className={subLevel === "7-8-sinif" ? "selected" : ""} onClick={() => selectSubLevel("7-8-sinif")}>7-8. Sınıf</button>
                    </>
                  )}
                </div>
              </div>
            )}

<button
  type="button"
  className="reading-primary-btn"
  disabled={!canContinueFromLevel}
  onClick={prepareTest}
>
  Devam Et
</button>
          </div>
        )}

        {step === "info" && selectedText && (
          <div className="reading-test-screen">
            <div className="reading-test-kicker">{getReadingLevelLabel(level, subLevel)}</div>
            <h2>Test hakkında bilgi</h2>
            <div className="reading-info-card">
              <div><strong>{selectedText.wordCount}</strong><span>Kelime</span></div>
              <div><strong>{selectedText.questions.length}</strong><span>Soru</span></div>
              <div><strong>Rastgele</strong><span>Metin</span></div>
            </div>
            <p>Hazır olduğunuzda testi başlatın. Metni kendi hızınızda okuyun. Okuma bitince “Okumayı Bitirdim” butonuna basın ve soruları cevaplayın.</p>

            <button
              type="button"
              className="reading-primary-btn"
              onClick={startReading}
            >
              Testi Başlat
            </button>
          </div>
        )}

        {step === "reading" && selectedText && (
          <div className="reading-test-screen reading-test-screen-wide">
            <div className="reading-test-kicker">Süre ölçülüyor • {selectedText.wordCount} kelime</div>
            <div className="reading-title-row">
              <h2>{selectedText.title}</h2>
              <div className="reading-font-controls" aria-label="Yazı puntosu">
                <button type="button" onClick={() => setReadingFontSize((prev) => Math.max(14, prev - 2))}>−</button>
                <span>{readingFontSize}px</span>
                <button type="button" onClick={() => setReadingFontSize((prev) => Math.min(28, prev + 2))}>+</button>
              </div>
            </div>
            <article className="reading-text-box" style={{ "--reading-font-size": `${readingFontSize}px` }}>
              {selectedText.text.split("\n\n").map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            </article>
            <div className="reading-finish-row">
  <button
    type="button"
    className="reading-primary-btn"
    onClick={finishReading}
    disabled={readingSeconds < 40}
  >
    {readingSeconds < 40 ? "Okumayı Bitirdim (" + (40 - readingSeconds) + " sn sonra)" : "Okumayı Bitirdim"}
  </button>

  {readingWarning && (
    <span className="reading-warning-text">
      {readingWarning}
    </span>
  )}
</div>
          </div>
        )}

        {step === "questions" && selectedText && activeQuestion && (
          <div className="reading-test-screen">
            <div className="reading-test-kicker">Anlama Soruları</div>
            <h2>Soru {questionIndex + 1} / {totalQuestions}</h2>

            <div className="reading-question-card">
              <h3>{activeQuestion.question}</h3>

              <div className="reading-options">
                {activeQuestion.options.map((option, index) => (
                  <button
                    key={option}
                    type="button"
                    className={answers[questionIndex] === index ? "selected" : ""}
                    onClick={() =>
                      setAnswers((prev) => ({
                        ...prev,
                        [questionIndex]: index,
                      }))
                    }
                  >
                    <span>{String.fromCharCode(65 + index)}</span>
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="reading-question-actions">
              <button
                type="button"
                disabled={questionIndex === 0}
                onClick={() => setQuestionIndex((prev) => prev - 1)}
              >
                Önceki Soru
              </button>

              {questionIndex < totalQuestions - 1 ? (
                <button
                  type="button"
                  onClick={() => setQuestionIndex((prev) => prev + 1)}
                >
                  Sonraki Soru
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setStep("result")}
                >
                  Sonucu Gör
                </button>
              )}
            </div>
          </div>
        )}

        {step === "result" && selectedText && (
          <div className="reading-test-screen reading-result-screen">
            <div className="reading-test-kicker">Çocuğunuzun Okuma ve Anlama Analizi Hazır</div>
            <h2>{resultComment.title}</h2>
            <div className="reading-result-grid">
              <div><strong>{speed}</strong><span>Kelime / Dakika</span></div>
              <div><strong>%{comprehension}</strong><span>Anlama</span></div>
              <div><strong>{correctCount}/{totalQuestions}</strong><span>Doğru Cevap</span></div>
            </div>
            <p>{resultComment.text}</p>

            {selectedAverage && (
              <div className="reading-average-box">
                <h3>Okuma ve Anlama Ortalamaları</h3>
                <div className="reading-average-grid">
                  <div>
                    <span>{selectedAverage.label}</span>
                    <strong>{selectedAverage.speed}</strong>
                    <small>Kelime / Dakika</small>
                  </div>
                  <div>
                    <span>Beklenen Anlama</span>
                    <strong>{selectedAverage.comprehension}</strong>
                    <small>Ortalama seviye</small>
                  </div>
                </div>
              </div>
            )}

            <div className="reading-lead-box">
              <h3>Sonucu uzman eğitmenle değerlendirin</h3>
              <div className="reading-form-grid">
                <input placeholder="Veli adı soyadı" value={formData.parentName} onChange={(e) => setFormData({ ...formData, parentName: e.target.value })} />
                <input placeholder="Telefon" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                <input placeholder="Öğrencinin sınıfı" value={formData.studentClass} onChange={(e) => setFormData({ ...formData, studentClass: e.target.value })} />
                <input placeholder="Şehir" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
              </div>
              <div className="reading-cta-row">
  <a
  href={`https://wa.me/905334789253?text=${encodeURIComponent(
    `Merhaba FixOku, ben ${formData.parentName || "veli"}. ${
      formData.city ? `Size ${formData.city} şehrinden yazıyorum.` : ""
    } Çocuğum için yaptığımız okuma testi sonucunda ${speed} kelime/dakika ve %${comprehension} anlama sonucu elde ettik. Bu seviyeye göre nasıl bir gelişim planı önerirsiniz? Detaylı bilgi almak isterim.

*Velinin Adı Soyadı:* ${formData.parentName || "-"}
*Telefon:* ${formData.phone || "-"}
*Öğrencinin Sınıfı:* ${formData.studentClass || "-"}
*Bulunduğumuz Şehir:* ${formData.city || "-"}`
  )}`}
  target="_blank"
  rel="noreferrer"
>
  WhatsApp ile Bilgi Al
</a>

  {showPhoneNumber ? (
    <strong className="reading-phone-number">0 533 478 92 53</strong>
  ) : (
    <button
      type="button"
      className="reading-phone-btn"
      onClick={() => setShowPhoneNumber(true)}
    >
      Telefonla Bilgi Al
    </button>
  )}
</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
