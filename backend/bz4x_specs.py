"""
bZ4X官方規格 與 能源價格參考資料

這份資料有時效性，來源與查詢時間都寫在每個欄位旁邊的註解。
正式上台簡報前，建議至少重新核對一次「售價」跟「油價/電價」這兩項，
因為這兩個變動最頻繁；其他規格(電池容量、續航、保固)相對穩定，
除非TOYOTA官方改款，不太會變。
"""

# 資料查詢時間：2026/09
BZ4X_SPECS = {
    "price_twd": 1_280_000,  # 來源：toyota.com.tw/showroom/bZ4X 官網現行牌價(128萬)
                               # 注意：此車過去一年內已調價多次(167萬→136萬→128萬)，
                               # 上台前建議重新查一次官網確認
    "battery_capacity_kwh": 74.7,
    "nedc_range_km": 743,  # NEDC測試值，非實際道路續航，官網有附此但書
    "battery_warranty_years": 8,
    "battery_warranty_km": 160_000,  # 8年或16萬公里，以先到者為準
    "general_warranty_years": 5,  # 準時定保可延長到的年限
    "general_warranty_km": 140_000,
    "dc_fast_charge_time_min": 28,  # 28分鐘充到80%（160kW快充）
    "home_charge_time_hours": "6-8",  # 220V家用充電，一般估算值
}

# 能源效率：用「NEDC續航/電池容量」概算出來的近似值，不是官方直接公布的km/kWh數字，
# 精確的能源效率測試值要去下載官方電子型錄PDF核對，這裡先用概算值頂著。
BZ4X_EFFICIENCY_KM_PER_KWH = round(BZ4X_SPECS["nedc_range_km"] / BZ4X_SPECS["battery_capacity_kwh"], 2)

# 資料查詢時間：2026/09/14
ELECTRICITY_PRICE_PER_KWH = 3.78  # 台電住宅用電2026年4-9月適用平均費率(元/度)
                                    # 注意：這是累進費率的近似平均值，非固定單一價格，
                                    # 用電量越高單價越貴，這裡先用平均值簡化計算
GASOLINE_PRICE_PER_LITER = 32.7   # 中油95無鉛牌價，每週會浮動，這是查詢當下的牌價

# 這個是目前資料裡最粗略的假設，強烈建議跟Data Lead確認：
# 不同車款的實際油耗差異很大(小型車省油、SUV/HV較耗油)，這裡先用一個
# 籠統的平均值頂著，讓mileage_cost_5yr能先有真實數字可看，
# 之後有更精確的每車款油耗數據時，這個常數應該要改成依車款查表。
GENERIC_GAS_CAR_KM_PER_LITER = 13.0


def calc_cost_per_km(is_bz4x: bool) -> float:
    """回傳每公里成本（元），bZ4X用電費估算，油車用汽油費估算。"""
    if is_bz4x:
        return round(ELECTRICITY_PRICE_PER_KWH / BZ4X_EFFICIENCY_KM_PER_KWH, 2)
    return round(GASOLINE_PRICE_PER_LITER / GENERIC_GAS_CAR_KM_PER_LITER, 2)
