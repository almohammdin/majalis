# تشغيل مساعد مجالس عبر Gemini

يستخدم المساعد مسارين من Gemini:

- المحادثة الكتابية عبر Firebase AI Logic والنموذج `gemini-3.5-flash-lite`.
- المحادثة الصوتية عبر Gemini Live والنموذج `gemini-3.1-flash-live-preview`.

تستخدم النسخة الحالية مشروع Firebase واتصال الرموز المؤقتة المهيأ لمسراح. يحمي App Check الاتصال، ولا يوضع مفتاح Gemini دائم داخل `index.html` أو ملفات المتصفح.

قبل النشر تأكد من الآتي:

1. نطاق `almohammdin.github.io` مسجل في reCAPTCHA Enterprise وFirebase App Check.
2. Firebase AI Logic مفعل في مشروع `mesraah-a2dfc`.
3. عامل الرموز المؤقتة `mesraah-live-token` يقبل App Check من تطبيق الويب نفسه.

مجلد `functions` يحوي تكامل OpenAI السابق فقط، ولا يستخدمه إصدار `v1.13.5`.
