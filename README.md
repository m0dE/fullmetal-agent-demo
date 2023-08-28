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

2. Build Lllama.cpp with GPU support

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

Download the file from https://huggingface.co/TheBloke/Wizard-Vicuna-7B-Uncensored-GGML/resolve/main/Wizard-Vicuna-7B-Uncensored.ggmlv3.q5_1.bin and save it in the root folder

Open config.js and change path to llama.cpp main file, and the model name/path


## Usage
To run just type:

```
npm start
```
