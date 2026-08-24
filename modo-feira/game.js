(function () {
  "use strict";

  const fossils = [
    {
      id: "dickinsonia",
      name: "Dickinsonia",
      era: "precambriana",
      eraName: "Pré-Cambriana",
      image: "assets/dickinsonia.png",
      href: "../precambriana/",
      color: "#b96cff",
      fact: "Viveu nos mares do Ediacarano, antes do surgimento de animais com esqueletos e conchas duras.",
      clues: [
        "Pista: seu corpo era mole, achatado e viveu muito antes dos dinossauros.",
        "Pista extra: procure a era mais antiga de todas."
      ]
    },
    {
      id: "trilobita",
      name: "Trilobita",
      era: "paleozoica",
      eraName: "Paleozoica",
      image: "assets/trilobita.png",
      href: "../paleozoica/",
      color: "#39ef8e",
      fact: "Foi um artrópode marinho de carapaça segmentada e um dos fósseis mais conhecidos dos oceanos paleozoicos.",
      clues: [
        "Pista: este animal de carapaça viveu em antigos oceanos.",
        "Pista extra: surgiu muito antes dos dinossauros, na era em que a vida conquistou os mares e a terra."
      ]
    },
    {
      id: "trex",
      name: "Tyrannosaurus rex",
      era: "mesozoica",
      eraName: "Mesozoica",
      image: "assets/trex.png",
      href: "../mesozoica/",
      color: "#ff9b4a",
      fact: "Viveu no final do Cretáceo, entre aproximadamente 68 e 66 milhões de anos atrás.",
      clues: [
        "Pista: seus dentes e pernas revelam um grande predador terrestre.",
        "Pista extra: ele viveu na famosa era dos dinossauros."
      ]
    },
    {
      id: "mamute",
      name: "Mamute-lanoso",
      era: "cenozoica",
      eraName: "Cenozoica",
      image: "assets/mamute.png",
      href: "../cenozoica/",
      color: "#3ab8ff",
      fact: "Conviveu com seres humanos durante o período glacial e era adaptado a ambientes muito frios.",
      clues: [
        "Pista: é um grande mamífero coberto de pelos e adaptado ao frio.",
        "Pista extra: pertence à era mais recente, a era dos mamíferos."
      ]
    }
  ];

  const targets = {
    precambriana: 88.239,
    paleozoica: 94.522,
    mesozoica: 98.565,
    cenozoica: 100
  };

  const initialTimeline = {
    precambriana: 58,
    paleozoica: 70,
    mesozoica: 82,
    cenozoica: 94
  };

  const screenButtons = document.querySelectorAll("[data-open-screen]");
  const screens = document.querySelectorAll(".screen");
  const soundButton = document.getElementById("soundButton");
  const fullscreenButton = document.getElementById("fullscreenButton");

  const scannerProgress = document.getElementById("scannerProgress");
  const scannerProgressText = document.getElementById("scannerProgressText");
  const cardDeck = document.getElementById("cardDeck");
  const uvDevice = document.getElementById("uvDevice");
  const emptyCard = document.getElementById("emptyCard");
  const fossilCard = document.getElementById("fossilCard");
  const uvButton = document.getElementById("uvButton");
  const scannerInstruction = document.getElementById("scannerInstruction");
  const scanStatus = document.getElementById("scanStatus");
  const classificationPanel = document.getElementById("classificationPanel");
  const eraChoices = document.getElementById("eraChoices");
  const scannerResult = document.getElementById("scannerResult");
  const scannerCompletion = document.getElementById("scannerCompletion");
  const restartScanner = document.getElementById("restartScanner");

  const timelineBoard = document.querySelector(".timeline-board");
  const markerRows = Array.from(document.querySelectorAll(".marker-row"));
  const revealTimeline = document.getElementById("revealTimeline");
  const timelineFeedback = document.getElementById("timelineFeedback");
  const timelineReveal = document.getElementById("timelineReveal");
  const revealHumans = document.getElementById("revealHumans");
  const humanAnswer = document.getElementById("humanAnswer");
  const earthAxis = document.getElementById("earthAxis");
  const zoomHumanDot = document.getElementById("zoomHumanDot");
  const restartTimeline = document.getElementById("restartTimeline");

  let soundEnabled = true;
  let audioContext = null;
  let rounds = [];
  let roundIndex = 0;
  let discoveries = 0;
  let selectedCard = null;
  let currentFossil = null;
  let scannerRevealed = false;
  let scannerAnswered = false;
  let wrongAttempts = 0;
  let holdStart = 0;
  let holdFrame = 0;
  let holding = false;
  let timelineIsRevealed = false;
  let pendingScroll = 0;

  const HOLD_DURATION = 850;

  const SCROLL_DELAY = {
    openScreen: 700,
    navigation: 700,
    timelineReveal: 1600,
    humansReveal: 800
  };

  function scrollAfter(target, delay, block) {
    if (pendingScroll) {
      window.clearTimeout(pendingScroll);
    }

    pendingScroll = window.setTimeout(function () {
      pendingScroll = 0;

      if (target === "top") {
        window.scrollTo({
          top: 0,
          behavior: "smooth"
        });
        return;
      }

      if (!target || !document.documentElement.contains(target)) {
        return;
      }

      const parentScreen = target.closest(".screen");

      if (parentScreen && parentScreen.hidden) {
        return;
      }

      target.scrollIntoView({
        behavior: "smooth",
        block: block || "start"
      });
    }, delay);
  }

  function shuffle(items) {
    const copy = items.slice();

    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = copy[i];

      copy[i] = copy[j];
      copy[j] = temp;
    }

    return copy;
  }

  function openScreen(id) {
    cancelHold();

    screens.forEach(function (screen) {
      const active = screen.id === id;

      screen.hidden = !active;
      screen.classList.toggle("is-active", active);
    });

    scrollAfter("top", SCROLL_DELAY.openScreen, "start");

    const heading = document.querySelector(
      "#" + id + " h1, #" + id + " h2"
    );

    if (heading) {
      heading.setAttribute("tabindex", "-1");

      window.setTimeout(function () {
        heading.focus({
          preventScroll: true
        });
      }, 100);
    }

    playTone("move");
  }

  screenButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      openScreen(button.getAttribute("data-open-screen"));
    });
  });

  function ensureAudioContext() {
    if (!soundEnabled) {
      return null;
    }

    const AudioCtor =
      window.AudioContext ||
      window.webkitAudioContext;

    if (!AudioCtor) {
      return null;
    }

    if (!audioContext) {
      audioContext = new AudioCtor();
    }

    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    return audioContext;
  }

  function playTone(type) {
    const context = ensureAudioContext();

    if (!context) {
      return;
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;

    const settings = {
      move: [330, 0.045, "sine"],
      scan: [680, 0.14, "sine"],
      correct: [880, 0.22, "triangle"],
      wrong: [180, 0.15, "square"],
      human: [1100, 0.3, "sine"]
    }[type] || [440, 0.08, "sine"];

    oscillator.type = settings[2];
    oscillator.frequency.setValueAtTime(settings[0], now);

    if (type === "scan" || type === "correct") {
      oscillator.frequency.exponentialRampToValueAtTime(
        settings[0] * 1.45,
        now + settings[1]
      );
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.09, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + settings[1]
    );

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start(now);
    oscillator.stop(now + settings[1] + 0.03);
  }

  soundButton.addEventListener("click", function () {
    soundEnabled = !soundEnabled;

    soundButton.setAttribute(
      "aria-pressed",
      String(soundEnabled)
    );

    soundButton.setAttribute(
      "aria-label",
      soundEnabled ? "Desativar sons" : "Ativar sons"
    );

    soundButton.querySelector("span").textContent =
      soundEnabled ? "🔊" : "🔇";

    if (soundEnabled) {
      playTone("move");
    }
  });

  const requestFull =
    document.documentElement.requestFullscreen ||
    document.documentElement.webkitRequestFullscreen;

  if (!requestFull) {
    fullscreenButton.hidden = true;
  } else {
    fullscreenButton.addEventListener("click", function () {
      const isFull =
        document.fullscreenElement ||
        document.webkitFullscreenElement;

      if (isFull) {
        const exitFull =
          document.exitFullscreen ||
          document.webkitExitFullscreen;

        if (exitFull) {
          exitFull.call(document);
        }
      } else {
        requestFull.call(document.documentElement);
      }
    });
  }

  function renderProgress() {
    scannerProgress.innerHTML = "";

    for (let i = 0; i < fossils.length; i += 1) {
      const dot = document.createElement("i");

      if (i < discoveries) {
        dot.className = "done";
      }

      scannerProgress.appendChild(dot);
    }

    scannerProgressText.textContent =
      discoveries + "/" + fossils.length;
  }

  function renderDeck() {
    cardDeck.innerHTML = "";

    for (let i = 1; i <= 15; i += 1) {
      const card = document.createElement("button");

      card.type = "button";
      card.className = "deck-card";
      card.dataset.number = String(i).padStart(2, "0");

      card.setAttribute(
        "aria-label",
        "Escolher carta " + i
      );

      card.addEventListener("click", function () {
        selectCard(card);
      });

      cardDeck.appendChild(card);
    }
  }

  function resetChoiceButtons() {
    eraChoices.querySelectorAll("button").forEach(function (button) {
      button.disabled = false;
      button.classList.remove("is-wrong", "is-correct");
    });
  }

  function resetScannerRound() {
    cancelHold();

    selectedCard = null;
    currentFossil = rounds[roundIndex];
    scannerRevealed = false;
    scannerAnswered = false;
    wrongAttempts = 0;

    uvDevice.classList.remove("is-scanning", "is-revealed");
    uvButton.classList.remove("is-holding", "is-complete");

    uvButton.style.setProperty(
      "--hold-progress",
      "0deg"
    );

    uvButton.disabled = true;

    uvButton.querySelector("strong").textContent =
      "Segure para escanear";

    uvButton.querySelector("small").textContent =
      "mantenha pressionado";

    emptyCard.hidden = false;
    fossilCard.hidden = true;
    fossilCard.style.backgroundImage = "none";

    fossilCard.setAttribute(
      "aria-label",
      "Carta ainda não revelada"
    );

    classificationPanel.hidden = true;
    scannerResult.hidden = true;
    scannerResult.className = "answer-box";
    scannerResult.innerHTML = "";

    scannerInstruction.textContent =
      "Primeiro, escolha uma carta do monte.";

    scanStatus.textContent =
      "Escolha uma carta para começar.";

    resetChoiceButtons();

    cardDeck.querySelectorAll(".deck-card").forEach(function (card) {
      card.classList.remove("is-selected");
    });
  }

  function resetScannerGame() {
    rounds = shuffle(fossils);
    roundIndex = 0;
    discoveries = 0;

    scannerCompletion.hidden = true;

    renderDeck();
    renderProgress();
    resetScannerRound();
  }

  function selectCard(card) {
    if (
      scannerRevealed ||
      scannerAnswered ||
      card.classList.contains("is-used")
    ) {
      return;
    }

    cardDeck.querySelectorAll(".deck-card").forEach(function (item) {
      item.classList.remove("is-selected");
    });

    selectedCard = card;
    selectedCard.classList.add("is-selected");

    currentFossil = rounds[roundIndex];

    fossilCard.style.backgroundImage =
      "url('" + currentFossil.image + "')";

    fossilCard.setAttribute(
      "aria-label",
      "Carta escolhida; fóssil ainda oculto"
    );

    fossilCard.hidden = false;
    emptyCard.hidden = true;
    uvButton.disabled = false;

    scannerInstruction.textContent =
      "Agora, use a luz UV para investigar.";

    scanStatus.textContent =
      "Segure o botão UV até o scanner completar a leitura.";

    playTone("move");

    if (navigator.vibrate) {
      navigator.vibrate(25);
    }
  }

  function holdTick(now) {
    if (!holding || scannerRevealed) {
      return;
    }

    const elapsed = now - holdStart;

    const progress = Math.min(
      elapsed / HOLD_DURATION,
      1
    );

    uvButton.style.setProperty(
      "--hold-progress",
      progress * 360 + "deg"
    );

    if (progress >= 1) {
      completeScan();
      return;
    }

    holdFrame = window.requestAnimationFrame(holdTick);
  }

  function beginHold(event) {
    if (
      uvButton.disabled ||
      scannerRevealed ||
      holding
    ) {
      return;
    }

    if (
      event.type === "keydown" &&
      event.key !== " " &&
      event.key !== "Enter"
    ) {
      return;
    }

    if (event.type === "keydown") {
      event.preventDefault();
    }

    if (
      event.pointerId !== undefined &&
      uvButton.setPointerCapture
    ) {
      try {
        uvButton.setPointerCapture(event.pointerId);
      } catch (error) {
        /* Sem suporte completo a captura. */
      }
    }

    holding = true;
    holdStart = performance.now();

    uvButton.classList.add("is-holding");
    uvDevice.classList.add("is-scanning");

    scanStatus.textContent =
      "Continue segurando... a luz UV está varrendo a carta.";

    holdFrame = window.requestAnimationFrame(holdTick);
  }

  function cancelHold() {
    if (holdFrame) {
      window.cancelAnimationFrame(holdFrame);
    }

    holdFrame = 0;

    if (!holding) {
      return;
    }

    holding = false;
    uvButton.classList.remove("is-holding");

    if (!scannerRevealed) {
      uvDevice.classList.remove("is-scanning");

      uvButton.style.setProperty(
        "--hold-progress",
        "0deg"
      );

      scanStatus.textContent =
        "Quase! Mantenha o botão pressionado até completar o círculo.";
    }
  }

  function completeScan() {
    holding = false;

    if (holdFrame) {
      window.cancelAnimationFrame(holdFrame);
    }

    holdFrame = 0;
    scannerRevealed = true;

    uvButton.classList.remove("is-holding");
    uvButton.classList.add("is-complete");

    uvButton.style.setProperty(
      "--hold-progress",
      "360deg"
    );

    uvButton.disabled = true;

    uvButton.querySelector("strong").textContent =
      "Fóssil revelado!";

    uvButton.querySelector("small").textContent =
      "agora classifique a descoberta";

    uvDevice.classList.remove("is-scanning");
    uvDevice.classList.add("is-revealed");

    fossilCard.setAttribute(
      "aria-label",
      "Fóssil revelado. Observe a imagem e escolha a era correta."
    );

    scanStatus.textContent =
      "Fóssil revelado! Observe com calma. Quando estiver pronto, role para baixo e escolha a era.";

    classificationPanel.hidden = false;

    playTone("scan");

    if (navigator.vibrate) {
      navigator.vibrate([40, 40, 80]);
    }

    /*
     * Não movimentar a tela neste momento.
     * A pessoa observa o fóssil e desce quando estiver pronta.
     */
  }

  uvButton.addEventListener("pointerdown", beginHold);
  uvButton.addEventListener("pointerup", cancelHold);
  uvButton.addEventListener("pointercancel", cancelHold);
  uvButton.addEventListener("lostpointercapture", cancelHold);
  uvButton.addEventListener("keydown", beginHold);

  uvButton.addEventListener("keyup", function (event) {
    if (event.key === " " || event.key === "Enter") {
      cancelHold();
    }
  });

  uvButton.addEventListener("contextmenu", function (event) {
    event.preventDefault();
  });

  function finishScannerRound() {
    scannerAnswered = true;

    selectedCard.classList.remove("is-selected");
    selectedCard.classList.add("is-used");

    discoveries += 1;
    renderProgress();

    if (discoveries === fossils.length) {
      scannerResult.innerHTML +=
        '<div class="answer-actions">' +
        '<button class="primary-button" id="finishScanner" type="button">' +
        "Concluir missão" +
        "</button>" +
        "</div>";

      document
        .getElementById("finishScanner")
        .addEventListener("click", function () {
          classificationPanel.hidden = true;
          scannerCompletion.hidden = false;

          scrollAfter(
            scannerCompletion,
            SCROLL_DELAY.navigation,
            "center"
          );

          playTone("correct");
        });
    } else {
      scannerResult.innerHTML +=
        '<div class="answer-actions">' +
        '<button class="primary-button" id="nextCard" type="button">' +
        "Escolher próxima carta →" +
        "</button>" +
        "</div>";

      document
        .getElementById("nextCard")
        .addEventListener("click", function () {
          roundIndex += 1;
          resetScannerRound();

          scrollAfter(
            document.querySelector(".deck-panel"),
            SCROLL_DELAY.navigation,
            "start"
          );
        });
    }
  }

  eraChoices.addEventListener("click", function (event) {
    const button = event.target.closest("button[data-era]");

    if (
      !button ||
      !scannerRevealed ||
      scannerAnswered
    ) {
      return;
    }

    const chosenEra = button.dataset.era;

    scannerResult.hidden = false;

    if (chosenEra !== currentFossil.era) {
      wrongAttempts += 1;

      button.classList.add("is-wrong");
      button.disabled = true;

      const clueIndex = Math.min(
        wrongAttempts - 1,
        currentFossil.clues.length - 1
      );

      scannerResult.className = "answer-box wrong";

      scannerResult.innerHTML =
        "<h4>Ainda não — tente outra era.</h4>" +
        "<p>" +
        currentFossil.clues[clueIndex] +
        "</p>";

      playTone("wrong");

      if (navigator.vibrate) {
        navigator.vibrate(70);
      }

      return;
    }

    button.classList.add("is-correct");

    eraChoices.querySelectorAll("button").forEach(function (choice) {
      choice.disabled = true;
    });

    scannerResult.className = "answer-box correct";

    scannerResult.innerHTML =
      "<h4>Correto! É " +
      currentFossil.name +
      ".</h4>" +
      "<p>Ele pertence à era " +
      '<strong style="color:' +
      currentFossil.color +
      '">' +
      currentFossil.eraName +
      "</strong>. " +
      currentFossil.fact +
      "</p>" +
      '<div class="answer-actions">' +
      '<a class="secondary-button link-button" href="' +
      currentFossil.href +
      '">' +
      "Explorar esta era" +
      "</a>" +
      "</div>";

    playTone("correct");

    if (navigator.vibrate) {
      navigator.vibrate([40, 50, 40]);
    }

    finishScannerRound();
  });

  restartScanner.addEventListener("click", function () {
    resetScannerGame();

    scrollAfter(
      document.querySelector("#scannerScreen .section-heading"),
      SCROLL_DELAY.navigation,
      "start"
    );
  });

  function setRangeVisual(input, value, showNumber) {
    input.value = String(value);

    input.style.setProperty(
      "--range",
      value + "%"
    );

    const output = input.parentElement.querySelector("output");

    output.value = showNumber
      ? Math.round(value) + "%"
      : "?";

    output.textContent = output.value;
  }

  markerRows.forEach(function (row) {
    const input = row.querySelector("input");

    setRangeVisual(
      input,
      Number(input.value),
      false
    );

    input.addEventListener("input", function () {
      setRangeVisual(
        input,
        Number(input.value),
        false
      );
    });
  });

  function animateMarker(input, from, to, duration) {
    const started = performance.now();

    function frame(now) {
      const progress = Math.min(
        (now - started) / duration,
        1
      );

      const eased =
        1 - Math.pow(1 - progress, 3);

      setRangeVisual(
        input,
        from + (to - from) * eased,
        true
      );

      if (progress < 1) {
        window.requestAnimationFrame(frame);
      }
    }

    window.requestAnimationFrame(frame);
  }

  function scoreTimeline(errors) {
    const average =
      errors.reduce(function (sum, value) {
        return sum + value;
      }, 0) / errors.length;

    if (average <= 3) {
      return "Excelente estimativa! Você chegou muito perto da escala real.";
    }

    if (average <= 8) {
      return "Muito bem! Você percebeu que as eras mais recentes ocupam uma parte pequena da linha.";
    }

    return "Boa tentativa! A escala verdadeira surpreende: quase toda a história está na Pré-Cambriana.";
  }

  revealTimeline.addEventListener("click", function () {
    if (timelineIsRevealed) {
      return;
    }

    timelineIsRevealed = true;

    const errors = [];

    markerRows.forEach(function (row) {
      const era = row.dataset.era;
      const input = row.querySelector("input");
      const guess = Number(input.value);

      errors.push(
        Math.abs(guess - targets[era])
      );

      input.disabled = true;

      animateMarker(
        input,
        guess,
        targets[era],
        1150
      );
    });

    timelineBoard.classList.add("is-revealed");
    revealTimeline.disabled = true;

    revealTimeline.textContent =
      "Linha verdadeira revelada";

    timelineFeedback.hidden = false;

    timelineFeedback.innerHTML =
      "<strong>" +
      scoreTimeline(errors) +
      "</strong><br>" +
      "Os marcadores estão se movendo para suas posições corretas.";

    timelineReveal.hidden = false;

    playTone("correct");

    if (navigator.vibrate) {
      navigator.vibrate([45, 40, 80]);
    }

    scrollAfter(
      timelineReveal,
      SCROLL_DELAY.timelineReveal,
      "start"
    );
  });

  revealHumans.addEventListener("click", function () {
    earthAxis.classList.add("show-humans");
    zoomHumanDot.classList.add("is-visible");

    humanAnswer.hidden = false;
    revealHumans.disabled = true;

    revealHumans.textContent =
      "Estamos no último pontinho da linha";

    playTone("human");

    if (navigator.vibrate) {
      navigator.vibrate([30, 50, 30, 50, 90]);
    }

    scrollAfter(
      humanAnswer,
      SCROLL_DELAY.humansReveal,
      "center"
    );
  });

  restartTimeline.addEventListener("click", function () {
    timelineIsRevealed = false;

    timelineBoard.classList.remove("is-revealed");
    earthAxis.classList.remove("show-humans");
    zoomHumanDot.classList.remove("is-visible");

    timelineFeedback.hidden = true;
    timelineReveal.hidden = true;
    humanAnswer.hidden = true;

    revealHumans.disabled = false;
    revealHumans.textContent =
      "E nós, onde estamos?";

    revealTimeline.disabled = false;
    revealTimeline.textContent =
      "Revelar linha verdadeira";

    markerRows.forEach(function (row) {
      const input = row.querySelector("input");

      input.disabled = false;

      setRangeVisual(
        input,
        initialTimeline[row.dataset.era],
        false
      );
    });

    scrollAfter(
      document.querySelector("#timelineScreen .section-heading"),
      SCROLL_DELAY.navigation,
      "start"
    );
  });

  resetScannerGame();

  if (
    "serviceWorker" in navigator &&
    (
      location.protocol === "https:" ||
      location.hostname === "localhost"
    )
  ) {
    window.addEventListener("load", function () {
      navigator.serviceWorker
        .register("sw.js")
        .catch(function () {
          /*
           * O jogo continua funcionando
           * normalmente mesmo sem cache offline.
           */
        });
    });
  }
}());
