// ============================================================
// SUPABASE CLIENT
// ============================================================
var db = null;
var supabaseReady = false;

function initSupabase() {
    if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY &&
        window.SUPABASE_URL.indexOf('PROJECT_ID') === -1) {
        db = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
        midtransIsProduction = false;
        return Promise.resolve(true);
    }
    return fetch('/api/config')
        .then(function (res) {
            if (!res.ok) throw new Error('API error');
            return res.json();
        })
        .then(function (data) {
            if (data.error) throw new Error(data.error);
            db = window.supabase.createClient(data.supabaseUrl, data.supabaseAnonKey);
            midtransIsProduction = data.midtransIsProduction || false;
            return true;
        });
}

// ============================================================
// SEED DATA
// ============================================================
var SEED_PRODUCTS = [
    { name: 'Nasi Goreng Spesial',  price: 25000, category: 'Makanan',  stock: 50,  emoji: '🍛' },
    { name: 'Mie Ayam Bakso',       price: 22000, category: 'Makanan',  stock: 40,  emoji: '🍜' },
    { name: 'Ayam Geprek',          price: 20000, category: 'Makanan',  stock: 35,  emoji: '🍗' },
    { name: 'Sate Ayam (10)',       price: 30000, category: 'Makanan',  stock: 25,  emoji: '🍢' },
    { name: 'Burger Wagyu',         price: 45000, category: 'Makanan',  stock: 15,  emoji: '🍔' },
    { name: 'Nasi Padang Komplit',  price: 28000, category: 'Makanan',  stock: 30,  emoji: '🍚' },
    { name: 'Pizza Margherita',     price: 55000, category: 'Makanan',  stock: 10,  emoji: '🍕' },
    { name: 'Salad Buah Segar',     price: 18000, category: 'Makanan',  stock: 20,  emoji: '🥗' },
    { name: 'Nasi Uduk Komplit',    price: 20000, category: 'Makanan',  stock: 45,  emoji: '🍱' },
    { name: 'Ikan Bakar Rica',      price: 38000, category: 'Makanan',  stock: 12,  emoji: '🐟' },
    { name: 'Es Teh Manis',         price: 5000,  category: 'Minuman',  stock: 100, emoji: '🧊' },
    { name: 'Kopi Susu Gula Aren',   price: 18000, category: 'Minuman',  stock: 60,  emoji: '☕' },
    { name: 'Jus Alpukat',          price: 15000, category: 'Minuman',  stock: 30,  emoji: '🥑' },
    { name: 'Matcha Latte',         price: 22000, category: 'Minuman',  stock: 40,  emoji: '🍵' },
    { name: 'Es Jeruk Segar',       price: 8000,  category: 'Minuman',  stock: 80,  emoji: '🍊' },
    { name: 'Milkshake Coklat',     price: 20000, category: 'Minuman',  stock: 25,  emoji: '🥤' },
    { name: 'Air Mineral',          price: 4000,  category: 'Minuman',  stock: 200, emoji: '💧' },
    { name: 'Smoothie Mangga',      price: 18000, category: 'Minuman',  stock: 20,  emoji: '🥭' },
    { name: 'Kentang Goreng',       price: 15000, category: 'Snack',    stock: 50,  emoji: '🍟' },
    { name: 'Cireng Isi (5)',       price: 12000, category: 'Snack',    stock: 40,  emoji: '🥟' },
    { name: 'Pisang Goreng Keju',   price: 14000, category: 'Snack',    stock: 35,  emoji: '🍌' },
    { name: 'Tahu Crispy',          price: 10000, category: 'Snack',    stock: 45,  emoji: '🧈' },
    { name: 'Roti Bakar Coklat',    price: 16000, category: 'Snack',    stock: 30,  emoji: '🍞' },
    { name: 'Dimsum (8 pcs)',       price: 25000, category: 'Snack',    stock: 20,  emoji: '🥮' },
    { name: 'Es Krim Cone',         price: 12000, category: 'Dessert',  stock: 30,  emoji: '🍦' },
    { name: 'Pancake Madu',         price: 22000, category: 'Dessert',  stock: 15,  emoji: '🥞' },
    { name: 'Brownies Coklat',      price: 18000, category: 'Dessert',  stock: 20,  emoji: '🍫' },
    { name: 'Puding Caramel',       price: 10000, category: 'Dessert',  stock: 25,  emoji: '🍮' },
    { name: 'Es Campur',            price: 15000, category: 'Dessert',  stock: 18,  emoji: '🍧' },
    { name: 'Martabak Manis Mini',  price: 28000, category: 'Dessert',  stock: 10,  emoji: '🫓' },
];

var EMOJI_OPTIONS = [
    '🍛','🍜','🍗','🍢','🍔','🍕','🍚','🥗','🐟','🍖',
    '🍝','🥩','🧊','☕','🥑','🍵','🍊','🥤','💧','🥭',
    '🍺','🧋','🍷','🍟','🥟','🍌','🧈','🍞','🥮','🍿',
    '🧁','🍪','🥨','🍦','🥞','🍫','🍮','🍧','🫓','🍰',
    '🎂','🍩','🥧','🥐','🌭','🌮','🥙','🥪','🥚','📦'
];

