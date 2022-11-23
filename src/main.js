const express = require('express')
const serveIndex = require('serve-index')
const path = require('path')
const multer = require('multer')

const app = express()

let storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './contents');
    },
    filename: function (req, file, cb) {
        let [_, extension] = file.mimetype.split("/")

        cb(null, `${file.originalname.split(".")[0]}${Date.now()}.${extension}`)
    }
})

const upload = multer({
    storage: storage
})

app.use('/contents', express.static('contents'))
app.use('/contents', serveIndex('contents'))

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/index.html'))
})

app.post('/upload', upload.single('file'), (req, res) => {
    console.log(req.file)
    res.send('upload done!')
})

app.listen(3000, () => console.log('Server is running at port 3000'))
