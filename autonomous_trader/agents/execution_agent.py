from ..core.bus import EventBus
from ..core.types import Event, TOPIC_INTENT, TOPIC_ORDER, TOPIC_FILL

class ExecutionAgent:
    def __init__(self, bus: EventBus, exchange, mode: str = "paper"):
        self.bus = bus
        self.exchange = exchange
        self.mode = mode

    async def run(self):
        q = await self.bus.subscribe(TOPIC_INTENT)
        while True:
            ev: Event = await q.get()
            sym, side, amount, cid = ev.payload["symbol"], ev.payload["side"], \
                                     float(ev.payload["amount"]), ev.payload["client_id"]
            px = float(ev.payload.get("px", 0))

            if amount <= 0:
                continue

            if self.mode == "paper":
                # naive fill at px with 5 bps slippage
                fill_px = px * 1.0005 if side == "buy" else px * 0.9995
                await self.bus.publish(Event(topic=TOPIC_ORDER,
                    payload={"client_id": cid, "status":"filled","paper":True}))
                await self.bus.publish(Event(topic=TOPIC_FILL,
                    payload={"client_id": cid, "symbol": sym, "side": side, "amount": amount,
                            "price": fill_px}))
            else:
                try:
                    order = self.exchange.create_market_order(sym, side, amount, client_id=cid)
                    await self.bus.publish(Event(topic=TOPIC_ORDER,
                        payload={"client_id": cid, "status":"submitted","id": order.get("id")}))
                    # NOTE: for simplicity assume immediate fill; production should poll `fetch_order`
                    avg = order.get("average") or px
                    await self.bus.publish(Event(topic=TOPIC_FILL,
                        payload={"client_id": cid, "symbol": sym, "side": side, "amount":
                                float(order.get("amount", amount)), "price": float(avg)}))
                except Exception as e:
                    await self.bus.publish(Event(topic="alert",
                        payload={"severity":"error","msg":f"Exec error: {e}"}))