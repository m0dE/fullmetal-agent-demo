import { LlamaModel, LlamaContext, LlamaChatSession } from "node-llama-cpp"; // Importing necessary classes for Llama model interaction
import Fullmetal from "fullmetal-agent"; // Importing Fullmetal agent for handling prompts
import { pipeline } from "@xenova/transformers"; // Importing pipeline for feature extraction
import { ChromaClient } from "chromadb"; // Importing ChromaClient for managing knowledge base
import fs from "fs"; // Importing file system module for file operations
import "dotenv/config"; // Importing environment variables from .env file

// Template for the model prompt
const modelTemplate = `${process.env.MODEL_TEMPLATE}`;

// Initializing the embedder for feature extraction
const embedder = await pipeline(
  "feature-extraction",
  "Xenova/all-MiniLM-L6-v2"
);

// Creating a new Chroma client for knowledge base management
const chroma = new ChromaClient();
const collection = await chroma.getOrCreateCollection({
  name: process.env.CHROMA_COLLECTION, // Name of the knowledge base collection
});

// Checking if the model file exists
if (!fs.existsSync(process.env.MODEL_FILE)) {
  console.log(`${process.env.MODEL_FILE} does not exist`); // Log if the model file is missing
} else {
  console.log(`${process.env.MODEL_FILE} exists`); // Log if the model file is found

  // Initializing the Llama model with specified parameters
  const model = new LlamaModel({
    modelPath: process.env.MODEL_FILE, // Path to the model file
    gpuLayers: parseInt(process.env.NGL, 10), // Number of GPU layers
    contextSize: 8192, // Size of the context
    threads: 12, // Number of threads to use
    temperature: 0.6, // Temperature for response variability
    seed: 3407, // Seed for random number generation
  });

  // Debugging information for model initialization
  console.debug("LlamaModel initialized with config:", {
    modelPath: process.env.MODEL_FILE,
    gpuLayers: process.env.NGL,
  });

  // Configuration for the Fullmetal agent
  const fullMetalConfig = {
    name: process.env.AGENT_NAME, // Name of the agent
    apiKey: process.env.FULLMETAL_API_KEY, // API key for authentication
    models: [process.env.MODEL_NAME], // List of models to use
    isPublic: true, // Public access flag
    restartOnDisconnect: true, // Restart on disconnection flag
  };

  // Creating a new Fullmetal agent instance
  const fullmetalAgent = new Fullmetal(fullMetalConfig);
  console.debug("Fullmetal agent created with config:", fullMetalConfig);

  // Setting up the prompt handler for the Fullmetal agent
  fullmetalAgent.onPrompt(async (data) => {
    console.debug("Received prompt data:", data); // Log received prompt data
    await getApiResponse(data, async (response) => {
      fullmetalAgent.sendResponse(response); // Send the response back to the agent
    });
  });

  // Function to store knowledge into the vector database
  const addToKnowledgeBase = async (text, id) => {
    console.debug("Adding to knowledge base:", { text, id }); // Log the addition of knowledge
    const embedding = await embedder(text, {
      pooling: "mean", // Pooling method for embeddings
      normalize: true, // Normalize the embeddings
    });
    await collection.add({
      ids: [id], // Unique identifier for the entry
      embeddings: [embedding.data], // Embedding data
      documents: [text], // Original text
    });
    console.debug("Knowledge base updated with ID:", id); // Log successful update
  };

  // Function to retrieve relevant knowledge based on a query
  const retrieveContext = async (query) => {
    console.debug("Retrieving context for query:", query); // Log the query being processed
    const queryEmbedding = await embedder(query, {
      pooling: "mean", // Pooling method for query embeddings
      normalize: true, // Normalize the query embeddings
    });
    const results = await collection.query({
      queryEmbeddings: [queryEmbedding.data], // Query embeddings
      nResults: 10, // Number of results to return
    });
    console.debug("Context retrieved:", results.documents); // Log retrieved documents
    return results.documents.flat().join("\n"); // Return the documents as a single string
  };

  // Function to generate API response with RAT
  const getApiResponse = async (data, cb) => {
    try {
      console.debug("Generating API response for data:", data); // Log the data being processed

      const retrievedContext = await retrieveContext(data.prompt); // Retrieve context for the prompt
      const augmentedPrompt = `Context:\n${retrievedContext}\n\nUser Prompt:\n${data.prompt}`; // Create an augmented prompt

      const context = new LlamaContext({ model }); // Create a new context for the Llama model
      const session = new LlamaChatSession({ context }); // Create a new chat session

      const startTime = Date.now(); // Start time for performance measurement
      let tokenLength = 0; // Initialize token length counter
      let userPrompt = modelTemplate
        .replace("{prompt}", augmentedPrompt) // Replace placeholder with the augmented prompt
        .replace("{system_prompt}", data.options.sysPrompt); // Replace system prompt placeholder

      console.log("User prompt sent to model:", userPrompt); // Log the user prompt being sent
      let responseMessage = ""; // Initialize response message

      // Send the prompt to the model and handle token responses
      await session.prompt(userPrompt, {
        stop: ["<｜User｜>", "<｜End｜>", "User:", "Assistant:"], // Define stop sequences
        onToken(chunk) {
          tokenLength += chunk.length; // Update token length
          responseMessage += context.decode(chunk); // Decode and append the chunk to the response message
        },
      });
      const endTime = Date.now(); // End time for performance measurement
      const elapsedTimeInSeconds = (endTime - startTime) / 1000; // Calculate elapsed time in seconds
      const tokensPerSecond = tokenLength / elapsedTimeInSeconds; // Calculate tokens processed per second
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
      cleanedResponseMessage = cleanedResponseMessage.replace(/undefined/g, ""); // Remove undefined values
      thinkContent = thinkContent.replace(/undefined/g, ""); // Remove undefined values

      console.log("Cleaned response message:", cleanedResponseMessage); // Log cleaned response message
      console.log("Think content:", thinkContent); // Log think content
      cb({
        token: cleanedResponseMessage, // Return cleaned response
        reasoning: thinkContent, // Return think content
        completed: true, // Mark as completed
        model: process.env.MODEL_NAME, // Return model name
        elapsedTime: elapsedTimeInSeconds.toFixed(2), // Return elapsed time
        speed: tokensPerSecond.toFixed(2), // Return processing speed
        promptLength: data.prompt.length, // Return length of the prompt
        responseLength: tokenLength, // Return length of the response
      });

      console.log(`nGPU: ${process.env.NGL}`); // Log number of GPU layers
      console.log(`Total time taken: ${elapsedTimeInSeconds}`); // Log total time taken
      console.log(`Tokens Per Second: ${tokensPerSecond.toFixed(2)}`); // Log tokens processed per second

      // Log the model response being stored in the knowledge base for debugging purposes
      console.debug(
        "Storing model response into knowledge base:",
        responseMessage
      );

      // Log the user prompt being stored in the knowledge base for debugging purposes
      console.debug(
        "Storing new user prompt in the knowledge base:",
        data.prompt
      );

      // Add the user prompt to the knowledge base with a unique identifier based on the current timestamp
      await addToKnowledgeBase(data.prompt, `prompt-${Date.now()}`);
      console.debug("User prompt stored successfully."); // Confirm successful storage of user prompt

      // Add the cleaned model response to the knowledge base with a unique identifier based on the current timestamp
      await addToKnowledgeBase(
        cleanedResponseMessage,
        `response-${Date.now()}`
      );
      console.debug("Model response stored successfully."); // Confirm successful storage of model response
    } catch (e) {
      // Log any errors that occur during the process
      console.error("Error in getApiResponse:", e);
    }
  };
}
