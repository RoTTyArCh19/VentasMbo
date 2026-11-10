import { stores, sellers } from '../server/demo.js';

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({
      error: 'Método no permitido'
    });
  }

  return res.status(200).json({
    mode: 'demo',
    currency: 'CLP',
    stores,
    sellers
  });
}