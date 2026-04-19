// Camera service: handles interaction with the user's camera.

function isLocalhost(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function isSecureCameraContext() {
  const isSecureOrigin = window.isSecureContext === true;
  const localhostOrigin = isLocalhost(window.location.hostname);
  return isSecureOrigin || localhostOrigin;
}

function normalizeCameraError(error) {
  const name = error?.name || '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return new Error('Camera permission denied. Allow camera access in browser/site settings.');
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return new Error('No camera device found on this phone/browser.');
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return new Error('Camera is already in use by another app.');
  }
  if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
    return new Error('Camera constraints not supported on this device.');
  }
  if (name === 'SecurityError') {
    return new Error('Camera blocked for security reasons. Use HTTPS or localhost.');
  }
  return new Error(error?.message || 'Failed to start camera.');
}

export async function startCamera({
  videoEl,
  facingMode = 'environment',
  width,
  height
} = {}) {
  if (!videoEl) throw new Error('startCamera requires a video element.');
  if (!isSecureCameraContext()) {
    throw new Error(
      'Camera requires HTTPS on mobile network URLs. Open this app with HTTPS (or localhost for dev).'
    );
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error(
      'Camera API unavailable. On mobile, this usually means insecure HTTP context (needs HTTPS).'
    );
  }

  const constraints = {
    video: {
      facingMode: { ideal: facingMode }
    },
    audio: false
  };

  if (width) constraints.video.width = { ideal: width };
  if (height) constraints.video.height = { ideal: height };

  let stream = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia(constraints);
  } catch (error) {
    // Fallback for devices that do not support requested constraints.
    if (error?.name === 'OverconstrainedError' || error?.name === 'ConstraintNotSatisfiedError' || error?.name === 'NotFoundError') {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      } catch (fallbackError) {
        throw normalizeCameraError(fallbackError);
      }
    } else {
      throw normalizeCameraError(error);
    }
  }

  try {
    videoEl.srcObject = stream;
    await videoEl.play();
  } catch (error) {
    stopCamera(stream);
    throw normalizeCameraError(error);
  }
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
