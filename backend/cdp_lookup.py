"""
CDP資料查表模組

原始CDP資料（約105萬筆油車/HEV車主 + bZ4X補充檔）太大，不適合放進repo，
所以先離線彙整成 cdp_model_stats.json（幾KB），程式啟動時只讀這份精簡版。

重要口徑（詳見 json 裡的 _meta）：
- 金額 = 回廠消費總金額 ÷ 持有年數（年化），優先只用車齡0-4年的車輛，
  與 bZ4X（最長約4.4年）對齊；0-4年樣本不足的車款會退用全部持有年數，basis 會標示。
- 金額幣別是「A國幣值，非台幣」，只能拿來比大小，不能與台幣金額相加。
"""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional

_STATS_FILE = Path(__file__).parent / "cdp_model_stats.json"


def _load() -> Dict[str, Any]:
    with open(_STATS_FILE, encoding="utf-8") as f:
        return json.load(f)


_RAW: Dict[str, Any] = _load()
_META: Dict[str, str] = _RAW.get("_meta", {})
_MODEL_STATS: Dict[str, Dict[str, Any]] = {k: v for k, v in _RAW.items() if k != "_meta"}


def get_model_stats(model_name: str) -> Optional[Dict[str, Any]]:
    """依車款名稱查詢CDP彙整數據，查不到回傳 None。"""
    return _MODEL_STATS.get(model_name)


def list_available_models() -> List[str]:
    """回傳查表中有資料的車款名稱，可供前端做下拉選單。"""
    return sorted(_MODEL_STATS.keys())


def get_bz4x_stats() -> Dict[str, Any]:
    stats = _MODEL_STATS.get("bZ4X")
    if stats is None:
        raise RuntimeError("bZ4X統計資料遺失，請確認 cdp_model_stats.json 內容")
    return stats


def get_meta() -> Dict[str, str]:
    """口徑說明（基準日、幣別、限制），供回應附帶顯示。"""
    return _META
