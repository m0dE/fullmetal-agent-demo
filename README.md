# llcui small llama.ccp wrapper for Node.js

**Note: This project is a work in progress.**

This project provides a Node.js server for a chat user interface (UI) that interacts with the Llama.cpp library. It allows users to communicate with the Llama.cpp application via a web-based chat interface.

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

3. Clone fullmetal-uncensored-agent-demo
```   
git clone https://github.com/m0dE/fullmetal-agent-example
```
4. Install the project and set your configuration parameters

```
cd fullmetal-uncensored-agent-demo
```

Download the file from https://huggingface.co/TheBloke/Wizard-Vicuna-7B-Uncensored-GGML/resolve/main/Wizard-Vicuna-7B-Uncensored.ggmlv3.q5_1.bin and save it in root folder

```
npm install
```

Open config.js and change path to llama.cpp main file, and the model name/path

## Usage
To run just type:

```
npm start
```
