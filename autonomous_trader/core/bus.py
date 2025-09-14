import asyncio
from typing import Dict, List
from .types import Event

class EventBus:
    def __init__(self):
        self._topics: Dict[str, List[asyncio.Queue]] = {}
        self._lock = asyncio.Lock()

    async def subscribe(self, topic: str) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=1000)
        async with self._lock:
            self._topics.setdefault(topic, []).append(q)
        return q

    async def publish(self, event: Event):
        qs = self._topics.get(event.topic, [])
        for q in qs:
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                # drop oldest to keep moving
                try:
                    q.get_nowait()
                except Exception:
                    pass
                await q.put(event)

    def subscribers(self, topic: str) -> int:
        return len(self._topics.get(topic, []))