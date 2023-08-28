const { spawn } = require('child_process');
const config = require('./config.js');
const Fullmetal = require('fullmetal-agent');
let tokenLength = 0;
const config = {   
    model: "TheBloke/Llama-2-7B-fp16", // full name provided in hugging face including the creator's name
    name: "my 30B LLM", // Optional. This name will be registered in api.fullmetal.ai
    contextLength: 30, // context length in thousands. 30 here is 30k.
    acceptPublicPrompts: true // answer public prompts and earn mystery gems
};
const fullmetalAgent = new Fullmetal(config);
fullmetalAgent.setApiKey('sample-key');

fullmetalAgent.onPrompt(async (prompt) => {
  await getApiResponse(prompt, async (response, completed) => {
    fullmetalAgent.sendResponse(response, completed);
  });
});

const getApiResponse = async (input, cb) => {
  const startTime = Date.now();
  tokenLength = 0;
  const response = spawn(config.llamacpp, [...config.params, '-p', `${input}`]);

  response.stdout.on('data', (msg) => {
    msg = msg.toString('utf-8');
    if (msg && !msg.includes(input)) {
      tokenLength += msg.length;
      cb(msg, false);
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
