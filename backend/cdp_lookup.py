"""
CDP資料查表模組

背後邏輯：原始CDP資料檔（含約105萬筆油車/HEV車主 + bZ4X專門補充資料）太大，
不適合放進repo或每次啟動都重新讀取一次，所以先離線把每個車款的
「年均保養消費金額」「年均回廠次數」算好，存成一份精簡的 cdp_model_stats.json
（3KB），程式啟動時只讀這份精簡版即可。

如果之後Data Lead那邊有更細的分析（例如依地區、依年齡分層），
可以比照這個做法，另外產生新的彙整檔，這支模組再擴充讀取邏輯即可。
"""

import json
from pathlib import Path
from typing import Optional, TypedDict

_STATS_FILE = Path(__file__).parent / "cdp_model_stats.json"


class ModelStats(TypedDict):
    sample_size: int
    avg_annual_maintenance_cost: float
    avg_annual_visits: float


def _load_stats() -> dict[str, ModelStats]:
    with open(_STATS_FILE, encoding="utf-8") as f:
        return json.load(f)


# 模組載入時就讀一次，之後重複呼叫不用每次都開檔案
_MODEL_STATS: dict[str, ModelStats] = _load_stats()


def get_model_stats(model_name: str) -> Optional[ModelStats]:
    """
    依車款名稱查詢CDP彙整數據，查不到回傳 None。

    使用範例：
        stats = get_model_stats("RAV4 HV")
        if stats:
            print(stats["avg_annual_maintenance_cost"])
    """
    return _MODEL_STATS.get(model_name)


def list_available_models() -> list[str]:
    """回傳所有查表中有資料的車款名稱，前端可以用這個做輸入下拉選單的選項。"""
    return sorted(_MODEL_STATS.keys())


def get_bz4x_stats() -> ModelStats:
    """bZ4X的統計數據，cost-comparison端點一定會用到。"""
    stats = _MODEL_STATS.get("bZ4X")
    if stats is None:
        raise RuntimeError("bZ4X統計資料遺失，請確認 cdp_model_stats.json 內容")
    return stats
