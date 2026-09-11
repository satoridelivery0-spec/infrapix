const axios=require("axios");

async function createPix(amount){

const response = await axios.post(
process.env.PIX_GATEWAY_URL,
{
amount
},
{
headers:{
Authorization:`Bearer ${process.env.PIX_GATEWAY_KEY}`
}
}
);

return response.data;

}

module.exports={createPix};
