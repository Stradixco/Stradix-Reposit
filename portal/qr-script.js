/* ====== Utils: Time ====== */
function pad(n){return String(n).padStart(2,'0')}
function toIsoLocal(d){
  const y=d.getFullYear(), m=pad(d.getMonth()+1), day=pad(d.getDate());
  const hh=pad(d.getHours()), mm=pad(d.getMinutes()), ss=pad(d.getSeconds());
  const offMin=-d.getTimezoneOffset(), sign=offMin>=0?'+':'-';
  const oh=pad(Math.floor(Math.abs(offMin)/60)), om=pad(Math.abs(offMin)%60);
  return `${y}-${m}-${day}T${hh}:${mm}:${ss}${sign}${oh}:${om}`;
}
function fillNowLocal(){ const el=document.getElementById('ts'); if(el) el.value = toIsoLocal(new Date()); }

/* ====== Numbers ====== */
function formatNumber(num){ return num.toLocaleString('en-US',{minimumFractionDigits:2, maximumFractionDigits:2}); }
function parseNumber(str){ return parseFloat((str||'').toString().replace(/,/g,'')) || 0; }

function calcVAT(){
  const subtotal=parseNumber(document.getElementById("subtotal").value);
  const vat=subtotal*0.15, total=subtotal+vat;
  document.getElementById("subtotal").value=formatNumber(subtotal);
  document.getElementById("vatamt").value=vat.toFixed(2);
  document.getElementById("total").value=total.toFixed(2);
}
document.getElementById("btnCalcVAT").addEventListener("click", calcVAT);
document.getElementById("subtotal").addEventListener("blur", function(){
  const v=parseNumber(this.value); if(v){ this.value = formatNumber(v); }
});

/* ====== Status ====== */
function showStatus(msg, ok=false){
  const el=document.getElementById('status');
  el.className='status ' + (ok?'ok':'error');
  el.textContent=msg;
}

/* ====== Save/Load ====== */
function saveDefaults(){
  const s=document.getElementById('seller').value.trim();
  const v=document.getElementById('vat').value.trim();
  if(!s||!v){ showStatus('ادخل الاسم والرقم الضريبي قبل الحفظ',false); return; }
  localStorage.setItem('zatca_seller',s);
  localStorage.setItem('zatca_vat',v);
  showStatus('تم حفظ البيانات',true);
}
function loadDefaults(){
  const s=localStorage.getItem('zatca_seller')||'';
  const v=localStorage.getItem('zatca_vat')||'';
  if(s) document.getElementById('seller').value=s;
  if(v) document.getElementById('vat').value=v;
  showStatus('تم تحميل البيانات',true);
}

/* ====== Clear ====== */
function clearAll(){
  ['ts','subtotal','vatamt','total'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.value='';
  });
  document.getElementById('qrContainer').innerHTML='';
  document.getElementById('out').style.display='none';
  document.getElementById('status').textContent='';
  const dl=document.getElementById('download'); if(dl) dl.style.display='none';
}

/* ====== TLV + Base64 ====== */
function tlv(tag,value){
  const enc=new TextEncoder(); const v=enc.encode(String(value??''));
  if(v.length>255) throw new Error('قيمة حقل أطول من 255 بايت: '+tag);
  return Uint8Array.from([tag,v.length,...v]);
}
function b64(u8){ let bin=''; u8.forEach(b=>bin+=String.fromCharCode(b)); return btoa(bin); }
function nice2(num){ const n=Number(num); return isFinite(n)? n.toFixed(2):''; }

/* ====== Copy ====== */
function copyB64(){
  const t=document.getElementById('b64');
  t.select(); document.execCommand('copy');
  showStatus('تم نسخ Base64',true);
}

/* ====== Validate & Generate ====== */
function validateInputs(){
  const seller=document.getElementById('seller').value.trim();
  const vat=document.getElementById('vat').value.trim();
  const ts=document.getElementById('ts').value.trim();
  const total=document.getElementById('total').value.trim();
  const vatamt=document.getElementById('vatamt').value.trim();
  if(!seller) return '⚠️ اسم البائع مطلوب';
  if(!/^[0-9]{15}$/.test(vat)) return '⚠️ الرقم الضريبي يجب أن يكون 15 رقمًا';
  if(!ts) return '⚠️ التاريخ/الوقت مطلوب';
  if(total===''||isNaN(Number(total))) return '⚠️ إجمالي الفاتورة غير صحيح';
  if(vatamt===''||isNaN(Number(vatamt))) return '⚠️ مبلغ الضريبة غير صحيح';
  return '';
}

let currentCanvas=null;
function generate(){
  const err=validateInputs();
  if(err){ showStatus(err,false); return; }
  const seller=document.getElementById('seller').value.trim();
  const vat=document.getElementById('vat').value.trim();
  const ts=document.getElementById('ts').value.trim();
  const total=nice2(document.getElementById('total').value.trim());
  const vatamt=nice2(document.getElementById('vatamt').value.trim());
  const invoiceDigits = document.getElementById('invoiceDigits').value.trim();
  if(!/^[0-9]{6}$/.test(invoiceDigits)){
    showStatus('⚠️ رقم الفاتورة يجب أن يكون 6 أرقام صحيحة', false);
    return;
  }
  const invoiceNo = "INV-" + invoiceDigits;

  try{
    const tlvAll=new Uint8Array([
      ...tlv(1,seller), ...tlv(2,vat), ...tlv(3,ts), ...tlv(4,total), ...tlv(5,vatamt)
    ]);
    const b64str=b64(tlvAll);
    document.getElementById('b64').value=b64str;

    const cont=document.getElementById('qrContainer'); cont.innerHTML='';
    new QRCode(cont,{
      text: b64str,
      width: 264,
      height: 264,
      correctLevel: QRCode.CorrectLevel.M,
      margin: 0
    });

    const qrCanvas = cont.querySelector("canvas");
    if(qrCanvas){
      qrCanvas.style.display = "block";
      qrCanvas.style.margin = "0";
      qrCanvas.style.padding = "0";
    }
    setTimeout(()=>{
      currentCanvas=cont.querySelector('canvas');
      const dl=document.getElementById('download'); if(dl) dl.style.display='inline-block';
    },180);

    document.getElementById('out').style.display='grid';
    showStatus('تم توليد QR ✔',true);
  }catch(e){
    showStatus('خطأ: '+e.message,false);
  }
}

document.getElementById('download')?.addEventListener('click', ()=>{
  if(currentCanvas){
    const invoiceDigits = document.getElementById('invoiceDigits').value.trim();
    if(!/^[0-9]{3}$/.test(invoiceDigits)){
      showStatus('⚠️ رقم الفاتورة يجب أن يكون 3 أرقام صحيحة', false);
      return;
    }
    const invoiceNo = "/S-TDX-INV-2025-" + invoiceDigits;
    const a = document.createElement('a');
    a.download = `${invoiceNo}_zatca_qr.png`;
    a.href = currentCanvas.toDataURL('image/png');
    a.click();
  }
});
