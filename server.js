const { spawn } = require('child_process');
const config = require('./config.js');
const Fullmetal = require('fullmetal-agent');
let tokenLength = 0;
/*const fullmetalConfig = {   
    model: "TheBloke/Llama-2-7B-fp16", // full name provided in hugging face including the creator's name
    name: "my 30B LLM", // Optional. This name will be registered in api.fullmetal.ai
    contextLength: 30, // context length in thousands. 30 here is 30k.
    acceptPublicPrompts: true // answer public prompts and earn mystery gems
};
const fullmetalAgent = new Fullmetal(fullmetalConfig);
fullmetalAgent.setApiKey('sample-key');

fullmetalAgent.onPrompt(async (prompt) => {
console.log(prompt);
  await getApiResponse(prompt, async (response, completed) => {
    fullmetalAgent.sendResponse(response, completed);
  });
});*/
const modelList = [
  {
    name: 'Wizard-Vicuna-7B-Uncensored.ggmlv3.q5_1',
    file: 'Wizard-Vicuna-7B-Uncensored.ggmlv3.q5_1.bin',
  },
  {
    name: 'Wizard-Vicuna-13B-Uncensored.ggmlv3.q5_1',
    file: 'Wizard-Vicuna-13B-Uncensored.ggmlv3.q5_1.bin',
  },
];

const fullMetalConfig = {
  name: 'Uncensored Agent',
  apiKey: 'sample-key',
  models: modelList.map((m) => m.name),
};

const fullmetalAgent = new Fullmetal(fullMetalConfig);
fullmetalAgent.onPrompt(async (data) => {
  await getApiResponse(data, async (answer, completed) => {
    fullmetalAgent.sendResponse(answer, completed);
  });
});

const getApiResponse = async (data, cb) => {
  const startTime = Date.now();
  tokenLength = 0;
  config.params[1] = modelList.filter(
    (m) => m.name === data.options.model
  )[0].file;
  const response = spawn(config.llamacpp, [
    ...config.params,
    '-p',
    `${data.prompt}`,
  ]);

  response.stdout.on('data', (msg) => {
    msg = msg.toString('utf-8');
    if (msg && !msg.includes(data.prompt)) {
      tokenLength += msg.length;
      cb(msg);
    }
  });

  response.on('exit', function () {
    cb(null, true);
    const endTime = Date.now();
    // Calculate the elapsed time in seconds
    const elapsedTimeInSeconds = (endTime - startTime) / 1000;

    const tokensPerSecond = tokenLength / elapsedTimeInSeconds;
    console.log(`nGPU: ${config.params[3]}`);
    console.log(`Total time taken: ${elapsedTimeInSeconds}`);
    console.log(`Tokens Per Second: ${tokensPerSecond.toFixed(2)}`);
  });
};
console.log('Connected');
