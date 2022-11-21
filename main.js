const express = require('express')
const serveIndex = require('serve-index')

const app = express()

app.use('/contents',express.static('contents'))
app.use('/contents',serveIndex('contents'))

app.listen(3000, () => console.log('Server is running at port 3000'))