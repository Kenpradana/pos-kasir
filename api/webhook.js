export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    var notification = req.body;
    var orderId = notification.order_id;
    var transactionStatus = notification.transaction_status;
    var fraudStatus = notification.fraud_status;

    console.log('Midtrans Webhook:', orderId, transactionStatus, fraudStatus);

    // Verifikasi signature keamanan
    var SERVER_KEY = process.env.MIDTRANS_SERVER_KEY;
    var crypto = await import('crypto');

    var signatureKey = notification.signature_key;
    var orderIdSign = notification.order_id;
    var statusCode = notification.status_code;
    var grossAmount = notification.gross_amount;

    var hash = crypto
        .createHash('sha512')
        .update(orderIdSign + statusCode + grossAmount + SERVER_KEY)
        .digest('hex');

    if (hash !== signatureKey) {
        console.error('Webhook signature tidak valid');
        return res.status(403).json({ error: 'Invalid signature' });
    }

    // Status settlement = pembayaran sukses
    if (transactionStatus === 'settlement') {
        console.log('Pembayaran sukses via webhook:', orderId);
        // Di sini bisa tambahkan logic update DB jika perlu
        // Saat ini sudah dihandle via callback frontend
    }

    res.status(200).json({ status: 'ok' });
}