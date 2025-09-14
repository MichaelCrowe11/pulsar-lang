import time
from ..core.bus import EventBus
from ..core.types import Event, TOPIC_FILL

class ReconcileAgent:
    def __init__(self, bus: EventBus, store, mode: str):
        self.bus = bus
        self.store = store
        self.mode = mode
        self.positions = {}  # symbol -> (qty, avg_price)

    def apply_fill(self, client_id: str, symbol: str, side: str, amount: float, price: float):
        qty, avg = self.positions.get(symbol, (0.0, 0.0))
        if side == "buy":
            new_qty = qty + amount
            new_avg = (qty*avg + amount*price) / new_qty if new_qty > 0 else 0.0
            self.positions[symbol] = (new_qty, new_avg)
            # cash update (paper/backtest)
            if self.mode != "live":
                cash = float(self.store.get_meta("cash_USDT", "0") or 0)
                cash -= amount * price
                self.store.set_meta("cash_USDT", str(cash))
        else:
            new_qty = qty - amount
            self.positions[symbol] = (new_qty, avg)
            if self.mode != "live":
                cash = float(self.store.get_meta("cash_USDT", "0") or 0)
                cash += amount * price
                self.store.set_meta("cash_USDT", str(cash))

        self.store.upsert_position(symbol, *self.positions[symbol])
        self.store.add_trade(client_id, time.time(), symbol, side, amount, price, 0.0, self.mode)

    async def run(self):
        q = await self.bus.subscribe(TOPIC_FILL)
        while True:
            ev: Event = await q.get()
            self.apply_fill(ev.payload.get("client_id"), ev.payload["symbol"],
                          ev.payload["side"], float(ev.payload["amount"]), float(ev.payload["price"]))