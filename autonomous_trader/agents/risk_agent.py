import time, math
from ..core.bus import EventBus
from ..core.types import Event, TOPIC_SIGNAL, TOPIC_INTENT, TOPIC_ALERT

class RiskAgent:
    def __init__(self, bus: EventBus, exchange, cfg):
        self.bus = bus
        self.exchange = exchange
        self.cfg = cfg
        self.last_equity = 0.0
        self.peak_equity = 0.0

    def micro_cap_gate(self, symbol: str, notional: float, edge_bps: float) -> tuple[bool, str]:
        p0 = self.cfg.get("phase0", {})
        if not p0.get("enabled", False):
            return True, "disabled"

        meta = self.exchange.market_meta(symbol)
        min_notional = (meta.get("min_notional") or 0.0) * float(p0.get("min_notional_buffer", 1.0))
        taker_bps = float(meta.get("taker", 0.001)) * 1e4
        spread_bps = 10.0  # placeholder; compute from orderbook if available
        slippage_bps = float(self.cfg.get("execution", {}).get("slippage_bps", 5)) if self.cfg.get("execution") else 5.0
        safety_bps = float(p0.get("safety_bps", 3))

        if notional < min_notional:
            return False, f"below min_notional {min_notional}"
        if self.last_equity < float(p0.get("min_live_balance_usd", 25)):
            return False, "low equity"
        if notional > float(p0.get("max_trade_usd", 1)):
            return False, "max_trade_usd"
        if edge_bps <= (taker_bps + spread_bps + slippage_bps + safety_bps):
            return False, "edge<costs"
        return True, "ok"

    async def run(self):
        q = await self.bus.subscribe(TOPIC_SIGNAL)
        while True:
            ev: Event = await q.get()
            sym = ev.payload["symbol"]
            px = float(ev.payload["px"])
            side = ev.payload["side"]
            edge_bps = float(ev.payload.get("strength_bps", 0))

            # balances
            bal = self.exchange.fetch_balance()
            usd = float(bal.get("total", {}).get("USDT", 0))
            btc = float(bal.get("total", {}).get("BTC", 0))
            self.last_equity = usd + btc * px
            self.peak_equity = max(self.peak_equity, self.last_equity)

            # sizing
            risk_pct = float(self.cfg["risk"]["risk_per_trade_pct"]) if "risk" in self.cfg else 0.01
            order_value = self.last_equity * risk_pct
            amount = max(0.0, order_value / px)

            # caps
            max_pos = self.last_equity * float(self.cfg["risk"]["max_position_pct"]) if "risk" in self.cfg else self.last_equity
            # simple pos cap: use amount directly for now

            notional = amount * px
            ok, reason = self.micro_cap_gate(sym, notional, edge_bps)
            if not ok and self.cfg.get("mode") == "live":
                await self.bus.publish(Event(topic=TOPIC_ALERT,
                    payload={"severity":"warn","msg":f"Gate block: {reason}","symbol":sym}))
                continue

            intent = {"symbol": sym, "side": side, "amount": amount, "notional": notional,
                     "px": px, "client_id": f"{sym.replace('/','-')}-{int(time.time()*1000)}"}
            await self.bus.publish(Event(topic=TOPIC_INTENT, payload=intent))