// ============================================================
// STATE
// ============================================================
var products = [];
var cart = [];
var transactions = [];
var selectedCategory = 'Semua';
var selectedTable = null;
var selectedPayMethod = 'cash';
var currentTransaction = null;
var editingProductId = null;
var deleteTargetId = null;
var selectedFormEmoji = '🍛';
var selectedFormCategory = 'Makanan';
var TAX_RATE = 0.11;
var midtransIsProduction = false; // akan di-set dari API
var midtransSnapLoaded = false;

// ============================================================
// UTILITAS
// ============================================================
function formatRupiah(num) { return 'Rp ' + num.toLocaleString('id-ID'); }

// ============================================================
// JAM & TANGGAL
// ============================================================
function updateClock() {
    var now = new Date();
    var days = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
    var months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    document.getElementById('currentDate').textContent = days[now.getDay()] + ', ' + now.getDate() + ' ' + months[now.getMonth()] + ' ' + now.getFullYear();
    document.getElementById('currentTime').textContent = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
setInterval(updateClock, 1000);
updateClock();

// ============================================================
// AUTH
// ============================================================
function showScreen(id) {
    ['loadingScreen', 'loginScreen', 'configErrorScreen', 'appContainer'].forEach(function (s) {
        var el = document.getElementById(s);
        if (el) el.style.display = 'none';
    });
    var target = document.getElementById(id);
    if (target) {
        target.style.display = id === 'appContainer' ? 'flex' : 'flex';
    }
}

function showLoginError(msg) {
    var el = document.getElementById('loginError');
    el.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> ' + msg;
    el.style.display = 'flex';
}

async function handleLogin() {
    var email = document.getElementById('loginEmail').value.trim();
    var password = document.getElementById('loginPassword').value;
    document.getElementById('loginError').style.display = 'none';
    document.getElementById('loginBtn').disabled = true;
    document.getElementById('loginBtn').innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Masuk...';

    var { data, error } = await db.auth.signInWithPassword({ email: email, password: password });

    if (error) {
        showLoginError(error.message);
        document.getElementById('loginBtn').disabled = false;
        document.getElementById('loginBtn').innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Masuk';
        return;
    }

    document.getElementById('loginBtn').disabled = false;
    document.getElementById('loginBtn').innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Masuk';
}

async function handleLogout() {
    await db.auth.signOut();
}

document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && document.getElementById('loginScreen').style.display !== 'none') {
        handleLogin();
    }
});

// ============================================================
// DATABASE — PRODUCTS
// ============================================================
async function dbLoadProducts() {
    var { data, error } = await db.from('products').select('*').order('id');
    if (error) throw error;
    return data;
}

async function dbAddProduct(product) {
    var { data, error } = await db.from('products').insert([{
        name: product.name,
        price: product.price,
        stock: product.stock,
        category: product.category,
        emoji: product.emoji
    }]).select();
    if (error) throw error;
    return data[0];
}

async function dbUpdateProduct(product) {
    var { data, error } = await db.from('products').update({
        name: product.name,
        price: product.price,
        stock: product.stock,
        category: product.category,
        emoji: product.emoji
    }).eq('id', product.id).select();
    if (error) throw error;
    return data[0];
}

async function dbDeleteProduct(id) {
    var { error } = await db.from('products').delete().eq('id', id);
    if (error) throw error;
}

async function dbClearProducts() {
    var { error } = await db.from('products').delete().neq('id', 0);
    if (error) throw error;
}

async function dbSeedProducts() {
    var { error } = await db.from('products').insert(SEED_PRODUCTS);
    if (error) throw error;
}

// ============================================================
// DATABASE — TRANSACTIONS
// ============================================================
async function dbLoadTransactions() {
    var { data, error } = await db.from('transactions').select('*').order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    return data;
}

async function dbSaveTransaction(tx) {
    var { error } = await db.from('transactions').insert([{
        tx_id: tx.id,
        date: tx.date,
        items: tx.items,
        subtotal: tx.subtotal,
        discount: tx.discount,
        tax: tx.tax,
        total: tx.total,
        method: tx.method,
        cash: tx.cash,
        change_amount: tx.change,
        table_num: tx.table
    }]);
    if (error) throw error;
}

async function dbClearTransactions() {
    var { error } = await db.from('transactions').delete().neq('id', 0);
    if (error) throw error;
}

// ============================================================
// KATEGORI
// ============================================================
function getCategories() {
    var cats = {};
    products.forEach(function (p) { cats[p.category] = true; });
    return Object.keys(cats).sort();
}

function renderCategories() {
    var cats = ['Semua'].concat(getCategories());
    document.getElementById('categoryTabs').innerHTML = cats.map(function (c) {
        return '<div class="cat-tab ' + (c === selectedCategory ? 'active' : '') + '" onclick="selectCategory(\'' + c + '\')">' + c + '</div>';
    }).join('');
}

