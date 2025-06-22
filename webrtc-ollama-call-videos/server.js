const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Ollama configuration
const OLLAMA_BASE_URL = 'http://localhost:11434';
const MODEL_NAME = 'llama3.2';

// Check Ollama connection on startup
async function checkOllamaConnection() {
  try {
    const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`);
    console.log('✅ Ollama connected successfully');
    console.log('Available models:', response.data.models.map(m => m.name));
    
    // Check if our target model exists
    const hasModel = response.data.models.some(m => m.name.includes(MODEL_NAME));
    if (!hasModel) {
      console.log(`⚠️  Model ${MODEL_NAME} not found. Available models:`, 
                  response.data.models.map(m => m.name));
    }
    return true;
  } catch (error) {
    console.error('❌ Cannot connect to Ollama:', error.message);
    console.log('Make sure Ollama is running on http://localhost:11434');
    return false;
  }
}

// Chat with Ollama - now with streaming support
async function chatWithOllamaStream(message, socket) {
  try {
    console.log('Sending streaming request to Ollama...');
    
    const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
      model: MODEL_NAME,
      prompt: message,
      stream: true,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 50
      }
    }, {
      responseType: 'stream'
    });

    let fullResponse = '';
    let buffer = '';

    // Signal start of streaming
    socket.emit('ai-response-start');

    response.data.on('data', (chunk) => {
      buffer += chunk.toString();
      
      // Process complete JSON lines
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            const data = JSON.parse(line);
            if (data.response) {
              fullResponse += data.response;
              // Send each chunk to client
              socket.emit('ai-response-chunk', {
                chunk: data.response,
                timestamp: new Date().toISOString()
              });
            }
            
            // Check if streaming is done
            if (data.done) {
              socket.emit('ai-response-end', {
                fullMessage: fullResponse,
                timestamp: new Date().toISOString()
              });
              console.log('Streaming completed');
            }
          } catch (parseError) {
            console.error('Error parsing JSON:', parseError);
          }
        }
      }
    });

    response.data.on('end', () => {
      if (!fullResponse) {
        socket.emit('ai-response-error', {
          message: "No response received from AI",
          timestamp: new Date().toISOString()
        });
      }
    });

    response.data.on('error', (error) => {
      console.error('Stream error:', error);
      socket.emit('ai-response-error', {
        message: "Error receiving AI response",
        timestamp: new Date().toISOString()
      });
    });

  } catch (error) {
    console.error('Error chatting with Ollama:', error.message);
    socket.emit('ai-response-error', {
      message: "Sorry, I'm having trouble connecting to the AI right now. Please make sure Ollama is running.",
      timestamp: new Date().toISOString()
    });
  }
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle WebRTC signaling
  socket.on('offer', (data) => {
    socket.broadcast.emit('offer', data);
  });

  socket.on('answer', (data) => {
    socket.broadcast.emit('answer', data);
  });

  socket.on('ice-candidate', (data) => {
    socket.broadcast.emit('ice-candidate', data);
  });

  // Handle AI chat messages with streaming
  socket.on('ai-message', async (data) => {
    console.log('Received message for AI:', data.message);
    await chatWithOllamaStream(data.message, socket);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  await checkOllamaConnection();
});