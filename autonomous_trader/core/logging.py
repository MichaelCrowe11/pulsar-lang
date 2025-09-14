import logging, sys
from rich.logging import RichHandler

def setup_logging(level: str = "INFO"):
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(message)s",
        datefmt="%H:%M:%S",
        handlers=[RichHandler(rich_tracebacks=True, markup=True, stream=sys.stdout)],
    )
    return logging.getLogger("trader")