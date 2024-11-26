/*import { LlamaModel, LlamaContext, LlamaChatSession } from 'node-llama-cpp';
import Fullmetal from 'fullmetal-agent';
import fs from 'fs';
import 'dotenv/config';

if (!fs.existsSync(process.env.MODEL_FILE)) {
  console.log(`${process.env.MODEL_FILE} does not exist`);
} else {
  console.log(`${process.env.MODEL_FILE} exists`);

  const model = new LlamaModel({
    modelPath: process.env.MODEL_FILE,
    gpuLayers: parseInt(process.env.NGL),
  });

  const fullMetalConfig = {
    name: process.env.AGENT_NAME,
    apiKey: process.env.FULLMETAL_API_KEY,
    models: [process.env.MODEL_NAME],
    isPublic: true,
  };

  const fullmetalAgent = new Fullmetal(fullMetalConfig);
  fullmetalAgent.onPrompt(async (data) => {
    await getApiResponse(data, async (response) => {
      // response= {token:'', completed:false, speed:10, model:''Wizard-Vicuna-7B-Uncensored'}
      fullmetalAgent.sendResponse(response);
    });
  });

  const getApiResponse = async (data, cb) => {
    try {
      const context = new LlamaContext({ model });
      const session = new LlamaChatSession({ context });
      const startTime = Date.now();
      let tokenLength = 0;

      await session.prompt(`${data.prompt}`, {
        onToken(chunk) {
          tokenLength += chunk.length;
          cb({ token: context.decode(chunk) });
        },
      });
      const endTime = Date.now();
      // Calculate the elapsed time in seconds
      const elapsedTimeInSeconds = (endTime - startTime) / 1000;
      const tokensPerSecond = tokenLength / elapsedTimeInSeconds;

      cb({
        token: null,
        completed: true,
        model: process.env.MODEL_NAME,
        elapsedTime: elapsedTimeInSeconds.toFixed(2),
        speed: tokensPerSecond.toFixed(2),
        promptLength: data.prompt.length,
        responseLength: tokenLength,
      });

      console.log(`nGPU: ${process.env.NGL}`);
      console.log(`Total time taken: ${elapsedTimeInSeconds}`);
      console.log(`Tokens Per Second: ${tokensPerSecond.toFixed(2)}`);
    } catch (e) {
      console.log(e);
    }
  };
}
*/
import { LlamaModel, LlamaContext, LlamaChatSession } from 'node-llama-cpp';
import Fullmetal from 'fullmetal-agent';
import fs from 'fs';
import 'dotenv/config';

const MAX_TOKENS = 4096; // Model's token context limit

if (!fs.existsSync(process.env.MODEL_FILE)) {
  console.log(`${process.env.MODEL_FILE} does not exist`);
} else {
  console.log(`${process.env.MODEL_FILE} exists`);

  const model = new LlamaModel({
    modelPath: process.env.MODEL_FILE,
    gpuLayers: parseInt(process.env.NGL),
  });

  const fullMetalConfig = {
    name: process.env.AGENT_NAME,
    apiKey: process.env.FULLMETAL_API_KEY,
    models: [process.env.MODEL_NAME],
    isPublic: true,
  };

  const fullmetalAgent = new Fullmetal(fullMetalConfig);

  fullmetalAgent.onPrompt(async (data) => {
    await getApiResponse(data, async (response) => {
      fullmetalAgent.sendResponse(response);
    });
  });

  /**
   * A helper function to estimate token length based on characters.
   * This is a rough estimation, and you may need to fine-tune it.
   */
  const estimateTokenLength = (text) => {
    return Math.ceil(text.length / 4); // Rough estimate (1 token ~ 4 chars)
  };

  /**
   * Clears context when needed (important if working with long conversations).
   * @param {LlamaContext} context - The context to clear.
   */
  const clearContext = (context) => {
    context.clear(); // Clear context to avoid overflow.
  };

  const getApiResponse = async (data, cb) => {
    try {
      const context = new LlamaContext({ model });
      const session = new LlamaChatSession({ context });
      let accumulatedContext = ''; // Store accumulated context
      let tokenCount = 0;

      const chunks = chunkPrompt(data.prompt, MAX_TOKENS);

      // Iterate through chunks, adjusting context as needed
      for (const chunk of chunks) {
        // Estimate the token length of the current chunk
        const chunkTokenLength = estimateTokenLength(chunk);
        
        if (tokenCount + chunkTokenLength > MAX_TOKENS) {
          // If adding this chunk exceeds the context limit, clear context
          clearContext(context);
          tokenCount = 0;
        }

        // Add the chunk to the accumulated context
        accumulatedContext += chunk;
        tokenCount += chunkTokenLength;

        // Send the accumulated context to the model
        await session.prompt(accumulatedContext, {
          onToken(chunkToken) {
            const tokenString = context.decode(chunkToken);
            cb({ token: tokenString });
          },
        });
      }

      cb({
        token: null,
        completed: true,
        model: process.env.MODEL_NAME,
      });

    } catch (error) {
      console.error('Error during response generation:', error);
    }
  };

  /**
   * Splits the prompt into smaller chunks based on the token limit.
   * @param {string} prompt - The input prompt to split.
   * @param {number} maxTokens - The maximum allowed tokens per chunk.
   * @returns {string[]} Array of prompt chunks.
   */
  const chunkPrompt = (prompt, maxTokens) => {
    const chunks = [];
    let currentChunk = '';

    const estimatedTokenLimit = maxTokens * 4; // Estimate in characters based on tokens

    for (let i = 0; i < prompt.length; i++) {
      currentChunk += prompt[i];

      // Check if adding the character exceeds the token limit
      if (estimateTokenLength(currentChunk) > estimatedTokenLimit) {
        chunks.push(currentChunk);
        currentChunk = ''; // Reset for the next chunk
      }
    }

    // Push any remaining content
    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }

    return chunks;
  };
}
