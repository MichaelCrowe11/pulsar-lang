from ..core.bus import EventBus
from ..core.types import Event, TOPIC_FEATURES, TOPIC_SIGNAL

class StrategyAgent:
    def __init__(self, bus: EventBus):
        self.bus = bus

    async def run(self):
        q = await self.bus.subscribe(TOPIC_FEATURES)
        while True:
            ev: Event = await q.get()
            sym = ev.payload["symbol"]
            f = ev.payload["features"]
            # last two rows
            if len(f["sma_fast"]) >= 2 and len(f["sma_slow"]) >= 2:
                fast_prev, fast_now = f["sma_fast"][-2], f["sma_fast"][-1]
                slow_prev, slow_now = f["sma_slow"][-2], f["sma_slow"][-1]
                close_now = f["close"][-1]

                side = None
                if fast_prev and slow_prev and fast_now and slow_now:
                    if fast_prev < slow_prev and fast_now > slow_now:
                        side = "buy"
                    elif fast_prev > slow_prev and fast_now < slow_now:
                        side = "sell"

                if side:
                    payload = {"symbol": sym, "side": side, "px": close_now,
                              "strength_bps": abs((fast_now - slow_now)/close_now)*1e4}
                    await self.bus.publish(Event(topic=TOPIC_SIGNAL, payload=payload))