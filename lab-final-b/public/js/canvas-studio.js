(function () {
  if (typeof document === 'undefined') {
    return;
  }

  const canvas = document.getElementById('heroCanvas');
  if (!canvas) {
    return;
  }

  const ctx = canvas.getContext('2d');
  const imageUpload = document.getElementById('imageUpload');
  const clearImageBtn = document.getElementById('clearImageBtn');
  const faceScaleInput = document.getElementById('faceScale');
  const faceOffsetXInput = document.getElementById('faceOffsetX');
  const faceOffsetYInput = document.getElementById('faceOffsetY');
  const bgScaleInput = document.getElementById('bgScale');
  const bgOffsetXInput = document.getElementById('bgOffsetX');
  const bgOffsetYInput = document.getElementById('bgOffsetY');
  const captionInput = document.getElementById('captionInput');
  const captionColor = document.getElementById('captionColor');
  const downloadBtn = document.getElementById('downloadBtn');
  const templateButtons = Array.from(document.querySelectorAll('.template-btn'));

  const templates = {
    superman: {
      face: { x: 540, y: 435, r: 128 },
      bgTop: '#0b2d88',
      bgBottom: '#07153f',
      bodyMain: '#1e4cd8',
      bodySecondary: '#cc262e',
      accent: '#f6d54a',
      title: 'SUPERMAN STYLE'
    },
    ironman: {
      face: { x: 540, y: 430, r: 116 },
      bgTop: '#70140f',
      bgBottom: '#220607',
      bodyMain: '#9e1d20',
      bodySecondary: '#f2c857',
      accent: '#77f0ff',
      title: 'IRONMAN STYLE'
    }
  };

  const templateImages = {
    superman: null,
    ironman: null
  };

  const templateImageStatus = {
    superman: 'idle',
    ironman: 'idle'
  };

  const state = {
    template: 'superman',
    uploadedImage: null,
    caption: 'SUPER HERO',
    captionColor: '#ffe600',
    faceScale: 1.2,
    faceOffsetX: 0,
    faceOffsetY: 0,
    bgScale: 1,
    bgOffsetX: 0,
    bgOffsetY: 0
  };

  const dragState = {
    active: false,
    mode: 'face',
    startX: 0,
    startY: 0,
    baseFaceX: 0,
    baseFaceY: 0,
    baseBgX: 0,
    baseBgY: 0
  };

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function drawCoverImage(img) {
    const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
    const adjustedScale = scale * state.bgScale;
    const drawW = img.width * adjustedScale;
    const drawH = img.height * adjustedScale;
    const x = (canvas.width - drawW) / 2 + state.bgOffsetX;
    const y = (canvas.height - drawH) / 2 + state.bgOffsetY;
    ctx.drawImage(img, x, y, drawW, drawH);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function syncPlacementInputs() {
    if (faceOffsetXInput) faceOffsetXInput.value = String(Math.round(state.faceOffsetX));
    if (faceOffsetYInput) faceOffsetYInput.value = String(Math.round(state.faceOffsetY));
    if (bgOffsetXInput) bgOffsetXInput.value = String(Math.round(state.bgOffsetX));
    if (bgOffsetYInput) bgOffsetYInput.value = String(Math.round(state.bgOffsetY));
  }

  function tryLoadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load ${url}`));
      img.src = url;
    });
  }

  async function loadTemplateImage(name) {
    if (templateImageStatus[name] === 'loaded' || templateImageStatus[name] === 'loading') {
      return;
    }

    templateImageStatus[name] = 'loading';
    const candidates = [
      `/assets/${name}`,
      `/assets/${name}.png`,
      `/assets/${name}.jpg`,
      `/assets/${name}.jpeg`,
      `/assets/${name}.webp`
    ];

    for (const src of candidates) {
      try {
        const img = await tryLoadImage(src);
        templateImages[name] = img;
        templateImageStatus[name] = 'loaded';
        return;
      } catch (error) {
        // Try next extension candidate.
      }
    }

    templateImageStatus[name] = 'failed';
  }

  function drawTemplateBackground() {
    const templateImg = templateImages[state.template];
    if (templateImg) {
      drawCoverImage(templateImg);
      return true;
    }

    const t = templates[state.template];
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, t.bgTop);
    grad.addColorStop(1, t.bgBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    for (let i = 0; i < 10; i += 1) {
      ctx.fillRect(i * 140 + rand(-30, 30), 0, 16, canvas.height);
    }

    for (let i = 0; i < 100; i += 1) {
      ctx.beginPath();
      ctx.fillStyle = `rgba(255,255,255,${rand(0.03, 0.24)})`;
      ctx.arc(rand(0, canvas.width), rand(0, canvas.height), rand(1, 3), 0, Math.PI * 2);
      ctx.fill();
    }

    return false;
  }

  function drawBodyTemplate() {
    const t = templates[state.template];
    const shoulderY = 660;
    const torsoTop = 520;

    ctx.save();
    ctx.fillStyle = t.bodySecondary;
    ctx.beginPath();
    ctx.moveTo(255, shoulderY);
    ctx.lineTo(825, shoulderY);
    ctx.lineTo(900, 1280);
    ctx.lineTo(180, 1280);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = t.bodyMain;
    ctx.beginPath();
    ctx.moveTo(330, torsoTop);
    ctx.lineTo(750, torsoTop);
    ctx.lineTo(812, 1280);
    ctx.lineTo(268, 1280);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = t.accent;
    ctx.beginPath();
    ctx.ellipse(540, 780, 78, 65, 0, 0, Math.PI * 2);
    ctx.fill();

    if (state.template === 'superman') {
      ctx.fillStyle = '#ca2a2e';
      ctx.beginPath();
      ctx.moveTo(540, 720);
      ctx.lineTo(590, 790);
      ctx.lineTo(540, 850);
      ctx.lineTo(490, 790);
      ctx.closePath();
      ctx.fill();
    }

    if (state.template === 'ironman') {
      ctx.fillStyle = '#5cf0ff';
      ctx.beginPath();
      ctx.arc(540, 780, 35, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawFaceImage() {
    const img = state.uploadedImage;
    const face = templates[state.template].face;

    ctx.save();
    ctx.beginPath();
    ctx.arc(face.x, face.y, face.r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    if (!img) {
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(face.x - face.r, face.y - face.r, face.r * 2, face.r * 2);
      ctx.fillStyle = '#f7f7f7';
      ctx.font = '700 26px Segoe UI, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Upload Face', face.x, face.y + 10);
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(face.x, face.y, face.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return;
    }

    const target = face.r * 2 * state.faceScale;
    const scale = Math.max(target / img.width, target / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const x = face.x - drawW / 2 + state.faceOffsetX;
    const y = face.y - drawH / 2 + state.faceOffsetY;

    ctx.drawImage(img, x, y, drawW, drawH);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(face.x, face.y, face.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function getCanvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  }

  function isPointInsideFace(point) {
    const face = templates[state.template].face;
    const centerX = face.x + state.faceOffsetX;
    const centerY = face.y + state.faceOffsetY;
    const dx = point.x - centerX;
    const dy = point.y - centerY;
    return Math.sqrt(dx * dx + dy * dy) <= face.r;
  }

  function drawCaption() {
    const caption = (state.caption || '').trim();
    if (!caption) {
      return;
    }

    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '900 92px Segoe UI, sans-serif';
    ctx.lineWidth = 12;
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.strokeText(caption, canvas.width / 2, 1200);
    ctx.fillStyle = state.captionColor;
    ctx.fillText(caption, canvas.width / 2, 1200);
    ctx.restore();
  }

  function drawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const usingTemplateImage = drawTemplateBackground();
    if (!usingTemplateImage) {
      drawBodyTemplate();
    }
    drawFaceImage();

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.34)';
    ctx.fillRect(0, 0, canvas.width, 120);
    ctx.textAlign = 'center';
    ctx.font = '800 46px Segoe UI, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(templates[state.template].title, canvas.width / 2, 75);
    ctx.restore();

    drawCaption();
  }

  function loadImageFromFile(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        state.uploadedImage = img;
        drawCanvas();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  imageUpload.addEventListener('change', function (event) {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }
    loadImageFromFile(file);
  });

  clearImageBtn.addEventListener('click', function () {
    state.uploadedImage = null;
    imageUpload.value = '';
    drawCanvas();
  });

  faceScaleInput.addEventListener('input', function () {
    state.faceScale = Number(faceScaleInput.value) / 100;
    drawCanvas();
  });

  faceOffsetXInput.addEventListener('input', function () {
    state.faceOffsetX = clamp(Number(faceOffsetXInput.value), -250, 250);
    drawCanvas();
  });

  faceOffsetYInput.addEventListener('input', function () {
    state.faceOffsetY = clamp(Number(faceOffsetYInput.value), -250, 250);
    drawCanvas();
  });

  if (bgScaleInput) {
    bgScaleInput.addEventListener('input', function () {
      state.bgScale = Number(bgScaleInput.value) / 100;
      drawCanvas();
    });
  }

  if (bgOffsetXInput) {
    bgOffsetXInput.addEventListener('input', function () {
      state.bgOffsetX = clamp(Number(bgOffsetXInput.value), -300, 300);
      drawCanvas();
    });
  }

  if (bgOffsetYInput) {
    bgOffsetYInput.addEventListener('input', function () {
      state.bgOffsetY = clamp(Number(bgOffsetYInput.value), -300, 300);
      drawCanvas();
    });
  }

  canvas.addEventListener('pointerdown', function (event) {
    const point = getCanvasPoint(event);
    const faceHit = isPointInsideFace(point);

    if (!faceHit && !event.shiftKey) {
      return;
    }

    dragState.active = true;
    dragState.mode = event.shiftKey ? 'background' : 'face';
    dragState.startX = point.x;
    dragState.startY = point.y;
    dragState.baseFaceX = state.faceOffsetX;
    dragState.baseFaceY = state.faceOffsetY;
    dragState.baseBgX = state.bgOffsetX;
    dragState.baseBgY = state.bgOffsetY;
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener('pointermove', function (event) {
    if (!dragState.active) {
      return;
    }

    const point = getCanvasPoint(event);
    const dx = point.x - dragState.startX;
    const dy = point.y - dragState.startY;

    if (dragState.mode === 'face') {
      state.faceOffsetX = clamp(dragState.baseFaceX + dx, -250, 250);
      state.faceOffsetY = clamp(dragState.baseFaceY + dy, -250, 250);
    } else {
      state.bgOffsetX = clamp(dragState.baseBgX + dx, -300, 300);
      state.bgOffsetY = clamp(dragState.baseBgY + dy, -300, 300);
    }

    syncPlacementInputs();
    drawCanvas();
  });

  function endDrag(event) {
    if (!dragState.active) {
      return;
    }
    dragState.active = false;
    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch (error) {
      // No-op when pointer capture was not active.
    }
  }

  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerleave', endDrag);

  canvas.addEventListener('contextmenu', function (event) {
    event.preventDefault();
  });

  canvas.title = 'Drag on face to move face. Hold Shift + drag to move background.';

  canvas.addEventListener('wheel', function (event) {
    event.preventDefault();
    if (event.shiftKey) {
      const nextBgScale = state.bgScale + (event.deltaY < 0 ? 0.03 : -0.03);
      state.bgScale = clamp(nextBgScale, 0.7, 1.8);
      if (bgScaleInput) {
        bgScaleInput.value = String(Math.round(state.bgScale * 100));
      }
    } else {
      const nextFaceScale = state.faceScale + (event.deltaY < 0 ? 0.03 : -0.03);
      state.faceScale = clamp(nextFaceScale, 0.6, 2.5);
      faceScaleInput.value = String(Math.round(state.faceScale * 100));
    }
    drawCanvas();
  }, { passive: false });

  captionInput.addEventListener('input', function () {
    state.caption = captionInput.value;
    drawCanvas();
  });

  captionColor.addEventListener('input', function () {
    state.captionColor = captionColor.value;
    drawCanvas();
  });

  templateButtons.forEach((button) => {
    button.addEventListener('click', function () {
      templateButtons.forEach((btn) => btn.classList.remove('active'));
      button.classList.add('active');
      state.template = button.dataset.template;
      faceScaleInput.value = '120';
      faceOffsetXInput.value = '0';
      faceOffsetYInput.value = '0';
      state.faceScale = 1.2;
      state.faceOffsetX = 0;
      state.faceOffsetY = 0;
      state.bgScale = 1;
      state.bgOffsetX = 0;
      state.bgOffsetY = 0;
      if (bgScaleInput) bgScaleInput.value = '100';
      if (bgOffsetXInput) bgOffsetXInput.value = '0';
      if (bgOffsetYInput) bgOffsetYInput.value = '0';
      loadTemplateImage(state.template).finally(drawCanvas);
    });
  });

  downloadBtn.addEventListener('click', function () {
    const link = document.createElement('a');
    link.download = 'hero-poster.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  });

  Promise.all([
    loadTemplateImage('superman'),
    loadTemplateImage('ironman')
  ]).finally(() => {
    syncPlacementInputs();
    drawCanvas();
  });
})();