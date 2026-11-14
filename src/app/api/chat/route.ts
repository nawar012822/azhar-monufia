import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ reply: 'عذراً، مفتاح الذكاء الاصطناعي غير موجود في الإعدادات.' }, { status: 500 });
    }

    const systemPrompt = `أنت المساعد الذكي الرسمي للمستودع الرقمي لكلية اللغة العربية بجامعة الأزهر - فرع شبين الكوم. 
مهمتك مساعدة الطلاب والباحثين في استكشاف الأبحاث، وتلخيصها، وشرح المصطلحات اللغوية والأدبية.
أجب دائماً باللغة العربية الفصحى، بأسلوب أكاديمي مهذب ومختصر.`;

    const formattedMessages = messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }));

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [{ role: 'system', content: systemPrompt }, ...formattedMessages],
        temperature: 0.5,
        max_tokens: 1024,
      }),
    });

    const data = await response.json();

    if (data.error) {
      return NextResponse.json({ reply: 'حدث خطأ في الاتصال بمزود الذكاء الاصطناعي: ' + data.error.message }, { status: 500 });
    }

    const botReply = data.choices[0].message.content;
    return NextResponse.json({ reply: botReply });

  } catch (error: any) {
    return NextResponse.json({ reply: 'حدث خطأ غير متوقع: ' + error.message }, { status: 500 });
  }
}