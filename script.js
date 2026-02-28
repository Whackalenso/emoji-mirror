const video = document.getElementById("video");
const emojiEl = document.getElementById("emoji");

const TWEMOJI_BASE =
  "https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg/";

function getTwemojiUrl(emoji) {
  const codePoint = emoji.codePointAt(0).toString(16);
  return `${TWEMOJI_BASE}${codePoint}.svg`;
}

function setEmojiDisplay(emoji) {
  emojiEl.src = getTwemojiUrl(emoji);
  emojiEl.alt = emoji;
}

// Multiple emojis per base emotion for variety
const emojiMap = {
  happy: ["😄", "😊", "🙂", "🤗", "😁", "🥳"],
  sad: ["😢", "😞", "😔", "🥺", "😭"],
  angry: ["😠", "😤", "🤬", "😡", "👿"],
  surprised: ["😲", "😮", "🤯", "😯", "😱"],
  fearful: ["😨", "😰", "😱", "😳", "🥶", "😬"],
  disgusted: ["🤢", "🤮", "😒", "🙄", "😑", "😤"],
  neutral: ["😐"],
  confused: ["🤔", "🧐", "🤨"]
};

// Compound emotions when two expressions are both strong (primary, secondary) -> emoji
const compoundEmojis = {
  "happy_surprised": ["🤩", "😍", "🥳"],
  "surprised_happy": ["🤩", "😍", "🥳"],
  "sad_fearful": ["😰", "😥", "🥺"],
  "fearful_sad": ["😰", "😥", "🥺"],
  "angry_disgusted": ["😤", "🤬", "😒"],
  "disgusted_angry": ["😤", "🤬", "😒"],
  "sad_angry": ["😤", "😣"],
  "angry_sad": ["😤", "😣"],
  "fearful_surprised": ["😱", "😳", "😨"],
  "surprised_fearful": ["😱", "😳", "😨"],
  "happy_fearful": ["😅", "😰", "🙃"],
  "fearful_happy": ["😅", "😰", "🙃"]
};

let holdUntil = 0;

// Landmark model from CDN (one-eyebrow-raised = confused)
const LANDMARK_WEIGHTS =
  "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights/";

// Load models and start
async function init() {
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri("./models"),
    faceapi.nets.faceExpressionNet.loadFromUri("./models"),
    faceapi.nets.faceLandmark68Net.loadFromUri(LANDMARK_WEIGHTS)
  ]);

  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
  await new Promise((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = (e) => reject(e);
  });
  if (video.videoWidth === 0) {
    await new Promise((r) => { video.onloadeddata = r; });
  }

  setEmojiDisplay("😐");
  await detectLoop();
}

async function detectLoop() {
  const now = performance.now();

  const detection = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceExpressions();

  if (detection) {
    const expressions = detection.expressions;
    const landmarks = detection.landmarks;

    // One eyebrow raised -> confused (only when one brow is clearly higher; lower Y = higher on face)
    let showConfused = false;
    if (landmarks && typeof landmarks.getLeftEyeBrow === "function") {
      const leftBrow = landmarks.getLeftEyeBrow();
      const rightBrow = landmarks.getRightEyeBrow();
      if (leftBrow.length && rightBrow.length) {
        const leftAvgY =
          leftBrow.reduce((s, p) => s + p.y, 0) / leftBrow.length;
        const rightAvgY =
          rightBrow.reduce((s, p) => s + p.y, 0) / rightBrow.length;
        const faceH = detection.detection?.box?.height ?? 200;
        const threshold = faceH * 0.07;
        showConfused = Math.abs(leftAvgY - rightAvgY) > threshold;
      }
    }
    const sorted = Object.entries(expressions)
      .sort((a, b) => b[1] - a[1]);
    let [[expr, confidence], [expr2, confidence2]] = sorted;
    const happyP = expressions.happy ?? 0;
    const sadP = expressions.sad ?? 0;
    let overrodeFromNeutral = false;
    // Prefer happy or sad over neutral when there's a clear signal (e.g. kind of smiling or frowning)
    if (expr === "neutral") {
      if (happyP >= 0.2 && happyP >= sadP) {
        expr = "happy";
        confidence = happyP;
        overrodeFromNeutral = true;
        const rest = sorted.filter(([e]) => e !== "neutral");
        expr2 = rest[1]?.[0] ?? "neutral";
        confidence2 = rest[1]?.[1] ?? 0;
      } else if (sadP >= 0.2) {
        expr = "sad";
        confidence = sadP;
        overrodeFromNeutral = true;
        const rest = sorted.filter(([e]) => e !== "neutral");
        expr2 = rest[1]?.[0] ?? "neutral";
        confidence2 = rest[1]?.[1] ?? 0;
      }
    }

    const compoundKey = expr + "_" + expr2;
    const useCompound = confidence2 > 0.35 && compoundEmojis[compoundKey];
    const options = showConfused
      ? emojiMap.confused
      : useCompound
        ? compoundEmojis[compoundKey]
        : emojiMap[expr];
    // Time-based cycle (every 500ms) so we see all emojis while holding same expression
    const cycleMs = 500;
    const idx = Math.floor((now / cycleMs) % options.length);
    const emoji = options[idx];

    // Confidence + hysteresis (lower bar when we preferred happy/sad over neutral or showing confused)
    const minConfidence =
      overrodeFromNeutral || showConfused ? 0.2 : 0.5;
    if (confidence > minConfidence && (emoji !== emojiEl.alt || now > holdUntil)) {
      holdUntil = now + 400; // hold for 400ms
      setEmojiDisplay(emoji);
    }
  }

  setTimeout(detectLoop, 100); // ~10 FPS
}

init();