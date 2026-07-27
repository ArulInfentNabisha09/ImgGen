const apiKey = "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";
const invokeUrl = "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell";

async function testT2I() {
  const payload = {
    prompt: "a beautiful cyberpunk city",
    width: 1024,
    height: 1024,
    steps: 4
  };

  try {
    const response = await fetch(invokeUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`API Error ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    console.log("✅ Success! Response keys:", Object.keys(data));
    if (data.image) {
      console.log("✅ Got image data length:", data.image.length);
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

testT2I();
