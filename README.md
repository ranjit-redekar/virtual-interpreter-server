# Virtual Interpreter Backend

This is the backend for the Virtual Interpreter application. It provides real-time speech-to-text transcription, language translation, and text-to-speech capabilities using Deepgram and Google Cloud Translation APIs. It also supports conversation summarization.

## Features
- Real-time speech-to-text conversion using Deepgram API
- Automatic language detection
- English-Spanish translation using Google Cloud Translation API
- Text-to-speech generation
- Conversation history tracking
- Conversation summarization using Deepgram API

## Pending Features
- Database integration to persist conversation history
- Display recognized intents from the conversation

## Installation
1. Clone the repository:
   ```sh
   git clone https://github.com/your-repo/virtual-interpreter-backend.git
   cd virtual-interpreter-backend
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Create a `.env` file and add your API keys:
   ```
   DEEPGRAM_API_KEY=your_deepgram_api_key
   GCP_KEY=your_google_cloud_api_key
   ```

## Running the Server
```sh
npm start
```
The server will start on port 3000.

## API Endpoints
### Speech-to-Text
- **Endpoint:** `ws://localhost:3000`
- **Method:** WebSocket
- **Description:** Accepts an audio stream and returns transcribed text with language detection.

### Summarization
- **Endpoint:** `GET /summary`
- **Description:** Returns a summary of the conversation history.

## License
This project is licensed under the MIT License.

