// Service to communicate with Google Gemini API for parcel Vision OCR extraction.
import { firebaseConfig } from "../firebase/firebase";

const SYSTEM_PROMPT = `
You are an intelligent data-entry operator for Flax Couriers.
Analyze the uploaded image (which could be a parcel photo, shipping label, invoice, or WhatsApp screenshot) and extract all courier shipment fields.
If you detect multiple parcels, invoices, or distinct shipments in one image, list all of them in the "parcels" array and set "multipleParcelsDetected" to true. Otherwise, set it to false and return a single item in the "parcels" array.

For each parcel/shipment, extract the following fields and return a confidence score (from 0 to 100) representing your confidence in the correctness of the extraction:

1. Sender:
   - name (Sender Name)
   - phone (Sender Phone)
   - address (Sender Address)
2. Receiver:
   - name (Consignee Name)
   - phone (Consignee Phone)
   - address (Consignee Full Address)
   - city (e.g. Karachi, Lahore, Islamabad, Faisalabad, Rawalpindi, Multan, Peshawar, Quetta, Gujrat, Sialkot, Gujranwala)
   - area (Specific locality)
   - landmark (Nearest reference point)
   - postalCode (Zip/Postal code)
3. Shipment:
   - codAmount (Numeric value of cash on delivery. Rs. 3,250 -> 3250. Rs 0 if prepaid)
   - declaredValue (Numeric declared value if any)
   - parcelContents (Description of item, e.g. Blue Shirt, Ladies Suite)
   - weight (Numeric value in KG, e.g., 2.5kg -> 2.5)
   - pieces (Number of pieces, numeric, default 1)
4. Reference:
   - orderNumber (Order ID or Order Ref)
   - referenceNumber (Reference number)
   - cnNumber (Consignment Note/tracking number if pre-existing)
   - email (Email address if present)
5. Notes:
   - specialInstructions (Any notes or delivery instructions)

Contextual Intelligence Rules:
- If a casual chat is shown (WhatsApp screenshot like "Name: Ahmed, 03451234567, House 22 Karachi"), extract them correctly.
- Convert weight terms like "2kg" or "2000g" to kilograms numeric (e.g. 2.0).
- Convert COD currencies to integer numbers (e.g. "Rs. 3,250" -> 3250).
- If city is Karachi, Lahore, Islamabad, Rawalpindi, Faisalabad, etc., map it to the "city" field.

Return your response strictly in the following JSON format:
{
  "multipleParcelsDetected": false,
  "parcels": [
    {
      "data": {
        "senderName": "...",
        "senderPhone": "...",
        "senderAddress": "...",
        "receiverName": "...",
        "receiverPhone": "...",
        "receiverAddress": "...",
        "receiverCity": "...",
        "receiverArea": "...",
        "receiverLandmark": "...",
        "receiverPostalCode": "...",
        "codAmount": 0,
        "declaredValue": 0,
        "parcelContents": "...",
        "weight": 1.0,
        "pieces": 1,
        "orderNumber": "...",
        "referenceNumber": "...",
        "cnNumber": "...",
        "receiverEmail": "...",
        "specialInstructions": "..."
      },
      "confidence": {
        "senderName": 95,
        "senderPhone": 90,
        "senderAddress": 90,
        "receiverName": 98,
        "receiverPhone": 99,
        "receiverAddress": 92,
        "receiverCity": 95,
        "receiverArea": 80,
        "receiverLandmark": 70,
        "receiverPostalCode": 90,
        "codAmount": 100,
        "declaredValue": 90,
        "parcelContents": 95,
        "weight": 95,
        "pieces": 95,
        "orderNumber": 90,
        "referenceNumber": 90,
        "cnNumber": 90,
        "receiverEmail": 90,
        "specialInstructions": 85
      }
    }
  ]
}
`;

/**
 * Sends a base64 image to the Gemini Vision API
 * @param {string} base64Image - Base64 encoded image string (with or without data URI prefix)
 * @param {string} apiKey - Gemini API Key
 * @returns {Promise<object>} - Parsed extraction result
 */
