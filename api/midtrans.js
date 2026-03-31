export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    var SERVER_KEY = (process.env.MIDTRANS_SERVER_KEY || '').trim().replace(/[\r\n\t]/g, '');
    if (!SERVER_KEY) {
        return res.status(500).json({ error: 'MIDTRANS_SERVER_KEY belum diisi' });
    }

    var IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true';
    var BASE_URL = IS_PRODUCTION
        ? 'https://app.midtrans.com/snap/v1/transactions'
        : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

    var body = req.body;
    var orderId = body.orderId;
    var items = body.items || [];
    var discount = parseInt(body.discount) || 0;
    var tax = parseInt(body.tax) || 0;

    if (!orderId) {
        return res.status(400).json({ error: 'orderId wajib' });
    }

    var authString = Buffer.from(SERVER_KEY + ':').toString('base64');

    // 1. Item produk
    var itemDetails = items.map(function (item) {
        return {
            id: String(item.id),
            price: parseInt(item.price),
            quantity: parseInt(item.qty),
            name: (item.name || 'Item').substring(0, 50)
        };
    });

    // 2. Tambah baris diskon (harga negatif)
    if (discount > 0) {
        itemDetails.push({
            id: 'discount',
            price: -Math.abs(discount),
            quantity: 1,
            name: 'Diskon'
        });
    }

    // 3. Tambah baris pajak
    if (tax > 0) {
        itemDetails.push({
            id: 'tax',
            price: tax,
            quantity: 1,
            name: 'Pajak 11%'
        });
    }

    // 4. Hitung gross_amount WAJIB sama dengan jumlah item_details
    var grossAmount = 0;
    for (var i = 0; i < itemDetails.length; i++) {
        grossAmount += itemDetails[i].price * itemDetails[i].quantity;
    }

    // Kalau semua item kosong, fallback
    if (itemDetails.length === 0) {
        itemDetails = [{ id: '1', price: grossAmount || 1, quantity: 1, name: 'Pesanan' }];
        grossAmount = itemDetails[0].price;
    }

    // Pastikan gross_amount positif
    grossAmount = Math.max(1, grossAmount);

    var payload = {
        transaction_details: {
            order_id: orderId,
            gross_amount: grossAmount
        },
        item_details: itemDetails,
        customer_details: {
            first_name: 'Pelanggan',
            email: 'pelanggan@kasirpos.com',
            phone: '081234567890'
        }
    };

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
        var data = JSON.parse(rawText);

        if (data.error_messages && data.error_messages.length > 0) {
            return res.status(400).json({ error: data.error_messages.join(', ') });
        }
        if (data.error_message) {
            return res.status(400).json({ error: data.error_message });
        }
        if (data.validation_messages && data.validation_messages.length > 0) {
            return res.status(400).json({ error: data.validation_messages.join(', ') });
        }

        var token = data.token || data.snap_token || data.redirect_url || null;

        if (!token) {
            return res.status(500).json({
                error: 'Token tidak ada',
                keys: Object.keys(data),
                preview: rawText.substring(0, 300)
            });
        }

        res.status(200).json({ token: token });

    } catch (error) {
        res.status(500).json({ error: 'Gagal: ' + error.message });
    }
}