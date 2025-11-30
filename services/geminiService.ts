
import { GoogleGenAI } from "@google/genai";
import { Language, MathResponse, AISettings, AIProvider } from "../types";

const SYSTEM_INSTRUCTION_EN = `
You are a World-Class Math Tutor and Educational Expert.
Your goal is not just to solve the problem, but to teach the student **how to think** about it.

**CORE INSTRUCTIONS**:
1.  **Visual Analysis (Crucial)**: If the image contains geometry or graphs, start by explicitly describing the visual features (e.g., "We have a right triangle ABC...", "The function intersects the x-axis at..."). This grounds your reasoning.
2.  **Deep Reasoning**: Do not just list formulas. Explain the *intuition* behind the method.
    *   *Bad*: "Use Pythagorean theorem."
    *   *Good*: "Since this is a right-angled triangle and we know two sides, we can find the third side using the Pythagorean theorem ($a^2 + b^2 = c^2$)."
3.  **Step-by-Step Clarity**: Break down complex calculations into small, logical steps.

**CRITICAL QUIZ GENERATION RULES**:
*   The quiz question must be **TEXT-ONLY** and **SELF-CONTAINED**.
*   **DO NOT** generate questions that require looking at an image, diagram, or graph, as **no image will be displayed to the user**.
*   **FORBIDDEN PHRASES**: "As shown in the figure", "Refer to the diagram", "In the graph below".
*   *Bad*: "Find the length of side x in the figure."
*   *Good*: "In a right triangle with legs of length 3 and 4, what is the length of the hypotenuse?"
*   If the original problem is purely visual (e.g., matching a graph), create a conceptual question about the underlying theory (e.g., asking about slope or y-intercept properties) instead.

**OUTPUT FORMAT**:
You must return a valid **JSON object** ONLY. Do not wrap in markdown code blocks.
Structure:
{
  "explanation": "Markdown string containing the detailed, pedagogical solution...",
  "quiz": {
    "question": "Markdown string for the quiz question (Text-only, self-contained)...",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0, // Integer 0-3
    "explanation": "Markdown string explaining the quiz answer..."
  }
}

**FORMATTING RULES**:
1.  **JSON**: The output must be valid JSON.
2.  **LaTeX**: You must **DOUBLE ESCAPE** backslashes for LaTeX in JSON strings.
    *   Correct: \`\\\\frac{1}{2}\`, \`\\\\alpha\`.
    *   Inline math: \`$ ... $\`. Block math: \`$$ ... $$\`.
3.  **Markdown**: Ensure standard markdown formatting.
`;

const SYSTEM_INSTRUCTION_ZH = `
你是一位世界级的数学教育专家和金牌讲师。
你的目标不仅仅是给出答案，更是要教会学生**解题的思维方式**。

**核心指令**：
1.  **视觉与几何分析（关键）**：
    *   **第一步必须是图形描述**：如果是几何题或函数图像题，必须先用文字详细描述图形特征（例如：“图中有一个圆 O，AB 是直径，CD 垂直于 AB...”）。
    *   **强迫观察**：在列公式之前，先解释你是如何从图中“看”出这个关系的。
2.  **深度推理与教学**：
    *   **拒绝堆砌公式**。每一步都要解释**“为什么要这样做”**。
    *   *错误示范*：“由勾股定理得 5。”
    *   *正确示范*：“因为题目给出了直角三角形的两条直角边 3 和 4，为了求斜边，我们可以使用勾股定理 $a^2 + b^2 = c^2$...”
3.  **步骤清晰**：将复杂的逻辑拆解为简单易懂的小步骤。

**测验题目生成规则（非常重要）**：
*   生成的测验题目必须是**纯文字题目**，且条件完备（Self-contained）。
*   **绝对禁止**生成需要“看图”才能解答的题目，因为**用户界面上不会显示任何图片**。
*   **禁止使用**：“如图所示”、“看图”、“参考下图”等表述。
*   *错误示范*：“求图中阴影部分的面积。”
*   *正确示范*：“已知一个圆的半径为 5，求其面积。”
*   如果原题是几何题，请将其转化为**所有几何条件都已用文字明确给出**的应用题。
*   如果原题是看图识函数，请改为考察该函数的性质（如“y=2x+1 的斜率是多少？”）。

**输出格式**：
你必须返回一个合法的 **JSON 对象**，不要包含 Markdown 代码块标记。
结构如下：
{
  "explanation": "包含图形分析、详细思路和逐步解答的 Markdown 字符串...",
  "quiz": {
    "question": "测验题目的 Markdown 字符串（必须是纯文字，不依赖图片）...",
    "options": ["选项 A", "选项 B", "选项 C", "选项 D"],
    "correctIndex": 0, // 整数 0-3
    "explanation": "测验的简要解析 Markdown 字符串..."
  }
}

**关键格式规则**：
1.  **JSON**：必须输出合法的 JSON。
2.  **JSON 中的 LaTeX**：在 JSON 字符串中，LaTeX 的反斜杠必须**双重转义**。
    *   正确：\`\\\\frac{1}{2}\`, \`\\\\alpha\`, \`\\\\approx\`。
    *   行内公式：\`$ ... $\`。块级公式：\`$$ ... $$\`。
3.  **Markdown**：加粗标签内绝不能有空格。
`;