export async function scanParcelImage(base64Image, apiKey) {
  let activeKey = "";
  const envKey = (typeof import.meta !== 'undefined' && import.meta.env ? (import.meta.env.VITE_OPENROUTER_API_KEY || import.meta.env.VITE_GEMINI_API_KEY) : "");
  
  if (apiKey && (apiKey.startsWith("sk-or-v1-") || apiKey.startsWith("AIzaSy"))) {
    activeKey = apiKey;
  } else if (envKey && (envKey.startsWith("sk-or-v1-") || envKey.startsWith("AIzaSy"))) {
    activeKey = envKey;
  } else {
    activeKey = apiKey || envKey || "";
  }

  console.log("AI Scan - Resolving API Key. Prefix:", activeKey ? activeKey.substring(0, 15) + "..." : "none");

  const isOpenRouter = activeKey && activeKey.startsWith("sk-or-v1-");

  if (!isOpenRouter && (!activeKey || !activeKey.startsWith("AIzaSy"))) {
    activeKey = firebaseConfig.apiKey || activeKey;
    console.log("AI Scan - Falling back to Firebase key. Prefix:", activeKey ? activeKey.substring(0, 15) + "..." : "none");
  }

  if (!activeKey) {
    throw new Error("Gemini API key is required. Please set it in the Settings panel.");
  }

  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");

  if (isOpenRouter) {
    const url = "https://openrouter.ai/api/v1/chat/completions";
    const requestBody = {
      model: "google/gemini-2.5-flash",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: SYSTEM_PROMPT },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Data}`
              }
            }
          ]
        }
      ]
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${activeKey}`,
        "HTTP-Referer": window.location.origin,
        "X-Title": "Flax Couriers Portal"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || `OpenRouter API failed with status ${response.status}`);
    }

    const result = await response.json();
    const textResponse = result?.choices?.[0]?.message?.content;

    if (!textResponse) {
      throw new Error("Failed to get response content from OpenRouter");
    }

    try {
      return JSON.parse(textResponse);
    } catch (e) {
      console.error("Failed to parse OpenRouter JSON output:", textResponse);
      throw new Error("Failed to parse the structured AI response.");
    }
  } else {
    // Direct Google Gemini API
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${activeKey}`;
    const requestBody = {
      contents: [
        {
          parts: [
            { text: SYSTEM_PROMPT },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json"
      }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || `API call failed with status ${response.status}`);
    }

    const result = await response.json();
    const textResponse = result?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResponse) {
      throw new Error("Failed to get response text from Gemini API");
    }

    try {
      return JSON.parse(textResponse);
    } catch (e) {
      console.error("Failed to parse Gemini JSON output:", textResponse);
      throw new Error("Failed to parse the structured AI response.");
    }
  }
}

/**
 * Simple chat assistant within review panel
 * @param {string} userQuestion - The question typed by the user
 * @param {object} extractedData - The data currently extracted
 * @param {string} apiKey - Gemini API key
 */
export async function chatAboutExtraction(userQuestion, extractedData, apiKey) {
  let activeKey = "";
  const envKey = (typeof import.meta !== 'undefined' && import.meta.env ? (import.meta.env.VITE_OPENROUTER_API_KEY || import.meta.env.VITE_GEMINI_API_KEY) : "");
  
  if (apiKey && (apiKey.startsWith("sk-or-v1-") || apiKey.startsWith("AIzaSy"))) {
    activeKey = apiKey;
  } else if (envKey && (envKey.startsWith("sk-or-v1-") || envKey.startsWith("AIzaSy"))) {
    activeKey = envKey;
  } else {
    activeKey = apiKey || envKey || "";
  }

  console.log("AI Chat - Resolving API Key. Prefix:", activeKey ? activeKey.substring(0, 15) + "..." : "none");

  const isOpenRouter = activeKey && activeKey.startsWith("sk-or-v1-");

  if (!isOpenRouter && (!activeKey || !activeKey.startsWith("AIzaSy"))) {
    activeKey = firebaseConfig.apiKey || activeKey;
    console.log("AI Chat - Falling back to Firebase key. Prefix:", activeKey ? activeKey.substring(0, 15) + "..." : "none");
  }

  if (!activeKey) {
    throw new Error("Gemini API key is required.");
  }

  const chatPrompt = `
You are the Flax Couriers AI Parcel Scan Assistant.
The user is reviewing the following extracted parcel shipment data:
${JSON.stringify(extractedData, null, 2)}

Answer the user's question: "${userQuestion}"
Provide a helpful, friendly, and concise response. Explain what was detected, what is missing, or why any fields are highlighted (< 85% confidence score) in plain language.
`;

  if (isOpenRouter) {
    const url = "https://openrouter.ai/api/v1/chat/completions";
    const requestBody = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "user", content: chatPrompt }
      ]
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${activeKey}`,
        "HTTP-Referer": window.location.origin,
        "X-Title": "Flax Couriers Portal"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error("Chat assistant OpenRouter API call failed.");
    }

    const result = await response.json();
    return result?.choices?.[0]?.message?.content || "No response received.";
  } else {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${activeKey}`;
    const requestBody = {
      contents: [
        {
          parts: [
            { text: chatPrompt }
          ]
        }
      ]
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error("Chat assistant API call failed.");
    }

    const result = await response.json();
    return result?.candidates?.[0]?.content?.parts?.[0]?.text || "No response received.";
  }
}
