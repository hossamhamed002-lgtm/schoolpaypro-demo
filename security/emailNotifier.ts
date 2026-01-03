/**
 * إرسال OTP عبر البريد الإلكتروني باستخدام إعدادات SMTP.
 * يحافظ على وضع MOCK عندما تكون الإعدادات ناقصة أو في بيئة المتصفح.
 */
let transporterPromise: Promise<any> | null = null;

const getTransporter = async (config: {
  host: string;
  port: number;
  user: string;
  pass: string;
}) => {
  if (transporterPromise) return transporterPromise;

  transporterPromise = (async () => {
    // تفادي محاولة تحميل nodemailer في بيئة المتصفح
    if (typeof window !== 'undefined' && !(globalThis as any).process?.versions?.node) {
      return null;
    }

    try {
      const dynamicImport = new Function('specifier', 'return import(specifier);');
      const nodemailerMod = await dynamicImport('nodemailer' as any);
      const nodemailer = (nodemailerMod as any).default || nodemailerMod;
      return nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.port === 465,
        auth: {
          user: config.user,
          pass: config.pass
        }
      });
    } catch (error) {
      console.warn('[EMAIL][ERROR]', error);
      return null;
    }
  })();

  return transporterPromise;
};

export const sendEmailOtp = async (toEmail: string | undefined, code: string) => {
  const env = (import.meta as any)?.env || {};
  const enabled = String(env.VITE_EMAIL_ENABLED || '').toLowerCase() === 'true';
  const host = env.VITE_SMTP_HOST;
  const port = Number(env.VITE_SMTP_PORT);
  const user = env.VITE_SMTP_USER;
  const pass = env.VITE_SMTP_PASS;
  const from = env.VITE_SMTP_FROM;

  const hasConfig = enabled && host && port && user && pass && from;
  if (!hasConfig || !toEmail) {
    console.log(
      `[EMAIL][MOCK] OTP: ${code} → ${toEmail || 'unknown email'}${
        hasConfig ? '' : ' (missing SMTP config)'
      }`
    );
    return;
  }

  const transporter = await getTransporter({ host, port, user, pass });
  if (!transporter) {
    console.log(`[EMAIL][MOCK] OTP: ${code} → ${toEmail} (transporter unavailable)`);
    return;
  }

  try {
    await transporter.sendMail({
      from,
      to: toEmail,
      subject: 'رمز التحقق الأمني',
      text: `
تنبيه أمني

رمز التحقق الخاص بك:
${code}

إذا لم تكن أنت، يرجى التواصل مع إدارة المدرسة فورًا.
`
    });
  } catch (error) {
    console.warn('[EMAIL][ERROR]', error);
    console.log(`[EMAIL][MOCK] OTP: ${code} → ${toEmail} (send failed)`);
  }
};
