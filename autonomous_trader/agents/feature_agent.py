import asyncio
import pandas as pd
from ..core.bus import EventBus
from ..core.types import Event, TOPIC_BAR, TOPIC_FEATURES

class FeatureAgent:
    def __init__(self, bus: EventBus, fast=20, slow=50):
        self.bus = bus
        self.fast = fast
        self.slow = slow

    async def run(self):
        q = await self.bus.subscribe(TOPIC_BAR)
        while True:
            ev: Event = await q.get()
            sym = ev.payload["symbol"]
            df = pd.DataFrame(ev.payload["bars"])  # columns ts,open,high,low,close,volume
            df["sma_fast"] = df["close"].rolling(self.fast).mean()
            df["sma_slow"] = df["close"].rolling(self.slow).mean()
            payload = {"symbol": sym, "features":
                      df[["ts","close","sma_fast","sma_slow"]].tail(2).to_dict(orient="list")}
            await self.bus.publish(Event(topic=TOPIC_FEATURES, payload=payload))