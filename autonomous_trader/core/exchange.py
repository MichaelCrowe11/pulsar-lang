import os, time
import ccxt
from typing import Dict, Any

class ExchangeClient:
    def __init__(self, name: str, mode: str, store=None):
        self.name = name
        self.mode = mode
        self.store = store
        cfg = {}
        if name == "binance":
            cfg = {"apiKey": os.getenv("BINANCE_KEY"), "secret": os.getenv("BINANCE_SECRET")}
        self.ex = getattr(ccxt, name)(cfg)
        if mode == "paper":
            try:
                self.ex.set_sandbox_mode(True)
            except Exception:
                pass
        self.markets = self.ex.load_markets()

    def market_meta(self, symbol: str) -> Dict[str, Any]:
        m = self.markets.get(symbol, {})
        limits = m.get("limits", {})
        cost_min = (limits.get("cost") or {}).get("min")
        step = (m.get("precision") or {}).get("amount")
        tick = (m.get("precision") or {}).get("price")
        taker = m.get("taker", 0.001)
        maker = m.get("maker", 0.001)
        return {"min_notional": cost_min or 0.0, "step": step, "tick": tick,
                "taker": taker, "maker": maker}

    def fetch_ohlcv(self, symbol: str, timeframe: str = "1m", limit: int = 200):
        return self.ex.fetch_ohlcv(symbol, timeframe=timeframe, limit=limit)

    def fetch_balance(self):
        if self.mode in ("paper", "backtest") and self.store is not None:
            cash = float(self.store.get_meta("cash_USDT", "0") or 0)
            totals = {"USDT": cash}
            for sym, qty, _ in self.store.get_positions():
                base = sym.split("/")[0]
                totals[base] = totals.get(base, 0.0) + float(qty)
            return {"total": totals}
        return self.ex.fetch_balance()

    def fetch_ticker(self, symbol: str):
        return self.ex.fetch_ticker(symbol)

    def create_market_order(self, symbol: str, side: str, amount: float,
                           client_id: str = None):
        params = {"clientOrderId": client_id} if client_id else {}
        return self.ex.create_order(symbol, "market", side, amount, None, params)