import { PNG } from 'pngjs';

function createPng(width, height) {
  const png = new PNG({ width, height, colorType: 6 });
  png.data.fill(0);
  return png;
}
function setPixel(png, x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const i = (png.width * y + x) << 2;
  png.data[i] = r; png.data[i+1] = g; png.data[i+2] = b; png.data[i+3] = a;
}
function drawThickLine(png, x1, y1, x2, y2, t, r, g, b, a) {
  let dx = Math.abs(x2 - x1), sx = x1 < x2 ? 1 : -1;
  let dy = -Math.abs(y2 - y1), sy = y1 < y2 ? 1 : -1;
  let err = dx + dy;
  const h = Math.max(0, Math.floor(t/2));
  while (true) {
    for (let oy=-h; oy<=h; oy++) for (let ox=-h; ox<=h; ox++) setPixel(png, x1+ox, y1+oy, r,g,b,a);
    if (x1 === x2 && y1 === y2) break;
    const e2 = 2*err; if (e2 >= dy) { err += dy; x1 += sx; } if (e2 <= dx) { err += dx; y1 += sy; }
  }
}
const toX = (v,W) => (v <= 1 ? Math.round(v*W) : Math.round(v));
const toY = (v,H) => (v <= 1 ? Math.round(v*H) : Math.round(v));

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ status_code: 405, error_message: 'Method not allowed' });
    const { width=1920, height=1080, show_thirds=true, strokes: customStrokes=[] } = req.body || {};
    const W = Math.max(8, Math.floor(width)), H = Math.max(8, Math.floor(height));
    const png = createPng(W, H);

    const defaultStrokes = [
      { type:'line', x1:0.06, y1:0.82, x2:0.94, y2:0.82, label:'lower horizon' },
      { type:'line', x1:0.18, y1:0.96, x2:0.78, y2:0.56, label:'leading diagonal' }
    ];
    const thirds = show_thirds ? [
      { type:'line', x1:1/3, y1:0, x2:1/3, y2:1, label:'' },
      { type:'line', x1:2/3, y1:0, x2:2/3, y2:1, label:'' },
      { type:'line', x1:0, y1:1/3, x2:1, y2:1/3, label:'' },
      { type:'line', x1:0, y1:2/3, x2:1, y2:2/3, label:'' }
    ] : [];
    const strokes = customStrokes.length ? customStrokes : [...thirds, ...defaultStrokes];

    const thickness = Math.max(3, Math.round(W*0.003));
    const color = { r:0, g:0, b:0, a:230 };
    for (const s of strokes) {
      if (s.type !== 'line') continue;
      drawThickLine(png, toX(s.x1,W), toY(s.y1,H), toX(s.x2,W), toY(s.y2,H), thickness, color.r, color.g, color.b, color.a);
    }

    const buffer = PNG.sync.write(png);
    res.status(200).json({ status_code:200, overlay_png_b64: buffer.toString('base64'), overlay_json: { width:W, height:H, normalized:true, strokes }, error_message:null });
  } catch (e) {
    res.status(500).json({ status_code:500, error_message:String(e) });
  }
}
