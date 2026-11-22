const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret, defineString } = require("firebase-functions/params");

const courierApiKey = defineSecret("COURIER_API_KEY");
const courierApiBaseUrl = defineString("COURIER_API_BASE_URL");
const courierAdminEmails = defineString("COURIER_ADMIN_EMAILS", {
  default: "ops@flaxcouriers.com,admin@flaxcouriers.com",
});

function requireText(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpsError("invalid-argument", `${field} is required.`);
  }
  return value.trim();
}

function apiKeySegment() {
  const key = courierApiKey.value();
  if (!key) throw new HttpsError("failed-precondition", "Courier API key is not configured.");
  return encodeURIComponent(key);
}

function getProviderRequest(action, input) {
  const key = () => apiKeySegment();
  const trackingNumber = (field = "trackingNumber") =>
    encodeURIComponent(requireText(input[field], field));

  switch (action) {
    case "bookParcel":
      if (!input.payload || typeof input.payload !== "object" || Array.isArray(input.payload)) {
        throw new HttpsError("invalid-argument", "Parcel booking details are required.");
      }
      return { method: "POST", path: `book-parcel/${key()}/`, body: input.payload };
    case "getDestinations":
      return { method: "GET", path: `get-designation/${key()}/` };
    case "findDestination":
      return {
        method: "GET",
        path: `find-designation/${key()}/${encodeURIComponent(requireText(input.city, "city"))}/`,
      };
    case "trackParcel":
      return { method: "GET", path: `tracking/${trackingNumber()}/` };
    case "getCharges":
      return { method: "GET", path: `get-shipment-charges/${key()}/${trackingNumber()}/` };
    case "getAddressLabel": {
      const trackingNumbers = input.trackingNumbers;
      if (!Array.isArray(trackingNumbers) || trackingNumbers.length === 0) {
        throw new HttpsError("invalid-argument", "Provide at least one tracking number.");
      }
      return {
        method: "POST",
        path: `get-address-label/${key()}/`,
        body: { Tracking_No_List: trackingNumbers.map((value) => requireText(value, "tracking number")) },
        htmlResponse: true,
      };
    }
    case "cancelBooking":
      return { method: "POST", path: `booking-cancel/${key()}/${trackingNumber()}/`, body: {} };
    case "getAdvice":
      return { method: "GET", path: `get-advice/${key()}/` };
    case "markAdvice": {
      const adviceMarkType = Number(input.markType);
      if (!Number.isInteger(adviceMarkType)) {
        throw new HttpsError("invalid-argument", "markType must be an integer.");
      }
      return {
        method: "POST",
        path: `mark-advice/${key()}/`,
        body: {
          cn_number: requireText(input.trackingNumber, "tracking number"),
          description: requireText(input.description, "advice"),
          mark_type: adviceMarkType,
        },
      };
    }
    case "getStatuses":
      return { method: "GET", path: `get-status/${key()}/` };
    case "getServiceTypes":
      return { method: "GET", path: `get-service-type/${key()}/` };
    default:
      throw new HttpsError("invalid-argument", "Unknown courier API operation.");
  }
}

async function callProvider(request) {
  const configuredBase = courierApiBaseUrl.value().trim().replace(/\/+$/, "");
  let baseUrl;
  try {
    baseUrl = new URL(configuredBase);
  } catch {
    throw new HttpsError("failed-precondition", "Set a valid COURIER_API_BASE_URL before using the courier API.");
  }
  if (
    baseUrl.protocol !== "https:" ||
    baseUrl.hostname.toLowerCase() === "domain.com" ||
    baseUrl.hostname.toLowerCase().includes("replace-with") ||
    baseUrl.username ||
    baseUrl.password ||
    baseUrl.search ||
    baseUrl.hash
  ) {
    throw new HttpsError("failed-precondition", "Set the provider's real HTTPS API host; domain.com is only a documentation placeholder.");
  }

  const endpoint = new URL(`${baseUrl.toString().replace(/\/+$/, "")}/${request.path}`);
  const headers = { Accept: request.htmlResponse ? "text/html" : "application/json" };
  if (request.body !== undefined) headers["Content-Type"] = "application/json";

  let response;
  try {
    response = await fetch(endpoint, {
      method: request.method,
      headers,
      body: request.body === undefined ? undefined : JSON.stringify(request.body),
      signal: AbortSignal.timeout(20000),
    });
  } catch (error) {
    const timedOut = error?.name === "TimeoutError";
    throw new HttpsError("unavailable", timedOut ? "Courier API request timed out." : "Courier API host could not be reached.");
  }

  const responseText = await response.text();
  if (!response.ok) {
    throw new HttpsError("failed-precondition", `Courier API returned HTTP ${response.status}.`);
  }
  if (request.htmlResponse || response.headers.get("content-type")?.includes("text/html")) {
    return { html: responseText };
  }
  try {
    return JSON.parse(responseText);
  } catch {
    return { text: responseText };
  }
}

exports.courierApi = onCall({ secrets: [courierApiKey] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in to use courier API operations.");
  }

  const email = String(request.auth.token.email || "").toLowerCase();
  const allowedEmails = courierAdminEmails.value()
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (!email || !allowedEmails.includes(email)) {
    throw new HttpsError("permission-denied", "Only configured admin accounts can use courier API operations.");
  }

  const action = requireText(request.data?.action, "action");
  return callProvider(getProviderRequest(action, request.data || {}));
});
