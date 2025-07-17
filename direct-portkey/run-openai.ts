// run-openai.ts
import * as dotenv from "dotenv";
import * as fs from "fs/promises";
import { OpenAI } from "openai";
import * as path from "path";

/**
 * Reads all files ending with '.request' in the current directory,
 * sends their content as chat completion requests to OpenAI concurrently,
 * and logs the responses or errors.
 */
async function runConcurrentOpenAIRequests(repeat: number = 1) {
    dotenv.config();
    // Add any other required headers here:
    // "x-portkey-aws-access-key-id": "YOUR_KEY",
    // "x-portkey-aws-secret-access-key": "YOUR_SECRET",

    // Get region from command line or default to eu-west-1
    const region = process.argv[2] || "eu-west-1";
    const openai = new OpenAI({
        baseURL: "http://localhost:8787/v1",
        apiKey: "sk-1234",
        defaultHeaders: {
            "x-portkey-provider": "bedrock",
            "x-aws-region": region
        }
    });
    console.log("Starting concurrent OpenAI requests...");

    let requestFiles: string[] = [];
    try {
        const files = await fs.readdir(".");
        requestFiles = files.filter((file) => file.endsWith(".request"));
    } catch (error) {
        console.error("Error reading directory or filtering files:", error);
        return;
    }

    const tasks: Promise<void>[] = [];
    for (const fileName of requestFiles) {
        for (let i = 0; i < repeat; i++) {
            tasks.push((async () => {
                const filePath = path.join(".", fileName);
                let requestContent: string = "";
                let requestPayload: any;
                try {
                    requestContent = await fs.readFile(filePath, "utf8");
                    requestPayload = JSON.parse(requestContent);
                } catch (err) {
                    console.error(`Failed to read or parse ${fileName}:`, err);
                    return;
                }
                const taskStartUtc = new Date().toISOString();
                const startTime = performance.now();
                try {
                    const response = await openai.chat.completions.create({
                        messages: requestPayload,
                        model: process.env.OPENAI_MODEL || "anthropic.claude-3-haiku-20240307-v1:0",
                    });
                    const took = Math.trunc(performance.now() - startTime);
                    // Use latency from response.metrics if available, otherwise fallback to measured value
                    //const latency = parseInt(response.metrics?.latencyMs ?? took);
                    // Output a structured log with metrics for gateway compatibility
                    console.log(
                        `openai-ts region=${region} model=${process.env.OPENAI_MODEL || "anthropic.claude-3-haiku-20240307-v1:0"} responseId=${response.id} startUtc=${taskStartUtc} latencyMs=${took} status=success`
                    );
                } catch (err) {
                    console.error("OpenAI request error for", fileName, err);
                }
            })());
        }
    }

    const results = await Promise.allSettled(tasks);
    results.forEach((result, idx) => {
        if (result.status === "rejected") {
            console.error(`Task ${idx} failed:`, result.reason);
        }
    });
}

runConcurrentOpenAIRequests(1);
