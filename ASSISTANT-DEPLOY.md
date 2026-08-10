# تشغيل نقطة اتصال مساعد مجالس

الواجهة والمسار الإرشادي يعملان من GitHub Pages. لتشغيل الرد الذكي، تضبط قيمة سر OpenAI في مشروع Firebase `majalis-admin` ثم تنشر الدالة:

```bash
firebase functions:secrets:set OPENAI_API_KEY
firebase deploy --only functions:majalisAssistant
```

مفتاح OpenAI يبقى داخل Firebase Secret Manager ولا يضاف إلى ملفات المستودع أو المتصفح.
