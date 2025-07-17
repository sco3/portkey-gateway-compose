// runRequests.ts
import * as dotenv from "dotenv";
import * as fs from "fs/promises"; // For asynchronous file system operations
import * as path from "path"; // For path manipulation
import Portkey from "portkey-ai"; // Import the Portkey SDK

/**
 * Reads all files ending with '.request' in the current directory,
 * sends their content as chat completion requests to Portkey concurrently,
 * and logs the responses or errors.
 */
async function runConcurrentRequests(repeat: number = 1) {
    dotenv.config();
    const region = process.argv[1] || "eu-west-1";
    const PORTKEY_CONFIG = {
        baseUrl: "http://localhost:8787",
        provider: "bedrock",
        awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
        awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        awsRegion: region,
    };
    const portkey = new Portkey(PORTKEY_CONFIG);
    console.log("Starting concurrent requests...");

    let requestFiles: string[] = [];
    try {
        const files = await fs.readdir(".");
        requestFiles = files.filter((file) => file.endsWith(".request"));
    } catch (error) {
        console.error("Error reading directory or filtering files:", error);
        return;
    }

    // Create an array of Promises, one for each request, repeated 'repeat' times
    const tasks: Promise<void>[] = [];
    for (const fileName of requestFiles) {
        for (let i = 0; i < repeat; i++) {
            tasks.push((async () => {
                const filePath = path.join(".", fileName);
                let requestContent: string = "";
                let requestPayload: any;

                requestContent = await fs.readFile(filePath, "utf8");
                requestPayload = JSON.parse(requestContent);
                const taskStartUtc = new Date().toISOString();
                const startTime = performance.now();
                const model = "anthropic.claude-3-haiku-20240307-v1:0";
                const response = await portkey.chat.completions.create({
                    messages: requestPayload,
                    model: model,
                });

                const took = Math.trunc(performance.now() - startTime);
                const latency = parseInt(response.metrics?.latencyMs ?? 0);
                const delta = took - latency;

                console.log("portkey-ts", region, model, "StartUTC:", taskStartUtc, "Took:", took, "Latency", latency, delta);
            })());
        }
    }

    const results = await Promise.allSettled(tasks);
    results.forEach((result) => {

    });
}

runConcurrentRequests(3);