function selectCategory(cat) {
    selectedCategory = cat;
    renderCategories();
    filterProducts();
}

// ============================================================
// PRODUK DISPLAY
// ============================================================
function filterProducts() {
    var query = document.getElementById('searchInput').value.toLowerCase().trim();
    var filtered = products.filter(function (p) {
        return (selectedCategory === 'Semua' || p.category === selectedCategory) &&
               p.name.toLowerCase().indexOf(query) !== -1;
    });
    renderProducts(filtered);
}

function renderProducts(list) {
    var container = document.getElementById('productsContainer');
    if (!list.length) {
        container.innerHTML = '<div class="empty-cart" style="grid-column:1/-1;"><i class="fa-solid fa-box-open"></i><p class="text-sm">Produk tidak ditemukan</p></div>';
        return;
    }
    container.innerHTML = list.map(function (p, i) {
        var isOut = p.stock <= 0, isLow = p.stock > 0 && p.stock <= 10;
        var sc = isOut ? 'stock-out' : isLow ? 'stock-low' : 'stock-ok';
        var st = isOut ? 'Habis' : isLow ? 'Sisa ' + p.stock : 'Stok ' + p.stock;
        return '<div class="product-card ' + (isOut ? 'out-of-stock' : '') + ' animate-slide-in" style="animation-delay:' + (i * 30) + 'ms;" onclick="addToCart(' + p.id + ')"><div class="flex items-start justify-between mb-2"><span style="font-size:1.8rem;line-height:1;">' + p.emoji + '</span><span class="stock-badge ' + sc + '">' + st + '</span></div><p class="text-xs font-semibold mb-1 leading-tight" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">' + p.name + '</p><p class="font-mono text-sm font-bold" style="color:var(--accent);">' + formatRupiah(p.price) + '</p></div>';
    }).join('');
}

// ============================================================
// MEJA
// ============================================================
function renderTables() {
    var c = document.getElementById('tableSelector');
    var h = '<div class="table-num ' + (selectedTable === null ? 'active' : '') + '" onclick="selectTable(null)">-</div>';
    for (var i = 1; i <= 12; i++) h += '<div class="table-num ' + (selectedTable === i ? 'active' : '') + '" onclick="selectTable(' + i + ')">' + i + '</div>';
    c.innerHTML = h;
}

function selectTable(n) { selectedTable = n; renderTables(); }

// ============================================================
// KERANJANG
// ============================================================
function addToCart(pid) {
    var p = products.find(function (x) { return x.id === pid; });
    if (!p || p.stock <= 0) return;
    var ex = cart.find(function (x) { return x.id === pid; });
    if (ex) {
        if (ex.qty >= p.stock) { showToast('Stok ' + p.name + ' tidak cukup', 'warning'); return; }
        ex.qty++;
    } else {
        cart.push({ id: p.id, name: p.name, price: p.price, qty: 1, emoji: p.emoji });
    }
    showToast(p.emoji + ' ' + p.name + ' ditambahkan', 'success');
    renderCart(); updateSummary();
}

function updateQty(pid, delta) {
    var item = cart.find(function (x) { return x.id === pid; });
    if (!item) return;
    var p = products.find(function (x) { return x.id === pid; });
    if (delta > 0) {
        if (item.qty >= p.stock) { showToast('Stok tidak cukup', 'warning'); return; }
        item.qty++;
    } else {
        item.qty--;
        if (item.qty <= 0) cart = cart.filter(function (x) { return x.id !== pid; });
    }
    renderCart(); updateSummary();
}

function removeFromCart(pid) { cart = cart.filter(function (x) { return x.id !== pid; }); renderCart(); updateSummary(); }

function clearCart() {
    if (!cart.length) return;
    cart = []; selectedTable = null; renderTables(); renderCart(); updateSummary();
    showToast('Keranjang dikosongkan', 'error');
}

function renderCart() {
    var e = document.getElementById('emptyCart'), i = document.getElementById('cartItems'), b = document.getElementById('payBtn');
    if (!cart.length) { e.style.display = 'flex'; i.innerHTML = ''; b.disabled = true; return; }
    e.style.display = 'none'; b.disabled = false;
    i.innerHTML = cart.map(function (item) {
        var s = item.price * item.qty;
        return '<div class="cart-item flex items-center gap-3"><div class="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center" style="background:var(--card);font-size:1.2rem;">' + item.emoji + '</div><div class="flex-1 min-w-0"><p class="text-xs font-semibold truncate">' + item.name + '</p><p class="font-mono text-xs" style="color:var(--fg-muted);">' + formatRupiah(item.price) + '</p></div><div class="flex items-center gap-1.5"><div class="qty-btn danger" onclick="updateQty(' + item.id + ',-1)"><i class="fa-solid fa-minus" style="font-size:0.6rem;"></i></div><span class="font-mono text-xs font-semibold" style="width:24px;text-align:center;">' + item.qty + '</span><div class="qty-btn" onclick="updateQty(' + item.id + ',1)"><i class="fa-solid fa-plus" style="font-size:0.6rem;"></i></div></div><div class="text-right flex-shrink-0" style="min-width:80px;"><p class="font-mono text-xs font-bold">' + formatRupiah(s) + '</p></div><button class="cart-item-remove" onclick="removeFromCart(' + item.id + ')"><i class="fa-solid fa-xmark"></i></button></div>';
    }).join('');
}

