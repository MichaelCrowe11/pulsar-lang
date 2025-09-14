import asyncio, time
import pandas as pd
from ..core.bus import EventBus
from ..core.types import Event, TOPIC_BAR

class BacktestAgent:
    def __init__(self, bus: EventBus, exchange, symbols, timeframe: str,
                 lookback_bars: int = 1000, speed: float = 50.0):
        self.bus = bus
        self.exchange = exchange
        self.symbols = symbols
        self.timeframe = timeframe
        self.lookback = lookback_bars
        self.speed = max(1.0, speed)

    async def run(self):
        # Preload OHLCV for each symbol
        datasets = {}
        for sym in self.symbols:
            ohlcv = self.exchange.fetch_ohlcv(sym, self.timeframe, limit=self.lookback)
            df = pd.DataFrame(ohlcv, columns=["ts","open","high","low","close","volume"]).astype({"ts":"int64"})
            datasets[sym] = df

        # Start replay (growing window)
        cursors = {s: max(50, min(200, len(datasets[s]))) for s in self.symbols}  # warmup
        done = False
        while not done:
            done = True
            t0 = time.time()
            for sym, df in datasets.items():
                i = cursors[sym]
                if i < len(df):
                    done = False
                    sub = df.iloc[: i + 1]
                    payload = {"symbol": sym, "bars": sub.to_dict(orient="list")}
                    await self.bus.publish(Event(topic=TOPIC_BAR, payload=payload))
                    cursors[sym] += 1

            # pace
            await asyncio.sleep(1.0 / self.speed)