function lerp(a, b, t) {
  return a + (b - a) * t;
}

function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(x=>x+x).join('');
  const num = parseInt(hex, 16);
  return [num >> 16, (num >> 8) & 0xFF, num & 0xFF];
}

function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function getFreqColor(freq, min, max) {
  let t = (freq - min) / (max - min)
  const rgb1 = hexToRgb('#FFFFFF');
  const rgb2 = hexToRgb('#a10028');
  const rgb = [
    Math.round(lerp(rgb1[0], rgb2[0], t)),
    Math.round(lerp(rgb1[1], rgb2[1], t)),
    Math.round(lerp(rgb1[2], rgb2[2], t))
  ];
  return rgbToHex(rgb);
}