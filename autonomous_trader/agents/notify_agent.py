import os, logging
import asyncio
from ..core.bus import EventBus
from ..core.types import Event, TOPIC_ALERT, TOPIC_ORDER, TOPIC_FILL

class NotifyAgent:
    def __init__(self, bus: EventBus):
        self.bus = bus
        self.log = logging.getLogger("trader")

    async def run(self):
        qa = await self.bus.subscribe(TOPIC_ALERT)
        qo = await self.bus.subscribe(TOPIC_ORDER)
        qf = await self.bus.subscribe(TOPIC_FILL)

        while True:
            done, pending = await asyncio.wait({asyncio.create_task(qa.get()),
                                               asyncio.create_task(qo.get()),
                                               asyncio.create_task(qf.get())},
                                              return_when=asyncio.FIRST_COMPLETED)
            for t in done:
                ev: Event = t.result()
                if ev.topic == TOPIC_ALERT:
                    self.log.warning(f"[ALERT] {ev.payload}")
                elif ev.topic == TOPIC_ORDER:
                    self.log.info(f"[ORDER] {ev.payload}")
                elif ev.topic == TOPIC_FILL:
                    self.log.info(f"[FILL] {ev.payload}")