// ============================================================
// RINGKASAN
// ============================================================
function getSubtotal() { return cart.reduce(function (s, i) { return s + i.price * i.qty; }, 0); }
function getTotal() {
    var sub = getSubtotal();
    var dp = Math.min(100, Math.max(0, parseFloat(document.getElementById('discountInput').value) || 0));
    var d = Math.round(sub * dp / 100);
    return sub - d + Math.round((sub - d) * TAX_RATE);
}
function updateSummary() {
    var sub = getSubtotal();
    var dp = Math.min(100, Math.max(0, parseFloat(document.getElementById('discountInput').value) || 0));
    var d = Math.round(sub * dp / 100), ad = sub - d, t = Math.round(ad * TAX_RATE);
    document.getElementById('subtotalValue').textContent = formatRupiah(sub);
    document.getElementById('discountValue').textContent = '- ' + formatRupiah(d);
    document.getElementById('taxValue').textContent = formatRupiah(t);
    document.getElementById('totalValue').textContent = formatRupiah(ad + t);
    document.getElementById('itemCount').textContent = cart.reduce(function (s, i) { return s + i.qty; }, 0);
}

// ============================================================
// PEMBAYARAN
// ============================================================
function openPayment() {
    if (!cart.length) return;
    var total = getTotal();
    document.getElementById('payTotalDisplay').textContent = formatRupiah(total);
    document.getElementById('cashInput').value = '';
    document.getElementById('changeSection').style.display = 'none';
    document.getElementById('changeWarning').style.display = 'none';
    selectedPayMethod = 'cash'; updatePayMethodUI(); renderQuickCash(total);
    document.getElementById('paymentModal').style.display = 'flex';
    document.getElementById('cashInput').focus();
}
function closePayment() { document.getElementById('paymentModal').style.display = 'none'; }
function selectPayMethod(m) {
    selectedPayMethod = m;
    updatePayMethodUI();
    // Tunai perlu input uang, lainnya tidak
    var showCash = m === 'cash';
    document.getElementById('cashSection').style.display = showCash ? 'block' : 'none';
    if (showCash) document.getElementById('cashInput').focus();
}
function updatePayMethodUI() {
    document.querySelectorAll('.pay-method').forEach(function (el) { el.classList.toggle('selected', el.dataset.method === selectedPayMethod); });
}
function renderQuickCash(total) {
    var denoms = [50000, 100000, 200000, 500000];
    var a = [total].concat(denoms.filter(function (d) { return d >= total; }).sort(function (a, b) { return a - b; }));
    var u = []; a.forEach(function (v) { if (u.indexOf(v) === -1) u.push(v); });
    while (u.length < 4) u.push((u[u.length - 1] || 0) + 50000);
    document.getElementById('quickCash').innerHTML = u.slice(0, 4).map(function (v) {
        return '<button class="btn-outline font-mono text-xs" onclick="setQuickCash(' + v + ')" style="padding:8px;">' + formatRupiah(v) + '</button>';
    }).join('');
}
function setQuickCash(v) { document.getElementById('cashInput').value = v; calcChange(); }
function calcChange() {
    var t = getTotal(), c = parseInt(document.getElementById('cashInput').value) || 0, ch = c - t;
    if (c > 0 && ch >= 0) {
        document.getElementById('changeSection').style.display = 'block';
        document.getElementById('changeWarning').style.display = 'none';
        document.getElementById('changeValue').textContent = formatRupiah(ch);
    } else if (c > 0 && ch < 0) {
        document.getElementById('changeSection').style.display = 'none';
        document.getElementById('changeWarning').style.display = 'block';
    } else {
        document.getElementById('changeSection').style.display = 'none';
        document.getElementById('changeWarning').style.display = 'none';
    }
}

// ============================================================
// PROSES PEMBAYARAN
// ============================================================
async function processPayment() {
    var total = getTotal();

    // === TUNAI ===
    if (selectedPayMethod === 'cash') {
        var cash = parseInt(document.getElementById('cashInput').value) || 0;
        if (cash < total) {
            document.getElementById('changeWarning').style.display = 'block';
            var inp = document.getElementById('cashInput');
            inp.classList.add('animate-shake');
            setTimeout(function () { inp.classList.remove('animate-shake'); }, 400);
            return;
        }
        await finalizeTransaction('cash', cash);
        return;
    }

    // === MIDTRANS ===
    if (selectedPayMethod === 'midtrans') {
        await processMidtrans(total);
        return;
    }

    // === KARTU / E-WALLET (manual) ===
    await finalizeTransaction(selectedPayMethod, total);
}

