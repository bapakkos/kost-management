import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import qrcode from 'qrcode-terminal';
import QRCode from 'qrcode';
import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  Browsers,
} from '@whiskeysockets/baileys';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============ CONFIG (edit bagian ini) ============
const CONFIG = {
  // Kosongkan dulu, lalu lihat terminal saat program jalan.
  // Bot akan mencetak daftar grup -> salin JID-nya ke sini.
  GROUP_JID: '120363411736958918@g.us',
  PORT: 3000,
  AUTH_DIR: path.join(__dirname, 'auth'),
  MESSAGES_FILE: path.join(__dirname, 'messages.json'),
};
// =================================================

let sock = null;
let status = 'starting';
let currentQR = '';
let messages = [];

if (fs.existsSync(CONFIG.MESSAGES_FILE)) {
  try {
    const raw = JSON.parse(fs.readFileSync(CONFIG.MESSAGES_FILE, 'utf8'));
    if (Array.isArray(raw)) messages = raw;
  } catch {}
}

function saveMessages() {
  try {
    fs.writeFileSync(CONFIG.MESSAGES_FILE, JSON.stringify(messages, null, 2));
  } catch (e) {
    console.error('Gagal menyimpan pesan:', e.message);
  }
}

function addMessage(m) {
  messages.push(m);
  if (messages.length > 500) messages = messages.slice(-500);
  saveMessages();
}

async function listGroups() {
  try {
    const groups = await sock.groupFetchAllParticipating();
    const list = Object.entries(groups);
    console.log('\n=== Grup yang terdeteksi ===');
    if (list.length === 0) {
      console.log('(belum ada grup - pastikan nomor bot sudah masuk ke grup kost)');
    }
    for (const [jid, info] of list) {
      console.log(`  ${info.subject || '(tanpa nama)'}  ->  ${jid}`);
    }
    console.log('Salin JID grup kost ke CONFIG.GROUP_JID di index.js, lalu restart program.\n');
  } catch (e) {
    console.error('Gagal mengambil daftar grup:', e.message);
  }
}

function extractText(msg) {
  return (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    ''
  );
}

async function handleMessages({ messages: msgs, type }) {
  if (type !== 'notify') return;
  for (const msg of msgs) {
    const jid = msg.key.remoteJid || '';
    if (jid === 'status@broadcast') continue;
    if (CONFIG.GROUP_JID && jid !== CONFIG.GROUP_JID) continue;

    const text = extractText(msg);
    if (!text) continue;

    const sender = msg.key.participant || msg.pushName || '';
    const waktu = msg.messageTimestamp
      ? new Date(msg.messageTimestamp * 1000).toLocaleString('id-ID')
      : new Date().toLocaleString('id-ID');

    addMessage({ waktu, jid, pengirim: sender, teks: text });
    console.log(`[${waktu}] ${sender} (${jid}): ${text}`);
  }
}

async function connectToWhatsApp() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(CONFIG.AUTH_DIR);

    let version;
    try {
      version = (await fetchLatestBaileysVersion()).version;
    } catch {}

    sock = makeWASocket({
      version,
      auth: state,
      browser: Browsers.macOS('Chrome'),
      markOnlineOnConnect: false,
      syncFullHistory: false,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        status = 'menunggu_scan';
        currentQR = qr;
        console.log('\nScan QR di bawah ini dengan WhatsApp (nomor baru):');
        qrcode.generate(qr, { small: true });
        console.log('\n(QR juga tampil di halaman web: http://localhost:' + CONFIG.PORT + ')');
      }
      if (connection === 'open') {
        status = 'connected';
        currentQR = '';
        console.log('\n=== Terhubung ke WhatsApp ===');
        listGroups();
      }
      if (connection === 'close') {
        status = 'disconnected';
        const code = lastDisconnect?.error?.output?.statusCode;
        console.log('Koneksi terputus, kode:', code);
        if (code !== DisconnectReason.loggedOut) {
          setTimeout(connectToWhatsApp, 5000);
        } else {
          console.log('Session logout. Hapus folder "auth" lalu jalankan ulang untuk scan ulang.');
        }
      }
    });

    sock.ev.on('messages.upsert', handleMessages);
  } catch (e) {
    console.error('Gagal koneksi:', e.message);
    status = 'error';
  }
}

// ============ Server web ============
const app = express();
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/messages', (req, res) => {
  res.json(messages);
});

app.get('/api/status', (req, res) => {
  res.json({ status });
});

app.get('/api/qr', async (req, res) => {
  if (!currentQR) return res.json({ qr: null });
  try {
    const dataUrl = await QRCode.toDataURL(currentQR, { margin: 1, width: 400 });
    res.json({ qr: dataUrl });
  } catch (e) {
    res.json({ qr: null });
  }
});

app.listen(CONFIG.PORT, () => {
  console.log(`Website intranet: http://localhost:${CONFIG.PORT}`);
});

connectToWhatsApp();
