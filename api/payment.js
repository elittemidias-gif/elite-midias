const { MercadoPagoConfig, Payment } = require('mercadopago');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const client = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN
    });

    const { type, items, payer, total, token, installments, cpf, payment_method_id } = req.body;
    const payment = new Payment(client);

    if (type === 'pix') {
      const result = await payment.create({
        body: {
          transaction_amount: Number(total),
          description: 'Fotos Elite Midias',
          payment_method_id: 'pix',
          payer: {
            email: payer.email,
            first_name: payer.name.split(' ')[0],
            last_name: payer.name.split(' ').slice(1).join(' ') || 'Cliente'
          },
          metadata: {
            payer_email: payer.email,
            payer_name: payer.name,
            event_name: payer.eventName || 'Evento',
            items_list: (items||[]).map(i => '• ' + i.caption).join('\n'),
            drive_links: (items||[]).map(i => i.driveLink || '').join('\n')
          }
        }
      });

      return res.status(200).json({
        id: result.id,
        status: result.status,
        qr_code: result.point_of_interaction?.transaction_data?.qr_code,
        qr_code_base64: result.point_of_interaction?.transaction_data?.qr_code_base64,
      });
    }

    if (type === 'card') {
      const result = await payment.create({
        body: {
          transaction_amount: Number(total),
          token,
          description: 'Fotos Elite Midias',
          installments: Number(installments) || 1,
          payment_method_id: payment_method_id || 'visa',
          payer: {
            email: payer.email,
            identification: { type: 'CPF', number: cpf }
          },
          metadata: {
            payer_email: payer.email,
            payer_name: payer.name,
            event_name: payer.eventName || 'Evento',
            items_list: (items||[]).map(i => '• ' + i.caption).join('\n'),
            drive_links: (items||[]).map(i => i.driveLink || '').join('\n')
          }
        }
      });

      return res.status(200).json({
        id: result.id,
        status: result.status,
        status_detail: result.status_detail
      });
    }

    return res.status(400).json({ error: 'Invalid type' });

  } catch (err) {
    console.error('Payment error:', err);
    return res.status(500).json({ error: err.message });
  }
};
