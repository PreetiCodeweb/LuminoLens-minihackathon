const MODEL_URL = "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights";

const SHAPE_INFO = {
  round: {
    label: "Round",
    description: "Soft curves with similar width and length. Angular frames add definition and make your face appear longer.",
    styles: ["Square", "Rectangular", "Angular/Geometric", "Browline"],
  },
  oval: {
    label: "Oval",
    description: "Balanced proportions — the most versatile face shape. Most frame styles will suit you.",
    styles: ["Rectangular", "Aviator", "Square", "Round"],
  },
  square: {
    label: "Square",
    description: "A strong jawline with a broad forehead. Round or oval frames soften angular features.",
    styles: ["Round", "Oval", "Rimless", "Browline"],
  },
  heart: {
    label: "Heart",
    description: "A wider forehead that tapers to a narrow chin. Bottom-heavy or rimless frames balance proportions.",
    styles: ["Round", "Oval", "Rimless", "Light Cat-eye"],
  },
  diamond: {
    label: "Diamond",
    description: "Dramatic cheekbones with a narrower forehead and jaw. Oval and cat-eye frames highlight your eyes.",
    styles: ["Oval", "Cat-eye", "Rimless", "Round"],
  },
  oblong: {
    label: "Oblong",
    description: "A face longer than it is wide. Frames with more depth and decorative or bold temples shorten the look.",
    styles: ["Round", "Square (deep)", "Oversized", "Wraparound"],
  },
};

let stream = null;
let modelsLoaded = false;

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

// Heuristic classifier based on the 68-point facial landmark model.
// This is a lightweight approximation, not a medical-grade measurement.
function classifyFaceShape(landmarks) {
  const pts = landmarks.positions;
  const jawWidth = dist(pts[4], pts[12]);
  const cheekWidth = dist(pts[1], pts[15]);
  const foreheadWidth = dist(pts[17], pts[26]);
  const faceLength = dist(midpoint(pts[17], pts[26]), pts[8]);

  const lengthToWidth = faceLength / cheekWidth;
  const jawRatio = jawWidth / cheekWidth;
  const foreheadRatio = foreheadWidth / cheekWidth;

  let shape;
  if (lengthToWidth > 1.5) {
    shape = "oblong";
  } else if (foreheadRatio > 1.0 && jawRatio < 0.8) {
    shape = "heart";
  } else if (cheekWidth >= foreheadWidth && cheekWidth >= jawWidth && jawRatio < 0.85 && foreheadRatio < 0.92) {
    shape = "diamond";
  } else if (jawRatio > 0.9 && foreheadRatio > 0.9 && foreheadRatio < 1.08 && lengthToWidth < 1.25) {
    shape = "square";
  } else if (lengthToWidth >= 1.25 && lengthToWidth <= 1.5 && jawRatio >= 0.72 && jawRatio <= 0.95) {
    shape = "oval";
  } else {
    shape = "round";
  }

  return { shape, metrics: { lengthToWidth, jawRatio, foreheadRatio } };
}

async function loadModels() {
  if (modelsLoaded) return;
  document.getElementById("scanLoading").classList.remove("hidden");
  await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
  await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
  modelsLoaded = true;
  document.getElementById("scanLoading").classList.add("hidden");
}

async function startCamera() {
  const status = document.getElementById("scanStatus");
  try {
    status.textContent = "Requesting camera access…";
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
    const video = document.getElementById("video");
    video.srcObject = stream;
    await loadModels();
    document.getElementById("analyzeBtn").disabled = false;
    document.getElementById("startCamBtn").classList.add("hidden");
    status.textContent = "Camera ready. Center your face and click Analyze.";
  } catch (err) {
    status.textContent = "Couldn't access the camera: " + err.message;
    showToast("Camera access failed. Check browser permissions.", "error");
  }
}

