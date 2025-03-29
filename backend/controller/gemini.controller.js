import GeminiSocketHandler from '../services/socket.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

// Store the socket handler instance globally
let socketHandler;

const initSocketHandler = (server) => {
  socketHandler = new GeminiSocketHandler(server);
  return socketHandler;
};

const extractKeywordsAndKaggleApiHit = asyncHandler(async (req, res) => {
  if (!socketHandler) {
    throw new ApiError(500, 'Socket handler not initialized');
  }

  const {userPrompt,userId} = req.body
  console.log(req.body)
  if (!userPrompt || !userId) {
    throw new ApiError(400, 'Prompt and userID are required');
  }

  // Emit extract-keywords event
  await socketHandler.getIO().emit('extract-keywords', { userPrompt, userId });

  // Listen for the result
  socketHandler.getIO().on('keywords-result', (data) => {
    res.status(200).json(new ApiResponse(200, data, 'Suggested datasets successfully'));
  });

  // Listen for errors
  socketHandler.getIO().on('error', (error) => {
    throw new ApiError(500, `Keyword extraction failed: ${error.message}`);
  });
})

const genResponse = asyncHandler(async (req, res) => {
  if (!socketHandler) {
    throw new ApiError(500, 'Socket handler not initialized');
  }

  const { userPrompt, trainingData, userId } = req.body;

  if (!userPrompt || !userId) {
    throw new ApiError(400, 'Prompt and userID are required');
  }

  // Set up error handling first
  socketHandler.getIO().once('error', (error) => {
    throw new ApiError(500, `Response generation failed: ${error.message}`);
  });

  // Listen for the result with proper validation
  socketHandler.getIO().once('generate-response-result', (data) => {
    if (!data || !data.response) {
      throw new ApiError(500, 'Invalid response format from Gemini');
    }

    try {
      // Validate response format
      const response = {
        sessionId: data.sessionId,
        response: data.response,
        datasets: data.datasets || [],
        isComplete: data.isComplete || true
      };

      res.status(200).json(new ApiResponse(200, response, 'Response generated successfully'));
    } catch (error) {
      throw new ApiError(500, `Error processing response: ${error.message}`);
    }
  });

  // Emit generate-response event with session tracking
  socketHandler.getIO().emit('generate-response', { 
    userPrompt, 
    trainingData, 
    userId,
    sessionId: req.body.sessionId || Date.now().toString()
  });
});

// Also update the socket service to ensure proper response formatting:
const getHistory = asyncHandler(async (req, res) => {
  if (!socketHandler) {
    throw new ApiError(500, 'Socket handler not initialized');
  }

  const { userId } = req.params;

  if (!userId) {
    throw new ApiError(400, 'User ID is required');
  }

  // Use once instead of on to prevent memory leaks
  socketHandler.getIO().once('history-result', (data) => {
    res.status(200).json(new ApiResponse(200, data, 'History retrieved successfully'));
  });

  socketHandler.getIO().once('error', (error) => {
    throw new ApiError(500, `History retrieval failed: ${error.message}`);
  });

  // Emit get-history event after setting up listeners
  socketHandler.getIO().emit('get-history', { userId });
  
})

export {
  genResponse,
  extractKeywordsAndKaggleApiHit,
  initSocketHandler,
  getHistory
};