import express from "express";
import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";
import crypto from "crypto";

const app = express();
app.use(express.json());

// ==================== CONFIG ====================
const FIREBASE_URL = "https://bota-e4eda-default-rtdb.firebaseio.com";
const MAX_BULK = 5;

// ==================== FIREBASE ====================
async function fbGet(pathStr) {
  try {
    const res = await axios.get(`${FIREBASE_URL}/${pathStr.replace(/^\//, "")}.json`, { timeout: 10000 });
    if (res.status === 200) return res.data;
  } catch (e) {}
  return null;
}

async function fbPatch(pathStr, data) {
  try {
    const res = await axios.patch(`${FIREBASE_URL}/${pathStr.replace(/^\//, "")}.json`, data, { timeout: 10000 });
    return res.status === 200;
  } catch (e) {
    return false;
  }
}

// ==================== PROXY ====================
let PROXY_CONFIG = {
  enabled: false,
  ip: "",
  port: "",
  username: "",
  password: "",
  use_for_otp: false,
};

function getProxyUrl() {
  if (!PROXY_CONFIG.enabled || !PROXY_CONFIG.ip || !PROXY_CONFIG.port) return null;
  let auth = "";
  if (PROXY_CONFIG.username && PROXY_CONFIG.password) {
    auth = `${encodeURIComponent(PROXY_CONFIG.username)}:${encodeURIComponent(PROXY_CONFIG.password)}@`;
  }
  return `http://${auth}${PROXY_CONFIG.ip}:${PROXY_CONFIG.port}`;
}

function getProxyAgent(useProxy = true) {
  const pUrl = useProxy ? getProxyUrl() : null;
  if (!pUrl) return null;
  if (pUrl.startsWith("socks")) return new SocksProxyAgent(pUrl);
  return new HttpsProxyAgent(pUrl);
}

// ==================== HELPERS ====================
function generateRandomToken(length = 24) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function parseMetaResponse(text) {
  let clean = (typeof text === "string" ? text : JSON.stringify(text)).trim();
  if (clean.startsWith("for (;;);")) clean = clean.substring("for (;;);".length);
  try {
    return JSON.parse(clean);
  } catch (e) {
    return null;
  }
}

function extractTokensAndUid(html) {
  let fb_dtsg = "", lsd = "", actor_id = "";

  const dtsgPatterns = [
    /\["DTSGInitialData",\[\],\{"token":"([^"]+)"\}/,
    /name="fb_dtsg"\s+value="([^"]+)"/,
    /"token":"(NAf[^"]+)"/,
  ];
  for (const p of dtsgPatterns) {
    const m = html.match(p);
    if (m) { fb_dtsg = m[1]; break; }
  }

  const lsdPatterns = [
    /\["LSD",\[\],\{"token":"([^"]+)"\}/,
    /name="lsd"\s+value="([^"]+)"/,
    /"token":"([0-9a-zA-Z_\-]{20,})"/,
  ];
  for (const p of lsdPatterns) {
    const m = html.match(p);
    if (m) { lsd = m[1]; break; }
  }

  const actPatterns = [
    /"ACCOUNT_ID":"(\d+)"/,
    /"USER_ID":"(\d+)"/,
    /"actor_id":"(\d+)"/,
  ];
  for (const p of actPatterns) {
    const m = html.match(p);
    if (m && m[1] !== "0") { actor_id = m[1]; break; }
  }

  return { fb_dtsg, lsd, actor_id };
}

function classifyCreateResponse(statusCode, data, rawText) {
  if (!data) {
    if (rawText.includes("uid")) {
      const m = rawText.match(/"uid":\s*"?(\d+)"?/);
      if (m) return { success: true, reason: m[1] };
    }
    return { success: false, reason: "Unable to parse response" };
  }
  const payload = data.payload || {};
  if (typeof payload === "object" && payload.uid) {
    return { success: true, reason: String(payload.uid) };
  }
  if (data.error) {
    return { success: false, reason: data.errorDescription || data.errorSummary || "Unknown error" };
  }
  return { success: false, reason: "Unknown response" };
}

