from flask import Flask, request, send_file, send_from_directory
from docxtpl import DocxTemplate
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)  # ✅ لتفعيل الاتصال بين 5500 و 5000

# ✅ تقديم صفحة HTML
@app.route('/')
def agreement_form():
    return send_from_directory(directory='S-TRADIX-DASHBOARD', path='Agreement-Creat-Cust.html')

# ✅ استقبال البيانات بصيغة JSON ومعالجتها
@app.route('/generate', methods=['POST'])
def generate_agreement():
    data = request.get_json()  # ✅ هنا الفرق الأساسي

    context = {
        'agreement_date': data.get('agreement_date', ''),
        'client_name': data.get('client_name', ''),
        'agreement_Place_ar': data.get('agreement_Place_ar', ''),
        'agreement_Place_en': data.get('agreement_Place_en', ''),
        'credit_term': data.get('credit_term', ''),
        'start_date': data.get('start_date', ''),
        'end_date': data.get('end_date', ''),
        'extra_ar': data.get('extra_ar', ''),
        'extra_en': data.get('extra_en', ''),
        'items_table': data.get('items', [])
    }

    # ✅ تحميل القالب ومعالجته
    template_path = os.path.join('templates', 'agreement_template.docx')
    output_path = os.path.join('output', 'generated_agreement.docx')

    doc = DocxTemplate(template_path)
    doc.render(context)
    doc.save(output_path)

    return send_file(output_path, as_attachment=True)

# ✅ لتحميل الملف مباشرة (عند الضغط على زر Word)
# 🟦 تحميل ملف Word
@app.route('/download')
def download_word():
    word_path = os.path.join('output', 'generated_agreement.docx')
    return send_file(word_path, as_attachment=True)

from docx2pdf import convert

# توليد PDF بعد حفظ الوورد
convert("output/generated_agreement.docx", "output/generated_agreement.pdf")

# 📄 تحميل ملف PDF
@app.route('/download-pdf')
def download_pdf():
    docx_path = os.path.join('output', 'generated_agreement.docx')
    pdf_path = os.path.join('output', 'generated_agreement.pdf')

    if not os.path.exists(docx_path):
        return "❌ ملف الاتفاقية غير موجود. احفظ الاتفاقية أولاً.", 404

    try:
        # ✅ تهيئة COM لتفادي خطأ CoInitialize
        import comtypes
        comtypes.CoInitialize()

        from docx2pdf import convert
        convert(docx_path, pdf_path)
    except Exception as e:
        return f"❌ خطأ أثناء التحويل إلى PDF: {e}", 500

    return send_file(pdf_path, as_attachment=True)

if __name__ == '__main__':
    app.run(debug=True)
