const express = require('express')
const serveIndex = require('serve-index')
const path = require('path')
const multer = require('multer')
const getIpv4 = require('./utils/ipv4')

const app = express()

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

app.post('/upload', upload.single('file'), (req, res) => {
  console.log(req.file)
  res.sendFile(path.join(__dirname, '/upload_success.html'))
})

app.listen(3000, () =>
  console.log(`💐 Server is running at http://${getIpv4()}:3000/`)
)