function calculateJazoest(token) {
  if (!token) return "25584";
  let sum = 0;
  for (let i = 0; i < token.length; i++) sum += token.charCodeAt(i);
  return "2" + sum;
}

// ==================== META HEADERS ====================
const TARGET_CREATE_URL = "https://auth.meta.com/login/device-based/register-save-credentials/";
const TARGET_CONFIRM_URL = "https://auth.meta.com/api/graphql/";

const ACCEPT_LANGUAGE = "fr-FR,fr;q=0.9,en;q=0.8";

const HEADERS_CREATE = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 12; itel S665L Build/SP1A.210812.016) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.87 Mobile Safari/537.36",
  "Accept-Encoding": "gzip, deflate",
  "Content-Type": "application/x-www-form-urlencoded",
  "Accept-Language": ACCEPT_LANGUAGE,
  "X-FB-Locale": "fr_FR",
  "sec-ch-ua": '"Chromium";v="152", "Not?A_Brand";v="24", "Android WebView";v="152"',
  "sec-ch-ua-mobile": "?1",
  "sec-ch-ua-platform": '"Android"',
  "x-asbd-id": "359341",
  "x-fb-lsd": "AdRLdRXnKs4_RAGnmEr-k2XaQu0",
  "origin": "https://auth.meta.com",
  "x-requested-with": "mark.via.gp",
  "sec-fetch-site": "same-origin",
  "sec-fetch-mode": "cors",
  "sec-fetch-dest": "empty",
  "referer": "https://auth.meta.com/",
  "priority": "u=1, i",
};

const HEADERS_CONFIRM = {
  "User-Agent": HEADERS_CREATE["User-Agent"],
  "Accept-Encoding": "gzip, deflate",
  "Content-Type": "application/x-www-form-urlencoded",
  "Accept-Language": ACCEPT_LANGUAGE,
  "X-FB-Locale": "fr_FR",
  "sec-ch-ua-platform": '"Android"',
  "sec-ch-ua": HEADERS_CREATE["sec-ch-ua"],
  "x-fb-friendly-name": "FRLConfirmEmailMutation",
  "sec-ch-ua-mobile": "?1",
  "x-asbd-id": "359341",
  "origin": "https://auth.meta.com",
  "x-requested-with": "mark.via.gp",
  "sec-fetch-site": "same-origin",
  "sec-fetch-mode": "cors",
  "sec-fetch-dest": "empty",
  "accept-language": ACCEPT_LANGUAGE,
  "priority": "u=1, i",
};

const HEADERS_RESEND = {
  ...HEADERS_CONFIRM,
  "x-fb-friendly-name": "FRLResendEmailMutation",
};

const HEADERS_TEMPMAIL = {
  "User-Agent": HEADERS_CREATE["User-Agent"],
  "Accept-Encoding": "gzip, deflate",
  "sec-ch-ua-platform": '"Android"',
  "sec-ch-ua": HEADERS_CREATE["sec-ch-ua"],
  "sec-ch-ua-mobile": "?1",
  "x-requested-with": "mark.via.gp",
  "origin": "https://instanttempemail.com",
  "referer": "https://instanttempemail.com/",
};

const TEMPTF_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 12; itel S665L Build/SP1A.210812.016) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.8010.39 Mobile Safari/537.36",
  "Accept-Encoding": "gzip, deflate, br, zstd",
  "sec-ch-ua-platform": '"Android"',
  "sec-ch-ua": '"Android WebView";v="153", "Not_A Brand";v="8", "Chromium";v="153"',
  "sec-ch-ua-mobile": "?1",
  "X-Requested-With": "mark.via.gp",
  "Sec-Fetch-Site": "same-origin",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Dest": "empty",
  "Referer": "https://temp.tf/",
  "Accept-Language": ACCEPT_LANGUAGE,
};

