import os

# 集中管理全域變數與設定，避免長距離依賴 
API_KEY = os.environ.get("GEMINI_API_KEY", "")  # 從環境變數讀取金鑰，避免金鑰外洩
MODEL_NAME = os.environ.get("GEMINI_MODEL_NAME", "google ai studio")  # 優先讀取環境變數，預設為 google ai studio

# 嚴格定義 Markdown 驗收標準的欄位名稱 (呼應簡報規範) 
REQUIRED_SECTIONS = ["## 關於我", "## 專業技能", "## 學歷背景", "## 實務經驗", "## 核心專案成果"]