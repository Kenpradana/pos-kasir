export default async function handler(req, res) {
    console.log('=== MIDTRANS API ===');
    console.log('Has Key:', process.env.MIDTRANS_SERVER_KEY ? 'Ya' : 'TIDAK');
    console.log('Key length:', process.env.MIDTRANS_SERVER_KEY ? process.env.MIDTRANS_SERVER_KEY.length : 0);

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    var SERVER_KEY = process.env.MIDTRANS_SERVER_KEY;
    if (!SERVER_KEY) {
        return res.status(500).json({ error: 'MIDTRANS_SERVER_KEY belum diisi' });
    }

    // Bersihkan key dari spasi atau karakter aneh
    SERVER_KEY = SERVER_KEY.trim().replace(/[\r\n\t]/g, '');

    var IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true';
    var BASE_URL = IS_PRODUCTION
        ? 'https://app.midtrans.com/snap/v1/transactions'
        : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

    console.log('Mode:', IS_PRODUCTION ? 'PRODUCTION' : 'SANDBOX');

    var body = req.body;
    var orderId = body.orderId;
    var amount = parseInt(body.amount);
    var items = body.items || [];

    if (!orderId || !amount || amount <= 0) {
        return res.status(400).json({ error: 'orderId dan amount wajib' });
    }

    var authString = Buffer.from(SERVER_KEY + ':').toString('base64');

    var itemDetails = items.map(function (item) {
        return {
            id: String(item.id),
            price: parseInt(item.price),
            quantity: parseInt(item.qty),
            name: (item.name || 'Item').substring(0, 50)
        };
    });

    if (itemDetails.length === 0) {
        itemDetails = [{ id: '1', price: amount, quantity: 1, name: 'Pesanan' }];
    }

    var payload = {
        transaction_details: {
            order_id: orderId,
            gross_amount: amount
        },
        item_details: itemDetails,
        customer_details: {
            first_name: 'Pelanggan',
            email: 'pelanggan@kasirpos.com',
            phone: '081234567890'
        }
    };

    console.log('Payload:', JSON.stringify(payload));

    try {
        var response = await fetch(BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': 'Basic ' + authString
            },
            body: JSON.stringify(payload)
        });

        var rawText = await response.text();
        console.log('HTTP Status:', response.status);
        console.log('Raw Response:', rawText);

        var data = JSON.parse(rawText);

        // error_messages = array
        if (data.error_messages && data.error_messages.length > 0) {
            console.error('ERROR_MESSAGES:', JSON.stringify(data.error_messages));
            return res.status(400).json({
                error: data.error_messages.join(', '),
                full: data.error_messages
            });
        }

        // error_message = string (kadang pakai ini)
        if (data.error_message) {
            console.error('ERROR_MESSAGE:', data.error_message);
            return res.status(400).json({ error: data.error_message });
        }

        // validation_messages = array
        if (data.validation_messages && data.validation_messages.length > 0) {
            return res.status(400).json({ error: data.validation_messages.join(', ') });
        }

        // status_code bukan 200
        if (data.status_code && String(data.status_code) !== '200') {
            return res.status(400).json({
                error: 'Midtrans: ' + (data.status_message || 'Unknown error'),
                code: data.status_code
            });
        }

        // Ambil token
        var token = data.token || data.snap_token || data.redirect_url || null;

        if (!token) {
            return res.status(500).json({
                error: 'Token tidak ada',
                keys: Object.keys(data),
                preview: rawText.substring(0, 500)
            });
        }

        console.log('TOKEN OK:', String(token).substring(0, 30) + '...');
        res.status(200).json({ token: token });

    } catch (error) {
        console.error('CATCH:', error.message);
        res.status(500).json({ error: 'Gagal: ' + error.message });
    }
}