async function analyzeFace() {
  const status = document.getElementById("scanStatus");
  const video = document.getElementById("video");
  const overlay = document.getElementById("overlay");
  status.textContent = "Analyzing…";

  const detection = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks();

  if (!detection) {
    status.textContent = "No face detected. Make sure your face is centered and well lit, then try again.";
    showToast("No face detected — try again", "error");
    return;
  }

  overlay.width = video.videoWidth;
  overlay.height = video.videoHeight;
  const ctx = overlay.getContext("2d");
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  faceapi.draw.drawFaceLandmarks(overlay, detection);

  const { shape, metrics } = classifyFaceShape(detection.landmarks);
  showResult(shape);

  sessionStorage.setItem("ll_face_shape", shape);
  status.textContent = "Done! Scroll down to see frames picked for you.";

  document.getElementById("analyzeBtn").classList.add("hidden");
  document.getElementById("rescanBtn").classList.remove("hidden");

  // Log the scan (best-effort, non-blocking)
  api("/face-scans", { method: "POST", auth: true, body: { faceShape: shape, metrics } }).catch(() => {});

  stopCamera();
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
}

function showResult(shape) {
  const info = SHAPE_INFO[shape];
  document.getElementById("resultEmpty").classList.add("hidden");
  const card = document.getElementById("resultCard");
  card.classList.remove("hidden");
  document.getElementById("shapeName").textContent = info.label;
  document.getElementById("shapeDescription").textContent = info.description;
  document.getElementById("shapeStyleTags").innerHTML = info.styles
    .map((s) => `<span class="bg-[var(--color-1)] text-[var(--color-5)] text-sm font-medium px-3 py-1 rounded-full">${s}</span>`)
    .join("");
  loadRecommendedProducts(shape);
}

async function loadRecommendedProducts(shape) {
  const container = document.getElementById("recommendedProducts");
  container.innerHTML = `<p class="col-span-full text-[var(--color-4)]">Finding your matches…</p>`;
  try {
    const { products } = await api(`/products?faceShape=${shape}`);
    if (products.length === 0) {
      container.innerHTML = `<p class="col-span-full text-[var(--color-4)]">No matches yet — check back as we add more styles!</p>`;
      return;
    }
    container.innerHTML = products
      .map(
        (p) => `
      <a href="index.html#products" onclick="sessionStorage.setItem('ll_face_shape','${shape}')" class="product-card block shadow-md">
        <img src="${p.image_url}" alt="${p.title}" class="w-full h-40 object-cover" onerror="this.style.display='none';" />
        <div class="p-4">
          <h4 class="font-semibold text-[var(--color-4)]">${p.title}</h4>
          <p class="text-[var(--color-3)] font-bold">${money(p.price)}</p>
        </div>
      </a>`
      )
      .join("");
  } catch (err) {
    container.innerHTML = `<p class="col-span-full text-red-700">Couldn't load recommendations: ${err.message}</p>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("startCamBtn").addEventListener("click", startCamera);
  document.getElementById("analyzeBtn").addEventListener("click", analyzeFace);
  document.getElementById("rescanBtn").addEventListener("click", () => {
    document.getElementById("rescanBtn").classList.add("hidden");
    document.getElementById("analyzeBtn").classList.remove("hidden");
    document.getElementById("startCamBtn").classList.remove("hidden");
    document.getElementById("analyzeBtn").disabled = true;
    document.getElementById("resultCard").classList.add("hidden");
    document.getElementById("resultEmpty").classList.remove("hidden");
    document.getElementById("recommendedProducts").innerHTML = "";
    startCamera();
  });

  document.getElementById("mobile-menu-toggle")?.addEventListener("click", () => {
    document.getElementById("mobile-menu").classList.toggle("hidden");
  });

  // If a shape was already detected this session, show it immediately.
  const existingShape = sessionStorage.getItem("ll_face_shape");
  if (existingShape) showResult(existingShape);
});

window.addEventListener("beforeunload", stopCamera);
