import { demoRows } from '../server/demo.js';
import { validateRange, summarize } from '../server/metrics.js';

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({
      error: 'Método no permitido'
    });
  }

  const {
    start,
    end,
    store = '',
    seller = ''
  } = req.query;

  try {
    validateRange(start, end);

    if (
      typeof store !== 'string' ||
      typeof seller !== 'string'
    ) {
      throw new Error('Filtros inválidos.');
    }
  } catch (error) {
    return res.status(400).json({
      error: error.message
    });
  }

  try {
    const rows = demoRows(start, end)
      .filter(row =>
        (!store || row.StoreCode === store) &&
        (!seller || String(row.SellerCode) === seller)
      )
      .map(row => ({
        ...row,
        Amount: Number(row.Amount)
      }));

    return res.status(200).json({
      mode: 'demo',
      start,
      end,
      summary: summarize(rows),
      rows,
      unallocatedDocuments: 0,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error al generar demo:', error);

    return res.status(500).json({
      error: 'No se pudieron generar los datos demo.'
    });
  }
}