// runRequests.ts
import * as fs from "fs/promises"; // For asynchronous file system operations
import * as path from "path"; // For path manipulation
import Portkey from "portkey-ai"; // Import the Portkey SDK
import * as dotenv from "dotenv";

/**
 * Reads all files ending with '.request' in the current directory,
 * sends their content as chat completion requests to Portkey concurrently,
 * and logs the responses or errors.
 */
async function runConcurrentRequests() {
    dotenv.config();
    const PORTKEY_CONFIG = {
        baseUrl: "http://localhost:8787",
        provider: "bedrock",
        awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
        awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        awsRegion: "eu-west-1",
    };
    const portkey = new Portkey(PORTKEY_CONFIG);
    console.log("Starting concurrent requests...");

    let requestFiles: string[] = [];
    try {
        // Read all entries in the current directory
        const files = await fs.readdir(".");
        // Filter for files ending with '.request'
        requestFiles = files.filter((file) => file.endsWith(".request"));

        if (requestFiles.length === 0) {
            console.warn("No *.request files found in the current directory.");
            return;
        }

        console.log(
            `Found ${requestFiles.length} request file(s): ${requestFiles.join(", ")}`,
        );
    } catch (error) {
        console.error("Error reading directory or filtering files:", error);
        return;
    }

    // Create an array of Promises, one for each request
    const tasks = requestFiles.map(async (fileName) => {
        const filePath = path.join(".", fileName);
        let requestContent: string = "";
        let requestPayload: any;

        try {
            // Read the content of the request file
            requestContent = await fs.readFile(filePath, "utf8");

            // Parse the JSON content
            requestPayload = JSON.parse(requestContent);

            console.log(`Processing ${fileName}...`);


            const startTime = performance.now();
            const response = await portkey.chat.completions.create({
                messages: requestPayload,
                model: "anthropic.claude-3-haiku-20240307-v1:0",
            });
            const took = performance.now() - startTime;
            console.log("Took:", took, "Metrics", response);
            return {fileName, status: "fulfilled", content};
        } catch (error: any) {
            // Handle errors during file reading, JSON parsing, or API call
            console.error(`${fileName} Error: ${error.message || error}\n`);
            return {fileName, status: "rejected", error: error.message || error};
        }
    });

    // Run all tasks concurrently and wait for all to settle
    const results = await Promise.allSettled(tasks);

    console.log("\n--- All requests finished ---");
    results.forEach((result) => {
        if (result.status === "fulfilled") {
            console.log(`[SUCCESS] ${result.value.fileName}`);
        } else {
            console.log(
                `[FAILED] ${result.reason.fileName || "Unknown file"}: ${result.reason.error || result.reason}`,
            );
        }
    });
}

// Execute the main function
runConcurrentRequests();
