# FuLLMetal Agent Example

This project provides a Fullmetal Agent written in Node.js that interacts with Fullmetal API.

The main workflow this application is as following:
1. Register itself to Fullmetal API
2. Receive prompts from Fullmetal API
3. Generate a response to the received prompts using LLM running locally
4. Send the response to Fullmetal API

## Installation

1. Clone the following repository
```
git clone https://github.com/m0dE/fullmetal-agent-example
```

2. Install the project and set your configuration parameters

```
cd fullmetal-agent-example

npm install
```

__CUDA SUPPORT__

Please make sure you have latest cmake version
```
npx --no node-llama-cpp download --cuda
```

Download a GGUF LLM file and save it in the models folder. 
For example, you can use https://huggingface.co/TheBloke/Wizard-Vicuna-7B-Uncensored-GGUF/resolve/main/Wizard-Vicuna-7B-Uncensored.Q2_K.gguf

```
mkdir models

cd models

wget https://huggingface.co/TheBloke/Wizard-Vicuna-7B-Uncensored-GGUF/resolve/main/Wizard-Vicuna-7B-Uncensored.Q2_K.gguf
```
<br />

5. Obtain your ```FULLMETAL_API_KEY``` by following instructions mentioned [here](https://fullmetal.gitbook.io/docs/how-to-obtain-api-key)
<br /><br />

6. Create ```.env``` file in root folder and add the following keys. Remember all these keys are important. If left blank then your agent may not work properly.
```
FULLMETAL_API_KEY=YOUR_FULLMETAL_API_KEY

#AGENT NAME
AGENT_NAME=

#MODEL INFORMATION
MODEL_NAME=
MODEL_FILE=

# -ngl N, --n-gpu-layers N number of layers to store in VRAM
NGL=28
```


## Usage
To run, type:

```
npm start
```