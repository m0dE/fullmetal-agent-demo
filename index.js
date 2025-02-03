import { LlamaModel, LlamaContext, LlamaChatSession } from "node-llama-cpp"; // Importing Llama model and context classes
import Fullmetal from "fullmetal-agent"; // Importing Fullmetal agent for handling prompts
import { pipeline } from "@xenova/transformers"; // Importing pipeline for feature extraction
import { ChromaClient } from "chromadb"; // Importing Chroma client for database operations
import fs from "fs"; // Importing file system module for file operations
import "dotenv/config"; // Loading environment variables from .env file

// Template for the model prompt
const modelTemplate = `${process.env.MODEL_TEMPLATE}`;

// Initializing the embedder for feature extraction
const embedder = await pipeline(
  "feature-extraction",
  "Xenova/all-MiniLM-L6-v2"
);

// Creating a new Chroma client instance
const chroma = new ChromaClient();

// Getting or creating a collection in Chroma database
const collection = await chroma.getOrCreateCollection({
  name: process.env.CHROMA_COLLECTION,
});

// Checking if the model file exists
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

  // Debugging information for model initialization
  console.debug("LlamaModel initialized with config:", {
    modelPath: process.env.MODEL_FILE,
    gpuLayers: process.env.NGL,
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
  console.debug("Fullmetal agent created with config:", fullMetalConfig);

  // Handling incoming prompts
  fullmetalAgent.onPrompt(async (data) => {
    console.debug("Received prompt data:", data); // Log received prompt data
    await getApiResponse(data, async (response) => {
      fullmetalAgent.sendResponse(response); // Send the response back to the agent
    });
  });

  // Function to add text to the knowledge base
  const addToKnowledgeBase = async (text, id) => {
    console.debug("Adding to knowledge base:", { text, id }); // Log the text being added
    const embedding = await embedder(text, {
      pooling: "mean", // Use mean pooling for embeddings
      normalize: true, // Normalize the embeddings
    });
    // Add the embedding and document to the collection
    await collection.add({
      ids: [id],
      embeddings: [embedding.data],
      documents: [text],
    });
    console.debug("Knowledge base updated with ID:", id); // Log successful update
  };

  // Function to retrieve context based on a query
  const retrieveContext = async (query) => {
    console.debug("Retrieving context for query:", query); // Log the query being processed
    const queryEmbedding = await embedder(query, {
      pooling: "mean", // Use mean pooling for the query embedding
      normalize: true, // Normalize the query embedding
    });
    // Query the collection for relevant documents
    const results = await collection.query({
      queryEmbeddings: [queryEmbedding.data],
      nResults: 5, // Number of results to return
    });
    console.debug("Context retrieved:", results.documents); // Log retrieved documents
    return results.documents.flat().join("\n"); // Return the documents as a single string
  };

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

    return summary.trim(); // Return the trimmed summary
  };

  // Function to generate API response based on incoming data
  const getApiResponse = async (data, cb) => {
    let context = null;
    let session = null;
    try {
      console.debug("Generating API response for data:", data); // Log the data being processed

      // Retrieve and summarize context for the user's prompt
      let retrievedContext = await retrieveContext(data.prompt);
      retrievedContext = await summarizeText(retrievedContext); // Summarize before passing to model

      // Create an augmented prompt with context and user prompt
      const augmentedPrompt = `Context:\n${retrievedContext}\n\nUser Prompt:\n${data.prompt}`;

      context = new LlamaContext({ model }); // Create a new context for the model
      session = new LlamaChatSession({ context }); // Create a new chat session

      const startTime = Date.now(); // Start time for performance measurement
      let tokenLength = 0; // Initialize token length counter
      // Prepare the user prompt for the model
      let userPrompt = modelTemplate
        .replace("{prompt}", augmentedPrompt)
        .replace("{system_prompt}", data.options.sysPrompt);

      console.log("User prompt sent to model:", userPrompt); // Log the user prompt
      let responseMessage = ""; // Initialize response message variable

      // Send the user prompt to the model and handle the response
      await session.prompt(userPrompt, {
        stop: ["<｜User｜>", "<｜End｜>", "User:", "Assistant:"], // Stop tokens for the prompt
        onToken(chunk) {
          tokenLength += chunk.length; // Count the length of each chunk
          responseMessage += context.decode(chunk); // Decode and append each chunk to the response message
        },
      });

      const endTime = Date.now(); // End time for performance measurement
      const elapsedTimeInSeconds = (endTime - startTime) / 1000; // Calculate elapsed time
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

      console.log(`nGPU: ${process.env.NGL}`); // Log number of GPUs used
      console.log(`Total time taken: ${elapsedTimeInSeconds}`); // Log total time taken
      console.log(`Tokens Per Second: ${tokensPerSecond.toFixed(2)}`); // Log tokens per second

      console.debug(
        "Storing model response into knowledge base:",
        responseMessage // Log the response being stored
      );
      console.debug(
        "Storing new user prompt in the knowledge base:",
        data.prompt // Log the user prompt being stored
      );

      // Add the user prompt and model response to the knowledge base
      await addToKnowledgeBase(data.prompt, `prompt-${Date.now()}`);
      console.debug("User prompt stored successfully."); // Log successful storage of user prompt

      await addToKnowledgeBase(
        cleanedResponseMessage,
        `response-${Date.now()}`
      );
      console.debug("Model response stored successfully."); // Log successful storage of model response
      if (global.gc) {
        global.gc(); // Manually trigger garbage collection
        console.debug("Freed Llama context and session to release GPU memory.");
      } else {
        console.log("Garbage collection is not available.");
      }
    } catch (e) {
      console.error("Error in getApiResponse:", e); // Log any errors that occur
      process.exit(0);
    } finally {
      // Free up GPU memory
      if (session) {
        session.free(); // Free the session
      }
      if (context) {
        context.free(); // Free the context
      }
      console.debug("Freed Llama context and session to release GPU memory.");
    }
  };
}
