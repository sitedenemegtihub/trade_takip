const express = require('express');
const cors = require('cors');
const axios = require('axios');
const Parser = require('rss-parser');
const basicAuth = require('express-basic-auth');

const app = express();
const parser = new Parser();
const PORT = process.env.PORT || 3000;

// --- BURAYI DOLDUR ---
// JSONBin.io'dan aldığın kodları buraya yapıştır:
const BIN_ID = '692ca7a4d0ea881f400a0f47'; 
const API_KEY = '$2a$10$036RVufNI59CMhql9i.pY.c1jWKtek33fkUnW2LEO2t00uyz7L6dC';
// ---------------------

// ŞİFRELER
const USERS = {
    'admin': 'admin1907',
    'meryem': 'meryem123'
};

app.use(basicAuth({ users: USERS, challenge: true }));
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// --- JSONBIN ENTEGRASYONU ---
// Verileri Buluttan Oku
async function readDB() {
    try {
        const res = await axios.get(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
            headers: { 'X-Master-Key': API_KEY }
        });
        return res.data.record; // Veriyi döndür
    } catch (e) {
        console.error("Veri okunamadı:", e.message);
        return [];
    }
}

// Verileri Buluta Yaz
async function writeDB(data) {
    try {
        await axios.put(`https://api.jsonbin.io/v3/b/${BIN_ID}`, data, {
            headers: { 
                'X-Master-Key': API_KEY,
                'Content-Type': 'application/json'
            }
        });
    } catch (e) {
        console.error("Veri yazılamadı:", e.message);
    }
}

// --- FİYATLAR & HABERLER (Aynı) ---
const SYMBOLS = { gold: 'GC=F', dolar: 'TRY=X', bitcoin: 'BTC-USD', euro: 'EURTRY=X', brent: 'BZ=F' };
const HEADERS = { 'User-Agent': 'Mozilla/5.0' };

app.get('/api/prices', async (req, res) => {
    const results = [];
    for (const [key, symbol] of Object.entries(SYMBOLS)) {
        try {
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
            const r = await axios.get(url, { headers: HEADERS });
            const meta = r.data.chart.result[0].meta;
            results.push({ id: symbol, price: meta.regularMarketPrice, change: ((meta.regularMarketPrice - meta.chartPreviousClose)/meta.chartPreviousClose)*100 });
        } catch (e) { results.push({ id: symbol, price: 0, change: 0 }); }
    }
    res.json(results);
});

// --- TRADE API (Artık Buluta Yazıyor) ---
app.get('/api/trades', async (req, res) => {
    const trades = await readDB();
    res.json(trades);
});

app.post('/api/trades', async (req, res) => {
    const trades = await readDB();
    trades.push(req.body);
    await writeDB(trades);
    res.json({ success: true });
});

app.post('/api/trades/delete', async (req, res) => {
    const { index } = req.body;
    let trades = await readDB();
    if(index > -1) trades.splice(index, 1);
    await writeDB(trades);
    res.json({ success: true });
});

app.listen(PORT, () => { console.log("Sunucu Hazır"); });