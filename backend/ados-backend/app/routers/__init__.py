# app/routers/__init__.py
from . import users
from . import competitors
from . import ads
from . import platforms
from . import metrics
from . import trending
from . import targ_intel
from . import sum_metrics


__all__ = ["auth", "users", "competitors", "ads", "platforms", "metrics", "trending"]