const BASE_FORM_CREATE = {
  consent_version: "",
  contact_point_type: "EMAIL_ADDRESS",
  csi: "Scd0BS3l-yOix38o6lNKa_kT",
  date_of_birth: "1993-09-11",
  device_id: "",
  fb_encrypted_access_token: "",
  fb_oidc_access_token: "",
  first_name: "Ajs",
  google_id_token: "",
  has_youth_consent: "false",
  ig_encrypted_access_token: "",
  ig_encrypted_auth_header: "",
  ig_oidc_access_token: "",
  last_name: "Sjs",
  opt_into_marketing: "true",
  password: "",
  reg_integrity: "Q8W2BTuKa24cQO_B6qvNeGtvmIjuAiCCCvXaCbgkwfWbqt-rPjXJArjnIu5K2myj2GHMJPPSr6BbjXBUFU17JuiZ3IvWTGB_fpfbXwr1sq6qX5lwBCHho2TWDE4ACpgpKGop91SIXofE0KTu2MBkdW1Ss0D6TG7isv6lz2N1CLlYDcRuoiMmSnzt_3_tNldGlheeYm1KVKQyQckdk6G2PoiceW2vxKWbivZ6HJPdq-QsNs4JB7yqEnYY2B3u6mfepC066IZYhv9ZgWpXIuYUsgim6pBbL6NyF84-UsOy8kYIOZlCHc_2PFK4SRPhdx0RMJipGYiIeb5y-Nwj_VHS1Tc2es-jc6aZ7hlBsBokGAeo-cnYEERpIKXz_OnmFTc48WHp2nMcJxww|kregenc",
  should_save_credentials: "true",
  waterfall_id: "701777af-c668-4a8d-976a-0c0f619d807a",
  caa_event_flow: "ntf",
  entry_point: "login_home",
  event_client_time: "1789066665.654",
  is_kadabra_zero: "false",
  regulation_jurisdiction: '["FR"]',
  qpl_join_id: "ff52ee3c05b3ec955",
  __user: "0",
  __a: "1",
  __req: "1q",
  __rev: "1047214234",
  lsd: "AdRLdRXnKs4_RAGnmEr-k2XaQu0",
  jazoest: "22293",
  __spin_r: "1047214234",
  __spin_b: "trunk",
  __spin_t: "1789066629",
  __jssesw: "1",
};

// ==================== TEMP MAIL ====================
async function instantCreate() {
  try {
    const agent = getProxyAgent(true);
    const config = { headers: HEADERS_TEMPMAIL, timeout: 10000 };
    if (agent) { config.httpsAgent = agent; config.httpAgent = agent; }
    const resp = await axios.post("https://instanttempemail.com/api/create", {}, config);
    if (resp.status === 200 && resp.data && resp.data.address) {
      return { email: resp.data.address, token: resp.data.token || "", provider: "instant" };
    }
  } catch (e) {}
  return null;
}

async function instantInbox(token) {
  if (!token) return [];
  try {
    const agent = getProxyAgent(true);
    const config = { headers: HEADERS_TEMPMAIL, timeout: 10000 };
    if (agent) { config.httpsAgent = agent; config.httpAgent = agent; }
    const resp = await axios.get(`https://instanttempemail.com/api/inbox/${token}`, config);
    if (resp.status === 200 && resp.data && resp.data.emails) return resp.data.emails;
  } catch (e) {}
  return [];
}

async function temptfCreate() {
  try {
    const resp = await axios.get("https://temp.tf/api/account?providers=high.edu.pl&dot=0&plus=0", {
      headers: TEMPTF_HEADERS,
      timeout: 15000,
    });
    if (resp.status === 200 && resp.data && resp.data.email && resp.data.email.includes("@")) {
      return { email: resp.data.email, token: resp.data.email, provider: "temptf" };
    }
  } catch (e) {}
  return null;
}

async function temptfInbox(token) {
  const email = token;
  if (!email || !email.includes("@")) return [];
  try {
    const headers = { ...TEMPTF_HEADERS, "Content-Type": "application/json", Origin: "https://temp.tf" };
    const resp = await axios.post("https://temp.tf/api/check", { email, wait: false }, { headers, timeout: 15000 });
    if (resp.status === 200 && resp.data && Array.isArray(resp.data.data)) {
      return resp.data.data.map((m) => ({
        subject: m.subject || "",
        body_text: m.body || "",
        body_html: m.body || "",
      }));
    }
  } catch (e) {}
  return [];
}

