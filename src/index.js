import exp from 'constants'
import express from 'express'

const app = express()

app.get('/', (req , res)=>{
    res.send('Jai shree Ram');
})

app.listen(3000);