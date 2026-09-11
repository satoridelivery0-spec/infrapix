require("dotenv").config();

const express = require("express");
const { initBot } = require("./bot");

const app = express();

app.use(express.json());

app.get("/", (req,res)=>{
    res.send("InfraPix Online 🚀");
});

initBot();

app.listen(process.env.PORT || 3000, ()=>{
    console.log("Servidor InfraPix iniciado");
});
