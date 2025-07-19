const WebSocket = require('ws')
const http = require('http')
const fs = require('fs')
const path = require('path')
const express = require('express')
const serveIndex = require('serve-index')
const multer = require('multer')
const getIpv4 = require('./utils/ipv4')
const bytesToMB = require('./utils/converter')
const { v4: uuidv4 } = require('uuid')

const app = express()
const PORT = 3000

let storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './contents')
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  },
})

const upload = multer({
  storage: storage,
})

app.use('/contents', express.static('contents'))
app.use('/contents', serveIndex('contents', { icons: true }))

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/index.html'))
})

app.get('/chat', (req, res) => {
  const wsUrl = `ws://${getIpv4()}:${PORT}`

  fs.readFile(path.join(__dirname, '/chat.html'), 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading chat.html:', err)
      return res.status(500).send('Error loading chat page.')
    }

    const modifiedHtml = data.replace(
      '<!-- WS_URL_INJECTION_POINT -->',
      `<script>window.CHAT_WS_URL = '${wsUrl}';</script>`
    )

    res.send(modifiedHtml)
  })
})

app.post('/upload', upload.single('file'), (req, res) => {
  console.log(
    `[${new Date().toISOString()}] File uploaded: ${
      req.file.originalname
    } (${bytesToMB(req.file.size)} MB)`
  )
  res.sendFile(path.join(__dirname, '/upload_success.html'))
})

const server = http.createServer(app)

const wss = new WebSocket.Server({ server })

wss.on('connection', (ws) => {
  ws.clientId = uuidv4()
  const connectTime = new Date().toISOString()
  console.log(`[${connectTime}] Client connected: ${ws.clientId}`)

  ws.send(JSON.stringify({ type: 'init', clientId: ws.clientId }))

  const joinMessage = {
    type: 'join',
    clientId: ws.clientId,
    timestamp: new Date().toISOString(),
  }
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(joinMessage))
    }
  })

  ws.on('message', (message) => {
    const messageString = message.toString()
    const messageTimestamp = new Date().toISOString()
    console.log(
      `[${messageTimestamp}] Message from ${ws.clientId}: "${messageString}"`
    )

    const messageData = {
      type: 'chat',
      senderId: ws.clientId,
      text: messageString,
      timestamp: messageTimestamp,
    }

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(messageData))
      }
    })
  })

  ws.on('close', () => {
    const disconnectTime = new Date().toISOString()
    console.log(`[${disconnectTime}] Client disconnected: ${ws.clientId}`)
  })

  ws.on('error', (error) => {
    const errorTime = new Date().toISOString()
    console.error(
      `[${errorTime}] WebSocket error for client ${ws.clientId}:`,
      error.message
    )
  })
})

server.listen(PORT, () => {
  console.log(`💐 HTTP server running on http://${getIpv4()}:${PORT}/`)
  console.log(`💬 WebSocket server running on ws://${getIpv4()}:${PORT}`)
})
