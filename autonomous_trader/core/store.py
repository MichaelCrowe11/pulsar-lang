import sqlite3, threading, time
from typing import Any, Dict, Tuple

_SQL_SCHEMA = """
CREATE TABLE IF NOT EXISTS positions (
    symbol TEXT PRIMARY KEY,
    qty REAL NOT NULL,
    avg_price REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS trades (
    id TEXT PRIMARY KEY,
    ts REAL, symbol TEXT, side TEXT, qty REAL, price REAL, fees REAL, mode TEXT
);

CREATE TABLE IF NOT EXISTS equity (
    ts REAL, equity REAL
);

CREATE TABLE IF NOT EXISTS meta (
    k TEXT PRIMARY KEY, v TEXT
);
"""

class Store:
    def __init__(self, path: str):
        self._lock = threading.Lock()
        self._conn = sqlite3.connect(path, check_same_thread=False)
        with self._conn:
            self._conn.executescript(_SQL_SCHEMA)

    def set_meta(self, k: str, v: str):
        with self._lock, self._conn:
            self._conn.execute("REPLACE INTO meta(k,v) VALUES(?,?)", (k, v))

    def get_meta(self, k: str, default: str = "") -> str:
        cur = self._conn.execute("SELECT v FROM meta WHERE k=?", (k,))
        row = cur.fetchone()
        return row[0] if row else default

    def upsert_position(self, symbol: str, qty: float, avg_price: float):
        with self._lock, self._conn:
            self._conn.execute("REPLACE INTO positions(symbol,qty,avg_price) VALUES(?,?,?)",
                              (symbol, qty, avg_price))

    def add_trade(self, id: str, ts: float, symbol: str, side: str, qty: float,
                  price: float, fees: float, mode: str):
        with self._lock, self._conn:
            self._conn.execute(
                "INSERT OR REPLACE INTO trades(id,ts,symbol,side,qty,price,fees,mode) VALUES(?,?,?,?,?,?,?,?)",
                (id, ts, symbol, side, qty, price, fees, mode))

    def add_equity(self, ts: float, equity: float):
        with self._lock, self._conn:
            self._conn.execute("INSERT INTO equity(ts,equity) VALUES(?,?)", (ts, equity))

    def get_positions(self):
        cur = self._conn.execute("SELECT symbol, qty, avg_price FROM positions")
        return cur.fetchall()