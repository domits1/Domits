const express = require('express')
const app = express()
const port = 3001

app.use(express.json())

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.get('/checkout', async (req, res) => {
    res.send('Hello World!')
})

app.post('/checkout', async (req, res) => {
    res.send('Hello World!')
})

app.put('/checkout', async (req, res) => {
    res.send('Hello World!')
})

app.delete('/checkout', async (req, res) => {
    res.send('Hello World!')
})


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})