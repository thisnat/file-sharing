const WebSocket = require('ws')
const http = require('http')
const fs = require('fs')
const path = require('path')
const express = require('express')
const serveIndex = require('serve-index')
const multer = require('multer')
const getIpv4 = require('./utils/ipv4')

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
    // Inject a script tag that sets a global variable with the WebSocket URL
    const modifiedHtml = data.replace(
      '<!-- WS_URL_INJECTION_POINT -->',
      `<script>window.CHAT_WS_URL = '${wsUrl}';</script>`
    )

    res.send(modifiedHtml)
  })
})

app.post('/upload', upload.single('file'), (req, res) => {
  console.log(req.file)
  res.sendFile(path.join(__dirname, '/upload_success.html'))
})

const server = http.createServer(app)

const wss = new WebSocket.Server({ server })

wss.on('connection', (ws) => {
  console.log('Client connected')

  ws.on('message', (message) => {
    const messageString = message.toString()
    console.log(`Received: ${messageString}`)

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageString)
      }
    })
  })

  ws.on('close', () => {
    console.log('Client disconnected')
  })

  ws.on('error', (error) => {
    console.error('WebSocket error:', error)
  })
})

server.listen(PORT, () => {
  console.log(`💐 Server is running at http://${getIpv4()}:${PORT}/`)
  console.log(`💐 WebSocket is running at ws://${getIpv4()}:${PORT}`)
})
