import os
import requests
import json
import settings

def generate_tailored_resume(base_resume, jd_text, api_key=None, model_name="gemini-1.5-flash"):
    """
    讀取原始履歷與目標JD，透過LLM將經歷改寫為結構化的 STAR 原則 Markdown 檔案
    """
    print("[INFO] 開始讀取原始履歷資料...")
    if isinstance(base_resume, str) and os.path.exists(base_resume):
        with open(base_resume, 'r', encoding='utf-8') as f:
            base_content = f.read()
    else:
        base_content = base_resume
        
    print(f"[INFO] 正在準備 Prompt...")
    
    # 這裡的 Prompt 嚴格遵循簡報中的「結構化 Markdown」指導原則
    prompt = f"""
你是專業的求職面試專家。請根據以下【目標職缺描述(JD)】，將我的【原始履歷】進行客製化改寫。

【目標職缺描述(JD)】：
{jd_text}

【原始履歷】：
{base_content}

【改寫與輸出嚴格驗收清單】：
1. 必須嚴格使用以下 Markdown 結構輸出，不要包含任何前言或後記，且最外層不要加 ```markdown 和 ``` 的包裹標記。
2. 結構必須包含：一級標題姓名、二級標題簡介與聯絡方式清單。
3. 必須包含標題 `## 關於我` (約100-150字自傳)。
4. 必須包含標題 `## 專業技能`，以分類粗體清單呈現。
5. 必須包含標題 `## 學歷背景`。
6. 必須包含標題 `## 實務經驗`，包含公司名稱、職稱、時間，與條列式職責。請使用 STAR 原則並量化數據。
7. 必須包含標題 `## 核心專案成果`，包含 CASE STUDY、技術棧、專案目標、痛點分析、解決方案、預估效益。與 JD 技術棧完全符合的關鍵字，請使用 **粗體文字** 強調。

嚴格遵循以下 Markdown 結構範本：
# [姓名]
## [一句話簡介/職稱]
- 聯絡電話：[電話]
- 電子信箱：[信箱]
- LinkedIn：[連結]
- GitHub：[連結]

## 關於我
[簡短的職涯自傳，約 100-150 字]

## 專業技能
- **[技能分類 1]**：技能 1, 技能 2, 技能 3
- **[技能分類 2]**：技能 1, 技能 2, 技能 3

## 學歷背景
### [學校名稱] — [學系名稱]
* [學位] | [起訖年份]

## 實務經驗
### [公司名稱]
* [職稱] | [起訖年份]
- [工作成就/職責 1]
- [工作成就/職責 2]

## 核心專案成果
### CASE STUDY [編號]：[專案名稱]
- **技術棧**：[技術 1]、[技術 2]
- **專案目標**：[內容]
- **痛點分析**：[內容]
- **解決方案**：[內容]
- **預估效益**：[內容]
"""
    
    if api_key and api_key.strip():
        actual_model = model_name if model_name else "gemini-1.5-flash"
        print(f"[INFO] 正在發送請求至 LLM ({actual_model}) 進行真實語意改寫...")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{actual_model}:generateContent?key={api_key.strip()}"
        headers = {
            "Content-Type": "application/json"
        }
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": prompt
                        }
                    ]
                }
            ]
        }
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=60)
            if response.status_code == 200:
                result_json = response.json()
                candidates = result_json.get("candidates", [])
                if candidates:
                    text_content = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                    
                    # 清理可能被包裹的 markdown 標籤
                    text_content_clean = text_content.strip()
                    if text_content_clean.startswith("```markdown"):
                        text_content_clean = text_content_clean.split("```markdown", 1)[1]
                        if text_content_clean.endswith("```"):
                            text_content_clean = text_content_clean.rsplit("```", 1)[0]
                    elif text_content_clean.startswith("```"):
                        text_content_clean = text_content_clean.split("```", 1)[1]
                        if text_content_clean.endswith("```"):
                            text_content_clean = text_content_clean.rsplit("```", 1)[0]
                            
                    return text_content_clean.strip()
                else:
                    raise Exception("Gemini API 回傳空內容。")
            else:
                raise Exception(f"Gemini API 請求失敗，狀態碼: {response.status_code}，訊息: {response.text}")
        except Exception as e:
            print(f"[ERROR] 呼叫 API 發生錯誤: {str(e)}")
            raise e
    else:
        print("[INFO] 正在以 [模擬模式] 進行履歷改寫...")
        # 模擬呼叫 LLM API 傳回的 Markdown 結構化文本
        mock_llm_output = """# 何帥哥
## 資訊管理系 | 全端工程師
- 聯絡電話：+123 456 789
- 電子信箱：abcd1234@gmail.com
- LinkedIn：linkedin.com/in/han
- GitHub：github.com/han

## 關於我
具備跨模組系統整合能力的軟體工程師，專長於利用自動化管線消除日常摩擦、提升團隊開發效益。積極尋找能發揮模組化架構設計與 AI 自動化工具開發的工程職缺，期望透過技術解決實際業務痛點。

## 專業技能
- **開發語言**：Python, JavaScript (ES6+), ABAP
- **前端技術**：React, CSS Grid/Flexbox, Tailwind
- **AI 工具**：Prompt Engineering, Open AI/Gemini API

## 學歷背景
### 逢甲大學 — 資管學系
* 學士學位 | 2022 年 9 月 – 2026 年 6 月 (應屆畢業)

## 實務經驗
### 創新軟體科技
* 全端實習生 | 2025 年 7 月 – 2025 年 9 月
- 運用 Python 大拆小、模組化組織架構設計系統，將繁雜的資料庫梳理並建立 API。
- 成功縮短 90% 的履歷客製化時間，大幅提升工程團隊與 HR 部門合作效率。

## 核心專案成果
### CASE STUDY 1：自動化數據清洗與履歷客製化管線
- **技術棧**：**Python**, **Markdown**
- **專案目標**：將原始履歷根據目標公司的 JD 進行量化改寫與動態排版
- **痛點分析**：面對應屆畢業生投遞不同職缺時，手動調整履歷關鍵字耗時且排版容易出錯
- **解決方案**：打造一條自動化 Pipeline，結合 LLM API 與預設 CSS 排版，直接輸出 PDF
- **預估效益**：產出之履歷經測試 100% 符合 Markdown 結構化驗收標準
"""
        return mock_llm_output