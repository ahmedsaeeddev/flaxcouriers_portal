import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase/firebase";

const courierApiCallable = httpsCallable(functions, "courierApi");

export async function callCourierApi(action, payload = {}) {
  try {
    const result = await courierApiCallable({ action, ...payload });
    const data = result.data;
    const responseType = String(data?.response_type || data?.reponse_type || "").toLowerCase();
    if (responseType && responseType !== "success") {
      throw new Error(data.message || data.Message || "The courier provider rejected the request.");
    }
    return data;
  } catch (error) {
    const message = error?.message || "The courier API request failed.";
    throw new Error(message, { cause: error });
  }
}
