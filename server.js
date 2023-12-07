const { spawn } = require('child_process');
const config = require('./config.js');
const Fullmetal = require('fullmetal-agent');
const fs = require('fs');
require('dotenv').config();

if (!fs.existsSync(config.llamaConfig.m)) {
  console.log(`${config.llamaConfig.m} does not exist`);
} else {
  let tokenLength = 0;

  const modelList = [
    {
      name: config.llamaConfig.name,
      file: config.llamaConfig.m,
    },
  ];

  const fullMetalConfig = {
    name: process.env.AGENT_NAME,
    apiKey: process.env.FULLMETAL_API_KEY,
    models: modelList.map((m) => m.name),
    isPublic: true
  };

  const fullmetalAgent = new Fullmetal(fullMetalConfig);
  fullmetalAgent.onPrompt(async (data) => {
    await getApiResponse(data, async (response) => {
      // response= {token:'', completed:false, speed:10, model:''Wizard-Vicuna-7B-Uncensored'}
      fullmetalAgent.sendResponse(response);
    });
  });

  const findMatchingIndexes = (query, models) => {
    const queryWords = query.toLowerCase().split(' '); // Split the query into individual words

    const matchingIndexes = models.filter((key) => {
      const modelString = key.toLowerCase(); // Convert "model" to lowercase
      return queryWords.every((word) => modelString.includes(word)); // Check if all queryWords are in the model string
    });

    return matchingIndexes;
  };

  const getApiResponse = async (data, cb) => {
    console.log(data.prompt);
    const startTime = Date.now();
    tokenLength = 0;
    let modelFileUsed, modelNameUsed;
    if (data && data.options && data.options.model) {
      const findModel = findMatchingIndexes(
        data.options.model,
        modelList.map((m) => m.name)
      );

      if (!findModel.length) {
        findModel = [modelList[0].name];
      }
      modelFileUsed = modelList.filter((m) => m.name === findModel[0])[0].file;
      modelNameUsed = findModel[0];
    } else {
      modelFileUsed = modelList[0].file;
      modelNameUsed = modelList[0].name;
    }

    config.llamaConfig.m = modelFileUsed;
    const params = config.convertObjectToArray(config.llamaConfig);
    const response = spawn(config.llamacpp, [
      ...params,
      '-p',
      `${data.prompt}`,
    ]);

    response.stdout.on('data', (msg) => {
      msg = msg.toString('utf-8');
      if (msg && !msg.includes(data.prompt)) {
        tokenLength += msg.length;
        cb({ token: msg });
        console.log({ token: msg });
      }
    });

    response.on('exit', function () {
      // cb(null, true);
      const endTime = Date.now();
      // Calculate the elapsed time in seconds
      const elapsedTimeInSeconds = (endTime - startTime) / 1000;
      const tokensPerSecond = tokenLength / elapsedTimeInSeconds;

      cb({
        token: null,
        completed: true,
        model: modelNameUsed,
        elapsedTime: elapsedTimeInSeconds.toFixed(2),
        speed: tokensPerSecond.toFixed(2),
        promptLength: data.prompt.length,
        responseLength: tokenLength,
      });

      console.log(`nGPU: ${config.llamaConfig.ngl}`);
      console.log(`Total time taken: ${elapsedTimeInSeconds}`);
      console.log(`Tokens Per Second: ${tokensPerSecond.toFixed(2)}`);
    });
  };
}