// ============================================================
// MIDTRANS FLOW
// ============================================================
async function loadMidtransSnap() {
    if (midtransSnapLoaded && window.snap) return true;

    return new Promise(function (resolve, reject) {
        var url = midtransIsProduction
            ? 'https://app.midtrans.com/snap/snap.js'
            : 'https://app.sandbox.midtrans.com/snap/snap.js';

        var script = document.createElement('script');
        script.src = url;
        script.onload = function () { midtransSnapLoaded = true; resolve(true); };
        script.onerror = function () { reject(new Error('Gagal memuat Midtrans Snap')); };
        document.head.appendChild(script);
    });
}

async function processMidtrans(total) {
    var btn = document.getElementById('confirmPayBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...';

    try {
        await loadMidtransSnap();

        var orderId = 'TX' + Date.now().toString(36).toUpperCase();

        // Hitung rincian
        var sub = getSubtotal();
        var dp = Math.min(100, Math.max(0, parseFloat(document.getElementById('discountInput').value) || 0));
        var disc = Math.round(sub * dp / 100);
        var ad = sub - disc;
        var tax = Math.round(ad * TAX_RATE);

        var response = await fetch('/api/midtrans', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orderId: orderId,
                amount: total,
                subtotal: sub,
                discount: disc,
                tax: tax,
                items: cart.map(function (i) {
                    return { id: i.id, name: i.name, price: i.price, qty: i.qty };
                })
            })
        });

        var data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Gagal membuat token');
        }

        if (!data.token) {
            throw new Error('Token kosong');
        }

        closePayment();

        window.snap.pay(data.token, {
            onSuccess: function (result) {
                finalizeTransaction('midtrans', total, orderId, result);
            },
            onPending: function (result) {
                showToast('Menunggu pembayaran', 'warning');
            },
            onError: function (result) {
                showToast('Pembayaran gagal', 'error');
            },
            onClose: function () {}
        });

    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-check-circle"></i> Konfirmasi Pembayaran';
    }
}

// ============================================================
// FINALIZE TRANSACTION (Dipakai semua metode)
// ============================================================
async function finalizeTransaction(method, cashPaid, externalOrderId, midtransResult) {
    // Kurangi stok
    for (var i = 0; i < cart.length; i++) {
        var item = cart[i];
        var product = products.find(function (p) { return p.id === item.id; });
        if (product) {
            product.stock -= item.qty;
            await dbUpdateProduct(product);
        }
    }

    var sub = getSubtotal();
    var dp = Math.min(100, Math.max(0, parseFloat(document.getElementById('discountInput').value) || 0));
    var disc = Math.round(sub * dp / 100);
    var ad = sub - disc;
    var tax = Math.round(ad * TAX_RATE);
    var total = ad + tax;

    var tx = {
        id: externalOrderId || ('TX' + Date.now().toString(36).toUpperCase()),
        date: new Date().toLocaleString('id-ID'),
        items: cart.map(function (x) {
            return { id: x.id, name: x.name, price: x.price, qty: x.qty, emoji: x.emoji };
        }),
        subtotal: sub,
        discount: disc,
        tax: tax,
        total: total,
        method: method,
        cash: cashPaid,
        change: method === 'cash' ? (cashPaid - total) : 0,
        table: selectedTable
    };

    await dbSaveTransaction(tx);
    transactions.unshift(tx);

    // Reset state
    closePayment();
    showReceipt(tx);

    cart = [];
    selectedTable = null;
    document.getElementById('discountInput').value = 0;
    renderTables();
    renderCart();
    updateSummary();
    filterProducts();
    document.getElementById('txCount').textContent = transactions.length;
}

