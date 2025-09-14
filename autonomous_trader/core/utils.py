import asyncio, random

async def sleep_jittered(sec: float, jitter: float = 0.1):
    j = sec * jitter
    await asyncio.sleep(max(0.0, sec + random.uniform(-j, j)))