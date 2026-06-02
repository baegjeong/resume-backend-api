import os
import traceback
import io
import markdown
from xhtml2pdf import pisa
from flask import Flask, request, jsonify, render_template, send_from_directory, send_file
from flask_cors import CORS
import settings
import resume_generator
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

font_path = os.path.join(os.path.dirname(__file__), 'static', 'fonts', 'kaiu.ttf')
pdfmetrics.registerFont(TTFont('myfont', font_path))

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app, resources={r"/api/*": {"origins": "*"}})

BASE_RESUME_FILE = "my_resume.md"
OUTPUT_RESUME_FILE = "客製化履歷_產出成果.md"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/load_data', methods=['GET'])
def load_data():
    try:
        resume_content = ""
        if os.path.exists(BASE_RESUME_FILE):
            with open(BASE_RESUME_FILE, 'r', encoding='utf-8') as f:
                resume_content = f.read()
        else:
            # 備用預設內容
            resume_content = "# 原始履歷\n我是一個大學生，做過一些專案，想要找工作。"

        # 讀取 settings 設定
        required_sections = getattr(settings, 'REQUIRED_SECTIONS', ["# 個人求職引言", "## 專業技能庫", "## 工作與專案經歷"])
        default_api_key = getattr(settings, 'API_KEY', "")
        default_model = getattr(settings, 'MODEL_NAME', "gemini-1.5-flash")

        return jsonify({
            "success": True,
            "resume_content": resume_content,
            "required_sections": required_sections,
            "default_api_key": default_api_key,
            "default_model": default_model
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/generate', methods=['POST'])
def generate():
    try:
        data = request.json or {}
        base_resume = data.get('base_resume', '')
        jd_text = data.get('jd_text', '')
        model = data.get('model', 'gemini-1.5-flash')
        simulate = data.get('simulate', False)

        if not jd_text.strip():
            return jsonify({
                "success": False,
                "error": "請提供目標職缺描述 (JD)！"
            }), 400

        # 如果選擇模擬模式，傳入 None 給產生器以觸發 Mock 邏輯
        key_to_pass = None if simulate else getattr(settings, 'API_KEY', "")
        
        tailored_resume = resume_generator.generate_tailored_resume(
            base_resume, 
            jd_text, 
            api_key=key_to_pass, 
            model_name=model
        )

        return jsonify({
            "success": True,
            "tailored_resume": tailored_resume
        })
    except Exception as e:
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/validate', methods=['POST'])
def validate():
    try:
        data = request.json or {}
        content = data.get('content', '')
        
        required_sections = getattr(settings, 'REQUIRED_SECTIONS', ["# 個人求職引言", "## 專業技能庫", "## 工作與專案經歷"])
        
        results = []
        all_passed = True
        for section in required_sections:
            passed = section in content
            results.append({
                "section": section,
                "passed": passed,
                "message": f"[PASS] {section} 欄位結構驗證通過" if passed else f"[FAIL] 遺漏必要結構欄位: {section}"
            })
            if not passed:
                all_passed = False
                
        return jsonify({
            "success": True,
            "results": results,
            "all_passed": all_passed,
            "summary": "測試完成: 欄位全部通過 / 0 失敗" if all_passed else "測試完成: 欄位驗證有部分失敗，請檢查結構。"
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/save', methods=['POST'])
def save():
    try:
        data = request.json or {}
        content = data.get('content', '')
        target = data.get('target', 'output') # 'output' 或 'original'
        
        filename = BASE_RESUME_FILE if target == 'original' else OUTPUT_RESUME_FILE
        
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(content)
            
        return jsonify({
            "success": True,
            "message": f"成功儲存至 {filename}"
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/export_pdf', methods=['POST'])
def export_pdf():
    try:
        data = request.json or {}
        content_md = data.get('content', '')
        
        if not content_md:
            return jsonify({"success": False, "error": "沒有收到內容"}), 400
            
        # 1. Markdown 轉 HTML
        html_content = markdown.markdown(content_md, extensions=['fenced_code', 'tables'])
        
        # 2. 渲染入 PDF 專用模板
        rendered_html = render_template('pdf_template.html', content=html_content)
        
        # 3. 使用 xhtml2pdf 產生 PDF 記憶體檔案
        pdf_buffer = io.BytesIO()
        pisa_status = pisa.CreatePDF(
            io.StringIO(rendered_html),
            dest=pdf_buffer
        )
        
        if pisa_status.err:
            return jsonify({"success": False, "error": "PDF 產生發生錯誤"}), 500
            
        pdf_buffer.seek(0)
        
        # 4. 回傳給前端
        return send_file(
            pdf_buffer,
            as_attachment=True,
            download_name='客製化履歷.pdf',
            mimetype='application/pdf'
        )
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
