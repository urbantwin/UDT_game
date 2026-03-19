// Camera service: handles interaction with the user's camera.

export async function startCamera({
  videoEl,
  facingMode = 'environment',
  width,
  height
} = {}) {
  if (!videoEl) throw new Error('startCamera requires a video element.');
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera API not supported in this browser.');
  }

  const constraints = {
    video: {
      facingMode: { ideal: facingMode }
    },
    audio: false
  };

  if (width) constraints.video.width = { ideal: width };
  if (height) constraints.video.height = { ideal: height };

  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  videoEl.srcObject = stream;
  await videoEl.play();
  return stream;
}

export function stopCamera(stream) {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    track.stop();
  }
}

export async function capturePhoto(videoEl, { type = 'image/png', quality = 0.92 } = {}) {
  if (!videoEl) throw new Error('capturePhoto requires a video element.');
  const width = videoEl.videoWidth;
  const height = videoEl.videoHeight;
  if (!width || !height) throw new Error('Video is not ready for capture.');

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoEl, 0, 0, width, height);

  const blob = await new Promise((resolve) => {
    canvas.toBlob((result) => resolve(result), type, quality);
  });

  if (!blob) throw new Error('Failed to capture image.');
  return { blob, width, height, type };
}
