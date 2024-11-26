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
}*/
import { LlamaModel, LlamaContext, LlamaChatSession } from 'node-llama-cpp';
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

  // Event listener for prompt
  fullmetalAgent.onPrompt(async (data) => {
    await getApiResponse(data, async (response) => {
      // Send each token or chunk response to Fullmetal
      fullmetalAgent.sendResponse(response);
    });
  });

  /**
   * Splits the prompt into smaller chunks if it exceeds the model's token limit.
   * @param {string} prompt - The input prompt to split.
   * @param {object} tokenizer - The LLaMA tokenizer.
   * @param {number} maxTokens - Maximum tokens allowed per chunk.
   * @returns {string[]} Array of prompt chunks.
   */
  const chunkPrompt = (prompt, tokenizer, maxTokens) => {
    const tokens = tokenizer.tokenize(prompt);
    const chunks = [];
    for (let i = 0; i < tokens.length; i += maxTokens) {
      chunks.push(tokenizer.detokenize(tokens.slice(i, i + maxTokens)));
    }
    return chunks;
  };

  /**
   * Processes the prompt and streams tokens as chunks if needed.
   * @param {object} data - Input data containing the prompt.
   * @param {function} cb - Callback function for token responses.
   */
  const getApiResponse = async (data, cb) => {
    try {
      const context = new LlamaContext({ model });
      const session = new LlamaChatSession({ context });
      const tokenizer = context.getTokenizer();
      const startTime = Date.now();
      const MAX_TOKENS = 2048; // Token limit for each chunk

      let tokenLength = 0;
      let contextString = ''; // Accumulated context

      // Split the prompt into chunks
      const promptChunks = chunkPrompt(data.prompt, tokenizer, MAX_TOKENS);

      for (const chunk of promptChunks) {
        const fullPrompt = contextString + chunk; // Combine with accumulated context

        await session.prompt(fullPrompt, {
          onToken(chunkToken) {
            const tokenString = context.decode(chunkToken);
            tokenLength += tokenString.length;
            contextString += tokenString; // Update context
            cb({ token: tokenString }); // Stream token back
          },
        });
      }

      const endTime = Date.now();
      const elapsedTimeInSeconds = (endTime - startTime) / 1000;
      const tokensPerSecond = tokenLength / elapsedTimeInSeconds;

      // Notify completion of all chunks
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
    } catch (error) {
      console.error('Error during response generation:', error);
    }
  };
}


