# FuLLMetal Agent Example

This project provides a Fullmetal Agent written in Node.js that interacts with Fullmetal API.

The main workflow this application is as following:
1. Register itself to Fullmetal API
2. Receive prompts from Fullmetal API
3. Generate a response to the received prompts using LLM running locally
4. Send the response to Fullmetal API

## Installation

1. Setup llama.cpp
```
git clone https://github.com/ggerganov/llama.cpp.git
```

2. Build Llama.cpp with GPU support

```
cd llama.cpp

sed -i 's/-arch=native/-arch=all/g' Makefile

make clean && LLAMA_CUBLAS=1 make -j
```

3. Clone this repo in a separate folder
```
cd ..

git clone https://github.com/m0dE/fullmetal-agent-example
```

4. Install the project and set your configuration parameters

```
cd fullmetal-agent-example

npm install
```

Download a LLM file and save it in the root folder. 
For example, you can use https://huggingface.co/TheBloke/Wizard-Vicuna-7B-Uncensored-GGML/resolve/main/Wizard-Vicuna-7B-Uncensored.ggmlv3.q5_1.bin

```
wget https://huggingface.co/TheBloke/Wizard-Vicuna-7B-Uncensored-GGML/resolve/main/Wizard-Vicuna-7B-Uncensored.ggmlv3.q5_1.bin
```
<br />

5. Obtain your ```FULLMETAL_API_KEY``` by following instructions mentioned [here](https://fullmetal.gitbook.io/docs/how-to-obtain-api-key)
<br /><br />

6. Open ```config.js``` and change the path to llama.cpp main file, and the model name/path. You can adjust the parameter value as per your requirement
```
config.params = [
  '-m',
  'Wizard-Vicuna-7B-Uncensored.ggmlv3.q5_1.bin',
  '-ngl',
  '28',
  '-n',
  '512',
];
config.llamacpp = '../llama.cpp/main';
```

7. Create ```.env``` and add following key
```
FULLMETAL_API_KEY=YOUR_FULLMETAL_API_KEY
```

8. Open ```server.js``` file and change the following object with your values
```
const modelList = [
  {
    name: 'MODEL_NAME',
    file: 'MODEL_FILE.bin',
  },
];

const fullMetalConfig = {
  ...
  name: 'YOUR UNIQUE AGENT NAME',
  apiKey: process.env.FULLMETAL_API_KEY,
  ...
};
```




## Usage
To run, type:

```
npm start
```


## Credits
[Llama.cpp](https://github.com/ggerganov/llama.cpp.git) by Denis Spasyuk