// ============================================================
// STRUK
// ============================================================
function showReceipt(tx) {
    var ml = { cash: 'Tunai', card: 'Kartu Debit/Kredit', ewallet: 'E-Wallet', midtrans: 'Midtrans' };
    var ih = tx.items.map(function (i) { return '<div class="flex justify-between"><span>' + i.qty + 'x ' + i.name + '</span><span>' + formatRupiah(i.price * i.qty) + '</span></div>'; }).join('');
    var dr = tx.discount > 0 ? '<div class="flex justify-between" style="color:#cc0000;"><span>Diskon</span><span>- ' + formatRupiah(tx.discount) + '</span></div>' : '';
    var cr = tx.method === 'cash' ? '<div class="flex justify-between" style="font-weight:600;"><span>Kembalian</span><span>' + formatRupiah(tx.change) + '</span></div>' : '';
    document.getElementById('receiptContent').innerHTML = '<div class="receipt" id="receiptPrint"><div class="text-center mb-3"><p style="font-size:1rem;font-weight:700;font-family:\'Space Grotesk\',sans-serif;">KASIR POS</p><p style="font-size:0.65rem;color:#666;">Jl. Contoh No. 123, Jakarta</p><p style="font-size:0.65rem;color:#666;">Telp: (021) 1234-5678</p></div><hr class="divider"><div style="font-size:0.65rem;color:#666;"><div class="flex justify-between"><span>No</span><span>' + tx.id + '</span></div><div class="flex justify-between"><span>Tanggal</span><span>' + tx.date + '</span></div><div class="flex justify-between"><span>Meja</span><span>' + (tx.table || '-') + '</span></div></div><hr class="divider"><div style="font-size:0.7rem;line-height:1.8;">' + ih + '</div><hr class="divider"><div style="font-size:0.7rem;"><div class="flex justify-between"><span>Subtotal</span><span>' + formatRupiah(tx.subtotal) + '</span></div>' + dr + '<div class="flex justify-between"><span>Pajak (11%)</span><span>' + formatRupiah(tx.tax) + '</span></div></div><hr class="divider"><div class="flex justify-between" style="font-size:0.9rem;font-weight:700;"><span>TOTAL</span><span>' + formatRupiah(tx.total) + '</span></div><hr class="divider"><div style="font-size:0.7rem;"><div class="flex justify-between"><span>Bayar (' + ml[tx.method] + ')</span><span>' + formatRupiah(tx.cash) + '</span></div>' + cr + '</div><hr class="divider"><div class="text-center" style="font-size:0.65rem;color:#888;margin-top:8px;"><p>Terima kasih atas kunjungan Anda!</p></div></div>';
    document.getElementById('receiptModal').style.display = 'flex';
}
function closeReceipt() { document.getElementById('receiptModal').style.display = 'none'; }
function printReceipt() { window.print(); }

// ============================================================
// RIWAYAT
// ============================================================
async function openHistory() {
    var c = document.getElementById('historyContent');
    transactions = await dbLoadTransactions();
    document.getElementById('txCount').textContent = transactions.length;
    if (!transactions.length) {
        c.innerHTML = '<div class="empty-cart" style="padding:48px 0;"><i class="fa-solid fa-receipt"></i><p class="text-sm">Belum ada transaksi</p></div>';
    } else {
        var ml = { cash: 'Tunai', card: 'Kartu', ewallet: 'E-Wallet', midtrans: 'Midtrans' };
        var mi = { cash: 'fa-money-bill-wave', card: 'fa-credit-card', ewallet: 'fa-mobile-screen-button', midtrans: 'fa-qrcode' };
        var mc = { cash: 'var(--accent)', card: 'var(--warning)', ewallet: '#a78bfa', midtrans: '#4ade80' };
        c.innerHTML = '<div class="flex items-center justify-between mb-4"><p class="text-xs" style="color:var(--fg-muted);">' + transactions.length + ' transaksi</p><button onclick="clearHistory()" class="btn-danger-sm">Hapus Semua</button></div><div class="flex flex-col" style="max-height:60vh;overflow-y:auto;">' + transactions.map(function (tx) {
            return '<div class="history-item"><div class="history-item-header"><div class="flex items-center gap-2"><span class="history-item-id">' + tx.tx_id + '</span><span class="history-item-tag">Meja ' + (tx.table_num || '-') + '</span></div><div class="flex items-center gap-1.5"><i class="fa-solid ' + mi[tx.method] + '" style="color:' + mc[tx.method] + ';font-size:0.7rem;"></i><span class="text-xs" style="color:var(--fg-muted);">' + ml[tx.method] + '</span></div></div><div class="history-item-tags">' + (tx.items || []).map(function (i) { return '<span class="history-item-tag">' + i.emoji + ' ' + i.qty + 'x</span>'; }).join('') + '</div><div class="history-item-footer"><span class="text-xs" style="color:var(--fg-muted);">' + tx.date + '</span><span class="font-mono text-sm font-bold" style="color:var(--accent);">' + formatRupiah(tx.total) + '</span></div></div>';
        }).join('') + '</div>';
    }
    document.getElementById('historyModal').style.display = 'flex';
}
function closeHistory() { document.getElementById('historyModal').style.display = 'none'; }
async function clearHistory() {
    await dbClearTransactions();
    transactions = [];
    document.getElementById('txCount').textContent = '0';
    openHistory();
    showToast('Riwayat transaksi dihapus', 'error');
}

