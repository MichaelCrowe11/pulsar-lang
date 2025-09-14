from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
import time

# Base event
@dataclass
class Event:
    topic: str
    ts: float = field(default_factory=lambda: time.time())
    payload: Dict[str, Any] = field(default_factory=dict)

# Common topics
TOPIC_BAR = "bar"                    # new OHLCV bar
TOPIC_FEATURES = "features"          # computed indicators
TOPIC_SIGNAL = "signal"              # strategy signal
TOPIC_INTENT = "order_intent"        # proposed order
TOPIC_ORDER = "order"                # order result (ack)
TOPIC_FILL = "fill"                  # fill event
TOPIC_ALERT = "alert"                # risk/monitoring alerts
TOPIC_HEARTBEAT = "heartbeat"        # agent heartbeats