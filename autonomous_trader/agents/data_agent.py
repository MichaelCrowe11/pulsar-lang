import asyncio, time
import pandas as pd
from typing import Dict, List
from ..core.bus import EventBus
from ..core.types import Event, TOPIC_BAR
from ..core.utils import sleep_jittered

class DataAgent:
    def __init__(self, bus: EventBus, exchange, symbols: List[str], timeframe: str, interval_sec: int):
        self.bus = bus
        self.exchange = exchange
        self.symbols = symbols
        self.timeframe = timeframe
        self.interval_sec = interval_sec

    async def run(self):
        while True:
            t0 = time.time()
            try:
                for sym in self.symbols:
                    ohlcv = self.exchange.fetch_ohlcv(sym, self.timeframe, limit=200)
                    df = pd.DataFrame(ohlcv, columns=["ts","open","high","low","close","volume"])
                    payload = {"symbol": sym, "bars": df.to_dict(orient="list")}
                    await self.bus.publish(Event(topic=TOPIC_BAR, payload=payload))
            except Exception as e:
                await self.bus.publish(Event(topic="alert",
                    payload={"severity":"error","msg":f"DataAgent: {e}"}))
            dt = max(0.0, self.interval_sec - (time.time() - t0))
            await sleep_jittered(dt, 0.2)