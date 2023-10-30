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

cd llama.cpp
```

### Continuing GGML File (RECOMMENDED)
- Latest llama.cpp doesn't support ggml now. Please refer the following link
https://huggingface.co/TheBloke/Llama-2-13B-chat-GGML/discussions/14#64e5bc015af55fb4d1f9b61d

- Execute following command in order to use older version of llama.cpp and use ggml file
```
git reset --hard dadbed99e65252d79f81101a392d0d6497b86caa
```

### Using GGUF file with the latest code (BETA)
To  use the latest code we need the model to be in gguf format. Please follow the instructions below 

- You will need ```python3``` and the ```numpy``` libraries. 
- You can install numpy using 
```
pip3 install numpy    
```
- Convert your ggml file with gguf by executing following command
```
cd llama.cpp    

./convert-llama-ggml-to-gguf.py --eps 1e-5 -i GGML.bin file -o ./models/Wizard-Vicuna-7B-Uncensored.ggmlv3.q5_1.bin   
```

2. Build Llama.cpp with GPU support

```
sudo apt update

sudo apt install build-essential

sudo apt install nvidia-cuda-toolkit nvidia-cuda-toolkit-gcc

nvcc --version

gcc --version

g++ --version

sed -i 's/-arch=native/-arch=all/g' Makefile

```

- With GPU support
```
make clean && LLAMA_CUBLAS=1 make -j
```

- Without GPU support
```
make clean && make -j
```

<br />

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

Download a LLM file and save it in the models folder. 
For example, you can use https://huggingface.co/TheBloke/Wizard-Vicuna-7B-Uncensored-GGML/resolve/main/Wizard-Vicuna-7B-Uncensored.ggmlv3.q5_1.bin

```
mkdir models

cd models

wget https://huggingface.co/TheBloke/Wizard-Vicuna-7B-Uncensored-GGML/resolve/main/Wizard-Vicuna-7B-Uncensored.ggmlv3.q5_1.bin
```
<br />

5. Obtain your ```FULLMETAL_API_KEY``` by following instructions mentioned [here](https://fullmetal.gitbook.io/docs/how-to-obtain-api-key)
<br /><br />

6. Open ```config.js``` and change the path to llama.cpp main file, and the model name/path. You can adjust the parameter value as per your requirement

```
config.llamaConfig = {
  name: 'TheBloke/Wizard-Vicuna-7B-Uncensored.ggmlv3.q5_1', // model name
  m: 'Wizard-Vicuna-7B-Uncensored.ggmlv3.q5_1.bin', // model path (default: Wizard-Vicuna-7B-Uncensored.ggmlv3.q5_1.bin)
  ngl: '28', //   -ngl N, --n-gpu-layers N number of layers to store in VRAM
  n: 512, //   -n N, --n-predict N   number of tokens to predict (default: -1, -1 = infinity, -2 = until context filled)
};
config.llamacpp = '../llama.cpp/main';
```

7. Create ```.env``` and add following key
```
FULLMETAL_API_KEY=YOUR_FULLMETAL_API_KEY
```

8. Open ```server.js``` file and change the following object with your values
```
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


