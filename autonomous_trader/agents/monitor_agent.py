import time
import asyncio
from ..core.bus import EventBus
from ..core.types import Event, TOPIC_HEARTBEAT, TOPIC_ALERT

class MonitorAgent:
    def __init__(self, bus: EventBus, interval_sec: int = 60):
        self.bus = bus
        self.interval = interval_sec

    async def run(self):
        while True:
            await self.bus.publish(Event(topic=TOPIC_HEARTBEAT, payload={"ts": time.time()}))
            await asyncio.sleep(self.interval)