// ============================================================
// CRUD — KELOLA PRODUK
// ============================================================
function openProductManager() {
    document.getElementById('crudSearch').value = '';
    document.getElementById('crudCatFilter').value = 'Semua';
    populateCrudCatFilter();
    renderProductTable();
    document.getElementById('productModal').style.display = 'flex';
}
function closeProductManager() {
    document.getElementById('productModal').style.display = 'none';
    hideProductForm();
    filterProducts();
}
function populateCrudCatFilter() {
    var cats = getCategories(), sel = document.getElementById('crudCatFilter'), cur = sel.value;
    sel.innerHTML = '<option value="Semua">Semua Kategori</option>' + cats.map(function (c) { return '<option value="' + c + '">' + c + '</option>'; }).join('');
    sel.value = cur;
}
function renderProductTable() {
    var q = document.getElementById('crudSearch').value.toLowerCase().trim();
    var cf = document.getElementById('crudCatFilter').value;
    var f = products.filter(function (p) {
        return (cf === 'Semua' || p.category === cf) && p.name.toLowerCase().indexOf(q) !== -1;
    });
    var tb = document.getElementById('crudTableBody'), em = document.getElementById('crudEmpty'), tl = document.querySelector('.crud-table');
    document.getElementById('crudProductCount').textContent = f.length + ' dari ' + products.length + ' produk';
    if (!f.length) { tl.style.display = 'none'; em.style.display = 'flex'; return; }
    tl.style.display = 'table'; em.style.display = 'none';
    tb.innerHTML = f.map(function (p) {
        var sc = p.stock <= 0 ? 'var(--danger)' : p.stock <= 10 ? 'var(--warning)' : 'var(--accent)';
        return '<tr><td class="emoji-cell">' + p.emoji + '</td><td class="name-cell">' + p.name + '</td><td class="cat-cell">' + p.category + '</td><td class="price-cell">' + formatRupiah(p.price) + '</td><td class="stock-cell" style="color:' + sc + ';">' + p.stock + '</td><td><div class="actions-cell"><button class="crud-action-btn edit" onclick="editProduct(' + p.id + ')" title="Edit"><i class="fa-solid fa-pen"></i></button><button class="crud-action-btn delete" onclick="requestDelete(' + p.id + ')" title="Hapus"><i class="fa-solid fa-trash-can"></i></button></div></td></tr>';
    }).join('');
}

// ============================================================
// FORM TAMBAH / EDIT
// ============================================================
function editProduct(id) {
    showProductForm(id);
}

function showProductForm(pid) {
    editingProductId = pid || null;
    document.getElementById('emojiGrid').innerHTML = EMOJI_OPTIONS.map(function (e) { return '<button type="button" class="emoji-option" onclick="pickEmoji(\'' + e + '\')">' + e + '</button>'; }).join('');
    var cats = getCategories();
    document.getElementById('formCatButtons').innerHTML = cats.map(function (c) { return '<button type="button" class="form-cat-btn" data-cat="' + c + '" onclick="pickFormCategory(\'' + c + '\')">' + c + '</button>'; }).join('') + '<button type="button" class="form-cat-custom-btn" data-cat="__custom__" onclick="pickFormCategory(\'__custom__\')">+ Lainnya</button>';

    if (editingProductId) {
        var p = products.find(function (x) { return x.id === editingProductId; });
        if (!p) return;
        document.getElementById('formTitle').textContent = 'Edit Produk';
        selectedFormEmoji = p.emoji; selectedFormCategory = p.category;
        document.getElementById('formName').value = p.name;
        document.getElementById('formPrice').value = p.price;
        document.getElementById('formStock').value = p.stock;
    } else {
        document.getElementById('formTitle').textContent = 'Tambah Produk';
        selectedFormEmoji = '🍛'; selectedFormCategory = cats.length ? cats[0] : 'Makanan';
        document.getElementById('formName').value = '';
        document.getElementById('formPrice').value = '';
        document.getElementById('formStock').value = '';
    }
    updateFormCategoryUI();
    document.getElementById('selectedEmoji').textContent = selectedFormEmoji;
    document.querySelectorAll('.emoji-option').forEach(function (el) { el.classList.toggle('selected', el.textContent.trim() === selectedFormEmoji); });
    document.getElementById('productFormPanel').style.display = 'block';
    document.getElementById('formName').focus();
}
function hideProductForm() { document.getElementById('productFormPanel').style.display = 'none'; editingProductId = null; }
function pickEmoji(e) { selectedFormEmoji = e; document.getElementById('selectedEmoji').textContent = e; document.querySelectorAll('.emoji-option').forEach(function (el) { el.classList.toggle('selected', el.textContent.trim() === e); }); }
function pickFormCategory(c) { selectedFormCategory = c; updateFormCategoryUI(); }
function updateFormCategoryUI() {
    document.querySelectorAll('.form-cat-btn, .form-cat-custom-btn').forEach(function (el) { el.classList.toggle('active', el.dataset.cat === selectedFormCategory); });
    var ci = document.getElementById('formCustomCat');
    if (selectedFormCategory === '__custom__') { ci.style.display = 'block'; ci.focus(); } else { ci.style.display = 'none'; ci.value = ''; }
}