const PROVIDER_MAP = {
  temptf: { create: temptfCreate, inbox: temptfInbox },
  instant: { create: instantCreate, inbox: instantInbox },
};

const TEMPMAIL_PROVIDERS = {
  temptf: { name: "Temp.tf", desc: "high.edu.pl • Default", badge: "⚡" },
  instant: { name: "InstantTempEmail", desc: "Fast & Reliable", badge: "🔥" },
};

let CURRENT_PROVIDER = "temptf";

async function createTempMail(provider = "temptf") {
  const fn = PROVIDER_MAP[provider]?.create;
  if (fn) {
    try {
      const res = await fn();
      if (res && res.email) return res;
    } catch (e) {}
  }
  const other = provider === "temptf" ? "instant" : "temptf";
  try {
    const res2 = await PROVIDER_MAP[other]?.create();
    if (res2 && res2.email) return res2;
  } catch (e) {}
  return null;
}

async function fetchInboxEmails(token, provider = "temptf") {
  const fn = PROVIDER_MAP[provider]?.inbox;
  if (!fn) return [];
  try {
    return (await fn(token)) || [];
  } catch (e) {
    return [];
  }
}

// ==================== META CREATE ====================
async function createMetaAccount(email, passwordStr) {
  const data = new URLSearchParams();
  for (const [k, v] of Object.entries(BASE_FORM_CREATE)) data.append(k, v);
  data.set("contact_point", email);
  data.set("password", passwordStr);
  data.set("redirect_uri",
    "https://auth.meta.com/recover/success/?redirect_uri=https%3A%2F%2Fauth.meta.com%2Foidc%3Fapp_id%3D1522763855472543");

  const agent = getProxyAgent(true);
  const config = {
    headers: HEADERS_CREATE,
    timeout: 25000,
    validateStatus: () => true,
  };
  if (agent) { config.httpsAgent = agent; config.httpAgent = agent; }

  try {
    const resp = await axios.post(TARGET_CREATE_URL, data.toString(), config);
    const parsed = parseMetaResponse(resp.data);
    const { success, reason } = classifyCreateResponse(resp.status, parsed,
      typeof resp.data === "string" ? resp.data : JSON.stringify(resp.data));

    const setCookies = resp.headers["set-cookie"] || [];
    const fullC = { datr: generateRandomToken(24), ps_l: "1", ps_n: "1", locale: "fr_FR" };
    for (const c of setCookies) {
      const match = c.match(/^([^=]+)=([^;]+)/);
      if (match) fullC[match[1]] = match[2];
    }
    const cookieStr = Object.entries(fullC).map(([k, v]) => `${k}=${v}`).join("; ");

    let extractedUid = "";
    if (parsed && typeof parsed.payload === "object" && parsed.payload.uid) {
      extractedUid = String(parsed.payload.uid);
    } else if (success && /^\d+$/.test(reason)) {
      extractedUid = reason;
    }

    if (!success || !extractedUid) return { success: false, message: reason };

    const savedCsi = BASE_FORM_CREATE.csi;
    const savedWf = BASE_FORM_CREATE.waterfall_id;
    const confirmLink = `https://auth.meta.com/register/confirm/?redirect_uri=https%3A%2F%2Fauth.meta.com%2Foidc%2F%3Fapp_id%3D1522763855472543&waterfall_id=${savedWf}&csi=${savedCsi}&event_flow=login_manual`;

    let liveDtsg = "", liveLsd = "", pageUid = "";
    try {
      const confRes = await axios.get(confirmLink, {
        headers: { ...HEADERS_CONFIRM, Cookie: cookieStr, referer: confirmLink },
        timeout: 15000,
        httpsAgent: agent,
        httpAgent: agent,
      });
      const ext = extractTokensAndUid(typeof confRes.data === "string" ? confRes.data : "");
      liveDtsg = ext.fb_dtsg;
      liveLsd = ext.lsd;
      pageUid = ext.actor_id;
    } catch (e) {}

    const finalUid = extractedUid || pageUid;
    return {
      success: true,
      email,
      uid: finalUid,
      password: passwordStr,
      cookie: cookieStr,
      csi: savedCsi,
      waterfall_id: savedWf,
      fb_dtsg: liveDtsg,
      lsd: liveLsd,
      confirm_link: confirmLink,
    };
  } catch (e) {
    return { success: false, message: e.message || "Meta request failed" };
  }
}

