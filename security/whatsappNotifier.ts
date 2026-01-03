/**
 * إرسال OTP عبر واتساب.
 * ملاحظة: لم يتم ربط API حقيقية بعد، يمكن ضبط متغيرات البيئة التالية:
 * - VITE_WHATSAPP_API_URL
 * - VITE_WHATSAPP_API_TOKEN
 * ي fallback للـ console log إذا لم تتوفر الإعدادات.
 */
export const sendOtpWhatsApp = async (phone: string | undefined, code: string) => {
  const apiUrl = (import.meta as any)?.env?.VITE_WHATSAPP_API_URL;
  const token = (import.meta as any)?.env?.VITE_WHATSAPP_API_TOKEN;
  if (!apiUrl || !token || !phone) {
    console.log(`[WHATSAPP][MOCK] Sending OTP ${code} to ${phone || 'unknown phone'}`);
    return;
  }

  try {
    await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        to: phone,
        message: `تنبيه أمني\nرمز التحقق: ${code}\nإذا لم تكن أنت، يرجى التواصل مع الإدارة.`
      })
    });
  } catch (err) {
    console.warn('[WHATSAPP] Failed to send OTP', err);
  }
};