async function saveProduct() {
    var name = document.getElementById('formName').value.trim();
    var price = parseInt(document.getElementById('formPrice').value) || 0;
    var stock = parseInt(document.getElementById('formStock').value) || 0;
    var cat = selectedFormCategory;
    if (cat === '__custom__') { cat = document.getElementById('formCustomCat').value.trim(); if (!cat) { showToast('Kategori harus diisi', 'warning'); return; } }
    if (!name) { showToast('Nama produk harus diisi', 'warning'); return; }
    if (price <= 0) { showToast('Harga harus lebih dari 0', 'warning'); return; }
    if (stock < 0) { showToast('Stok tidak boleh negatif', 'warning'); return; }

    try {
        if (editingProductId) {
            var p = products.find(function (x) { return x.id === editingProductId; });
            if (!p) return;
            p.name = name; p.price = price; p.stock = stock; p.category = cat; p.emoji = selectedFormEmoji;
            await dbUpdateProduct(p);
            var ci = cart.find(function (x) { return x.id === editingProductId; });
            if (ci) { ci.name = name; ci.price = price; ci.emoji = selectedFormEmoji; renderCart(); updateSummary(); }
            showToast(name + ' berhasil diperbarui', 'success');
        } else {
            var np = await dbAddProduct({ name: name, price: price, stock: stock, category: cat, emoji: selectedFormEmoji });
            products.push(np);
            showToast(name + ' berhasil ditambahkan', 'success');
        }
        hideProductForm(); populateCrudCatFilter(); renderProductTable();
    } catch (err) { showToast('Gagal menyimpan: ' + err.message, 'error'); }
}

// ============================================================
// HAPUS PRODUK
// ============================================================
function requestDelete(id) {
    deleteTargetId = id;
    var p = products.find(function (x) { return x.id === id; });
    if (!p) return;
    document.getElementById('deleteProductName').textContent = p.emoji + ' ' + p.name;
    document.getElementById('deleteConfirmModal').style.display = 'flex';
}
function closeDeleteConfirm() { document.getElementById('deleteConfirmModal').style.display = 'none'; deleteTargetId = null; }
async function confirmDelete() {
    if (!deleteTargetId) return;
    var p = products.find(function (x) { return x.id === deleteTargetId; });
    var name = p ? p.name : '';
    try {
        await dbDeleteProduct(deleteTargetId);
        products = products.filter(function (x) { return x.id !== deleteTargetId; });
        cart = cart.filter(function (x) { return x.id !== deleteTargetId; });
        renderCart(); updateSummary(); renderProductTable(); populateCrudCatFilter();
        showToast(name + ' dihapus', 'error');
    } catch (err) { showToast('Gagal menghapus: ' + err.message, 'error'); }
    closeDeleteConfirm();
}

// ============================================================
// RESET DATABASE
// ============================================================
async function resetDatabase() {
    try {
        await dbClearProducts();
        await dbSeedProducts();
        products = await dbLoadProducts();
        cart = []; renderCart(); updateSummary(); populateCrudCatFilter(); renderProductTable(); renderCategories();
        showToast('Database direset ke default', 'success');
    } catch (err) { showToast('Gagal reset: ' + err.message, 'error'); }
}

// ============================================================
// TOAST
// ============================================================
function showToast(msg, type) {
    type = type || 'success';
    var icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation' };
    var t = document.createElement('div');
    t.className = 'toast ' + type;
    t.innerHTML = '<i class="fa-solid ' + icons[type] + '"></i> ' + msg;
    document.getElementById('toastContainer').appendChild(t);
    setTimeout(function () { t.style.transition = 'opacity 0.3s, transform 0.3s'; t.style.opacity = '0'; t.style.transform = 'translateX(20px)'; setTimeout(function () { t.remove(); }, 300); }, 2000);
}

// ============================================================
// KEYBOARD
// ============================================================
document.addEventListener('keydown', function (e) {
    if (e.key === 'F2' && cart.length > 0) { e.preventDefault(); openPayment(); }
    if (e.key === 'F4') { e.preventDefault(); document.getElementById('searchInput').focus(); }
    if (e.key === 'F3') { e.preventDefault(); openProductManager(); }
    if (e.key === 'Escape') { closePayment(); closeReceipt(); closeHistory(); closeProductManager(); closeDeleteConfirm(); }
});

// ============================================================
// INIT
// ============================================================
async function init() {
    try {
        var ok = await initSupabase();
        if (!ok) {
            showScreen('configErrorScreen');
            return;
        }
    } catch (e) {
        showScreen('configErrorScreen');
        return;
    }

    // Cek sesi login
    var { data: { session } } = await db.auth.getSession();

    if (!session) {
        showScreen('loginScreen');
        db.auth.onAuthStateChange(function (event, session) {
            if (event === 'SIGNED_IN') startApp();
            if (event === 'SIGNED_OUT') {
                showScreen('loginScreen');
                products = []; cart = []; transactions = [];
            }
        });
        return;
    }

    await startApp();
}

async function startApp() {
    try {
        products = await dbLoadProducts();

        // Auto-seed jika tabel kosong
        if (!products.length) {
            await dbSeedProducts();
            products = await dbLoadProducts();
        }

        transactions = await dbLoadTransactions();
        document.getElementById('txCount').textContent = transactions.length;
        renderCategories(); filterProducts(); renderTables(); renderCart(); updateSummary();
        showScreen('appContainer');
    } catch (err) {
        console.error('Start error:', err);
        showToast('Gagal memuat data: ' + err.message, 'error');
    }
}

init();