const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const express = require('express');
const multer = require('multer');
const moment = require('moment-timezone');
let chat = ''

// Start WhatsApp client

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { args: ['--no-sandbox'] }
});

client.initialize();

client.on('loading_screen', (percent, message) => {
  console.log('Carregando', percent, message);
});

client.on('authenticated', () => {
  console.log('Autenticado');
});

client.on('auth_failure', msg => {
  console.error('Falha na autenticacao', msg);
});

client.on('ready', async () => {
  console.log('Cliente iniciado e pronto para uso!');

  let chats = await client.getChats();
  chat = chats.find((chat) => chat.name === "Monitoramento VillaNet");
});

// control routes

const app = express();
const port = 4002;

// post /api/message send just text


app.post('/api/message', (req, res) => {
  const { number, message } = req.body;

  const isGroup = (number) => {
    return number.toString().startsWith('55') && number.toString().length === 12;
  };

  const getCurrentTime = () => {
    return moment().tz('America/Sao_Paulo').format('YYYY-MM-DD HH:mm:ss');
  };

  try {
    client.sendMessage(chat.id._serialized, message);
    console.log(getCurrentTime(), '- Mensagem enviada com sucesso para:', chat.id._serialized);

    res.json({ message: 'Mensagem enviada com sucesso' });
  } catch (error) {
    console.error(getCurrentTime(), '- Erro ao enviar mensagem para:', number);
    console.error('Erro:', error);

    res.status(500).json({ error: 'Erro ao enviar mensagem' });
  }
});

// send image and text using route /api/download

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDirectory = req.body.destination || 'uploads/'; // Diretório padrão é 'uploads/'
    cb(null, uploadDirectory);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

app.post('/api/download', upload.single('file'), async (req, res) => {

  const getCurrentTime = () => {
    return moment().tz('America/Sao_Paulo').format('YYYY-MM-DD HH:mm:ss');
  };

  try {
    const { number, filepath, caption, destination } = req.body;
    const uploadDirectory = destination || 'uploads/bee';
    const media = await MessageMedia.fromFilePath(`${uploadDirectory}${filepath}`);

    const isGroup = (number) => {
      return number.toString().startsWith('55') && number.toString().length === 12;
    };
    await client.sendMessage(chat.id._serialized, media, { caption: `${caption}` });

    console.log(getCurrentTime(), '- Arquivo enviado com sucesso para:', number);
    res.json({ message: 'Arquivo enviado com sucesso para: ' + `${chat.subject}` });

  } catch (error) {
    console.error(getCurrentTime(), '- Erro ao enviar o arquivo:', error);
    res.status(500).send('Erro ao enviar o arquivo');
  }
});

app.listen(port, () => {
  console.log(`Servidor está rodando na porta ${port}`);
});