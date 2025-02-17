require("dotenv").config();
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const axios = require("axios");
const { createClient } = require("@deepgram/sdk");
const { Translate } = require("@google-cloud/translate").v2;
const { pipeline, Writable } = require("stream");
const cors = require("cors");

// Initialize services
const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });
const deepgram = new createClient(process.env.DEEPGRAM_API_KEY);
const translate = new Translate({ key: process.env.GCP_KEY });

app.use(cors());
app.use(express.json());

let conversationHistory = [];

io.on("connection", (socket) => {
  console.log("Client connected");
  setupSocketListeners(socket);
  socket.on("disconnect", () => console.log("Client disconnected"));
});

function setupSocketListeners(socket) {
  socket.on("speech-to-text", async (audio) => {
    try {
      console.log("Received audio buffer");
      const response = await axios.post(
        "https://api.deepgram.com/v1/listen?model=nova-3-general&detect_language=true",
        audio,
        {
          headers: {
            Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
            "Content-Type": "audio/wav",
          },
        }
      );
      console.log("Deepgram Response:", JSON.stringify(response.data));
      await handleTranscript(response.data, socket);
    } catch (error) {
      console.error("Error transcribing audio:", error);
      socket.emit("error", "Error processing audio.");
    }
  });
}

// Handle transcript data and translation
async function handleTranscript(data, socket) {
  const transcriptData = data.results?.channels?.[0]?.alternatives?.[0];
  if (!transcriptData) return;
  const message = transcriptData.transcript;
  const language = data.results?.channels?.[0]?.detected_language;

  if (!message) {
    console.log("No message detected in transcript data.");
    return;
  }
  console.log("Transcript Data:", transcriptData, "language", language);
  try {
    const [translation] = await translate.translate(
      message,
      language === "en" ? "es" : "en"
    );
    const role = language === "es" ? "patient" : "clinician";
    conversationHistory.push({
      role,
      language,
      original: message,
      translated: translation,
    });
    socket.emit("transcription", {
      role,
      displayText: language === "en" ? message : translation,
      language
    });
    await generateSpeech(translation, socket);
  } catch (error) {
    console.error("Translation error:", error);
  }
}

// Generate speech for the translation text
async function generateSpeech(text, socket) {
  try {
    console.log("Generating speech for:", text);
    const response = await deepgram.speak.request(
      { text },
      { model: "aura-asteria-en" }
    );

    const stream = await response.getStream();
    if (!stream) {
      throw new Error("No stream received from Deepgram.");
    }

    let audioBuffer = Buffer.alloc(0);
    const writableStream = new Writable({
      write(chunk, _, callback) {
        audioBuffer = Buffer.concat([audioBuffer, chunk]);
        callback();
      },
    });

    pipeline(stream, writableStream, (err) => {
      if (err) {
        console.error("Error processing audio stream:", err);
        socket.emit("error", "Error processing audio.");
      } else {
        console.log("Audio stream completed.");
        socket.emit("audioComplete", audioBuffer);
      }
    });
  } catch (error) {
    console.error("Speech synthesis error:", error);
  }
}

app.get('/summary', async (req, res) => {
  if (conversationHistory.length === 0) {
    return res.status(400).json({ error: "No summary available." });
  }

  const text = conversationHistory.map(entry => `${entry.role}: ${entry.original}`) // Add communicator (role) to each message
  .join(" "); 
  try {
    // Call Deepgram's summarization API
    const response = await axios.post(
      "https://api.deepgram.com/v1/read?summarize=true&language=en", 
      { text },
      {
        headers: {
          Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
          "Content-Type": "application/json",
        }
      }
    );
  
    // Handle Deepgram API response
    console.log("Deepgram Summarization Response:", response.data);
    const summary = response.data.summary || "No summary available.";

    return res.json({ summary });
  } catch (error) {
    console.error("Error summarizing text:", error);
    return res.status(500).json({ error: "Failed to summarize text." });
  }
});

server.listen(3000, () => console.log("Server listening on port 3000"));