// Helper to clean JSON string if the model wraps it in markdown code blocks
const cleanJsonString = (str: string): string => {
  let cleaned = str.trim();
  
  // Clean R1/DeepSeek <think> tags if present
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/g, '');
  cleaned = cleaned.trim();

  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```/, '').replace(/```$/, '');
  }
  return cleaned.trim();
};

// --- Provider Implementations ---

// 1. Google Gemini
const callGemini = async (base64Image: string, mimeType: string, prompt: string, instruction: string, settings: AISettings): Promise<string> => {
  const apiKey = settings.keys.gemini || process.env.API_KEY;
  if (!apiKey) throw new Error("Gemini API Key missing");

  const clientOptions: any = { apiKey };
  if (settings.baseUrl && settings.baseUrl.trim() !== '') {
    clientOptions.baseUrl = settings.baseUrl;
  }

  const ai = new GoogleGenAI(clientOptions);
  const modelId = settings.model || 'gemini-2.5-flash';

  const response = await ai.models.generateContent({
    model: modelId,
    contents: {
      parts: [
        { inlineData: { mimeType: mimeType || 'image/jpeg', data: base64Image } },
        { text: prompt }
      ]
    },
    config: {
      systemInstruction: instruction,
      responseMimeType: 'application/json',
      temperature: 0.2,
    }
  });

  return response.text || "{}";
};

// 2. Generic OpenAI Compatible Caller (Supports OpenAI, Qwen, etc.)
const callOpenAICompatible = async (
  messages: any[], 
  settings: AISettings, 
  forceJson: boolean = false
): Promise<string> => {
  const provider = settings.provider;
  const apiKey = settings.keys[provider];
  if (!apiKey) throw new Error(`${provider.toUpperCase()} API Key missing`);

  let baseUrl = settings.baseUrl;
  if (!baseUrl || baseUrl.trim() === '') {
    if (provider === 'openai') baseUrl = 'https://api.openai.com/v1';
    else if (provider === 'qwen') baseUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
  }
  baseUrl = baseUrl?.replace(/\/$/, '') || '';

  const url = `${baseUrl}/chat/completions`;
  const modelToUse = settings.model;

  // Cleanup Image Messages for providers that might not support 'detail'
  const cleanedMessages = messages.map(msg => {
    if (Array.isArray(msg.content)) {
      return {
        ...msg,
        content: msg.content.map((part: any) => {
          if (part.type === 'image_url' && provider !== 'openai') {
            // Remove 'detail' for non-OpenAI providers just in case
            const { detail, ...restImageUrl } = part.image_url;
            return { ...part, image_url: restImageUrl };
          }
          return part;
        })
      };
    }
    return msg;
  });

  const body: any = {
    model: modelToUse,
    messages: cleanedMessages,
    temperature: 0.3,
    max_tokens: 4096 
  };

  if (forceJson && provider === 'openai') {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    console.error("API Error", errData);
    
    // Extract error message safely
    const apiMsg = errData?.error?.message || errData?.message || JSON.stringify(errData) || `Status ${response.status}`;

    if (response.status === 401) {
      throw new Error("Unauthorized (401). Please check your API Key.");
    }
    throw new Error(`API Request Failed: ${apiMsg}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
};

// --- Main Export ---

export const solveMathProblem = async (base64Image: string, mimeType: string, lang: Language, settings: AISettings): Promise<MathResponse> => {
  const isZh = lang === 'zh';
  const instruction = isZh ? SYSTEM_INSTRUCTION_ZH : SYSTEM_INSTRUCTION_EN;
  const prompt = isZh ? "请分析图片并按要求输出 JSON。" : "Please analyze the image and output JSON as requested.";

  // Default MIME type if missing
  const safeMimeType = mimeType || 'image/jpeg';

  try {
    let rawText = "";

    if (settings.provider === 'gemini') {
      rawText = await callGemini(base64Image, safeMimeType, prompt, instruction, settings);
    } 
    else {
      // Standard flow (OpenAI, Qwen)
      const messages = [
        { role: "system", content: instruction },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:${safeMimeType};base64,${base64Image}`,
                detail: "high" // Will be stripped for non-OpenAI in callOpenAICompatible
              }
            }
          ]
        }
      ];
      
      // Use forceJson=true only for valid OpenAI models to avoid errors on other providers
      const useJsonFormat = settings.provider === 'openai';
      rawText = await callOpenAICompatible(messages, settings, useJsonFormat);
    }

    // Clean and Parse
    const cleanedText = cleanJsonString(rawText);
    console.log("Cleaned JSON Text:", cleanedText);
    
    try {
      const jsonResponse = JSON.parse(cleanedText) as MathResponse;
      
      if (!jsonResponse.explanation || !jsonResponse.quiz) {
        throw new Error("Invalid JSON structure received from AI");
      }
      return jsonResponse;

    } catch (parseError) {
      console.error("JSON Parse Error:", parseError, "Raw text:", rawText);
      throw new Error(isZh ? "AI 返回数据格式错误（JSON 解析失败）。" : "Failed to parse AI response (Invalid JSON).");
    }

  } catch (error: any) {
    console.error(`${settings.provider} API Error:`, error);
    
    let msg = error.message || "Failed to analyze the image.";
    
    if (msg.includes("Key missing")) {
      msg = isZh 
        ? "未配置 API Key，请在设置中输入。" 
        : "API Key not configured. Please enter it in Settings.";
    }

    throw new Error(msg);
  }
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error("Failed to convert file to base64"));
      }
    };
    reader.onerror = error => reject(error);
  });
};
