//Installation
// git clone https://github.com/ggerganov/llama.cpp.git
// cd llama.cpp
// sed -i 's/export NVCCFLAGS="-arch=native"/export NVCCFLAGS="-arch=all"/' llama.cpp/Makefile
// make clean && LLAMA_CUBLAS=1 make  -j
//Copyright Denis Spasyuk
//License MIT

const { spawn } = require('child_process');
const config = require('./config.js');
const Fullmetal = require('fullmetal-agent');
let tokenLength = 0;
const fullMetalConfig = {
  name: 'Uncensored Agent',
};
const fullmetalAgent = new Fullmetal(fullMetalConfig);
fullmetalAgent.setApiKey('sample-key');
fullmetalAgent.onPrompt(async (prompt) => {
  await getApiResponse(prompt, async (answer, completed) => {
    fullmetalAgent.sendResponse(answer, completed);
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
