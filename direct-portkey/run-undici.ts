import * as dotenv from "dotenv";
import * as fs from "fs/promises";
import * as path from "path";
import { request } from "undici";

/**
 * Reads all files ending with '.request' in the current directory,
 * sends their content as POST requests to the gateway using undici,
 * and logs the responses or errors with timing and region info.
 */
async function runConcurrentUndiciRequests(repeat: number = 1) {
    dotenv.config();
    const region = process.argv[2] || "us-east-1";
    const url = "http://localhost:8787/v1/chat/completions";
    const headers = {
        "content-type": "application/json",
        "x-portkey-provider": "bedrock",
        "x-portkey-aws-region": region,
        // Add more headers as needed, e.g.:
        // "x-portkey-aws-access-key-id": process.env.AWS_ACCESS_KEY_ID,
        // "x-portkey-aws-secret-access-key": process.env.AWS_SECRET_ACCESS_KEY,
        "authorization": "Bearer sk-1234"
    };
    console.log("Starting concurrent undici requests...");

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
                    const messages = JSON.parse(requestContent);
                    const model = process.env.OPENAI_MODEL || "anthropic.claude-3-haiku-20240307-v1:0";
                    requestPayload = {
                        model,
                        messages,
                        temperature: 0
                    };

                } catch (err) {
                    console.error(`Failed to read or parse ${fileName}:`, err);
                    return;
                }
                const taskStartUtc = new Date().toISOString();
                const startTime = performance.now();
                try {
                    const { statusCode, headers: respHeaders, body } = await request(url, {
                        method: "POST",
                        headers,
                        body: JSON.stringify(requestPayload)
                    });
                    const took = Math.trunc(performance.now() - startTime);
                    const responseText = await body.text();
                    let latency = took;
                    try {
                        const parsed = JSON.parse(responseText);
                        if (parsed.metrics && parsed.metrics.latencyMs) {
                            latency = parseInt(parsed.metrics.latencyMs);
                        }
                    } catch {}
                    const delta = took - latency;
                    console.log(
                        `undici region=${region} file=${fileName} status=${statusCode} startUtc=${taskStartUtc} latencyMs=${latency} tookMs=${took} deltaMs=${delta}`
                    );
                    if (statusCode !== 200) {
                        console.error(`Error response for ${fileName}:`, responseText);
                    }
                    // Optionally, print the response:
                    // console.log("Response:", responseText);
                } catch (err) {
                    console.error(`Undici request error for ${fileName}:`, err);
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

runConcurrentUndiciRequests(3);