// ==================== CONFIRM OTP ====================
async function confirmMetaOtp(sessionData, otpCode, useProxy = false) {
  try {
    const actorId = sessionData.uid;
    const cookie = sessionData.cookie;
    const savedCsi = sessionData.csi;
    const savedWf = sessionData.waterfall_id;
    const fbDtsg = sessionData.fb_dtsg || "NAfw3-iVgzAwb3wze6-QRU-d6X36d-knUVwny-8I9gCaoBHl9mph0_A:16:1789089771";
    const lsd = sessionData.lsd || "mVvZ2A2krrrCYh31NtUS0j";
    const jazoest = calculateJazoest(fbDtsg);

    const vPayload = {
      input: {
        confirmation_code: { sensitive_string_value: String(otpCode) },
        confirmation_code_type: "OTP_CODE",
        event_flow: "login_manual",
        rl_client_session_id: savedCsi,
        waterfall_id: savedWf,
        source_app_id: "1522763855472543",
        qpl_join_id: `f${crypto.randomBytes(8).toString("hex")}`,
        actor_id: String(actorId),
        client_mutation_id: "1",
      },
    };

    const fData = new URLSearchParams();
    fData.append("av", String(actorId));
    fData.append("__user", "0");
    fData.append("__a", "1");
    fData.append("__req", "g");
    fData.append("__hs", "20707.HYP:frl_comet_auth_pkg.2.1...0");
    fData.append("dpr", "2");
    fData.append("__ccg", "MODERATE");
    fData.append("__rev", "1047236770");
    fData.append("fb_dtsg", fbDtsg);
    fData.append("jazoest", jazoest);
    fData.append("lsd", lsd);
    fData.append("variables", JSON.stringify(vPayload));
    fData.append("doc_id", "9851798224911796");

    const agent = useProxy ? getProxyAgent(true) : null;
    const config = {
      headers: { ...HEADERS_CONFIRM, Cookie: cookie, "x-fb-lsd": lsd, referer: sessionData.confirm_link },
      timeout: 30000,
      validateStatus: () => true,
    };
    if (agent) { config.httpsAgent = agent; config.httpAgent = agent; }

    const cResp = await axios.post(TARGET_CONFIRM_URL, fData.toString(), config);
    const parsed = parseMetaResponse(typeof cResp.data === "string" ? cResp.data : JSON.stringify(cResp.data));
    const confirmInfo = parsed?.data?.confirm_email || {};
    const confirmed = confirmInfo.isConfirmed === true;
    const confirmedId = confirmed ? (confirmInfo.accountId || actorId) : actorId;

    return { confirmed, uid: confirmedId, raw: typeof cResp.data === "string" ? cResp.data : JSON.stringify(cResp.data) };
  } catch (e) {
    return { confirmed: false, uid: sessionData.uid || "0", raw: `Error: ${e.message?.substring(0, 200)}` };
  }
}

