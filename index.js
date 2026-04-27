const express = require("express");
const app = express();
app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// Business info — har client ke liye change karo
const BUSINESS_INFO = `
Aap ABC Clinic ke assistant hain.
Timing: Monday-Saturday 10am-6pm
Doctor: Dr. Sharma
Fee: 500 rupees
Address: Main Market, Delhi
Agar koi appointment chahiye toh timing batao.
`;

// Webhook verify
app.get("/webhook", (req, res) => {
  if (req.query["hub.verify_token"] === VERIFY_TOKEN) {
    res.send(req.query["hub.challenge"]);
  } else {
    res.sendStatus(403);
  }
});

// Message receive
app.post("/webhook", async (req, res) => {
  const body = req.body;
  if (body.object === "whatsapp_business_account") {
    const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (message && message.type === "text") {
      const userMessage = message.text.body;
      const phone = message.from;
      const reply = await getAIReply(userMessage);
      await sendWhatsAppMessage(phone, reply);
    }
  }
  res.sendStatus(200);
});

async function getAIReply(userMessage) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${BUSINESS_INFO}\n\nCustomer: ${userMessage}\n\nJawab Hindi mein do, short aur helpful.`
          }]
        }]
      })
    }
  );
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, abhi jawab nahi de pa raha!";
}

async function sendWhatsAppMessage(to, message) {
  await fetch(`https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.WHATSAPP_TOKEN}`
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to,
      text: { body: message }
    })
  });
}

app.listen(3000, () => console.log("Agent chal raha hai!"));
