import { Server } from 'socket.io';
import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSystemPrompt, CONTINUE_PROMPT } from '../utils/prompt.js';
import { displayDatasetOptions } from '../utils/kaggle.js';
import History from '../models/history.js';
import mongoose from 'mongoose';

class GeminiSocketHandler {
  constructor(server) {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    this.io = new Server(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    this.initializeSocketEvents();
  }

  async formatDBConversationHistory(messages) {
    if (!messages || messages.length === 0) return '';
    
    return messages.map(msg => 
        `${msg.role}: ${msg.content}${
            msg.trainingData ? `\n\nTraining Data Used: ${msg.trainingData}` : ''
        }`
    ).join('\n\n---\n\n');
  }

  async initializeSocketEvents() {
    this.io.on('connection', (socket) => {
      console.log('New client connected:', socket.id);

      socket.on('generate-response', async (data) => {
        try {
          const { userPrompt, trainingData, userId, sessionId } = data;
          
          if (!userPrompt || !userId) {
            socket.emit('error', {
              message: 'Please provide prompt and user ID.',
              type: 'missing-prompt',
            });
            return;
          }

          // Find or create user's history
          let history = await History.findOne({ author: new mongoose.Types.ObjectId(userId) });
          if (!history) {
            history = new History({
              author: userId,
              sessions: []
            });
          }

          // Find or create session
          let session = history.sessions.find(s => s.sessionId === sessionId);
          if (!session) {
            session = {
              sessionId: sessionId || Date.now().toString(),
              title: userPrompt.substring(0, 30) + '...',
              messages: [],
              lastActive: new Date()
            };
            history.sessions.push(session);
          }

          // Generate keywords and fetch datasets
          const keywordPrompt = `
"Extract the most relevant machine learning keyword from the following prompt. Focus on identifying the primary domain of the task, such as finance, healthcare, image classification, climate change, COVID-19, e-commerce, social media, education, recommendation systems, time series, sports, natural language processing (NLP), etc. The keyword should clearly represent the core subject or application area of the model being proposed.

Example Input:
'Create a model to predict house prices based on area and location'

Example Output:
'house prices'

Return only one keyword that best represents the domain of the task."
Here is the prompt:
${userPrompt}`;

          const result = await this.model.generateContent(keywordPrompt);
          const keywords = result.response.candidates[0].content.parts[0].text;
          console.log('Keywords:', keywords);

          const datasets = await displayDatasetOptions(keywords);
          let finalTrainingData = trainingData;

          if (!finalTrainingData && datasets.data.length > 0) {
            const defaultDataset = datasets.data[0];
            finalTrainingData = `Dataset: ${defaultDataset.title}\nURL: ${defaultDataset.url}`;
          }

          // Save user message
          session.messages.push({
            role: 'user',
            content: userPrompt,
            timestamp: new Date(),
            trainingData: finalTrainingData,
            datasets: datasets
          });
session.save()
          // Generate response using conversation context
          const conversationContext = await this.formatDBConversationHistory(session.messages);
          const systemPrompt = getSystemPrompt();
          const continuePrompt = CONTINUE_PROMPT;

          const finalPrompt = `${systemPrompt}
Previous conversation:
${conversationContext}
${continuePrompt}
Current user message: ${userPrompt}
${finalTrainingData ? `\nAvailable training data: ${finalTrainingData}` : ''}`;

const streamingResult = await this.model.generateContentStream(finalPrompt);
let fullResponse = '';

for await (const chunk of streamingResult.stream) {
  try {
    const chunkText = chunk.text();
    if (!chunkText) continue; // Skip empty chunks
    
    fullResponse += chunkText;

    socket.emit('generate-response-chunk', {
      sessionId: session.sessionId,
      chunk: chunkText,
      isComplete: false
    });
  } catch (error) {
    console.error('Error processing chunk:', error);
  }
}

if (!fullResponse) {
  throw new Error('Empty response from Gemini');
}

// Format final response with required tags if missing
const formattedResponse = fullResponse.includes('<code>') ? 
  fullResponse : 
  `<ChanetTags>
1. Processing: Analyzing your request
</ChanetTags>
<code>
${fullResponse}
</code>`;
console.log("uwuwu",datasets.data)

// Save and emit final response
// Inside generate-response handler
// Save and emit final response
session.messages.push({
  role: 'assistant',
  content: formattedResponse,
  timestamp: new Date(),
  trainingData: finalTrainingData
});

// Update the session's datasets
session.datasets = datasets.data.map(dataset => ({
  title: dataset.title,
  url: dataset.url,
  subtitle: dataset.subtitle,
  creatorName: dataset.creatorName,
  downloadCount: dataset.downloadCount
}));

session.lastActive = new Date();

// Mark both arrays as modified
history.markModified('sessions');
await history.save();

socket.emit('generate-response-result', {
  sessionId: session.sessionId,
  response: formattedResponse,
  datasets: datasets.data,
  isComplete: true
});

} catch (error) {
socket.emit('error', {
  message: `Response generation failed: ${error.message}`,
  type: 'response-generation',
});
}
});

      socket.on('get-sessions', async (data) => {
        try {
          const { userId } = data;
          const history = await History.findOne({
            author: new mongoose.Types.ObjectId(userId)
          });

          socket.emit('sessions-result', {
            sessions: history?.sessions.map(session => ({
              id: session.sessionId,
              title: session.title,
              lastActive: session.lastActive,
              messageCount: session.messages.length
            })) || [],
          });
        } catch (error) {
          socket.emit('error', {
            message: `Failed to get sessions: ${error.message}`,
            type: 'sessions-retrieval'
          });
        }
      });

      socket.on('get-history', async (data) => {
        try {
            const { userId, sessionId } = data;
            const history = await History.findOne({
                author: new mongoose.Types.ObjectId(userId)
            });
        
            const session = history?.sessions.find(s => s.sessionId === sessionId);
        
            if (!session) {
                socket.emit('history-result', { messages: [], isEmpty: true });
                return;
            }
            
            socket.emit('history-result', {
                sessionId: session.sessionId,
                title: session.title,
                messages: session.messages,
                lastResponse: session.messages
                    .filter(msg => msg.role === 'assistant')
                    .pop()?.content || '',
                datasets: session.datasets || [],
                isEmpty: false
            });
        } catch (error) {
            socket.emit('error', {
                message: `History retrieval failed: ${error.message}`,
                type: 'history-retrieval'
            });
        }
    });

      socket.on('create-session', async (data) => {
        try {
          const { userId, title } = data;
          const history = await History.findOne({
            author: new mongoose.Types.ObjectId(userId)
          });

          if (!history) {
            socket.emit('error', {
              message: 'User history not found',
              type: 'session-creation'
            });
            return;
          }

          const newSession = {
            sessionId: Date.now().toString(),
            title: title || 'New Chat',
            messages: [],
            lastActive: new Date()
          };

          history.sessions.push(newSession);
          await history.save();

          socket.emit('session-created', {
            sessionId: newSession.sessionId,
            title: newSession.title
          });
        } catch (error) {
          socket.emit('error', {
            message: `Session creation failed: ${error.message}`,
            type: 'session-creation'
          });
        }
      });

      socket.on('delete-session', async (data) => {
        try {
          const { userId, sessionId } = data;
          const history = await History.findOne({
            author: new mongoose.Types.ObjectId(userId)
          });

          if (!history) {
            socket.emit('error', {
              message: 'User history not found',
              type: 'session-deletion'
            });
            return;
          }

          history.sessions = history.sessions.filter(s => s.sessionId !== sessionId);
          await history.save();

          socket.emit('session-deleted', { sessionId });
        } catch (error) {
          socket.emit('error', {
            message: `Session deletion failed: ${error.message}`,
            type: 'session-deletion'
          });
        }
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  }

  getIO() {
    return this.io;
  }
}

export default GeminiSocketHandler;