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
