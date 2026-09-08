import { useEffect, useMemo, useState } from "react";

const LEVELS = [
  {
    key: "ilkokul",
    label: "İlkokul",
    difficulty: "Kolay Seviye",
    tone: "primary",
    grid: 3,
    rounds: [3, 4, 6, 7],
    description: "Görsel dikkat ve kısa süreli hafıza için başlangıç düzeyi.",
  },
  {
    key: "ortaokul",
    label: "Ortaokul",
    difficulty: "Zor Seviye",
    tone: "middle",
    grid: 4,
    rounds: [4, 5, 6, 7],
    description: "Daha fazla kutu ve daha yoğun dikkat gerektiren orta düzey.",
  },
  {
    key: "lise",
    label: "Lise",
    difficulty: "Daha Zor Seviye",
    tone: "high",
    grid: 4,
    rounds: [5, 6, 7, 8],
    description: "Hızlı algılama, odaklanma ve sıralı hafıza için ileri düzey.",
  },
];

const EXERCISES = [
  { key: "eye", title: "Göz\nEgzersizi", icon: "eye", active: true },
  { key: "focus", title: "Dikkat ve\nOdaklanma", icon: "brain", active: false },
  { key: "number", title: "Sayısal\nİşlem", icon: "puzzle", active: false },
  { key: "text", title: "Metin\nEgzersizi", icon: "text", active: false },
  { key: "memory", title: "Hafıza\nEgzersizi", icon: "memory", active: false },
];

const TOTAL_SECONDS = 30;
const PREVIEW_SECONDS = 3;

// Keep the difference markers visually unchanged while making the interaction
// target easier to hit on touch screens. The previous tolerance was 12
// percentage points; 17 is a 42% increase and is still bounded to the image.
const DIFFERENCE_HIT_RADIUS = 17;

const DIFFERENCE_SETS = {
  ilkokul: [
    {
      left: "/attention-games/fark-bul/ilkokul/set1-left.png",
      right: "/attention-games/fark-bul/ilkokul/set1-right.png",
      differences: [
        { x: 81.8, y: 70.4 },
        { x: 17.7, y: 35.7 },
        { x: 25.3, y: 46.8 },
        { x: 56.1, y: 26.8 },
        { x: 26.5, y: 80.9 },
      ],
    },
    {
      left: "/attention-games/fark-bul/ilkokul/set2-left.png",
      right: "/attention-games/fark-bul/ilkokul/set2-right.png",
      differences: [
        { x: 61.1, y: 19.8 },
        { x: 43.4, y: 86.4 },
        { x: 24.3, y: 57.4 },
        { x: 70.5, y: 7.0 },
        { x: 53.6, y: 71.5 },
      ],
    },
    {
      left: "/attention-games/fark-bul/ilkokul/set3-left.png",
      right: "/attention-games/fark-bul/ilkokul/set3-right.png",
      differences: [
        { x: 23.4, y: 19.0 },
        { x: 59.5, y: 37.7 },
        { x: 78.2, y: 44.5 },
        { x: 88.4, y: 56.6 },
        { x: 8.7, y: 90.5 },
      ],
    },
    {
      left: "/attention-games/fark-bul/ilkokul/set4-left.png",
      right: "/attention-games/fark-bul/ilkokul/set4-right.png",
      differences: [
        { x: 14.2, y: 10.9 },
        { x: 40.5, y: 46.8 },
        { x: 28.5, y: 47.8 },
        { x: 74.0, y: 62.4 },
        { x: 61.2, y: 77.9 },
      ],
    },
  ],
  ortaokul: [
    {
      left: "/attention-games/fark-bul/ortaokul/set1-left.png",
      right: "/attention-games/fark-bul/ortaokul/set1-right.png",
      differences: [
        { x: 90.1, y: 15.7 },
        { x: 76.1, y: 65.0 },
        { x: 14.0, y: 73.3 },
        { x: 37.3, y: 42.9 },
        { x: 78.6, y: 94.2 },
      ],
    },
    {
      left: "/attention-games/fark-bul/ortaokul/set2-left.png",
      right: "/attention-games/fark-bul/ortaokul/set2-right.png",
      differences: [
        { x: 74.4, y: 8.4 },
        { x: 91.0, y: 31.0 },
        { x: 65.1, y: 54.8 },
        { x: 43.9, y: 96.0 },
        { x: 87.4, y: 78.1 },
      ],
    },
    {
      left: "/attention-games/fark-bul/ortaokul/set3-left.png",
      right: "/attention-games/fark-bul/ortaokul/set3-right.png",
      differences: [
        { x: 40.8, y: 34.0 },
        { x: 74.6, y: 58.5 },
        { x: 25.1, y: 73.6 },
        { x: 85.9, y: 53.4 },
        { x: 8.8, y: 82.1 },
      ],
    },
    {
      left: "/attention-games/fark-bul/ortaokul/set4-left.png",
      right: "/attention-games/fark-bul/ortaokul/set4-right.png",
      differences: [
        { x: 80.0, y: 57.0 },
        { x: 23.0, y: 79.0 },
        { x: 64.0, y: 76.0 },
        { x: 43.0, y: 16.0 },
        { x: 35.0, y: 59.0 },
      ],
    },
  ],
  lise: [
    {
      left: "/attention-games/fark-bul/lise/set1-left.png",
      right: "/attention-games/fark-bul/lise/set1-right.png",
      differences: [
        { x: 90.1, y: 15.7 },
        { x: 76.1, y: 65.0 },
        { x: 14.0, y: 73.3 },
        { x: 37.3, y: 42.9 },
        { x: 78.6, y: 94.2 },
      ],
    },
    {
      left: "/attention-games/fark-bul/lise/set2-left.png",
      right: "/attention-games/fark-bul/lise/set2-right.png",
      differences: [
        { x: 74.4, y: 8.4 },
        { x: 91.0, y: 31.0 },
        { x: 65.1, y: 54.8 },
        { x: 43.9, y: 96.0 },
        { x: 87.4, y: 78.1 },
      ],
    },
    {
      left: "/attention-games/fark-bul/lise/set3-left.png",
      right: "/attention-games/fark-bul/lise/set3-right.png",
      differences: [
        { x: 40.8, y: 34.0 },
        { x: 74.6, y: 58.5 },
        { x: 25.1, y: 73.6 },
        { x: 85.9, y: 53.4 },
        { x: 8.8, y: 82.1 },
      ],
    },
  ],
};
const FOCUS_TOTAL_SECONDS = 60;
const TRACK_TOTAL_SECONDS = 30;

const TRACK_SETTINGS = {
  ilkokul: { swaps: 4, interval: 420 },
  ortaokul: { swaps: 6, interval: 360 },
  lise: { swaps: 8, interval: 310 },
};

const TEXT_TOTAL_SECONDS = 30;
const WORD_PREVIEW_SECONDS = 3;

const TEXT_SETTINGS = {
  ilkokul: {
    counts: [3, 4, 5, 6, 6],
    words: [
      "Elma", "Kalem", "Bulut", "Kedi", "Deniz", "Masa", "Okul", "Balon", "Çiçek", "Top",
      "Kuş", "Kitap", "Yol", "Ay", "Güneş", "Sarı", "Mavi", "Yeşil", "Ev", "Arı"
    ],
  },
  ortaokul: {
    counts: [4, 5, 6, 6, 7],
    words: [
      "Rota", "Okçu", "Rumuz", "Kirli", "Gezegen", "Fener", "Kanyon", "Pusula", "Liman", "Yankı",
      "Kıvılcım", "Mercek", "Kule", "Köprü", "Harita", "Denge", "Rüzgar", "Tünel", "Sinyal", "Yamaç"
    ],
  },
  lise: {
    counts: [5, 6, 7, 7, 8],
    words: [
      "Analiz", "Denklem", "Strateji", "Hipotez", "Mantık", "Sentez", "Kuram", "Algoritma", "Yörünge", "Paragraf",
      "Eleştiri", "Soyut", "Somut", "İzlenim", "Bağıntı", "Simetri", "Kavram", "Yöntem", "Kanıt", "Olasılık"
    ],
  },
};


const MEMORY_TOTAL_SECONDS = 30;
const MEMORY_PREVIEW_SECONDS = 3;

const MEMORY_SETTINGS = {
  ilkokul: { counts: [1, 2, 3, 4, 5], min: 1, max: 9 },
  ortaokul: { counts: [2, 3, 4, 5, 6], min: 4, max: 18 },
  lise: { counts: [3, 4, 5, 6, 7], min: 8, max: 35 },
};

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function uniqueNumberOptions(correctAnswer, minGap = 4) {
  const values = new Set([correctAnswer]);
  while (values.size < 4) {
    const offset = randomBetween(-minGap * 3, minGap * 3);
    const candidate = Math.max(1, correctAnswer + offset);
    values.add(candidate);
  }
  return shuffle([...values]);
}

function calculatePercent(correctValue, wrongValue) {
  const total = correctValue + wrongValue;
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((correctValue / total) * 100)));
}

