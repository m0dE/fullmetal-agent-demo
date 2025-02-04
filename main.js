import { LlamaModel, LlamaContext, LlamaChatSession } from "node-llama-cpp"; // Importing Llama model and context classes
import Fullmetal from "fullmetal-agent"; // Importing Fullmetal agent for handling prompts
import fs from "fs"; // Importing file system module for file operations
import "dotenv/config"; // Loading environment variables from .env file

const modelTemplate = `${process.env.MODEL_TEMPLATE}`; // Template for the model prompt

// Check if the model file exists
if (!fs.existsSync(process.env.MODEL_FILE)) {
  console.log(`${process.env.MODEL_FILE} does not exist`); // Log if the model file does not exist
} else {
  console.log(`${process.env.MODEL_FILE} exists`); // Log if the model file exists

  // Initializing the Llama model with configuration
  const model = new LlamaModel({
    modelPath: process.env.MODEL_FILE, // Path to the model file
    gpuLayers: parseInt(process.env.NGL, 10), // Number of GPU layers
    contextSize: 4096, // Size of the context
    threads: 12, // Number of threads to use
    temperature: 0.6, // Temperature for randomness in responses
    seed: 3407, // Seed for random number generation
  });

  // Configuration for the Fullmetal agent
  const fullMetalConfig = {
    name: process.env.AGENT_NAME, // Name of the agent
    apiKey: process.env.FULLMETAL_API_KEY, // API key for Fullmetal
    models: [process.env.MODEL_NAME], // Models to be used by the agent
    isPublic: true, // Whether the agent is public
    restartOnDisconnect: true, // Restart the agent on disconnect
  };

  // Creating a new Fullmetal agent instance
  const fullmetalAgent = new Fullmetal(fullMetalConfig);
  console.debug("Fullmetal agent created with config:", fullMetalConfig); // Debug log for agent configuration

  // Handling incoming prompts
  fullmetalAgent.onPrompt(async (data) => {
    console.debug("Received prompt data:", data); // Log received prompt data
    await getApiResponse(data, async (response) => {
      // response= {token:'', completed:false, speed:10, model:''Wizard-Vicuna-7B-Uncensored'}
      fullmetalAgent.sendResponse(response); // Send the response back to the agent
    });
  });

  // Function to summarize retrieved context to reduce token usage
  const summarizeText = async (text) => {
    const context = new LlamaContext({ model }); // Create a new context for the model
    const session = new LlamaChatSession({ context }); // Create a new chat session

    let summary = ""; // Initialize summary variable
    // Prompt the model to summarize the text
    await session.prompt(`Summarize this knowledge concisely:\n\n${text}`, {
      stop: ["<｜User｜>", "<｜End｜>", "User:", "Assistant:"], // Stop tokens for the prompt
      onToken(chunk) {
        summary += context.decode(chunk); // Decode and append each chunk to the summary
      },
    });
    console.debug("Summary before trimming:", summary); // Debug log before trimming
    console.log(summary.trim());
    console.debug("Summary after trimming:", summary.trim()); // Debug log after trimming
    return summary.trim(); // Return the trimmed summary
  };

  // Function to get API response
  const getApiResponse = async (data, cb) => {
    let context = null;
    let session = null;
    try {
      context = new LlamaContext({ model }); // Creating a new Llama context
      session = new LlamaChatSession({ context }); // Creating a new chat session
      const startTime = Date.now(); // Start time for performance measurement
      let tokenLength = 0; // Initialize token length counter

      let retrievedContext = await summarizeText(data.prompt); // Summarize before passing to model
      // Create an augmented prompt with context and user prompt
      const promptWithContext = `Context:\n${retrievedContext}\n\nUser Prompt:\n${data.prompt}`;

      let userPrompt = modelTemplate
        .replace("{prompt}", promptWithContext) // Replace prompt in the template
        .replace("{system_prompt}", data.options.sysPrompt); // Replace system prompt in the template
      let responseMessage = ""; // Initialize response message variable
      // Sending the prompt to the session
      await session.prompt(`${userPrompt}`, {
        onToken(chunk) {
          tokenLength += chunk.length; // Update token length
          responseMessage += context.decode(chunk); // Decode and append each chunk to the response message
        },
      });

      const endTime = Date.now(); // End time for performance measurement
      // Calculate the elapsed time in seconds
      const elapsedTimeInSeconds = (endTime - startTime) / 1000;
      const tokensPerSecond = tokenLength / elapsedTimeInSeconds; // Calculate tokens per second

      let cleanedResponseMessage, thinkContent; // Initialize variables for cleaned response and think content

      // Check if the response contains think content
      if (responseMessage.includes("</think>")) {
        thinkContent = responseMessage.split(/<\/think>/)[0]; // Extract think content
        cleanedResponseMessage = responseMessage.split(/<\/think>/)[1]; // Extract cleaned response
      } else {
        cleanedResponseMessage = responseMessage; // No think content, use full response
        thinkContent = ""; // No think content
      }

      // Clean up the response message
      cleanedResponseMessage = cleanedResponseMessage.replace(/undefined/g, "");
      thinkContent = thinkContent.replace(/undefined/g, "");

      console.log("Cleaned response message:", cleanedResponseMessage); // Log cleaned response message
      console.log("Think content:", thinkContent); // Log think content
      // Callback with the response data
      cb({
        token: cleanedResponseMessage,
        reasoning: thinkContent,
        completed: true,
        model: process.env.MODEL_NAME,
        elapsedTime: elapsedTimeInSeconds.toFixed(2), // Elapsed time in seconds
        speed: tokensPerSecond.toFixed(2), // Speed in tokens per second
        promptLength: data.prompt.length, // Length of the user prompt
        responseLength: tokenLength, // Length of the response
      });

      // Trigger garbage collection if available
      if (global.gc) {
        global.gc(); // Manually trigger garbage collection
        console.debug("Freed Llama context and session to release GPU memory."); // Debug log for garbage collection
      } else {
        console.log("Garbage collection is not available."); // Log if garbage collection is not available
      }
    } catch (e) {
      console.error("Error in getApiResponse:", e); // Log any errors that occur
    }
  };
}
