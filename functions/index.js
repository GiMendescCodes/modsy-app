// functions/index.js
const functions = require("firebase-functions");
const fetch = require("node-fetch");

// Configuração de segurança: só permite usuários autenticados
const withAuth = (handler) => {
  return functions.https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Usuário deve estar logado."
      );
    }
    return handler(data, context);
  });
};

exports.sugerirLookIA = withAuth(async (data, context) => {
  const { prompt } = data;
  if (!prompt || typeof prompt !== "string") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Prompt é obrigatório."
    );
  }

  const OPENROUTER_KEY = functions.config().openrouter.key;
  if (!OPENROUTER_KEY) {
    throw new functions.https.HttpsError(
      "internal",
      "Chave da OpenRouter não configurada."
    );
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://meu-guarda-roupa.app",
        "X-Title": "Meu Guarda-Roupa",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3-8b-instruct",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro OpenRouter:", errorText);
      throw new functions.https.HttpsError(
        "internal",
        `OpenRouter error ${response.status}`
      );
    }

    const result = await response.json();
    return {
      success: true,
      content: result.choices?.[0]?.message?.content || "",
    };
  } catch (error) {
    console.error("Erro na Cloud Function:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Falha ao comunicar com a IA."
    );
  }
});