// ==================== RESEND OTP TRIGGER ====================
async function triggerResendOtp(sessionData) {
  try {
    const actorId = sessionData.uid;
    const cookie = sessionData.cookie;
    const savedCsi = sessionData.csi;
    const savedWf = sessionData.waterfall_id;
    const fbDtsg = sessionData.fb_dtsg || "NAfw3-iVgzAwb3wze6-QRU-d6X36d-knUVwny-8I9gCaoBHl9mph0_A:16:1789089771";
    const lsd = sessionData.lsd || "mVvZ2A2krrrCYh31NtUS0j";
    const jazoest = calculateJazoest(fbDtsg);

    const vPayload = {
      input: {
        confirmation_code_type: "OTP_CODE",
        event_flow: "login_manual",
        rl_client_session_id: savedCsi,
        waterfall_id: savedWf,
        source_app_id: "1522763855472543",
        actor_id: String(actorId),
        client_mutation_id: "2",
      },
    };

    const fData = new URLSearchParams();
    fData.append("av", String(actorId));
    fData.append("__user", "0");
    fData.append("__a", "1");
    fData.append("__req", "h");
    fData.append("__hs", "20707.HYP:frl_comet_auth_pkg.2.1...0");
    fData.append("dpr", "2");
    fData.append("__ccg", "MODERATE");
    fData.append("__rev", "1047236770");
    fData.append("fb_dtsg", fbDtsg);
    fData.append("jazoest", jazoest);
    fData.append("lsd", lsd);
    fData.append("variables", JSON.stringify(vPayload));
    fData.append("doc_id", "7506257312537383");

    const agent = getProxyAgent(true);
    const config = {
      headers: {
        ...HEADERS_RESEND,
        Cookie: cookie,
        "x-fb-lsd": lsd,
        referer: sessionData.confirm_link,
      },
      timeout: 20000,
      validateStatus: () => true,
    };
    if (agent) { config.httpsAgent = agent; config.httpAgent = agent; }

    const resp = await axios.post(TARGET_CONFIRM_URL, fData.toString(), config);
    console.log(`Resend HTTP: ${resp.status}`);
    return resp;
  } catch (e) {
    console.log(`triggerResendOtp error: ${e.message}`);
    throw e;
  }
}

// ==================== BATCH & SESSIONS ====================
const SESSIONS = {};
const BATCHES = {};

// ============================================================
//          MAIN ACCOUNT CREATOR (with Resend flow)
// ============================================================
async function createOneAccount(passwordStr, provider = "temptf") {
  const result = {
    success: false, status: "failed", email: "", password: passwordStr,
    uid: "", otp: "", message: "", provider,
  };

  // ===== Step 1: Temp Mail =====
  const tempData = await createTempMail(provider);
  if (!tempData || !tempData.email) {
    result.message = "Temp mail create failed";
    return result;
  }

  const tempEmail = tempData.email;
  const tempToken = tempData.token || "";
  const actualProvider = tempData.provider || provider;
  result.email = tempEmail;
  result.provider = actualProvider;

  // ===== Step 2: Meta Account Create =====
  const meta = await createMetaAccount(tempEmail, passwordStr);
  if (!meta || !meta.success) {
    result.message = meta?.message || "Meta create failed";
    return result;
  }

  result.uid = meta.uid || "";
  console.log(`[${tempEmail}] Account created UID: ${result.uid}`);

  // ===== Step 3: প্রথম ১০s inbox চেক (4 × 2.5s) =====
  let otpCode = null;
  let checkpoint = false;

  for (let attempt = 0; attempt < 4; attempt++) {
    const emails = await fetchInboxEmails(tempToken, actualProvider);
    for (const em of emails) {
      if (!em || typeof em !== "object") continue;
      const body = `${em.body_text || ""} ${em.body_html || ""}`;
      const subj = em.subject || "";

      if (body.includes("Confirm that you're human") || subj.includes("Action needed")) {
        checkpoint = true;
        break;
      }

      const patterns = [
        /Confirmation code\s*[:\s]*(\d{6})/i,
        /letter-spacing:\s*2px;[^>]*>\s*(\d{6})\s*</,
        /font-size:\s*24px[^>]*>\s*(\d{6})\s*</,
        /\b(\d{6})\b/,
      ];
      for (const p of patterns) {
        const m = body.match(p);
        if (m) { otpCode = m[1]; break; }
      }
      if (otpCode) break;
    }
    if (otpCode || checkpoint) break;
    await new Promise((r) => setTimeout(r, 2500));
  }

  if (checkpoint) {
    result.status = "checkpoint";
    result.message = "Checkpoint detected";
    return result;
  }

  // ===== Step 4: OTP না পেলে RESEND trigger =====
  if (!otpCode) {
    console.log(`[${tempEmail}] OTP not found in 10s — triggering RESEND`);
    try {
      await triggerResendOtp(meta);
      console.log(`[${tempEmail}] Resend sent — waiting up to 20s`);
    } catch (e) {
      console.log(`[${tempEmail}] Resend failed: ${e.message}`);
    }

    // ===== Step 5: Resend এর পর ২০s wait (8 × 2.5s) =====
    for (let attempt = 0; attempt < 8; attempt++) {
      await new Promise((r) => setTimeout(r, 2500));

      const emails = await fetchInboxEmails(tempToken, actualProvider);
      for (const em of emails) {
        if (!em || typeof em !== "object") continue;
        const body = `${em.body_text || ""} ${em.body_html || ""}`;

        const patterns = [
          /Confirmation code\s*[:\s]*(\d{6})/i,
          /letter-spacing:\s*2px;[^>]*>\s*(\d{6})\s*</,
          /font-size:\s*24px[^>]*>\s*(\d{6})\s*</,
          /\b(\d{6})\b/,
        ];
        for (const p of patterns) {
          const m = body.match(p);
          if (m) { otpCode = m[1]; break; }
        }
        if (otpCode) break;
      }
      if (otpCode) break;
    }
  }

  if (!otpCode) {
    result.status = "otp_timeout";
    result.message = "OTP not found after resend";
    return result;
  }

  console.log(`[${tempEmail}] OTP found: ${otpCode}`);

  // ===== Step 6: Confirm OTP =====
  result.otp = otpCode;
  const confirm = await confirmMetaOtp(meta, otpCode, PROXY_CONFIG.use_for_otp);
  if (confirm && confirm.confirmed) {
    result.success = true;
    result.status = "success";
    result.uid = confirm.uid || result.uid;
    result.message = "Confirmed";
    console.log(`[${tempEmail}] ✅ SUCCESS UID: ${result.uid}`);
  } else {
    result.status = "confirm_failed";
    result.message = "OTP confirm failed";
  }
  return result;
}