function getLevel(levelKey) {
  return LEVELS.find((level) => level.key === levelKey) || LEVELS[0];
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function createBoard(grid, numberCount) {
  const totalCells = grid * grid;
  const numberPositions = shuffle(Array.from({ length: totalCells }, (_, index) => index)).slice(0, numberCount);

  return Array.from({ length: totalCells }, (_, index) => {
    const numberIndex = numberPositions.indexOf(index);

    return {
      id: index,
      number: numberIndex >= 0 ? numberIndex + 1 : null,
      opened: false,
      wrong: false,
    };
  });
}

function ExerciseIcon({ type }) {
  if (type === "eye") {
    return (
      <svg viewBox="0 0 96 96" fill="none" aria-hidden="true">
        <path d="M10 50c9-17 23-26 38-26s29 9 38 26c-9 17-23 26-38 26S19 67 10 50Z" fill="currentColor" />
        <circle cx="48" cy="50" r="16" fill="white" />
        <circle cx="48" cy="50" r="9" fill="currentColor" />
        <circle cx="59" cy="38" r="5" fill="currentColor" />
        <circle cx="68" cy="30" r="3.5" fill="currentColor" />
        <circle cx="75" cy="39" r="3" fill="currentColor" />
      </svg>
    );
  }

  if (type === "brain") {
    return (
      <svg viewBox="0 0 96 96" fill="none" aria-hidden="true">
        <path d="M18 60c0-9 7-16 16-16 0-11 8-19 19-19 12 0 22 10 22 22 0 12-10 22-22 22H28c-6 0-10-4-10-9Z" fill="currentColor" />
        <path d="M14 35C26 20 45 15 66 22" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        <path d="M73 23l7 11-12 4" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M82 61C70 76 51 81 30 74" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        <path d="M23 73l-7-11 12-4" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === "puzzle") {
    return (
      <svg viewBox="0 0 96 96" fill="none" aria-hidden="true">
        <path d="M14 22h28v19c0 4 3 7 7 7s7-3 7-7V22h26v26H66c-4 0-7 3-7 7s3 7 7 7h16v22H52V70c0-4-3-7-7-7s-7 3-7 7v14H14V58h14c4 0 7-3 7-7s-3-7-7-7H14V22Z" fill="currentColor" />
      </svg>
    );
  }

  if (type === "text") {
    return (
      <svg viewBox="0 0 96 96" fill="none" aria-hidden="true">
        <path d="M16 24h64v42H41L20 78l8-12H16V24Z" fill="currentColor" />
        <path d="M47 38c0-8 6-13 15-13 9 0 15 5 15 13 0 6-3 9-8 12-4 3-5 5-5 9" stroke="white" strokeWidth="6" strokeLinecap="round" />
        <circle cx="64" cy="68" r="4" fill="white" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 96 96" fill="none" aria-hidden="true">
      <path d="M44 18c-18 3-31 18-31 36 0 19 15 35 34 36" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <path d="M50 18c18 3 31 18 31 36 0 19-15 35-34 36" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <circle cx="50" cy="52" r="22" stroke="currentColor" strokeWidth="6" />
      <circle cx="50" cy="52" r="11" stroke="currentColor" strokeWidth="5" />
      <circle cx="50" cy="52" r="4" fill="currentColor" />
      <path d="M12 40l34 12" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

function LevelVisual({ tone }) {
  return (
    <div className={`attention-level-art attention-level-art-${tone}`} aria-hidden="true">
      <span className="art-circle" />
      <span className="art-book" />
      <span className="art-screen" />
      <span className="art-pencil" />
      <span className="art-globe" />
    </div>
  );
}

export default function AttentionFocusTest({ isOpen, onClose }) {
  const [screen, setScreen] = useState("intro");
  const [levelKey, setLevelKey] = useState("");
  const selectedLevel = getLevel(levelKey);

  const [roundIndex, setRoundIndex] = useState(0);
  const [board, setBoard] = useState(() => createBoard(3, 3));
  const [phase, setPhase] = useState("preview");
  const [nextNumber, setNextNumber] = useState(1);
  const [timeLeft, setTimeLeft] = useState(TOTAL_SECONDS);
  const [previewLeft, setPreviewLeft] = useState(PREVIEW_SECONDS);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [paused, setPaused] = useState(false);
  const [warning, setWarning] = useState("");

  const [focusSetIndex, setFocusSetIndex] = useState(0);
  const [focusTimeLeft, setFocusTimeLeft] = useState(FOCUS_TOTAL_SECONDS);
  const [foundDifferences, setFoundDifferences] = useState([]);
  const [focusCorrect, setFocusCorrect] = useState(0);
  const [focusWrong, setFocusWrong] = useState(0);
  const [focusWarning, setFocusWarning] = useState("");
  const [missPoint, setMissPoint] = useState(null);

  const [trackTimeLeft, setTrackTimeLeft] = useState(TRACK_TOTAL_SECONDS);
  const [trackPhase, setTrackPhase] = useState("show");
  const [trackCups, setTrackCups] = useState([
    { id: 0, position: 0 },
    { id: 1, position: 1 },
    { id: 2, position: 2 },
  ]);
  const [trackTargetId, setTrackTargetId] = useState(0);
  const [trackCorrect, setTrackCorrect] = useState(0);
  const [trackWrong, setTrackWrong] = useState(0);
  const [trackRound, setTrackRound] = useState(1);
  const [trackWarning, setTrackWarning] = useState("");
  const [trackPickedId, setTrackPickedId] = useState(null);

  const [textTimeLeft, setTextTimeLeft] = useState(TEXT_TOTAL_SECONDS);
  const [textRound, setTextRound] = useState(0);
  const [textPhase, setTextPhase] = useState("show");
  const [textWords, setTextWords] = useState([]);
  const [textOptions, setTextOptions] = useState([]);
  const [textMissingWord, setTextMissingWord] = useState("");
  const [textCorrect, setTextCorrect] = useState(0);
  const [textWrong, setTextWrong] = useState(0);
  const [textFeedback, setTextFeedback] = useState("");

  const [memoryTimeLeft, setMemoryTimeLeft] = useState(MEMORY_TOTAL_SECONDS);
  const [memoryRound, setMemoryRound] = useState(0);
  const [memoryPhase, setMemoryPhase] = useState("show");
  const [memoryNumbers, setMemoryNumbers] = useState([]);
  const [memoryOptions, setMemoryOptions] = useState([]);
  const [memoryAnswer, setMemoryAnswer] = useState(0);
  const [memoryCorrect, setMemoryCorrect] = useState(0);
  const [memoryWrong, setMemoryWrong] = useState(0);
  const [memoryFeedback, setMemoryFeedback] = useState("");
  const [attentionFormData, setAttentionFormData] = useState({
    parentName: "",
    phone: "",
    studentClass: "",
    city: "",
  });
  const [showAttentionPhoneNumber, setShowAttentionPhoneNumber] = useState(false);

  const focusSets = DIFFERENCE_SETS[levelKey || "ilkokul"] || DIFFERENCE_SETS.ilkokul;
  const currentFocusSet = focusSets[focusSetIndex] || focusSets[0];

  const currentNumberCount = selectedLevel.rounds[roundIndex] || selectedLevel.rounds[0];
  const progress = useMemo(() => ((TOTAL_SECONDS - timeLeft) / TOTAL_SECONDS) * 100, [timeLeft]);
  const focusProgress = useMemo(() => ((FOCUS_TOTAL_SECONDS - focusTimeLeft) / FOCUS_TOTAL_SECONDS) * 100, [focusTimeLeft]);
  const trackProgress = useMemo(() => ((TRACK_TOTAL_SECONDS - trackTimeLeft) / TRACK_TOTAL_SECONDS) * 100, [trackTimeLeft]);
  const textProgress = useMemo(() => ((TEXT_TOTAL_SECONDS - textTimeLeft) / TEXT_TOTAL_SECONDS) * 100, [textTimeLeft]);
  const memoryProgress = useMemo(() => ((MEMORY_TOTAL_SECONDS - memoryTimeLeft) / MEMORY_TOTAL_SECONDS) * 100, [memoryTimeLeft]);

  const resetGameState = () => {
    const level = getLevel(levelKey || "ilkokul");
    setRoundIndex(0);
    setBoard(createBoard(level.grid, level.rounds[0]));
    setPhase("preview");
    setNextNumber(1);
    setTimeLeft(TOTAL_SECONDS);
    setPreviewLeft(PREVIEW_SECONDS);
    setCorrect(0);
    setWrong(0);
    setPaused(false);
    setWarning("");
    setFocusSetIndex(0);
    setFocusTimeLeft(FOCUS_TOTAL_SECONDS);
    setFoundDifferences([]);
    setFocusCorrect(0);
    setFocusWrong(0);
    setFocusWarning("");
    setMissPoint(null);
    setTrackTimeLeft(TRACK_TOTAL_SECONDS);
    setTrackPhase("show");
    setTrackCups([
      { id: 0, position: 0 },
      { id: 1, position: 1 },
      { id: 2, position: 2 },
    ]);
    setTrackTargetId(0);
    setTrackCorrect(0);
    setTrackWrong(0);
    setTrackRound(1);
    setTrackWarning("");
    setTrackPickedId(null);
    setTextTimeLeft(TEXT_TOTAL_SECONDS);
    setTextRound(0);
    setTextPhase("show");
    setTextWords([]);
    setTextOptions([]);
    setTextMissingWord("");
    setTextCorrect(0);
    setTextWrong(0);
    setTextFeedback("");
    setMemoryTimeLeft(MEMORY_TOTAL_SECONDS);
    setMemoryRound(0);
    setMemoryPhase("show");
    setMemoryNumbers([]);
    setMemoryOptions([]);
    setMemoryAnswer(0);
    setMemoryCorrect(0);
    setMemoryWrong(0);
    setMemoryFeedback("");
    setAttentionFormData({
      parentName: "",
      phone: "",
      studentClass: "",
      city: "",
    });
    setShowAttentionPhoneNumber(false);
  };

  const closeModal = () => {
    setScreen("intro");
    setLevelKey("");
    resetGameState();
    onClose?.();
  };

  const goBack = () => {
    if (screen === "info") setScreen("intro");
    if (screen === "eyeInfo") setScreen("info");
    if (screen === "focusInfo") setScreen("eyeInfo");
    if (screen === "numberInfo") setScreen("focusInfo");
    if (screen === "game") {
      setPaused(false);
      setScreen("eyeInfo");
    }
    if (screen === "focusGame") {
      setPaused(false);
      setScreen("focusInfo");
    }
    if (screen === "trackGame") {
      setPaused(false);
      setScreen("numberInfo");
    }
    if (screen === "textInfo") setScreen("numberInfo");
    if (screen === "textGame") {
      setPaused(false);
      setScreen("textInfo");
    }
    if (screen === "memoryInfo") setScreen("textInfo");
    if (screen === "memoryGame") {
      setPaused(false);
      setScreen("memoryInfo");
    }
    if (screen === "completedInfo") setScreen("memoryInfo");
    if (screen === "result") setScreen("completedInfo");
  };

  const startInfo = () => {
    if (!levelKey) return;
    setScreen("info");
  };

  const startGame = () => {
    const level = getLevel(levelKey);
    setRoundIndex(0);
    setBoard(createBoard(level.grid, level.rounds[0]));
    setPhase("preview");
    setNextNumber(1);
    setTimeLeft(TOTAL_SECONDS);
    setPreviewLeft(PREVIEW_SECONDS);
    setCorrect(0);
    setWrong(0);
    setPaused(false);
    setWarning("");
    setScreen("game");
  };

  const startNextRound = (nextRound) => {
    const numberCount = selectedLevel.rounds[nextRound];
    setRoundIndex(nextRound);
    setBoard(createBoard(selectedLevel.grid, numberCount));
    setPhase("preview");
    setNextNumber(1);
    setPreviewLeft(PREVIEW_SECONDS);
    setWarning("");
  };

  useEffect(() => {
    if (screen !== "game" || paused || phase !== "play") return undefined;

    const timer = setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          setPhase("finished");
          setScreen("focusInfo");
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [screen, paused, phase]);

  useEffect(() => {
    if (screen !== "game" || paused || phase !== "preview") return undefined;

    const timer = setInterval(() => {
      setPreviewLeft((current) => {
        if (current <= 1) {
          setPhase("play");
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [screen, paused, phase]);


  useEffect(() => {
    if (screen !== "focusGame" || paused) return undefined;

    const timer = setInterval(() => {
      setFocusTimeLeft((current) => {
        if (current <= 1) {
          setScreen("numberInfo");
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [screen, paused]);

  useEffect(() => {
    if (screen !== "trackGame" || paused) return undefined;

    const timer = setInterval(() => {
      setTrackTimeLeft((current) => {
        if (current <= 1) {
          setScreen("textInfo");
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [screen, paused]);

  useEffect(() => {
    if (screen !== "trackGame" || paused || trackPhase !== "show") return undefined;

    const timer = setTimeout(() => {
      setTrackPhase("shuffle");
    }, 1000);

    return () => clearTimeout(timer);
  }, [screen, paused, trackPhase, trackRound]);

  useEffect(() => {
    if (screen !== "trackGame" || paused || trackPhase !== "shuffle") return undefined;

    const settings = TRACK_SETTINGS[levelKey || "ilkokul"] || TRACK_SETTINGS.ilkokul;
    let swapCount = 0;

    const timer = setInterval(() => {
      swapCount += 1;
      setTrackCups((items) => {
        const first = Math.floor(Math.random() * 3);
        let second = Math.floor(Math.random() * 3);
        while (second === first) second = Math.floor(Math.random() * 3);

        const firstPosition = items[first].position;
        const secondPosition = items[second].position;

        return items.map((item, index) => {
          if (index === first) return { ...item, position: secondPosition };
          if (index === second) return { ...item, position: firstPosition };
          return item;
        });
      });

      if (swapCount >= settings.swaps) {
        clearInterval(timer);
        setTimeout(() => setTrackPhase("guess"), settings.interval);
      }
    }, settings.interval);

    return () => clearInterval(timer);
  }, [screen, paused, trackPhase, trackRound, levelKey]);


  useEffect(() => {
    if (screen !== "textGame" || paused) return undefined;

    const timer = setInterval(() => {
      setTextTimeLeft((current) => {
        if (current <= 1) {
          setScreen("memoryInfo");
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [screen, paused]);

  useEffect(() => {
    if (screen !== "textGame" || paused || textPhase !== "show") return undefined;

    const timer = setTimeout(() => {
      setTextPhase("question");
    }, WORD_PREVIEW_SECONDS * 1000);

    return () => clearTimeout(timer);
  }, [screen, paused, textPhase, textRound]);

  const startFocusGame = () => {
    setFocusSetIndex(0);
    setFocusTimeLeft(FOCUS_TOTAL_SECONDS);
    setFoundDifferences([]);
    setFocusCorrect(0);
    setFocusWrong(0);
    setFocusWarning("");
    setMissPoint(null);
    setPaused(false);
    setScreen("focusGame");
  };

  const goNextFocusSet = () => {
    if (focusSetIndex >= focusSets.length - 1) {
      setScreen("numberInfo");
      return;
    }

    setFocusSetIndex((value) => value + 1);
    setFoundDifferences([]);
    setFocusWarning("");
    setMissPoint(null);
  };

  const handleDifferenceClick = (event) => {
    if (screen !== "focusGame" || paused || focusTimeLeft <= 0) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    // Evaluate the closest remaining difference instead of taking the first
    // matching point. This keeps the enlarged targets bounded and deterministic
    // when two nearby difference coordinates fall inside the same tolerance.
    const hitCandidate = currentFocusSet.differences
      .map((point, index) => {
        if (foundDifferences.includes(index)) return null;

        const dx = point.x - x;
        const dy = point.y - y;

        return {
          index,
          distance: Math.sqrt(dx * dx + dy * dy),
        };
      })
      .filter(Boolean)
      .sort((left, right) => left.distance - right.distance)[0];
    const hitIndex = hitCandidate && hitCandidate.distance <= DIFFERENCE_HIT_RADIUS
      ? hitCandidate.index
      : -1;

    if (hitIndex >= 0) {
      const nextFound = [...foundDifferences, hitIndex];
      setFoundDifferences(nextFound);
      setFocusCorrect((value) => value + 1);
      setFocusWarning("");

      if (nextFound.length === currentFocusSet.differences.length) {
        setTimeout(goNextFocusSet, 650);
      }

      return;
    }

    setFocusWrong((value) => value + 1);
    setFocusWarning("Tekrar dikkatlice bak. Bu noktada fark yok.");
    setMissPoint({ x, y });

    setTimeout(() => {
      setMissPoint(null);
      setFocusWarning("");
    }, 650);
  };

  const startTrackRound = (nextRound = trackRound + 1) => {
    setTrackCups([
      { id: 0, position: 0 },
      { id: 1, position: 1 },
      { id: 2, position: 2 },
    ]);
    setTrackTargetId(Math.floor(Math.random() * 3));
    setTrackPickedId(null);
    setTrackWarning("");
    setTrackRound(nextRound);
    setTrackPhase("show");
  };

  const startTrackGame = () => {
    setTrackTimeLeft(TRACK_TOTAL_SECONDS);
    setTrackCorrect(0);
    setTrackWrong(0);
    setPaused(false);
    startTrackRound(1);
    setScreen("trackGame");
  };

  const handleTrackPick = (cupId) => {
    if (screen !== "trackGame" || paused || trackPhase !== "guess" || trackTimeLeft <= 0) return;

    setTrackPickedId(cupId);

    if (cupId === trackTargetId) {
      setTrackCorrect((value) => value + 1);
      setTrackWarning("Doğru! Yeşil topu takip ettin.");
      setTrackPhase("result");
      setTimeout(() => startTrackRound(trackRound + 1), 700);
      return;
    }

    setTrackWrong((value) => value + 1);
    setTrackWarning("Dikkat! Yeşil top başka yuvarlağın içindeydi.");
    setTimeout(() => {
      setTrackPickedId(null);
      setTrackWarning("");
    }, 650);
  };


  const prepareTextRound = (roundNumber = 0) => {
    const settings = TEXT_SETTINGS[levelKey || "ilkokul"] || TEXT_SETTINGS.ilkokul;
    const count = settings.counts[roundNumber] || settings.counts[settings.counts.length - 1];
    const pool = settings.words;
    const shown = shuffle(pool).slice(0, count);
    const hiddenCandidates = pool.filter((word) => !shown.includes(word));
    const missing = shuffle(hiddenCandidates)[0] || pool[0];
    const wrongOptions = shuffle(shown).slice(0, 3);

    setTextWords(shown);
    setTextMissingWord(missing);
    setTextOptions(shuffle([missing, ...wrongOptions]));
    setTextPhase("show");
    setTextFeedback("");
  };

  const startTextGame = () => {
    setTextTimeLeft(TEXT_TOTAL_SECONDS);
    setTextRound(0);
    setTextCorrect(0);
    setTextWrong(0);
    setPaused(false);
    prepareTextRound(0);
    setScreen("textGame");
  };

  const goNextTextRound = () => {
    if (textRound >= 4) {
      setScreen("memoryInfo");
      return;
    }

    const nextRound = textRound + 1;
    setTextRound(nextRound);
    prepareTextRound(nextRound);
  };

  const handleTextAnswer = (answer) => {
    if (screen !== "textGame" || paused || textPhase !== "question" || textTimeLeft <= 0) return;

    if (answer === textMissingWord) {
      setTextCorrect((value) => value + 1);
      setTextFeedback("Bravo! Görmediğin kelimeyi doğru buldun.");
    } else {
      setTextWrong((value) => value + 1);
      setTextFeedback("Doğru cevap: " + textMissingWord);
    }

    setTextPhase("feedback");
    setTimeout(goNextTextRound, 850);
  };

  useEffect(() => {
    if (screen !== "memoryGame" || paused) return undefined;

    const timer = setInterval(() => {
      setMemoryTimeLeft((current) => {
        if (current <= 1) {
          setScreen("completedInfo");
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [screen, paused]);

  useEffect(() => {
    if (screen !== "memoryGame" || paused || memoryPhase !== "show") return undefined;

    const timer = setTimeout(() => {
      setMemoryPhase("question");
    }, MEMORY_PREVIEW_SECONDS * 1000);

    return () => clearTimeout(timer);
  }, [screen, paused, memoryPhase, memoryRound]);

  const prepareMemoryRound = (roundNumber = 0) => {
    const settings = MEMORY_SETTINGS[levelKey || "ilkokul"] || MEMORY_SETTINGS.ilkokul;
    const count = settings.counts[roundNumber] || settings.counts[settings.counts.length - 1];
    const numbers = Array.from({ length: count }, () => randomBetween(settings.min, settings.max));
    const answer = numbers.reduce((sum, number) => sum + number, 0);

    setMemoryNumbers(numbers);
    setMemoryAnswer(answer);
    setMemoryOptions(uniqueNumberOptions(answer, Math.max(3, count * 2)));
    setMemoryPhase("show");
    setMemoryFeedback("");
  };

  const startMemoryGame = () => {
    setMemoryTimeLeft(MEMORY_TOTAL_SECONDS);
    setMemoryRound(0);
    setMemoryCorrect(0);
    setMemoryWrong(0);
    setPaused(false);
    prepareMemoryRound(0);
    setScreen("memoryGame");
  };

  const goNextMemoryRound = () => {
    if (memoryRound >= 4) {
      setScreen("completedInfo");
      return;
    }

    const nextRound = memoryRound + 1;
    setMemoryRound(nextRound);
    prepareMemoryRound(nextRound);
  };

  const handleMemoryAnswer = (answer) => {
    if (screen !== "memoryGame" || paused || memoryPhase !== "question" || memoryTimeLeft <= 0) return;

    if (answer === memoryAnswer) {
      setMemoryCorrect((value) => value + 1);
      setMemoryFeedback("Bravo! Uçan sayıların toplamını doğru buldun.");
    } else {
      setMemoryWrong((value) => value + 1);
      setMemoryFeedback("Doğru cevap: " + memoryAnswer);
    }

    setMemoryPhase("feedback");
    setTimeout(goNextMemoryRound, 850);
  };

  if (!isOpen) return null;

  const resultItems = [
    { key: "eye", title: "Göz\nEgzersizi", icon: "eye", percent: calculatePercent(correct, wrong) },
    { key: "focus", title: "Dikkat ve\nOdaklanma", icon: "brain", percent: calculatePercent(focusCorrect, focusWrong) },
    { key: "number", title: "Sayısal\nİşlem", icon: "puzzle", percent: calculatePercent(trackCorrect, trackWrong) },
    { key: "text", title: "Metin\nEgzersizi", icon: "text", percent: calculatePercent(textCorrect, textWrong) },
    { key: "memory", title: "Hafıza\nEgzersizi", icon: "memory", percent: calculatePercent(memoryCorrect, memoryWrong) },
  ];
  const averageResultPercent = Math.round(
    resultItems.reduce((total, item) => total + item.percent, 0) / resultItems.length
  );
  const resultNoteText = "Test sonucu öğrencinin dikkat ve bilişsel becerileri hakkında genel bir değerlendirme sunmaktadır. Sonucun doğru yorumlanması ve öğrencinin gelişim alanlarının belirlenmesi için uzman eğitmen görüşü önerilir.";
  const attentionWhatsappMessage = `Merhaba FixOku, ben ${attentionFormData.parentName || "veli"}. ${
    attentionFormData.city ? `Size ${attentionFormData.city} şehrinden yazıyorum.` : ""
  } Çocuğum için yaptığımız dikkat testi sonucunu uzman eğitmenle değerlendirmek ve gelişim planı hakkında detaylı bilgi almak isterim.

*Test Türü:* Ücretsiz Dikkat Testi
*Seviye:* ${selectedLevel.label} - ${selectedLevel.difficulty}
*Genel Sonuç Ortalaması:* %${averageResultPercent}

*Egzersiz Sonuçları:*
*Göz Egzersizi:* %${resultItems[0].percent}
*Dikkat ve Odaklanma:* %${resultItems[1].percent}
*Sayısal İşlem:* %${resultItems[2].percent}
*Metin Egzersizi:* %${resultItems[3].percent}
*Hafıza Egzersizi:* %${resultItems[4].percent}

*Değerlendirme Notu:* ${resultNoteText}

*Velinin Adı Soyadı:* ${attentionFormData.parentName || "-"}
*Telefon:* ${attentionFormData.phone || "-"}
*Öğrencinin Sınıfı:* ${attentionFormData.studentClass || "-"}
*Bulunduğumuz Şehir:* ${attentionFormData.city || "-"}`;

  const handleCellClick = (cell) => {
    if (screen !== "game" || paused || phase !== "play" || timeLeft <= 0) return;
    if (!cell.number || cell.opened) return;

    if (cell.number === nextNumber) {
      setWarning("");
      setCorrect((value) => value + 1);
      setBoard((items) =>
        items.map((item) => (item.id === cell.id ? { ...item, opened: true, wrong: false } : item))
      );

      if (nextNumber === currentNumberCount) {
        if (roundIndex >= 3) {
          setTimeout(() => {
            setPhase("finished");
            setScreen("focusInfo");
          }, 650);
        } else {
          setTimeout(() => startNextRound(roundIndex + 1), 650);
        }
      } else {
        setNextNumber((value) => value + 1);
      }

      return;
    }

    setWrong((value) => value + 1);
    setWarning(`Önce ${nextNumber} numaralı kutuyu bulmalısın.`);
    setBoard((items) => items.map((item) => (item.id === cell.id ? { ...item, wrong: true } : item)));

    setTimeout(() => {
      setBoard((items) => items.map((item) => ({ ...item, wrong: false })));
    }, 420);
  };

  return (
    <div className="attention-modal-overlay" role="dialog" aria-modal="true">
      <style>{attentionStyles}</style>

      <div className={`attention-modal attention-tone-${selectedLevel.tone}`}>
        <button className="attention-close" type="button" onClick={closeModal} aria-label="Testi kapat">
          ×
        </button>

        <div className="attention-topline">
          {screen !== "intro" ? (
            <button className="attention-back" type="button" onClick={goBack}>
              ← Önceki
            </button>
          ) : (
            <span />
          )}

          <div className="attention-step-dots" aria-hidden="true">
            {["intro", "info", "eyeInfo", "game", "focusInfo", "focusGame", "numberInfo", "trackGame", "textInfo", "textGame", "memoryInfo", "memoryGame"].map((item) => (
              <span key={item} className={["intro", "info", "eyeInfo", "game", "focusInfo", "focusGame", "numberInfo", "trackGame", "textInfo", "textGame", "memoryInfo", "memoryGame"].indexOf(item) <= ["intro", "info", "eyeInfo", "game", "focusInfo", "focusGame", "numberInfo", "trackGame", "textInfo", "textGame", "memoryInfo", "memoryGame"].indexOf(screen) ? "active" : ""} />
            ))}
          </div>
        </div>

        {screen === "intro" && (
          <section className="attention-panel attention-intro-panel">
            <div className="attention-title-block">
              <span>Ücretsiz</span>
              <h2>Dikkat ve Odaklanma Testi</h2>
              <p>Bu test ile çocuğunuzun dikkat, odaklanma ve bilişsel becerilerini ölçebilirsiniz.</p>
            </div>

            <h3>Öğrencinin seviyesini seçin</h3>
            <p className="attention-muted">Seçtiğiniz seviyeye göre öğrencinin yaş grubuna uygun egzersiz akışı hazırlanır.</p>

            <div className="attention-level-grid">
              {LEVELS.map((level) => (
                <button
                  key={level.key}
                  type="button"
                  className={`attention-level-card attention-level-${level.tone} ${levelKey === level.key ? "selected" : ""}`}
                  onClick={() => setLevelKey(level.key)}
                >
                  <LevelVisual tone={level.tone} />
                  <strong>{level.label}</strong>
                  <span>{level.difficulty}</span>
                </button>
              ))}
            </div>

            <button className="attention-primary-btn" type="button" disabled={!levelKey} onClick={startInfo}>
              Testi Başlat
            </button>
          </section>
        )}

        {screen === "info" && (
          <section className="attention-panel attention-info-panel">
            <div className="attention-badge">{selectedLevel.label} · {selectedLevel.difficulty}</div>
            <h2>Test Hakkında Bilgi</h2>
            <p className="attention-muted">Bu test 5 kısa bölümden oluşur. İlk bölüm Göz Egzersizi ile başlar. Hazır olduğunuzda aktif egzersizi seçip teste geçebilirsiniz.</p>

            <div className="attention-exercise-grid">
              {EXERCISES.map((exercise, index) => (
                <button
                  key={exercise.key}
                  type="button"
                  disabled={!exercise.active}
                  className={`attention-exercise-card ${exercise.active ? "active" : "locked"}`}
                  onClick={() => exercise.active && setScreen("eyeInfo")}
                >
                  <span className="attention-exercise-order">{index + 1}</span>
                  <ExerciseIcon type={exercise.icon} />
                  <strong>{exercise.title.split("\n").map((line) => <span key={line}>{line}</span>)}</strong>
                  {exercise.active ? <em>Benimle başla</em> : <small>Sonra açılacak</small>}
                </button>
              ))}
            </div>
          </section>
        )}

        {screen === "eyeInfo" && (
          <section className="attention-panel attention-eye-panel">
            <div className="attention-badge">{selectedLevel.label} · {selectedLevel.difficulty}</div>
            <h2>Göz Egzersizi</h2>

            <div className="attention-detail-card">
              <div className="attention-detail-icon">
                <ExerciseIcon type="eye" />
              </div>
              <div>
                <h3>Süre: 30 Saniye</h3>
                <p><strong>Amaç:</strong> Bu egzersiz görsel dikkat, hızlı tarama ve kısa süreli belleği güçlendirmek için hazırlanmıştır.</p>
                <p><strong>Oynama Şekli:</strong> Sayıların yerini 3 saniye içinde hafızanda tut. Kutular kapandıktan sonra 1’den başlayarak sayıları sırayla bul.</p>
                <p><strong>{selectedLevel.label}:</strong> {selectedLevel.description} Bu seviyede oyun {selectedLevel.rounds[0]} sayı ile başlar ve her tur zorlaşır.</p>
              </div>
            </div>

            <button className="attention-green-btn" type="button" onClick={startGame}>
              Teste Başla
            </button>
          </section>
        )}

        {screen === "game" && (
          <section className="attention-game-panel">
            <div className="attention-scorebar">
              <strong>Kalan Süre : <span>00:{String(timeLeft).padStart(2, "0")}</span></strong>
              <strong>Doğru : <span>{correct}</span></strong>
              <strong>Yanlış : <span>{wrong}</span></strong>
            </div>

            <div className="attention-game-card">
              <div className="attention-badge">{selectedLevel.label} · {selectedLevel.difficulty}</div>
              <div className="attention-round-title">Tur {roundIndex + 1}/4 · {currentNumberCount} Sayı</div>

              <div className="attention-board" style={{ gridTemplateColumns: `repeat(${selectedLevel.grid}, 1fr)` }}>
                {board.map((cell) => {
                  const isVisible = phase === "preview" && cell.number;
                  const isOpened = cell.opened;

                  return (
                    <button
                      key={cell.id}
                      type="button"
                      className={`attention-cell ${isVisible ? "preview" : ""} ${isOpened ? "opened" : ""} ${cell.wrong ? "wrong" : ""}`}
                      onClick={() => handleCellClick(cell)}
                      aria-label={cell.number ? `${cell.number} numaralı kutu` : "boş kutu"}
                    >
                      <span className="attention-cell-inner">
                        {isVisible || isOpened ? (
                          <span className="attention-cell-number">{cell.number}</span>
                        ) : (
                          <span className="attention-cell-logo">Fixoku</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="attention-under-board">
                <div className="attention-mini-bar">
                  <span style={{ width: phase === "preview" ? `${((PREVIEW_SECONDS - previewLeft) / PREVIEW_SECONDS) * 100}%` : `${((nextNumber - 1) / currentNumberCount) * 100}%` }} />
                </div>
                <div className="attention-next-pill">
                  {phase === "preview" ? `Ezberle: ${previewLeft}` : `Sıradaki: ${nextNumber}`}
                </div>
              </div>

              {warning && <div className="attention-warning">{warning}</div>}
            </div>

            <div className="attention-footerbar">
              <div className="attention-total-progress"><span style={{ width: `${progress}%` }} /></div>
              <button className="attention-pause-btn" type="button" onClick={() => setPaused(true)}>
                II&nbsp; Durdur
              </button>
            </div>

            {paused && (
              <div className="attention-pause-overlay">
                <div className="attention-pause-card">
                  <div className="attention-pause-icon">Ⅱ</div>
                  <h2>Egzersiz duraklatıldı.</h2>
                  <p>Devam etmek için tıklayın</p>
                  <button type="button" onClick={() => setPaused(false)}>Devam Et</button>
                </div>
              </div>
            )}
          </section>
        )}


        {screen === "focusInfo" && (
          <section className="attention-panel attention-eye-panel">
            <div className="attention-badge">{selectedLevel.label} · {selectedLevel.difficulty}</div>
            <h2>Dikkat ve Odaklanma</h2>

            <div className="attention-detail-card">
              <div className="attention-detail-icon attention-focus-icon">
                <ExerciseIcon type="brain" />
              </div>
              <div>
                <h3>İki Resim Arasındaki Farkları Bul</h3>
                <p><strong>Amaç:</strong> Bu egzersiz görsel ayrıntı yakalama, dikkat sürdürme ve odaklanma becerisini ölçmek için hazırlanmıştır.</p>
                <p><strong>Oynama Şekli:</strong> Sağdaki resimde farklı olan noktaları işaretle. Doğru bulduğunda yeşil onay çıkar, yanlış seçimde uyarı alırsın.</p>
                <p><strong>{selectedLevel.label}:</strong> Bu seviyede 4 farklı görsel seti çözülür. Her set bitince otomatik olarak sıradaki sete geçer.</p>
              </div>
            </div>

            <button className="attention-green-btn" type="button" onClick={startFocusGame}>
              Dikkat Testine Başla
            </button>
          </section>
        )}

        {screen === "focusGame" && (
          <section className="attention-game-panel attention-focus-game-panel">
            <div className="attention-scorebar">
              <strong>Kalan Süre : <span>00:{String(focusTimeLeft).padStart(2, "0")}</span></strong>
              <strong>Doğru : <span>{focusCorrect}</span></strong>
              <strong>Yanlış : <span>{focusWrong}</span></strong>
              <strong>Bulunan : <span>{foundDifferences.length}/{currentFocusSet.differences.length}</span></strong>
            </div>

            <div className="attention-difference-card">
              <div className="attention-badge">{selectedLevel.label} · {selectedLevel.difficulty}</div>
              <div className="attention-round-title">Set {focusSetIndex + 1}/{focusSets.length} · Sağdaki resimde farkları işaretle</div>

              <div className="attention-difference-grid">
                <div className="attention-difference-image">
                  <img src={currentFocusSet.left} alt="Sol resim" />
                </div>

                <button
                  type="button"
                  className="attention-difference-image attention-difference-clickable"
                  onClick={handleDifferenceClick}
                  aria-label="Sağ resimde farkı işaretle"
                >
                  <img src={currentFocusSet.right} alt="Sağ resim" />

                  {foundDifferences.map((index) => {
                    const point = currentFocusSet.differences[index];

                    return (
                      <span
                        key={index}
                        className="attention-found-mark"
                        style={{ left: `${point.x}%`, top: `${point.y}%` }}
                      >
                        ✓
                      </span>
                    );
                  })}

                  {missPoint && (
                    <span
                      className="attention-miss-mark"
                      style={{ left: `${missPoint.x}%`, top: `${missPoint.y}%` }}
                    >
                      !
                    </span>
                  )}
                </button>
              </div>

              {focusWarning && <div className="attention-warning">{focusWarning}</div>}
            </div>

            <div className="attention-footerbar">
              <div className="attention-total-progress"><span style={{ width: `${focusProgress}%` }} /></div>
              <button className="attention-pause-btn" type="button" onClick={() => setPaused(true)}>
                II&nbsp; Durdur
              </button>
            </div>

            {paused && (
              <div className="attention-pause-overlay">
                <div className="attention-pause-card">
                  <div className="attention-pause-icon">Ⅱ</div>
                  <h2>Egzersiz duraklatıldı.</h2>
                  <p>Devam etmek için tıklayın</p>
                  <button type="button" onClick={() => setPaused(false)}>Devam Et</button>
                </div>
              </div>
            )}
          </section>
        )}

        {screen === "numberInfo" && (
          <section className="attention-panel attention-eye-panel">
            <div className="attention-badge">{selectedLevel.label} · {selectedLevel.difficulty}</div>
            <h2>Sayısal İşlem</h2>

            <div className="attention-detail-card">
              <div className="attention-detail-icon attention-number-icon">
                <ExerciseIcon type="puzzle" />
              </div>
              <div>
                <h3>Takip Et Bul</h3>
                <p><strong>Süre:</strong> 30 Saniye</p>
                <p><strong>Amaç:</strong> Bu egzersiz; bir göreve sürekli ve istikrarlı şekilde odaklanabilme yeteneğini ve sürdürülebilir dikkati güçlendirmek için hazırlanmıştır.</p>
                <p><strong>Oynama Şekli:</strong> Yeşil topun hangi yuvarlağın içinde olduğunu aklında tut. Yuvarlaklar yer değiştirdikten sonra saklı topun olduğu yuvarlağı bul.</p>
                <p><strong>{selectedLevel.label}:</strong> Seviye arttıkça yuvarlakların yer değiştirme hızı ve sayısı artar.</p>
              </div>
            </div>

            <button className="attention-green-btn" type="button" onClick={startTrackGame}>
              Takip Et Bul Testine Başla
            </button>
          </section>
        )}

        {screen === "trackGame" && (
          <section className="attention-game-panel attention-track-game-panel">
            <div className="attention-scorebar">
              <strong>Kalan Süre : <span>00:{String(trackTimeLeft).padStart(2, "0")}</span></strong>
              <strong>Doğru : <span>{trackCorrect}</span></strong>
              <strong>Yanlış : <span>{trackWrong}</span></strong>
              <strong>Tur : <span>{trackRound}</span></strong>
            </div>

            <div className="attention-track-card">
              <div className="attention-badge">{selectedLevel.label} · {selectedLevel.difficulty}</div>
              <div className="attention-round-title">
                {trackPhase === "show" && "Yeşil topun yerini aklında tut"}
                {trackPhase === "shuffle" && "Yuvarlakları dikkatle takip et"}
                {trackPhase === "guess" && "Saklı yeşil top hangi yuvarlakta?"}
                {trackPhase === "result" && "Sonuç"}
              </div>

              <div className={`attention-track-stage attention-track-${trackPhase}`}>
                {trackCups.map((cup) => {
                  const isTarget = cup.id === trackTargetId;
                  const isPicked = cup.id === trackPickedId;
                  const isCorrectPick = isPicked && isTarget;
                  const isWrongPick = isPicked && !isTarget;
                  const shouldShowBall = (trackPhase === "show" && isTarget) || (trackPhase === "result" && isTarget);

                  return (
                    <button
                      key={cup.id}
                      type="button"
                      className={`attention-track-cup position-${cup.position} ${shouldShowBall ? "has-ball" : ""} ${isCorrectPick ? "picked-correct" : ""} ${isWrongPick ? "picked-wrong" : ""}`}
                      onClick={() => handleTrackPick(cup.id)}
                      aria-label="Top yuvarlağı"
                    >
                      <span className="attention-track-cup-face">
                        <span className="attention-track-ball" />
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="attention-under-board">
                <div className="attention-mini-bar">
                  <span style={{ width: trackPhase === "show" ? "28%" : trackPhase === "shuffle" ? "68%" : "100%" }} />
                </div>
                <div className="attention-next-pill">
                  {trackPhase === "show" && "Yeşili gör"}
                  {trackPhase === "shuffle" && "Takip et"}
                  {trackPhase === "guess" && "Şimdi bul"}
                  {trackPhase === "result" && "Doğru yer"}
                </div>
              </div>

              {trackWarning && <div className="attention-warning">{trackWarning}</div>}
            </div>

            <div className="attention-footerbar">
              <div className="attention-total-progress"><span style={{ width: `${trackProgress}%` }} /></div>
              <button className="attention-pause-btn" type="button" onClick={() => setPaused(true)}>
                II&nbsp; Durdur
              </button>
            </div>

            {paused && (
              <div className="attention-pause-overlay">
                <div className="attention-pause-card">
                  <div className="attention-pause-icon">Ⅱ</div>
                  <h2>Egzersiz duraklatıldı.</h2>
                  <p>Devam etmek için tıklayın</p>
                  <button type="button" onClick={() => setPaused(false)}>Devam Et</button>
                </div>
              </div>
            )}
          </section>
        )}

        {screen === "textInfo" && (
          <section className="attention-panel attention-eye-panel">
            <div className="attention-badge">{selectedLevel.label} · {selectedLevel.difficulty}</div>
            <h2>Metin Egzersizi</h2>

            <div className="attention-detail-card">
              <div className="attention-detail-icon attention-text-icon">
                <ExerciseIcon type="text" />
              </div>
              <div>
                <h3>Kelimeyi Hatırla</h3>
                <p><strong>Süre:</strong> 30 Saniye</p>
                <p><strong>Amaç:</strong> Bu egzersiz kelimeleri hızlı şekilde kavrama ve kısa sürede algılama becerisini geliştirmek amacıyla hazırlanmıştır.</p>
                <p><strong>Oynama Şekli:</strong> Ekranda çıkan kelimeleri dikkatle incele. Sonra “Hangi kelimeyi görmedin?” sorusuna doğru ve hızlı cevap ver.</p>
                <p><strong>{selectedLevel.label}:</strong> Bu seviyede kelime sayısı kademeli olarak artar ve toplam 5 kısa tur oynanır.</p>
              </div>
            </div>

            <button className="attention-green-btn" type="button" onClick={startTextGame}>
              Kelimeyi Hatırla Testine Başla
            </button>
          </section>
        )}

        {screen === "textGame" && (
          <section className="attention-game-panel attention-text-game-panel">
            <div className="attention-scorebar">
              <strong>Kalan Süre : <span>00:{String(textTimeLeft).padStart(2, "0")}</span></strong>
              <strong>Doğru : <span>{textCorrect}</span></strong>
              <strong>Yanlış : <span>{textWrong}</span></strong>
              <strong>Tur : <span>{textRound + 1}/5</span></strong>
            </div>

            <div className="attention-text-card">
              <div className="attention-badge">{selectedLevel.label} · {selectedLevel.difficulty}</div>

              {textPhase === "show" && (
                <>
                  <div className="attention-round-title">Kelimeleri aklında tut</div>
                  <div className="attention-word-list">
                    {textWords.map((word) => (
                      <span key={word}>{word}</span>
                    ))}
                  </div>
                  <div className="attention-under-board">
                    <div className="attention-mini-bar"><span style={{ width: "65%" }} /></div>
                    <div className="attention-next-pill">Kelimeleri izle</div>
                  </div>
                </>
              )}

              {textPhase !== "show" && (
                <>
                  <div className="attention-text-question">Hangi kelimeyi görmedin?</div>
                  <div className="attention-word-options">
                    {textOptions.map((word) => (
                      <button key={word} type="button" onClick={() => handleTextAnswer(word)} disabled={textPhase !== "question"}>
                        {word}
                      </button>
                    ))}
                  </div>
                  {textFeedback && <div className={textFeedback.startsWith("Bravo") ? "attention-bravo" : "attention-warning"}>{textFeedback}</div>}
                </>
              )}
            </div>

            <div className="attention-footerbar">
              <div className="attention-total-progress"><span style={{ width: `${textProgress}%` }} /></div>
              <button className="attention-pause-btn" type="button" onClick={() => setPaused(true)}>
                II&nbsp; Durdur
              </button>
            </div>

            {paused && (
              <div className="attention-pause-overlay">
                <div className="attention-pause-card">
                  <div className="attention-pause-icon">Ⅱ</div>
                  <h2>Egzersiz duraklatıldı.</h2>
                  <p>Devam etmek için tıklayın</p>
                  <button type="button" onClick={() => setPaused(false)}>Devam Et</button>
                </div>
              </div>
            )}
          </section>
        )}

        {screen === "memoryInfo" && (
          <section className="attention-panel attention-eye-panel">
            <div className="attention-badge">{selectedLevel.label} · {selectedLevel.difficulty}</div>
            <h2>Hafıza Egzersizi</h2>

            <div className="attention-detail-card">
              <div className="attention-detail-icon attention-memory-icon">
                <ExerciseIcon type="memory" />
              </div>
              <div>
                <h3>Uçan Sayılar</h3>
                <p><strong>Süre:</strong> 30 Saniye</p>
                <p><strong>Amaç:</strong> Bu egzersiz, sayısal işlem becerilerini güçlendirmek; akıl yürütme, problem çözme ve karar verme yeteneklerini geliştirmek için hazırlanmıştır.</p>
                <p><strong>Oynama Şekli:</strong> Ekranda uçan sayıları kaybolmadan takip et. Sayılar gizlenince toplamlarını doğru şıktan işaretle.</p>
                <p><strong>{selectedLevel.label}:</strong> Bu seviyede {levelKey === "ilkokul" ? "1" : levelKey === "ortaokul" ? "2" : "3"} sayı ile başlar, her turda zorluk artar.</p>
              </div>
            </div>

            <button className="attention-green-btn" type="button" onClick={startMemoryGame}>
              Uçan Sayılar Testine Başla
            </button>
          </section>
        )}

        {screen === "memoryGame" && (
          <section className="attention-game-panel attention-memory-game-panel">
            <div className="attention-scorebar">
              <strong>Kalan Süre : <span>00:{String(memoryTimeLeft).padStart(2, "0")}</span></strong>
              <strong>Doğru : <span>{memoryCorrect}</span></strong>
              <strong>Yanlış : <span>{memoryWrong}</span></strong>
              <strong>Tur : <span>{memoryRound + 1}/5</span></strong>
            </div>

            <div className="attention-memory-card">
              <div className="attention-badge">{selectedLevel.label} · {selectedLevel.difficulty}</div>

              {memoryPhase === "show" && (
                <>
                  <div className="attention-round-title">Uçan sayıları takip et ve toplamını aklında tut</div>
                  <div className="attention-flying-area">
                    {memoryNumbers.map((number, index) => (
                      <span key={memoryRound + "-" + index + "-" + number} className={"attention-flying-number fly-" + (index % 7)}>
                        {number}
                      </span>
                    ))}
                  </div>
                  <div className="attention-under-board">
                    <div className="attention-mini-bar"><span style={{ width: "70%" }} /></div>
                    <div className="attention-next-pill">Sayıları topla</div>
                  </div>
                </>
              )}

              {memoryPhase !== "show" && (
                <>
                  <div className="attention-text-question">Uçan sayıların toplamı kaç?</div>
                  <div className="attention-memory-options">
                    {memoryOptions.map((option) => (
                      <button key={option} type="button" onClick={() => handleMemoryAnswer(option)} disabled={memoryPhase !== "question"}>
                        {option}
                      </button>
                    ))}
                  </div>
                  {memoryFeedback && <div className={memoryFeedback.startsWith("Bravo") ? "attention-bravo" : "attention-warning"}>{memoryFeedback}</div>}
                </>
              )}
            </div>

            <div className="attention-footerbar">
              <div className="attention-total-progress"><span style={{ width: memoryProgress + "%" }} /></div>
              <button className="attention-pause-btn" type="button" onClick={() => setPaused(true)}>
                II&nbsp; Durdur
              </button>
            </div>

            {paused && (
              <div className="attention-pause-overlay">
                <div className="attention-pause-card">
                  <div className="attention-pause-icon">Ⅱ</div>
                  <h2>Egzersiz duraklatıldı.</h2>
                  <p>Devam etmek için tıklayın</p>
                  <button type="button" onClick={() => setPaused(false)}>Devam Et</button>
                </div>
              </div>
            )}
          </section>
        )}

        {screen === "completedInfo" && (
          <section className="attention-panel attention-info-panel attention-completed-panel">
            <div className="attention-badge">{selectedLevel.label} · {selectedLevel.difficulty}</div>
            <h2>Test Hakkında Bilgi</h2>
            <p className="attention-muted">Tüm egzersizler tamamlandı. Aşağıdaki bölümlerin hepsi başarıyla işlendi; şimdi toplu sonucunu görüntüleyebilirsin.</p>

            <div className="attention-exercise-grid attention-completed-grid">
              {resultItems.map((exercise, index) => (
                <div key={exercise.key} className="attention-exercise-card completed">
                  <span className="attention-exercise-order">{index + 1}</span>
                  <span className="attention-complete-check">✓</span>
                  <ExerciseIcon type={exercise.icon} />
                  <strong>{exercise.title.split("\n").map((line) => <span key={line}>{line}</span>)}</strong>
                  <em>Tamamlandı</em>
                </div>
              ))}
            </div>

            <button className="attention-result-show-btn" type="button" onClick={() => setScreen("result")}>
              <span className="attention-play-circle">▶</span>
              Sonucumu Göster
            </button>
          </section>
        )}

        {screen === "result" && (
          <section className="attention-panel attention-result-panel">
            <div className="attention-badge">{selectedLevel.label} · {selectedLevel.difficulty}</div>
            <h2>Egzersiz Sonuçları</h2>

            <div className="attention-result-rings">
              {resultItems.map((item) => (
                <div key={item.key} className="attention-result-item">
                  <div className="attention-ring" style={{ "--score": `${item.percent * 3.6}deg` }}>
                    <div className="attention-ring-inner">{item.percent}%</div>
                  </div>
                  <div className="attention-result-icon"><ExerciseIcon type={item.icon} /></div>
                  <strong>{item.title.split("\n").map((line) => <span key={line}>{line}</span>)}</strong>
                </div>
              ))}
            </div>

            <p className="attention-result-note">
              {resultNoteText}
            </p>

            <div className="attention-result-cta">
              <h3>Sonucu uzman eğitmenle değerlendirin</h3>
              <div className="attention-result-form">
                <input
                  placeholder="Veli adı soyadı"
                  value={attentionFormData.parentName}
                  onChange={(event) => setAttentionFormData({ ...attentionFormData, parentName: event.target.value })}
                />
                <input
                  placeholder="Telefon"
                  value={attentionFormData.phone}
                  onChange={(event) => setAttentionFormData({ ...attentionFormData, phone: event.target.value })}
                />
                <input
                  placeholder="Öğrencinin sınıfı"
                  value={attentionFormData.studentClass}
                  onChange={(event) => setAttentionFormData({ ...attentionFormData, studentClass: event.target.value })}
                />
                <input
                  placeholder="Şehir"
                  value={attentionFormData.city}
                  onChange={(event) => setAttentionFormData({ ...attentionFormData, city: event.target.value })}
                />
              </div>
              <div className="attention-result-actions">
                <a
                  className="attention-whatsapp-btn"
                  href={`https://wa.me/905334789253?text=${encodeURIComponent(attentionWhatsappMessage)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp ile Bilgi Al
                </a>
                {showAttentionPhoneNumber ? (
                  <strong className="attention-phone-number">0 533 478 92 53</strong>
                ) : (
                  <button
                    type="button"
                    className="attention-call-btn"
                    onClick={() => setShowAttentionPhoneNumber(true)}
                  >
                    Telefonla Bilgi Al
                  </button>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

const attentionStyles = `
.attention-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: clamp(8px, 2vh, 18px);
  overflow-y: auto;
  background: rgba(20, 0, 33, 0.58);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: #46105f;
}
.attention-modal {
  width: min(980px, 100%);
  min-height: min(680px, calc(100dvh - 16px));
  max-height: calc(100dvh - 16px);
  position: relative;
  padding: 22px 24px 26px;
  border-radius: 30px;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  background:
    linear-gradient(135deg, rgba(236, 196, 255, 0.86), rgba(255, 207, 204, 0.94));
  box-shadow: 0 24px 70px rgba(41, 16, 54, 0.34);
}

.attention-modal::before {
  content: "";
  position: absolute;
  inset: 70px 24px 18px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.16);
  pointer-events: none;
}

.attention-topline {
  position: relative;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 42px;
  margin-bottom: 12px;
}

.attention-back {
  min-height: 36px;
  padding: 0 18px;
  border: 0;
  border-radius: 999px;
  color: #46105f;
  background: rgba(255, 255, 255, 0.78);
  font-size: 14px;
  font-weight: 900;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(66, 18, 88, 0.12);
}

.attention-close {
  position: absolute;
  z-index: 5;
  top: 18px;
  right: 22px;
  width: 42px;
  height: 42px;
  border: 0;
  border-radius: 999px;
  background: #ff6508;
  color: #fff;
  font-size: 34px;
  line-height: 1;
  font-weight: 900;
  cursor: pointer;
  box-shadow: 0 10px 20px rgba(255, 101, 8, 0.3);
}

.attention-step-dots {
  display: flex;
  gap: 8px;
  padding-right: 54px;
}

.attention-step-dots span {
  width: 28px;
  height: 7px;
  border-radius: 999px;
  background: rgba(255, 101, 8, 0.35);
}

.attention-step-dots span.active {
  background: #ff6508;
}

.attention-panel,
.attention-game-panel {
  position: relative;
  z-index: 2;
  width: min(820px, calc(100% - 80px));
  min-height: 560px;
  margin: 6px auto 0;
  padding: 26px 44px;
  border-radius: 36px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 18px 38px rgba(34, 0, 45, 0.22);
}

.attention-game-panel {
  width: min(930px, 100%);
  padding: 20px 28px 26px;
  background: transparent;
  box-shadow: none;
}

.attention-title-block {
  text-align: center;
  margin-bottom: 18px;
}

.attention-title-block span,
.attention-title-block h2,
.attention-panel h2 {
  font-weight: 950;
  letter-spacing: -0.8px;
}

.attention-title-block span {
  display: block;
  color: #ff6508;
  font-size: 44px;
  line-height: 1;
}

.attention-title-block h2,
.attention-panel h2 {
  margin: 8px 0 10px;
  color: #46105f;
  font-size: 48px;
  line-height: 1.02;
  text-align: center;
}

.attention-title-block p,
.attention-muted {
  max-width: 680px;
  margin: 0 auto 18px;
  color: #5a2471;
  font-size: 20px;
  line-height: 1.35;
  text-align: center;
}

.attention-intro-panel h3 {
  margin: 6px 0 6px;
  color: #46105f;
  text-align: center;
  font-size: 28px;
  font-weight: 950;
}

.attention-level-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
  margin: 22px 0 24px;
}

.attention-level-card {
  min-height: 215px;
  padding: 18px 14px;
  border: 3px solid transparent;
  border-radius: 26px;
  background: #f0dff0;
  color: #46105f;
  cursor: pointer;
  box-shadow: 0 12px 24px rgba(38, 0, 48, 0.16);
  transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
}

.attention-level-card:hover,
.attention-level-card.selected {
  transform: translateY(-6px);
  border-color: #ff6508;
  box-shadow: 0 18px 34px rgba(255, 101, 8, 0.2);
}

.attention-level-card strong {
  display: block;
  margin-top: 8px;
  font-size: 29px;
  line-height: 1;
  font-weight: 950;
}

.attention-level-card span {
  display: block;
  margin-top: 8px;
  color: rgba(70, 16, 95, 0.74);
  font-size: 14px;
  font-weight: 900;
}

.attention-level-art {
  width: 120px;
  height: 96px;
  margin: 0 auto;
  position: relative;
}

.attention-level-art span {
  position: absolute;
  display: block;
}

.art-circle {
  inset: 15px 27px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff6508, #7e20d7);
  opacity: 0.18;
}

.art-screen {
  left: 35px;
  bottom: 16px;
  width: 56px;
  height: 36px;
  border-radius: 7px;
  background: #f8fbff;
  border: 4px solid currentColor;
  transform: skewX(-12deg);
}

.art-book {
  left: 14px;
  bottom: 18px;
  width: 34px;
  height: 13px;
  border-radius: 4px;
  background: #ff6508;
  box-shadow: 4px 10px 0 #46105f;
}

.art-pencil {
  right: 12px;
  bottom: 25px;
  width: 8px;
  height: 42px;
  border-radius: 999px;
  background: #34c98b;
  transform: rotate(14deg);
}

.art-globe {
  left: 46px;
  top: 8px;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #a7ff7a, #1ebf8f 48%, #1684d8 49%);
}

.attention-level-primary { color: #18c981; }
.attention-level-middle { color: #2b85ff; }
.attention-level-high { color: #8b3cff; }

.attention-primary-btn,
.attention-green-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 56px;
  margin: 0 auto;
  padding: 0 34px;
  border: 0;
  border-radius: 999px;
  color: #fff;
  background: linear-gradient(135deg, #ff7a00, #ff4d00);
  font-size: 19px;
  font-weight: 950;
  cursor: pointer;
  box-shadow: 0 14px 28px rgba(255, 101, 8, 0.24);
}

.attention-primary-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.attention-green-btn {
  background: linear-gradient(135deg, #15c983, #8af84f);
  box-shadow: 0 14px 28px rgba(21, 201, 131, 0.26);
}

.attention-badge {
  width: fit-content;
  margin: 0 auto 14px;
  padding: 8px 18px;
  border-radius: 999px;
  color: #ff6508;
  background: #fff0e9;
  font-size: 13px;
  font-weight: 950;
}

.attention-exercise-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 16px;
  margin-top: 26px;
}

.attention-exercise-card {
  min-height: 220px;
  position: relative;
  border: 0;
  border-radius: 20px;
  background: #f0dff0;
  color: #ff6508;
  cursor: pointer;
  transition: transform 0.25s ease, filter 0.25s ease, box-shadow 0.25s ease;
}

.attention-exercise-card svg {
  width: 66px;
  height: 66px;
  margin: 26px auto 14px;
}

.attention-exercise-card strong span {
  display: block;
  color: #46105f;
  font-size: 20px;
  line-height: 1.15;
  font-weight: 900;
}

.attention-exercise-card.active {
  animation: attentionPulse 1.45s ease-in-out infinite;
  box-shadow: 0 14px 30px rgba(255, 101, 8, 0.18);
}

.attention-exercise-card.locked {
  opacity: 0.42;
  filter: grayscale(0.8);
  cursor: not-allowed;
}

.attention-exercise-card em,
.attention-exercise-card small {
  display: block;
  margin-top: 10px;
  font-style: normal;
  font-size: 12px;
  font-weight: 900;
}

.attention-exercise-order {
  position: absolute;
  top: 10px;
  left: 10px;
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #fff;
  background: #ff6508;
  font-size: 12px;
  font-weight: 900;
}

@keyframes attentionPulse {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-7px) scale(1.035); }
}

.attention-detail-card {
  display: grid;
  grid-template-columns: 130px 1fr;
  gap: 28px;
  align-items: center;
  margin: 18px auto 24px;
  padding: 28px;
  border-radius: 28px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(246, 226, 248, 0.94));
  box-shadow: inset 0 0 0 1px rgba(70, 16, 95, 0.08);
}

.attention-detail-icon {
  width: 118px;
  height: 118px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #15c983;
  background: #fff;
  box-shadow: 0 14px 30px rgba(70, 16, 95, 0.14);
}

.attention-detail-icon svg {
  width: 72px;
  height: 72px;
}

.attention-detail-card h3 {
  color: #ff6508;
  font-size: 26px;
  margin-bottom: 12px;
}

.attention-detail-card p {
  color: #4f1568;
  font-size: 16px;
  line-height: 1.48;
  margin: 8px 0;
}

.attention-scorebar {
  width: min(800px, 100%);
  min-height: 54px;
  margin: 0 auto 14px;
  padding: 0 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 28px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 12px 26px rgba(60, 17, 80, 0.12);
}

.attention-scorebar strong {
  color: #46105f;
  font-size: 20px;
  font-weight: 950;
  white-space: nowrap;
}

.attention-scorebar span {
  color: #333;
  font-weight: 500;
}

.attention-game-card {
  position: relative;
  width: min(720px, 100%);
  min-height: 500px;
  margin: 0 auto;
  padding: 18px 22px 24px;
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18px 38px rgba(50, 12, 70, 0.2);
}

.attention-game-card::before {
  content: "";
  position: absolute;
  inset: 16px;
  border-radius: 24px;
  background:
    linear-gradient(rgba(70, 16, 95, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(70, 16, 95, 0.035) 1px, transparent 1px);
  background-size: 28px 28px;
  pointer-events: none;
}

.attention-round-title {
  position: relative;
  z-index: 1;
  margin: -4px 0 10px;
  text-align: center;
  color: #46105f;
  font-size: 16px;
  font-weight: 950;
}

.attention-board {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 14px;
  width: fit-content;
  margin: 0 auto;
}

.attention-cell {
  width: 92px;
  height: 92px;
  padding: 0;
  border: 1px solid rgba(70, 16, 95, 0.12);
  border-radius: 14px;
  background: linear-gradient(135deg, #fff, #f9eef9);
  box-shadow: 0 10px 18px rgba(70, 16, 95, 0.08);
  cursor: pointer;
  perspective: 700px;
  transition: transform 0.22s ease, box-shadow 0.22s ease;
}

.attention-cell:hover {
  transform: translateY(-2px);
}

.attention-cell-inner {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  border-radius: inherit;
}

.attention-cell-logo {
  width: 58px;
  height: 58px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #fff;
  background: linear-gradient(135deg, rgba(126, 32, 215, 0.22), rgba(255, 101, 8, 0.24));
  font-size: 13px;
  font-weight: 950;
}

.attention-cell-number {
  font-size: 38px;
  line-height: 1;
  font-weight: 500;
  color: #111;
}

.attention-cell.opened .attention-cell-inner {
  background: linear-gradient(135deg, #18c981, #a2ff5f);
  box-shadow: 0 0 24px rgba(24, 201, 129, 0.45);
  animation: openFlip 0.34s ease;
}

.attention-cell.opened .attention-cell-number {
  color: #fff;
  font-weight: 950;
}

.attention-cell.wrong {
  animation: wrongShake 0.34s ease;
  box-shadow: 0 0 0 3px rgba(255, 50, 50, 0.22), 0 14px 26px rgba(255, 50, 50, 0.22);
}

@keyframes openFlip {
  from { transform: rotateY(90deg) scale(0.92); }
  to { transform: rotateY(0) scale(1); }
}

@keyframes wrongShake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-8px); }
  50% { transform: translateX(8px); }
  75% { transform: translateX(-5px); }
}

.attention-under-board {
  position: relative;
  z-index: 1;
  margin: 16px auto 0;
  display: grid;
  justify-items: center;
  gap: 12px;
}

.attention-mini-bar {
  width: 190px;
  height: 12px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(70, 16, 95, 0.1);
}

.attention-mini-bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #ff6508;
  transition: width 0.25s ease;
}

.attention-next-pill {
  min-height: 34px;
  padding: 0 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  color: #fff;
  background: #ff6508;
  font-size: 14px;
  font-weight: 950;
}

.attention-warning {
  position: relative;
  z-index: 1;
  width: fit-content;
  margin: 12px auto 0;
  padding: 8px 14px;
  border-radius: 999px;
  color: #fff;
  background: linear-gradient(135deg, #ff3d3d, #ff7a00);
  font-size: 13px;
  font-weight: 900;
}

.attention-footerbar {
  width: min(760px, 100%);
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 24px;
  align-items: center;
  margin: 16px auto 0;
}

.attention-total-progress {
  height: 24px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: inset 0 1px 4px rgba(70, 16, 95, 0.12);
}

.attention-total-progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #14c987, #a4ff5f);
  transition: width 0.25s ease;
}

.attention-pause-btn {
  min-width: 130px;
  min-height: 34px;
  border: 0;
  border-radius: 999px;
  color: #fff;
  background: #ff6508;
  font-size: 15px;
  font-weight: 950;
  cursor: pointer;
  box-shadow: 0 12px 24px rgba(255, 101, 8, 0.24);
}

.attention-pause-overlay {
  position: absolute;
  z-index: 10;
  inset: 0;
  display: grid;
  place-items: center;
  border-radius: 30px;
  background: rgba(255, 244, 241, 0.72);
  backdrop-filter: blur(9px);
}

.attention-pause-card {
  width: min(440px, calc(100% - 40px));
  padding: 34px 28px;
  text-align: center;
  border-radius: 24px;
  background: linear-gradient(135deg, #fff8f3, #ffd9c8);
  box-shadow: 0 22px 48px rgba(120, 38, 0, 0.22);
}

.attention-pause-icon {
  width: 142px;
  height: 142px;
  margin: 0 auto 22px;
  display: grid;
  place-items: center;
  border: 10px solid #ff6508;
  border-radius: 50%;
  color: #ff6508;
  font-size: 66px;
  font-weight: 950;
}

.attention-pause-card h2 {
  margin: 0 0 18px;
  color: #ff6508;
  font-size: 34px;
  font-weight: 500;
}

.attention-pause-card p {
  margin: 0 0 18px;
  color: #6f6f78;
  font-size: 22px;
}

.attention-pause-card button {
  min-height: 42px;
  padding: 0 26px;
  border: 0;
  border-radius: 999px;
  color: #fff;
  background: #ff6508;
  font-weight: 950;
  cursor: pointer;
}

.attention-result-panel {
  display: grid;
  align-content: center;
  text-align: center;
}

.attention-result-panel p {
  color: #46105f;
}

.attention-tone-primary .attention-badge { color: #18c981; background: rgba(24, 201, 129, 0.12); }
.attention-tone-middle .attention-badge { color: #2b85ff; background: rgba(43, 133, 255, 0.12); }
.attention-tone-high .attention-badge { color: #8b3cff; background: rgba(139, 60, 255, 0.12); }


.attention-focus-icon {
  color: #ff6508;
}

.attention-difference-card {
  position: relative;
  width: min(900px, 100%);
  min-height: 500px;
  margin: 0 auto;
  padding: 18px 22px 24px;
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18px 38px rgba(50, 12, 70, 0.2);
}

.attention-difference-card::before {
  content: "";
  position: absolute;
  inset: 16px;
  border-radius: 24px;
  background:
    linear-gradient(rgba(70, 16, 95, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(70, 16, 95, 0.035) 1px, transparent 1px);
  background-size: 28px 28px;
  pointer-events: none;
}

.attention-difference-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  align-items: start;
}

.attention-difference-image {
  position: relative;
  min-height: 390px;
  overflow: hidden;
  border: 0;
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 12px 26px rgba(70, 16, 95, 0.12);
}

.attention-difference-image img {
  width: 100%;
  height: 430px;
  object-fit: contain;
  display: block;
}

.attention-difference-clickable {
  cursor: crosshair;
  padding: 0;
}

.attention-found-mark {
  position: absolute;
  width: 38px;
  height: 38px;
  transform: translate(-50%, -50%);
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #fff;
  background: linear-gradient(135deg, #18c981, #a2ff5f);
  box-shadow: 0 0 24px rgba(24, 201, 129, 0.45);
  font-size: 25px;
  font-weight: 950;
  animation: foundPop 0.25s ease;
}

.attention-miss-mark {
  position: absolute;
  width: 34px;
  height: 34px;
  transform: translate(-50%, -50%);
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #fff;
  background: linear-gradient(135deg, #ff3d3d, #ff7a00);
  font-size: 22px;
  font-weight: 950;
  animation: wrongShake 0.34s ease;
}

@keyframes foundPop {
  from { transform: translate(-50%, -50%) scale(0.35); }
  to { transform: translate(-50%, -50%) scale(1); }
}


.attention-number-icon {
  color: #ff8a00;
}

.attention-track-card {
  position: relative;
  width: min(720px, 100%);
  min-height: 500px;
  margin: 0 auto;
  padding: 18px 22px 24px;
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18px 38px rgba(50, 12, 70, 0.2);
  overflow: hidden;
}

.attention-track-card::before {
  content: "";
  position: absolute;
  inset: 16px;
  border-radius: 24px;
  background:
    radial-gradient(circle at 18% 22%, rgba(255, 101, 8, 0.08), transparent 24%),
    radial-gradient(circle at 82% 78%, rgba(24, 201, 129, 0.10), transparent 26%),
    linear-gradient(rgba(70, 16, 95, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(70, 16, 95, 0.035) 1px, transparent 1px);
  background-size: auto, auto, 28px 28px, 28px 28px;
  pointer-events: none;
}

.attention-track-stage {
  position: relative;
  z-index: 1;
  width: min(560px, 100%);
  height: 255px;
  margin: 34px auto 20px;
}

.attention-track-stage::after {
  content: "";
  position: absolute;
  left: 9%;
  right: 9%;
  bottom: 36px;
  height: 18px;
  border-radius: 999px;
  background: radial-gradient(ellipse, rgba(70, 16, 95, 0.16), transparent 68%);
}

.attention-track-cup {
  position: absolute;
  top: 74px;
  width: 112px;
  height: 112px;
  border: 0;
  border-radius: 999px;
  padding: 0;
  background: transparent;
  cursor: pointer;
  transform: translateX(-50%);
  transition: left 0.34s cubic-bezier(0.2, 0.9, 0.2, 1), transform 0.2s ease, filter 0.2s ease;
  z-index: 2;
}

.attention-track-cup.position-0 { left: 20%; }
.attention-track-cup.position-1 { left: 50%; }
.attention-track-cup.position-2 { left: 80%; }

.attention-track-cup:hover {
  transform: translateX(-50%) translateY(-5px);
}

.attention-track-cup-face {
  width: 112px;
  height: 112px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background:
    radial-gradient(circle at 33% 28%, rgba(255, 255, 255, 0.95), transparent 24%),
    linear-gradient(135deg, #fff, #f0e4f3);
  border: 3px solid rgba(70, 16, 95, 0.15);
  box-shadow:
    inset 0 -10px 18px rgba(70, 16, 95, 0.08),
    0 16px 30px rgba(70, 16, 95, 0.18);
}

.attention-track-ball {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: linear-gradient(135deg, #18c981, #a4ff5f);
  box-shadow: 0 0 18px rgba(24, 201, 129, 0.55);
  opacity: 0;
  transform: scale(0.35);
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.attention-track-cup.has-ball .attention-track-ball {
  opacity: 1;
  transform: scale(1);
}

.attention-track-cup.picked-correct .attention-track-cup-face {
  background: linear-gradient(135deg, #18c981, #a4ff5f);
  border-color: rgba(24, 201, 129, 0.65);
  animation: trackCorrectPop 0.34s ease;
}

.attention-track-cup.picked-wrong .attention-track-cup-face {
  background: linear-gradient(135deg, #ff4d4d, #ff8a00);
  border-color: rgba(255, 77, 77, 0.65);
  animation: wrongShake 0.34s ease;
}

.attention-track-cup.picked-correct .attention-track-ball,
.attention-track-cup.picked-wrong .attention-track-ball {
  opacity: 1;
  transform: scale(1);
}

.attention-track-shuffle .attention-track-cup-face {
  animation: trackSpin 0.42s ease-in-out infinite alternate;
}

@keyframes trackSpin {
  from { transform: rotate(-3deg) scale(1); }
  to { transform: rotate(3deg) scale(1.035); }
}

@keyframes trackCorrectPop {
  0% { transform: scale(0.82); }
  70% { transform: scale(1.08); }
  100% { transform: scale(1); }
}


.attention-text-icon { color: #ff6508; }

.attention-text-card {
  position: relative;
  width: min(720px, 100%);
  min-height: 500px;
  margin: 0 auto;
  padding: 34px 28px;
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18px 38px rgba(50, 12, 70, 0.2);
  display: grid;
  align-content: center;
  justify-items: center;
  overflow: hidden;
}

.attention-text-card::before {
  content: "";
  position: absolute;
  inset: 16px;
  border-radius: 24px;
  background:
    linear-gradient(rgba(70, 16, 95, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(70, 16, 95, 0.035) 1px, transparent 1px);
  background-size: 28px 28px;
  pointer-events: none;
}

.attention-word-list,
.attention-word-options,
.attention-text-question,
.attention-bravo { position: relative; z-index: 1; }

.attention-word-list {
  width: min(560px, 100%);
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 14px;
  margin: 28px auto 24px;
}

.attention-word-list span {
  min-width: 118px;
  min-height: 54px;
  padding: 0 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
  color: #fff;
  background: linear-gradient(135deg, #ff7a00, #ff4d00);
  font-size: 23px;
  font-weight: 950;
  box-shadow: 0 12px 24px rgba(255, 101, 8, 0.18);
  animation: wordPop 0.35s ease;
}

.attention-text-question {
  margin: 0 0 28px;
  color: #1f2430;
  font-size: 38px;
  line-height: 1.15;
  font-weight: 500;
  text-align: center;
}

.attention-word-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(150px, 1fr));
  gap: 16px;
  width: min(430px, 100%);
}

.attention-word-options button {
  min-height: 54px;
  border: 0;
  border-radius: 8px;
  color: #fff;
  background: linear-gradient(135deg, #ff7a00, #ff4d00);
  font-size: 22px;
  font-weight: 950;
  cursor: pointer;
  box-shadow: 0 12px 24px rgba(255, 101, 8, 0.16);
  transition: transform 0.2s ease, filter 0.2s ease;
}

.attention-word-options button:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.04); }
.attention-word-options button:disabled { opacity: 0.72; cursor: default; }

.attention-bravo {
  width: fit-content;
  margin: 18px auto 0;
  padding: 10px 18px;
  border-radius: 999px;
  color: #fff;
  background: linear-gradient(135deg, #18c981, #a2ff5f);
  font-size: 15px;
  font-weight: 950;
  box-shadow: 0 12px 24px rgba(24, 201, 129, 0.25);
}

@keyframes wordPop { from { transform: scale(0.78); opacity: 0; } to { transform: scale(1); opacity: 1; } }


.attention-memory-icon {
  color: #ff6508;
}

.attention-memory-card {
  position: relative;
  width: min(800px, 100%);
  min-height: 500px;
  margin: 0 auto;
  padding: 24px 26px;
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18px 38px rgba(50, 12, 70, 0.2);
  overflow: hidden;
}

.attention-memory-card::before {
  content: "";
  position: absolute;
  inset: 16px;
  border-radius: 24px;
  background:
    linear-gradient(rgba(70, 16, 95, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(70, 16, 95, 0.035) 1px, transparent 1px);
  background-size: 28px 28px;
  pointer-events: none;
}

.attention-flying-area {
  position: relative;
  z-index: 1;
  height: 310px;
  margin: 6px auto 18px;
  border-radius: 28px;
  background: linear-gradient(135deg, rgba(246, 226, 248, 0.82), rgba(255, 241, 225, 0.78));
  overflow: hidden;
  box-shadow: inset 0 0 0 1px rgba(70, 16, 95, 0.06);
}

.attention-flying-number {
  position: absolute;
  width: 72px;
  height: 56px;
  display: grid;
  place-items: center;
  color: #fff;
  background: #e95fac;
  border-radius: 45% 55% 48% 52%;
  font-size: 32px;
  font-weight: 950;
  box-shadow: 0 14px 28px rgba(233, 95, 172, 0.24);
}

.attention-flying-number::before,
.attention-flying-number::after {
  content: "";
  position: absolute;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: inherit;
  top: -8px;
}

.attention-flying-number::before { left: 14px; }
.attention-flying-number::after { right: 12px; }

.fly-0 { left: 12%; top: 42%; animation: flyOne 2.8s ease-in-out infinite alternate; }
.fly-1 { left: 68%; top: 16%; animation: flyTwo 2.5s ease-in-out infinite alternate; }
.fly-2 { left: 42%; top: 58%; animation: flyThree 2.7s ease-in-out infinite alternate; }
.fly-3 { left: 78%; top: 58%; animation: flyFour 2.4s ease-in-out infinite alternate; }
.fly-4 { left: 24%; top: 18%; animation: flyFive 2.6s ease-in-out infinite alternate; }
.fly-5 { left: 54%; top: 28%; animation: flySix 2.3s ease-in-out infinite alternate; }
.fly-6 { left: 34%; top: 72%; animation: flySeven 2.5s ease-in-out infinite alternate; }

@keyframes flyOne { to { transform: translate(70px, -60px) rotate(8deg); } }
@keyframes flyTwo { to { transform: translate(-90px, 82px) rotate(-7deg); } }
@keyframes flyThree { to { transform: translate(96px, -92px) rotate(9deg); } }
@keyframes flyFour { to { transform: translate(-110px, -48px) rotate(-5deg); } }
@keyframes flyFive { to { transform: translate(86px, 70px) rotate(6deg); } }
@keyframes flySix { to { transform: translate(-74px, 96px) rotate(-8deg); } }
@keyframes flySeven { to { transform: translate(116px, -68px) rotate(5deg); } }

.attention-memory-options {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  max-width: 620px;
  margin: 32px auto 0;
}

.attention-memory-options button {
  min-height: 64px;
  border: 0;
  border-radius: 10px;
  color: #fff;
  background: #ff6508;
  font-size: 30px;
  font-weight: 950;
  cursor: pointer;
  box-shadow: 0 12px 24px rgba(255, 101, 8, 0.18);
}

.attention-memory-options button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}


.attention-completed-panel {
  text-align: center;
}

.attention-completed-grid .attention-exercise-card {
  opacity: 1;
  filter: none;
  cursor: default;
  background: linear-gradient(180deg, #fff, #f5e5f6);
  box-shadow: 0 14px 30px rgba(255, 101, 8, 0.14);
}

.attention-exercise-card.completed {
  position: relative;
  overflow: hidden;
}

.attention-complete-check {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #fff;
  background: linear-gradient(135deg, #18c981, #8af84f);
  font-size: 17px;
  font-weight: 950;
  box-shadow: 0 8px 18px rgba(24, 201, 129, 0.28);
}

.attention-result-show-btn {
  width: min(780px, 100%);
  min-height: 86px;
  margin: 26px auto 0;
  padding: 0 36px;
  border: 0;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  color: #fff;
  background: #4a0d62;
  font-size: 44px;
  line-height: 1;
  font-weight: 950;
  cursor: pointer;
  box-shadow: 0 16px 32px rgba(74, 13, 98, 0.22);
}

.attention-play-circle {
  width: 54px;
  height: 54px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 4px solid rgba(255, 255, 255, 0.9);
  font-size: 24px;
  padding-left: 4px;
}

.attention-result-panel {
  width: min(940px, 100%);
  padding: 18px 30px 20px;
  text-align: center;
}

.attention-result-panel h2 {
  margin: 4px 0 6px;
  font-size: clamp(30px, 3.7vw, 38px);
}

.attention-result-panel .attention-badge {
  margin-bottom: 8px;
}

.attention-result-rings {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  align-items: start;
  margin: 10px 0 12px;
}

.attention-result-item {
  display: grid;
  justify-items: center;
  gap: 7px;
  color: #46105f;
}

.attention-ring {
  width: 84px;
  height: 84px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background:
    conic-gradient(from -90deg, #ff2b1f 0deg, #ff1493 var(--score), #e8ece9 var(--score), #e8ece9 360deg);
  box-shadow: 0 12px 22px rgba(70, 16, 95, 0.12);
}

.attention-ring-inner {
  width: 58px;
  height: 58px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #777a80;
  background: #fff;
  font-size: 20px;
  font-weight: 950;
  box-shadow: 0 10px 18px rgba(0, 0, 0, 0.18);
}

.attention-result-icon {
  width: 46px;
  height: 46px;
  color: #ff6508;
}

.attention-result-icon svg {
  width: 100%;
  height: 100%;
}

.attention-result-item strong {
  display: block;
  font-size: 16px;
  line-height: 1.12;
  font-weight: 500;
}

.attention-result-item strong span {
  display: block;
}

.attention-result-note {
  max-width: 820px;
  margin: 4px auto 12px;
  color: #5a2471;
  font-size: 15.5px;
  line-height: 1.35;
}

.attention-result-cta {
  max-width: 560px;
  margin: 0 auto;
  padding: 12px;
  border: 1px solid rgba(70, 16, 95, 0.1);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.62);
}

.attention-result-cta h3 {
  margin: 0 0 8px;
  color: #46105f;
  font-size: 18px;
  font-weight: 950;
}

.attention-result-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.attention-result-form input {
  width: 100%;
  min-height: 34px;
  padding: 0 14px;
  border: 1px solid rgba(70, 16, 95, 0.12);
  border-radius: 14px;
  color: #46105f;
  background: rgba(255, 255, 255, 0.92);
  font-size: 14px;
  font-weight: 700;
  outline: none;
}

.attention-result-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.attention-whatsapp-btn,
.attention-call-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  padding: 0 18px;
  border: 0;
  border-radius: 999px;
  color: #fff;
  font-size: 15px;
  font-weight: 950;
  cursor: pointer;
  text-decoration: none;
}

.attention-whatsapp-btn {
  background: #20bd62;
}

.attention-call-btn {
  background: #ff6508;
}

.attention-phone-number {
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 18px;
  border-radius: 999px;
  color: #46105f;
  background: rgba(255, 255, 255, 0.88);
  font-size: 15px;
  font-weight: 950;
}


@media (max-height: 820px) and (min-width: 821px) {
  .attention-modal {
    min-height: auto;
    padding: 16px 20px 20px;
  }

  .attention-topline {
    min-height: 36px;
    margin-bottom: 8px;
  }

  .attention-panel,
  .attention-game-panel {
    min-height: auto;
  }
}


@media (max-width: 820px) {
  .attention-modal-overlay { padding: 6px; }
  .attention-modal {
    min-height: calc(100dvh - 12px);
    max-height: calc(100dvh - 12px);
    padding: 12px;
    border-radius: 22px;
  }
  .attention-modal::before {
    inset: 54px 12px 12px;
    border-radius: 20px;
  }
  .attention-topline {
    min-height: 36px;
    margin-bottom: 8px;
  }
  .attention-back {
    min-height: 32px;
    padding: 0 12px;
    font-size: 12px;
  }
  .attention-close {
    top: 10px;
    right: 12px;
    width: 36px;
    height: 36px;
    font-size: 28px;
  }
  .attention-step-dots {
    gap: 5px;
    padding-right: 44px;
  }
  .attention-step-dots span {
    width: 16px;
    height: 5px;
  }
  .attention-panel,
  .attention-game-panel {
    width: 100%;
    min-height: auto;
    padding: 18px 14px;
    border-radius: 24px;
  }
  .attention-title-block { margin-bottom: 12px; }
  .attention-title-block span { font-size: 28px; }
  .attention-title-block h2, .attention-panel h2 { font-size: 30px; letter-spacing: 0; }
  .attention-title-block p, .attention-muted { font-size: 16px; margin-bottom: 12px; }
  .attention-intro-panel h3 { font-size: 22px; }
  .attention-level-grid {
    grid-template-columns: 1fr;
    gap: 10px;
    margin: 14px 0 16px;
  }
  .attention-level-card {
    min-height: 104px;
    display: grid;
    grid-template-columns: 78px 1fr;
    align-items: center;
    padding: 10px 12px;
    text-align: left;
  }
  .attention-level-art {
    width: 70px;
    height: 56px;
    margin: 0;
    grid-row: 1 / span 2;
    transform: scale(0.78);
    transform-origin: left center;
  }
  .attention-level-card strong,
  .attention-level-card span { grid-column: 2; }
  .attention-level-card strong { font-size: 22px; margin-top: 0; }
  .attention-level-card span { font-size: 12px; line-height: 1.25; margin-top: 4px; }
  .attention-exercise-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-top: 16px;
  }
  .attention-exercise-card { min-height: 126px; border-radius: 16px; }
  .attention-exercise-card svg { width: 48px; height: 48px; margin: 22px auto 10px; }
  .attention-exercise-card strong span { font-size: 16px; }
  .attention-detail-card { grid-template-columns: 1fr; text-align: center; }
  .attention-detail-icon { margin: 0 auto; }
  .attention-scorebar { flex-wrap: wrap; gap: 12px; padding: 12px; }
  .attention-cell { width: 70px; height: 70px; }
  .attention-cell-number { font-size: 30px; }
  .attention-footerbar { grid-template-columns: 1fr; gap: 12px; }
  .attention-difference-grid { grid-template-columns: 1fr; }
  .attention-difference-image img { height: 320px; }

  .attention-result-show-btn { min-height: 64px; font-size: 27px; padding: 0 20px; }
  .attention-play-circle { width: 42px; height: 42px; font-size: 18px; }
  .attention-result-panel {
    padding: 18px 12px;
  }
  .attention-result-panel h2 { font-size: 30px; }
  .attention-result-rings {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px 10px;
    margin: 14px 0;
  }
  .attention-ring { width: 76px; height: 76px; }
  .attention-ring-inner { width: 54px; height: 54px; font-size: 18px; }
  .attention-result-icon { width: 42px; height: 42px; }
  .attention-result-item strong { font-size: 15px; }
  .attention-result-note { font-size: 15px; margin-bottom: 14px; }
  .attention-result-cta {
    max-width: 100%;
    padding: 14px 12px;
    border-radius: 18px;
  }
  .attention-result-cta h3 { font-size: 18px; }
  .attention-result-form { grid-template-columns: 1fr; }
  .attention-whatsapp-btn,
  .attention-call-btn,
  .attention-phone-number {
    width: 100%;
  }
}

@media (max-width: 480px) and (max-height: 740px) {
  .attention-modal {
    padding: 8px;
  }

  .attention-topline {
    min-height: 32px;
    margin-bottom: 6px;
  }

  .attention-intro-panel {
    padding: 12px 10px;
  }

  .attention-title-block {
    margin-bottom: 8px;
  }

  .attention-title-block span {
    font-size: 20px;
  }

  .attention-title-block h2,
  .attention-panel h2 {
    margin: 3px 0 5px;
    font-size: 24px;
  }

  .attention-title-block p,
  .attention-muted {
    font-size: 13px;
    line-height: 1.22;
    margin-bottom: 8px;
  }

  .attention-intro-panel h3 {
    margin: 2px 0 4px;
    font-size: 18px;
  }

  .attention-level-grid {
    gap: 8px;
    margin: 10px 0 12px;
  }

  .attention-level-card {
    min-height: 72px;
    grid-template-columns: 54px 1fr;
    padding: 8px 10px;
  }

  .attention-level-art {
    width: 54px;
    height: 44px;
    transform: scale(0.58);
  }

  .attention-level-card strong {
    font-size: 19px;
  }

  .attention-level-card span {
    font-size: 11px;
  }

  .attention-primary-btn {
    min-height: 46px;
    padding: 0 24px;
    font-size: 16px;
  }
}



/* =========================================================
   FIXOKU ATTENTION RESPONSIVE M2B
   Mobile, tablet and small notebook hardening
========================================================= */

.attention-modal-overlay {
  min-height: 100vh;
  min-height: 100svh;
  min-height: 100dvh;
  box-sizing: border-box;
  overscroll-behavior: contain;
}

.attention-modal,
.attention-modal * {
  box-sizing: border-box;
}

.attention-modal {
  max-height: calc(100vh - 16px);
  max-height: calc(100svh - 16px);
  max-height: calc(100dvh - 16px);
}

.attention-modal button,
.attention-modal a,
.attention-modal input {
  touch-action: manipulation;
}

@media (min-width: 821px) and (max-height: 820px) {
  .attention-modal-overlay {
    padding: 8px;
  }

  .attention-modal {
    min-height: 0;
    max-height: calc(100vh - 16px);
    max-height: calc(100dvh - 16px);
    padding: 14px 18px 18px;
    border-radius: 25px;
  }

  .attention-modal::before {
    inset: 54px 18px 12px;
    border-radius: 22px;
  }

  .attention-topline {
    min-height: 36px;
    margin-bottom: 6px;
  }

  .attention-panel,
  .attention-game-panel {
    min-height: 0;
    margin-top: 0;
    padding: 18px 28px;
    border-radius: 28px;
  }

  .attention-title-block {
    margin-bottom: 10px;
  }

  .attention-title-block span {
    font-size: 34px;
  }

  .attention-title-block h2,
  .attention-panel h2 {
    font-size: 34px;
  }

  .attention-level-grid {
    gap: 12px;
    margin: 12px 0 14px;
  }

  .attention-level-card {
    min-height: 150px;
    padding: 12px;
  }

  .attention-primary-btn,
  .attention-green-btn {
    min-height: 48px;
    font-size: 17px;
  }

  .attention-board {
    gap: 10px;
  }

  .attention-cell {
    width: 78px;
    height: 78px;
  }

  .attention-difference-image {
    min-height: 280px;
  }

  .attention-difference-image img {
    height: 280px;
  }

  .attention-track-card,
  .attention-text-card,
  .attention-memory-card {
    min-height: 360px;
    padding: 18px 20px;
  }

  .attention-footerbar {
    margin-top: 10px;
  }

  .attention-result-rings {
    margin: 8px 0 10px;
  }
}

@media (max-width: 820px) {
  .attention-modal-overlay {
    height: 100vh;
    height: 100svh;
    height: 100dvh;
    padding: 4px;
    overflow: hidden;
  }

  .attention-modal {
    width: 100%;
    height: calc(100vh - 8px);
    height: calc(100svh - 8px);
    height: calc(100dvh - 8px);
    min-height: 0;
    max-height: calc(100vh - 8px);
    max-height: calc(100dvh - 8px);
    padding: 10px;
    border-radius: 18px;
    overflow-x: hidden;
    overflow-y: auto;
  }

  .attention-modal::before {
    inset: 54px 10px 10px;
    border-radius: 18px;
  }

  .attention-close {
    top: 7px;
    right: 8px;
    width: 44px;
    height: 44px;
    font-size: 30px;
  }

  .attention-topline {
    min-height: 44px;
    margin-bottom: 4px;
    padding-right: 46px;
  }

  .attention-back {
    min-height: 44px;
    padding: 0 12px;
  }

  .attention-step-dots {
    gap: 4px;
    padding-right: 0;
  }

  .attention-step-dots span {
    width: clamp(12px, 4vw, 18px);
  }

  .attention-panel,
  .attention-game-panel {
    width: 100%;
    min-height: 0;
    margin: 0 auto;
    padding: 14px 12px;
    border-radius: 20px;
  }

  .attention-title-block h2,
  .attention-panel h2 {
    overflow-wrap: anywhere;
  }

  .attention-primary-btn,
  .attention-green-btn {
    width: 100%;
    min-height: 48px;
    padding: 0 16px;
    font-size: 16px;
  }

  .attention-exercise-grid {
    gap: 8px;
  }

  .attention-exercise-card {
    min-height: 108px;
  }

  .attention-scorebar {
    width: 100%;
    gap: 8px;
    padding: 10px;
    font-size: 13px;
  }

  .attention-game-card,
  .attention-difference-card,
  .attention-track-card,
  .attention-text-card,
  .attention-memory-card {
    width: 100%;
  }

  .attention-board {
    max-width: 100%;
    gap: clamp(6px, 2vw, 10px);
  }

  .attention-cell {
    width: clamp(48px, 18vw, 70px);
    height: clamp(48px, 18vw, 70px);
  }

  .attention-cell-number {
    font-size: clamp(23px, 8vw, 30px);
  }

  .attention-cell-logo {
    font-size: 10px;
  }

  .attention-under-board {
    gap: 8px;
  }

  .attention-footerbar {
    width: 100%;
    grid-template-columns: 1fr;
    gap: 8px;
    margin-top: 10px;
  }

  .attention-total-progress {
    height: 16px;
  }

  .attention-pause-btn {
    width: 100%;
    min-height: 44px;
  }

  .attention-difference-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .attention-difference-image {
    min-height: 0;
  }

  .attention-difference-image img {
    width: 100%;
    height: clamp(180px, 55vw, 260px);
    object-fit: cover;
  }

  .attention-track-card,
  .attention-text-card,
  .attention-memory-card {
    min-height: clamp(300px, 56dvh, 420px);
    padding: 16px 12px;
    border-radius: 20px;
  }

  .attention-track-card::before,
  .attention-text-card::before,
  .attention-memory-card::before {
    inset: 9px;
    border-radius: 16px;
  }

  .attention-track-stage,
  .attention-flying-area,
  .attention-word-list,
  .attention-word-options,
  .attention-memory-options {
    max-width: 100%;
  }

  .attention-result-panel {
    padding: 14px 10px;
  }

  .attention-result-rings {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px 8px;
  }

  .attention-result-cta {
    width: 100%;
    padding: 12px 10px;
  }

  .attention-result-form {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .attention-result-form input {
    min-height: 46px;
    font-size: 16px;
  }

  .attention-result-actions {
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .attention-whatsapp-btn,
  .attention-call-btn,
  .attention-phone-number {
    width: 100%;
    min-height: 48px;
  }
}

@media (max-width: 360px) {
  .attention-modal {
    padding: 8px;
  }

  .attention-panel,
  .attention-game-panel {
    padding: 12px 9px;
    border-radius: 18px;
  }

  .attention-title-block h2,
  .attention-panel h2 {
    font-size: 23px;
  }

  .attention-level-card {
    grid-template-columns: 48px minmax(0, 1fr);
    padding: 7px 8px;
  }

  .attention-cell {
    width: clamp(47px, 17vw, 58px);
    height: clamp(47px, 17vw, 58px);
  }

  .attention-difference-image img {
    height: 170px;
  }

  .attention-track-card,
  .attention-text-card,
  .attention-memory-card {
    min-height: 280px;
    padding: 13px 9px;
  }

  .attention-ring {
    width: 70px;
    height: 70px;
  }

  .attention-ring-inner {
    width: 50px;
    height: 50px;
  }
}

@media (max-width: 900px) and (max-height: 560px) {
  .attention-modal {
    padding: 6px 8px;
  }

  .attention-topline {
    min-height: 36px;
  }

  .attention-panel,
  .attention-game-panel {
    padding: 10px;
  }

  .attention-title-block {
    margin-bottom: 6px;
  }

  .attention-title-block span {
    font-size: 21px;
  }

  .attention-title-block h2,
  .attention-panel h2 {
    font-size: 23px;
  }

  .attention-difference-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .attention-difference-image img {
    height: 180px;
  }

  .attention-track-card,
  .attention-text-card,
  .attention-memory-card {
    min-height: 250px;
  }
}



/* =========================================================
   FIXOKU ATTENTION UX M2C
   Level spacing, compact instructions and smaller track cups
========================================================= */

@media (max-width: 820px) {
  .attention-level-grid {
    gap: 12px;
  }

  .attention-eye-panel {
    padding-top: 12px;
  }

  .attention-eye-panel .attention-badge {
    margin-bottom: 7px;
  }

  .attention-eye-panel > h2 {
    margin: 3px 0 5px;
  }

  .attention-eye-panel > .attention-muted {
    margin: 0 0 7px;
    line-height: 1.3;
  }

  .attention-eye-panel .attention-detail-card {
    grid-template-columns: 72px minmax(0, 1fr);
    gap: 10px;
    margin: 7px auto 9px;
    padding: 11px 12px;
    text-align: left;
  }

  .attention-eye-panel .attention-detail-icon {
    width: 68px;
    height: 68px;
    margin: 0;
  }

  .attention-eye-panel .attention-detail-icon svg {
    width: 42px;
    height: 42px;
  }

  .attention-eye-panel .attention-detail-card h3 {
    margin: 0 0 4px;
    font-size: 19px;
    line-height: 1.15;
  }

  .attention-eye-panel .attention-detail-card p {
    margin: 3px 0;
    font-size: 13px;
    line-height: 1.28;
  }

  .attention-eye-panel .attention-green-btn {
    margin-top: 0;
  }

  .attention-track-stage {
    height: 190px;
    margin: 18px auto 8px;
  }

  .attention-track-cup {
    top: 50px;
    width: 78px;
    height: 78px;
  }

  .attention-track-cup-face {
    width: 78px;
    height: 78px;
  }

  .attention-track-ball {
    width: 30px;
    height: 30px;
  }

  .attention-track-stage::after {
    bottom: 24px;
    height: 14px;
  }
}

@media (max-width: 360px) {
  .attention-level-grid {
    gap: 10px;
  }

  .attention-eye-panel .attention-detail-card {
    grid-template-columns: 58px minmax(0, 1fr);
    gap: 8px;
    padding: 9px;
  }

  .attention-eye-panel .attention-detail-icon {
    width: 56px;
    height: 56px;
  }

  .attention-eye-panel .attention-detail-icon svg {
    width: 35px;
    height: 35px;
  }

  .attention-eye-panel .attention-detail-card h3 {
    font-size: 17px;
  }

  .attention-eye-panel .attention-detail-card p {
    font-size: 12px;
  }

  .attention-track-stage {
    height: 175px;
  }

  .attention-track-cup,
  .attention-track-cup-face {
    width: 70px;
    height: 70px;
  }

  .attention-track-ball {
    width: 27px;
    height: 27px;
  }
}

`;
