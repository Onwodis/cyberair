export function getDeviceFingerprint(): string {
  if (typeof window === 'undefined') return '';

  const navigatorInfo = `${navigator.userAgent}-${navigator.language}-${screen.colorDepth}x${screen.width}x${screen.height}`;

  // Canvas Fingerprinting
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  let canvasHash = '';

  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('SecurityEnginePass', 2, 15);
    canvasHash = canvas.toDataURL();
  }

  // Simple Fast Hash Construction
  const str = navigatorInfo + canvasHash;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'DEV-' + Math.abs(hash).toString(16);
}