async function runBulk(batchId) {
  const batch = BATCHES[batchId];
  if (!batch) return;
  const passwordStr = batch.password || "";
  const provider = batch.provider || "temptf";

  for (const acc of batch.accounts || []) {
    try {
      acc.status = "processing";
      const r = await createOneAccount(passwordStr, provider);
      acc.email = r.email || "";
      acc.uid = r.uid || "";
      acc.confirmed_uid = r.success ? r.uid : "";
      acc.status = r.status || "failed";
    } catch (e) {
      acc.status = "failed";
    }
  }
  batch.done = true;
}

// ==================== API ROUTES ====================

app.get("/", (req, res) => {
  res.json({
    ok: true,
    name: "Meta Creator Server",
    version: "1.1.0",
    endpoints: [
      "/api/providers",
      "/api/set_provider",
      "/api/bulk_create",
      "/api/bulk_status",
      "/api/manual_create",
      "/api/confirm",
      "/api/ip_info",
      "/api/set_proxy",
    ],
  });
});

app.get("/api/providers", (req, res) => {
  const result = Object.entries(TEMPMAIL_PROVIDERS).map(([pid, info]) => ({
    id: pid, name: info.name, desc: info.desc, badge: info.badge,
  }));
  return res.json({ providers: result, current: CURRENT_PROVIDER });
});

app.post("/api/set_provider", (req, res) => {
  const p = (req.body?.provider || "").trim();
  if (!TEMPMAIL_PROVIDERS[p]) return res.json({ success: false, message: "Unknown provider" });
  CURRENT_PROVIDER = p;
  return res.json({ success: true, provider: p });
});

app.post("/api/bulk_create", async (req, res) => {
  const passwordStr = (req.body?.password || "").trim();
  const count = parseInt(req.body?.count || "1", 10);
  let provider = (req.body?.provider || "temptf").trim();
  if (!TEMPMAIL_PROVIDERS[provider]) provider = "temptf";

  if (!passwordStr || passwordStr.length < 6) {
    return res.json({ success: false, message: "Password min 6" });
  }
  if (count < 1 || count > MAX_BULK) {
    return res.json({ success: false, message: `1-${MAX_BULK}` });
  }

  const batchId = generateRandomToken(12);
  BATCHES[batchId] = {
    accounts: Array.from({ length: count }, (_, i) => ({
      index: i + 1,
      status: "pending",
      email: "",
      uid: "",
      session_id: "",
      confirmed_uid: "",
    })),
    done: false,
    password: passwordStr,
    provider,
  };

  runBulk(batchId);

  return res.json({
    success: true,
    batch_id: batchId,
    count,
    provider_name: TEMPMAIL_PROVIDERS[provider].name,
  });
});

