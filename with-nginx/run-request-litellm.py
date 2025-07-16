import litellm
from litellm import acompletion
import asyncio
import json
import time
from dotenv import load_dotenv
from datetime import datetime, timezone
import os
import sys


async def single(file_name: str, model: str, region: str) -> None:
    with open(file_name) as f:
        request = f.read()

    dict_request = json.loads(request)

    now_utc = datetime.now(timezone.utc)
    start = time.monotonic()

    response = await acompletion(
        messages=dict_request, 
        model=model,
        base_url = "http://localhost:8080/v1",
        api_key="sk-1234",
        temperature=0,
        extra_headers={"a":"b"},
    )
    took = time.monotonic() - start
    print(
        "Litellm     Start:",
        now_utc,
        "Took:",
        int(1000 * took),
        "Model:",
        model,
        region,
    )


async def main(region) -> None:
    load_dotenv()
    #litellm._turn_on_debug()
#    os.environ["LITELLM_PROXY_API_KEY"] = "sk-1234"
#    os.environ["LITELLM_PROXY_API_BASE"] = "http://localhost:8080/v1/chat/completions"

    models = [
        # "bedrock/amazon.nova-pro-v1:0",
        "bedrock/anthropic.claude-3-sonnet-20240229-v1:0",
        # "bedrock/anthropic.claude-3-5-sonnet-20240620-v1:0",
        # "bedrock/anthropic.claude-3-haiku-20240307-v1:0",
    ]

    agent_ids = []

    for filename in os.listdir("."):
        if filename.endswith(".request"):
            agent_ids.append(filename)

    repeat = 1

    for model in models:
        tasks = [
            single(agent_id, model.replace("bedrock/","openai/") , region)
            for agent_id in agent_ids
            for _ in range(repeat)
        ]

    await asyncio.gather(*tasks)


if __name__ == "__main__":
    region = "eu-west-1"
    if len(sys.argv) > 1:
        region = sys.argv[1]

    asyncio.run(main(region))
