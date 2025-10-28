// api/generate-overlay.js
import { createCanvas, loadImage } from '@napi-rs/canvas';

export default async function handler(req, res) {
  // Health check on GET
  if (req.method === 'GET') return res.status(200).json({ ok: true });

  if (req.method !== 'POST') {
    return res.status(405).json({ status_code: 405, error_message: 'Method not allowed' });
  }

  try {
    const { student_image_url, show_thirds = false } = req.body || {};
    if (!student_image_url) {
      return res.status(400).json({ status_code: 400, error_message: 'student_image_url is required' });
    }

    // Load the student's image to get exact pixel size
    const img = await loadImage(student_image_url);
    const W = img.width;
    const H = img.height;

    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d', { alpha: true });

    // Transparent background (PNG with alpha)
    ctx.clearRect(0, 0, W, H);

    // Grease-pencil/overlay style
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, Math.round(W * 0.003));
    ctx.strokeStyle = 'rgba(0,0,0,0.9)';
    ctx.fillStyle = 'rgba(0,0,0,0.9)';
    ctx.font = `${Math.round(W * 0.018)}px sans-serif`;

    // Example overlay: rule-of-thirds grid
    if (show_thirds) {
      const thirds = [Math.round(W / 3), Math.round((2 * W) / 3)];
      for (const x of thirds) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      const thirdsY = [Math.round(H / 3), Math.round((2 * H) / 3)];
      for (const y of thirdsY) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    }

    // Return PNG overlay + a tiny JSON descriptor (normalized strokes placeholder)
    const overlay_png_b64 = canvas.toBuffer('image/png').toString('base64');

    return res.status(200).json({
      status_code: 200,
      overlay_png_b64,
      overlay_json: { width: W, height: H, normalized: true, strokes: [] },
      error_message: null
    });
  } catch (err) {
    return res.status(500).json({ status_code: 500, error_message: String(err) });
  }
}
