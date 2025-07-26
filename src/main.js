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
  limits: {
    fileSize: 4000 * 1024 * 1024,
  },
})

app.use('/contents', express.static('contents'))
app.use('/contents', serveIndex('contents', { icons: true }))

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/index.html'))
})

app.get('/success', (req, res) => {
  res.sendFile(path.join(__dirname, '/upload_success.html'))
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

app.post('/upload', (req, res, next) => {
  upload.single('file')(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        console.error(
          `[${new Date().toISOString()}] Upload error: File too large. Max size: ${bytesToMB(
            upload.limits.fileSize
          )} MB.`
        )
        return res
          .status(413)
          .send(
            `File too large. Maximum size is ${bytesToMB(
              upload.limits.fileSize
            )} MB.`
          )
      }
      console.error(`[${new Date().toISOString()}] Multer error:`, err)
      return res.status(500).send('File upload failed: ' + err.message)
    } else if (err) {
      console.error(`[${new Date().toISOString()}] Unknown upload error:`, err)
      return res.status(500).send('File upload failed: ' + err.message)
    }
    console.log(
      `[${new Date().toISOString()}] File uploaded: ${
        req.file.originalname
      } (${bytesToMB(req.file.size)} MB)`
    )
    res.status(200).send('File upload successfully')
  })
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
  console.log(`
   /\\    LANGLYPH
  /__\\   [local-net invocation]
  `)
  console.log('\n')
  console.log('The room is wired for ritual.')
  console.log('\n')
  console.log(`💐 HTTP server running on  http://${getIpv4()}:${PORT}/`)
  console.log(`💬 Chat running on         http://${getIpv4()}:${PORT}/chat`)
  console.log('\n')
})
