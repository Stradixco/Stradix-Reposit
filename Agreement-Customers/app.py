from flask import Flask, request, send_file, send_from_directory, jsonify
from docxtpl import DocxTemplate
from flask_cors import CORS
import os
import json

app = Flask(__name__)
CORS(app)

# ✅ مسارات مهمة
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CUSTOMERS_FILE = os.path.join(BASE_DIR, "..", "customers.json")
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")
OUTPUT_DIR = os.path.join(BASE_DIR, "output")

os.makedirs(OUTPUT_DIR, exist_ok=True)

@app.route('/')
def agreement_form():
    return send_from_directory(directory='S-TRADIX-DASHBOARD', path='Agreement-Creat-Cust.html')

from flask import send_from_directory

@app.route('/customers.json', methods=['GET'])
def serve_customers_json():
    return send_from_directory("Stradix-Reposit", "customers.json")

# ✅ توليد الاتفاقية
@app.route('/generate', methods=['POST'])
def generate_agreement():
    data = request.get_json()
    selected_company = data.get('selectedCompany', 'Tradix')

    # اختر القالب والسياق بناءً على الشركة
    if selected_company == 'Mamzar':
        template_file = 'agreement_template.docx'
        context = {
            'entity_name_ar': "مؤسسة ممزر للمقاولات العامة",
            'entity_name_en': "Mamzar for General Contracting Est",
            'entity_detail_ar': "مؤسسة ممزر للمقاولات العامة\nسجل تجاري: 2050073487\nالعنوان: حي غرناطة ش طرفة بن العبد , الدمام , المملكة العربية السعودية",
            'entity_detail_en': "Mamzar for General Contracting Est\nCR :2050073487\nAdress: Ghernata Dist, Turfa bin Alabd St, Dammam, KSA"
        }
    else:
        template_file = 'agreement_templatev1.docx'
        context = {
            'entity_name_ar': "شركة اس ترديكسسا",
            'entity_name_en': "S TRADIXSA COMPANY",
            'entity_detail_ar': "شركة اس ترديكسسا\nتجاري عربي : 7052015091\nالعنوان: حي قرطبة , شارع طارق بن زياد , الخبر , المملكة العربية السعودية",
            'entity_detail_en': "S TRADIXSA COMPANY\nCR: 7052015091\nAdress: Al-Khubar Qurtuban Dist , Tariq bin Ziyad, King of Saudi Arabia"
        }

    # أضف باقي البيانات من الفورم
    context.update({
        'agreement_date': data.get('agreement_date', ''),
        'client_name': data.get('client_name', ''),
        'agreement_Place_ar': data.get('agreement_Place_ar', ''),
        'agreement_Place_en': data.get('agreement_Place_en', ''),
        'credit_term': data.get('credit_term', ''),
        'start_date': data.get('start_date', ''),
        'end_date': data.get('end_date', ''),
        'extra_ar': data.get('extra_ar', ''),
        'extra_en': data.get('extra_en', ''),
        'items_table': data.get('items', []),
        # بيانات العميل من صفحة الاختيار
        'client_id': data.get("client_id", ""),
        'client_name_ar': data.get("client_name_ar", ""),
        'client_name_en': data.get("client_name_en", ""),
        'client_address_ar': data.get("client_address_ar", ""),
        'client_address_en': data.get("client_address_en", ""),
        'client_cr': data.get("client_cr", ""),
        'client_vat': data.get("client_vat", "")
    })

    # تحميل القالب ومعالجته
    template_path = os.path.join(TEMPLATES_DIR, template_file)
    output_path = os.path.join(OUTPUT_DIR, 'generated_agreement.docx')

    doc = DocxTemplate(template_path)
    doc.render(context)
    doc.save(output_path)

    return send_file(output_path, as_attachment=True)

# ✅ حفظ عميل جديد
@app.route('/add-customer', methods=['POST'])
def add_customer():
    data = request.json
    try:
        if os.path.exists(CUSTOMERS_FILE):
            with open(CUSTOMERS_FILE, 'r', encoding='utf-8') as f:
                customers = json.load(f)
        else:
            customers = []

        customers.append(data)
        with open(CUSTOMERS_FILE, 'w', encoding='utf-8') as f:
            json.dump(customers, f, ensure_ascii=False, indent=2)

        return jsonify({'message': 'تم حفظ العميل بنجاح'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ✅ تعديل بيانات عميل
@app.route("/update-customer", methods=["POST"])
def update_customer():
    try:
        data = request.json
        client_id = data.get("client_id")

        with open(CUSTOMERS_FILE, "r", encoding="utf-8") as f:
            customers = json.load(f)

        for i, c in enumerate(customers):
            if c.get("client_id") == client_id:
                customers[i] = data
                break
        else:
            return jsonify({"status": "error", "message": "Customer not found"}), 404

        with open(CUSTOMERS_FILE, "w", encoding="utf-8") as f:
            json.dump(customers, f, ensure_ascii=False, indent=2)

        return jsonify({"status": "success", "message": "Customer updated"}), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# ✅ حذف عميل وتحديث الملف
@app.route("/update-customers", methods=["POST"])
def update_customers():
    try:
        customers = request.json
        with open(CUSTOMERS_FILE, "w", encoding="utf-8") as f:
            json.dump(customers, f, ensure_ascii=False, indent=2)
        return jsonify({"status": "success", "message": "Customer list updated."}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# ✅ لتحميل ملف Word مباشرة
@app.route('/download')
def download_word():
    word_path = os.path.join(OUTPUT_DIR, 'generated_agreement.docx')
    return send_file(word_path, as_attachment=True)

# ✅ لتحويل وتحميل PDF
@app.route('/download-pdf')
def download_pdf():
    docx_path = os.path.join(OUTPUT_DIR, 'generated_agreement.docx')
    pdf_path = os.path.join(OUTPUT_DIR, 'generated_agreement.pdf')

    if not os.path.exists(docx_path):
        return "❌ ملف الاتفاقية غير موجود. احفظ الاتفاقية أولاً.", 404

    try:
        import comtypes
        comtypes.CoInitialize()

        from docx2pdf import convert
        convert(docx_path, pdf_path)
    except Exception as e:
        return f"❌ خطأ أثناء التحويل إلى PDF: {e}", 500

    return send_file(pdf_path, as_attachment=True)

if __name__ == '__main__':
    app.run(debug=True)