app.get("/api/bulk_status", (req, res) => {
  const batchId = req.query?.batch || "";
  const batch = BATCHES[batchId];
  if (!batch) return res.json({ error: "not found" });

  const accounts = (batch.accounts || []).map((a) => ({
    index: a.index || 0,
    status: a.status || "unknown",
    email: a.email || "",
    password: batch.password || "",
    uid: a.confirmed_uid || a.uid || "",
    session_id: a.session_id || "",
  }));

  return res.json({ accounts, done: Boolean(batch.done) });
});

app.post("/api/manual_create", async (req, res) => {
  try {
    const email = (req.body?.email || "").trim();
    const passwordStr = (req.body?.password || "").trim();
    if (!email || !email.includes("@")) {
      return res.json({ success: false, message: "Invalid email" });
    }
    if (!passwordStr || passwordStr.length < 6) {
      return res.json({ success: false, message: "Password min 6" });
    }

    const result = await createMetaAccount(email, passwordStr);
    if (!result || !result.success) {
      return res.json({ success: false, message: result?.message || "Failed" });
    }

    const sid = generateRandomToken(16);
    SESSIONS[sid] = result;
    return res.json({
      success: true,
      session: sid,
      email: result.email || email,
      uid: result.uid || "",
      password: result.password || passwordStr,
    });
  } catch (e) {
    return res.json({ success: false, message: `Error: ${e.message?.substring(0, 200)}` });
  }
});

app.post("/api/confirm", async (req, res) => {
  try {
    const sid = req.body?.session || "";
    const otp = (req.body?.otp || "").replace(/\D/g, "");
    if (!sid || !otp) {
      return res.json({ confirmed: false, raw: "Missing params" });
    }
    const sessionData = SESSIONS[sid];
    if (!sessionData) {
      return res.json({ confirmed: false, raw: "Session expired" });
    }

    const result = await confirmMetaOtp(sessionData, otp, PROXY_CONFIG.use_for_otp);
    if (result && result.confirmed) {
      return res.json({ confirmed: true, uid: result.uid || "" });
    }
    return res.json({ confirmed: false, raw: result?.raw?.substring(0, 300) || "Failed" });
  } catch (e) {
    return res.json({ confirmed: false, raw: `Error: ${e.message?.substring(0, 200)}` });
  }
});

app.get("/api/ip_info", async (req, res) => {
  if (!PROXY_CONFIG.enabled || !PROXY_CONFIG.ip) {
    return res.json({ success: false, ip: "", country: "", country_code: "", isp: "", is_proxy: false });
  }
  try {
    const agent = getProxyAgent(true);
    const config = { timeout: 8000 };
    if (agent) { config.httpsAgent = agent; config.httpAgent = agent; }
    const r = await axios.get("http://ip-api.com/json/?fields=status,country,countryCode,query,isp", config);
    if (r.status === 200 && r.data?.status === "success") {
      return res.json({
        success: true, ip: r.data.query || PROXY_CONFIG.ip,
        country: r.data.country || "", country_code: (r.data.countryCode || "").toUpperCase(),
        isp: r.data.isp || "", is_proxy: true,
      });
    }
  } catch (e) {}
  return res.json({ success: true, ip: PROXY_CONFIG.ip, country: "Unknown", country_code: "", isp: "", is_proxy: true });
});

app.post("/api/set_proxy", async (req, res) => {
  const data = req.body || {};
  if (!data.enabled) {
    PROXY_CONFIG = { enabled: false, ip: "", port: "", username: "", password: "", use_for_otp: false };
    return res.json({ success: true, message: "Disabled" });
  }
  PROXY_CONFIG = {
    enabled: true,
    ip: (data.ip || "").trim(),
    port: String(data.port || "").trim(),
    username: (data.username || "").trim(),
    password: (data.password || "").trim(),
    use_for_otp: Boolean(data.use_for_otp),
  };
  return res.json({ success: true, message: "Proxy set", ip: PROXY_CONFIG.ip });
});

// ==================== EXPORT FOR VERCEL ====================
export default app;
