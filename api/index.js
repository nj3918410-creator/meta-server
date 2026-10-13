import express from "express";
import axios from "axios";
import crypto from "crypto";
import { Telegraf, Markup } from "telegraf";

// ================= CONFIG =================
const BOT_TOKEN = "8566960112:AAGCvLfA9tKI4WjuDNh2RPfVeNP74D38jDQ";
const app = express();
app.use(express.json());

const bot = new Telegraf(BOT_TOKEN);

// ================= URL & API ENDPOINTS =================
const TARGET_CREATE_URL = "https://auth.meta.com/login/device-based/register-save-credentials/";
const TARGET_CONFIRM_URL = "https://auth.meta.com/api/graphql/";

// Temp Mail APIs
const TEMPMAIL_CREATE_URL = "https://instanttempemail.com/api/create";
const TEMPMAIL_INBOX_URL = "https://instanttempemail.com/api/inbox/";

// Priyo Mail APIs
const PRIYO_BASE_URL = "https://ais-dev-or3hexjkzd5wiwgakt7ucq-780001404467.asia-southeast1.run.app";
const PRIYO_CREATE_URL = `${PRIYO_BASE_URL}/api/priyo/random`;
const PRIYO_MESSAGES_URL = `${PRIYO_BASE_URL}/api/priyo/messages`;

// ================= HEADERS =================
const HEADERS_CREATE = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 12; itel S665L Build/SP1A.210812.016) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.87 Mobile Safari/537.36",
  "Accept-Encoding": "gzip, deflate",
  "Content-Type": "application/x-www-form-urlencoded",
  "sec-ch-ua": '"Chromium";v="152", "Not?A_Brand";v="24", "Android WebView";v="152"',
  "sec-ch-ua-mobile": "?1",
  "sec-ch-ua-platform": '"Android"',
  "x-asbd-id": "359341",
  "x-fb-lsd": "AdRLdRXnKs4_RAGnmEr-k2XaQu0",
  origin: "https://auth.meta.com",
  "x-requested-with": "mark.via.gp",
  "sec-fetch-site": "same-origin",
  "sec-fetch-mode": "cors",
  "sec-fetch-dest": "empty",
  referer: "https://auth.meta.com/",
  "accept-language": "en-US,en;q=0.9",
  priority: "u=1, i",
};

const HEADERS_CONFIRM = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 12; itel S665L Build/SP1A.210812.016) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.87 Mobile Safari/537.36",
  "Accept-Encoding": "gzip, deflate",
  "Content-Type": "application/x-www-form-urlencoded",
  "sec-ch-ua-platform": '"Android"',
  "sec-ch-ua": '"Chromium";v="152", "Not?A_Brand";v="24", "Android WebView";v="152"',
  "x-fb-friendly-name": "FRLConfirmEmailMutation",
  "sec-ch-ua-mobile": "?1",
  "sec-ch-ua-model": '""',
  "x-asbd-id": "359341",
  "sec-ch-prefers-color-scheme": "light",
  "sec-ch-ua-platform-version": '""',
  origin: "https://auth.meta.com",
  "x-requested-with": "mark.via.gp",
  "sec-fetch-site": "same-origin",
  "sec-fetch-mode": "cors",
  "sec-fetch-dest": "empty",
  "accept-language": "en-US,en;q=0.9",
  priority: "u=1, i",
};

const HEADERS_TEMPMAIL = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 12; itel S665L Build/SP1A.210812.016) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.87 Mobile Safari/537.36",
  "Accept-Encoding": "gzip, deflate",
  "sec-ch-ua-platform": '"Android"',
  "sec-ch-ua": '"Chromium";v="152", "Not?A_Brand";v="24", "Android WebView";v="152"',
  "sec-ch-ua-mobile": "?1",
  "x-requested-with": "mark.via.gp",
  origin: "https://instanttempemail.com",
  referer: "https://instanttempemail.com/",
};

// ================= RANDOM NAME POOLS (MIX COUNTRIES) =================
const FIRST_NAMES = [
  // 🇧🇩 বাংলাদেশ
  "Rahim", "Karim", "Hasan", "Sabbir", "Tanvir", "Nusrat", "Farhana", "Ayesha", "Rifat", "Sakib",
  "Mehedi", "Shakil", "Arif", "Jahid", "Rasel", "Sumaiya", "Tania", "Mim", "Sadia", "Rumana",
  // 🇮🇳 ভারত
  "Arjun", "Rohit", "Priya", "Anjali", "Vikram", "Sneha", "Rahul", "Kavya", "Aditya", "Neha",
  "Siddharth", "Deepika", "Karan", "Pooja", "Amit", "Riya", "Varun", "Ishita", "Manish", "Divya",
  // 🇺🇸 আমেরিকা
  "John", "Michael", "David", "Sarah", "Emily", "James", "Robert", "Jessica", "Ashley", "Daniel",
  "Matthew", "Christopher", "Amanda", "Joshua", "Melissa", "Andrew", "Nicole", "Ryan", "Stephanie", "Brandon",
  // 🇬🇧 যুক্তরাজ্য
  "Oliver", "Harry", "George", "Amelia", "Olivia", "Jack", "Charlie", "Sophie", "Isla", "Thomas",
  "Jacob", "Alfie", "Freddie", "Poppy", "Evie", "Oscar", "Lily", "William", "Grace", "Henry",
  // 🇸🇦 সৌদি আরব
  "Ahmed", "Mohammed", "Abdullah", "Fatima", "Aisha", "Omar", "Khalid", "Layla", "Yusuf", "Zainab",
  "Ibrahim", "Sara", "Ali", "Noor", "Hassan", "Mariam", "Salman", "Huda", "Faisal", "Amal",
  // 🇯🇵 জাপান
  "Hiroshi", "Yuki", "Kenji", "Sakura", "Takeshi", "Aiko", "Daiki", "Yui", "Ryo", "Hana",
  "Kaito", "Mio", "Sota", "Rin", "Haruto", "Akari", "Yuto", "Nanami", "Sho", "Miyu",
  // 🇰🇷 কোরিয়া
  "Minho", "Jihoon", "Seoyeon", "Jungkook", "Somin", "Taehyung", "Jimin", "Hyejin", "Yoongi", "Nayeon",
  "Jisoo", "Seokjin", "Hoseok", "Chaeyoung", "Namjoon", "Jihyo", "Mina", "Sana", "Momo", "Tzuyu",
  // 🇩🇪 জার্মানি
  "Lukas", "Felix", "Maximilian", "Anna", "Lena", "Jonas", "Leon", "Emma", "Paul", "Mia",
  "Finn", "Elias", "Noah", "Sophia", "Marie", "Ben", "Luis", "Hannah", "Julian", "Lea",
  // 🇧🇷 ব্রাজিল
  "Lucas", "Gabriel", "Matheus", "Isabella", "Sofia", "Rafael", "Thiago", "Camila", "Beatriz", "Bruno",
  "Felipe", "João", "Pedro", "Maria", "Ana", "Carlos", "Larissa", "Vitor", "Julia", "Diego",
  // 🇳🇬 নাইজেরিয়া
  "Chinedu", "Emeka", "Adaeze", "Ngozi", "Tunde", "Bisi", "Chiamaka", "Obinna", "Funmi", "Kelechi",
  "Adebayo", "Oluchi", "Ifeanyi", "Amaka", "Segun", "Yetunde", "Uche", "Blessing", "Kunle", "Chioma",
];

const LAST_NAMES = [
  // 🇧🇩 বাংলাদেশ
  "Islam", "Hossain", "Rahman", "Ahmed", "Chowdhury", "Sarker", "Mia", "Khan", "Uddin", "Akter",
  "Bhuiyan", "Talukder", "Mollah", "Sheikh", "Mondal", "Karim", "Siddique", "Alam", "Kabir", "Haque",
  // 🇮🇳 ভারত
  "Sharma", "Patel", "Singh", "Kumar", "Gupta", "Reddy", "Mehta", "Joshi", "Nair", "Das",
  "Verma", "Rao", "Iyer", "Chopra", "Malhotra", "Bhat", "Desai", "Kapoor", "Sinha", "Mishra",
  // 🇺🇸 আমেরিকা
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Wilson", "Anderson", "Taylor",
  "Thomas", "Moore", "Jackson", "Martin", "Lee", "Thompson", "White", "Harris", "Clark", "Lewis",
  // 🇬🇧 যুক্তরাজ্য
  "Wright", "Walker", "Robinson", "Thompson", "White", "Hughes", "Edwards", "Green", "Hall", "Wood",
  "Harris", "Martin", "Jackson", "Clarke", "Turner", "Hill", "Scott", "Cooper", "Morris", "Ward",
  // 🇸🇦 সৌদি আরব
  "Al-Saud", "Al-Rashid", "Al-Farsi", "Al-Harbi", "Al-Qahtani", "Al-Otaibi", "Al-Ghamdi", "Al-Zahrani", "Al-Shehri", "Al-Mutairi",
  "Al-Dosari", "Al-Anazi", "Al-Malki", "Al-Juhani", "Al-Balawi", "Al-Amri", "Al-Yami", "Al-Shammari", "Al-Subaie", "Al-Harthi",
  // 🇯🇵 জাপান
  "Tanaka", "Suzuki", "Takahashi", "Yamamoto", "Watanabe", "Ito", "Nakamura", "Kobayashi", "Kato", "Yoshida",
  "Yamada", "Sasaki", "Yamaguchi", "Matsumoto", "Inoue", "Kimura", "Hayashi", "Shimizu", "Saito", "Mori",
  // 🇰🇷 কোরিয়া
  "Kim", "Lee", "Park", "Choi", "Jung", "Kang", "Cho", "Yoon", "Jang", "Lim",
  "Han", "Oh", "Seo", "Shin", "Kwon", "Hwang", "Ahn", "Song", "Yoo", "Hong",
  // 🇩🇪 জার্মানি
  "Müller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker", "Schulz", "Hoffmann",
  "Koch", "Richter", "Klein", "Wolf", "Schröder", "Neumann", "Schwarz", "Zimmermann", "Braun", "Krüger",
  // 🇧🇷 ব্রাজিল
  "Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves", "Pereira", "Lima", "Gomes",
  "Costa", "Ribeiro", "Martins", "Carvalho", "Almeida", "Lopes", "Soares", "Fernandes", "Vieira", "Barbosa",
  // 🇳🇬 নাইজেরিয়া
  "Okafor", "Adeyemi", "Eze", "Obi", "Balogun", "Ogunleye", "Nwosu", "Adebayo", "Ibrahim", "Yakubu",
  "Okonkwo", "Adesanya", "Olawale", "Chukwu", "Bello", "Afolabi", "Nnamdi", "Ogundipe", "Umeh", "Salami",
];

// র‍্যান্ডম নাম জেনারেট করার হেল্পার ফাংশন
function getRandomName() {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return { firstName, lastName };
}

// ================= BASE FORM =================
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
  regulation_jurisdiction: '["BD"]',
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

// ================= USER SESSIONS =================
const USER_SESSIONS = {};

// ================= HELPER FUNCTIONS =================
function getMainKeyboard() {
  return Markup.keyboard([["Create"]]).resize();
}

function getCancelInline() {
  return Markup.inlineKeyboard([[Markup.button.callback("❌ Cancel", "cancel_action")]]);
}

function generateRandomToken(length = 24) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function encodeMetaPassword(password) {
  try {
    const key = crypto.randomBytes(16);
    const pwBytes = Buffer.from(password, "utf-8");
    const encrypted = Buffer.alloc(pwBytes.length);
    for (let i = 0; i < pwBytes.length; i++) {
      encrypted[i] = pwBytes[i] ^ key[i % key.length];
    }
    const combined = Buffer.concat([key, encrypted]);
    const b64 = combined.toString("base64");
    const timestamp = Math.floor(Date.now() / 1000);
    return `#PWD_BROWSER:5:${timestamp}:${b64}`;
  } catch (e) {
    const b64 = Buffer.from(password, "utf-8").toString("base64");
    return `#PWD_BROWSER:5:${Math.floor(Date.now() / 1000)}:${b64}`;
  }
}

function parseMetaResponse(text) {
  let clean = text.trim();
  if (clean.startsWith("for (;;);")) {
    clean = clean.substring(9);
  }
  try {
    return JSON.parse(clean);
  } catch (e) {
    return null;
  }
}

function calculateJazoest(token) {
  if (!token) return "25584";
  let sum = 0;
  for (const c of String(token)) {
    sum += c.charCodeAt(0);
  }
  return "2" + sum;
}

function extractTokensAndUid(html) {
  let fb_dtsg = "";
  let lsd = "";
  let actor_id = "";

  const dtsgPatterns = [
    /\["DTSGInitialData",\[\],\{"token":"([^"]+)"\}/,
    /\["DTSGInitData",\[\],\{"token":"([^"]+)"\}/,
    /name="fb_dtsg"\s+value="([^"]+)"/,
    /"token":"(NAf[^"]+)"/,
    /DTSGInitialData.*?\{"token":"([^"]+)"\}/,
  ];
  for (const p of dtsgPatterns) {
    const m = html.match(p);
    if (m) { fb_dtsg = m[1]; break; }
  }

  const lsdPatterns = [
    /\["LSD",\[\],\{"token":"([^"]+)"\}/,
    /name="lsd"\s+value="([^"]+)"/,
    /"LSD":\{"token":"([^"]+)"\}/,
    /"token":"([0-9a-zA-Z_\-]{20,})"/,
  ];
  for (const p of lsdPatterns) {
    const m = html.match(p);
    if (m) { lsd = m[1]; break; }
  }

  const uidPatterns = [
    /"ACCOUNT_ID":"(\d+)"/,
    /"USER_ID":"(\d+)"/,
    /"actor_id":"(\d+)"/,
    /"account_id":"(\d+)"/,
  ];
  for (const p of uidPatterns) {
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
      return { success: true, reason: "UID detected" };
    }
    return { success: false, reason: "Unable to parse response" };
  }

  const payload = data.payload || {};
  if (typeof payload === "object" && payload.uid) {
    return { success: true, reason: String(payload.uid) };
  }

  if (data.error) {
    const desc = data.errorDescription || data.errorSummary || "Unknown error";
    return { success: false, reason: desc };
  }

  return { success: false, reason: "Unknown response" };
}

// ================= TEMP MAIL FUNCTIONS =================
async function createPriyoMail() {
  try {
    const resp = await axios.post(PRIYO_CREATE_URL, {}, {
      headers: { "Content-Type": "application/json" },
      timeout: 15000,
    });
    if (resp.status === 200 && resp.data.sessionId && resp.data.email) {
      return { address: resp.data.email, token: resp.data.sessionId, provider: "priyo" };
    }
  } catch (e) {
    console.error("Priyo Mail error:", e.message);
  }
  return null;
}

async function createTempMail() {
  // 1. Try InstantTempMail
  try {
    const resp = await axios.post(TEMPMAIL_CREATE_URL, {}, {
      headers: HEADERS_TEMPMAIL,
      timeout: 15000,
    });
    if (resp.status === 200 && resp.data.address) {
      return { address: resp.data.address, token: resp.data.token, provider: "instant" };
    }
  } catch (e) {
    console.error("InstantTempMail error:", e.message);
  }

  // 2. Fallback to Priyo Mail
  console.log("InstantTempMail failed, trying Priyo Mail...");
  return await createPriyoMail();
}

async function pollPriyoMailOtp(sessionId, statusMsg, baseText, userId, maxRetries = 20, delay = 3000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    if (USER_SESSIONS[userId]?.isCanceled) return { otp: null, status: "CANCELED" };

    try {
      await bot.telegram.editMessageText(
        statusMsg.chat.id,
        statusMsg.message_id,
        undefined,
        `${baseText}\n⏳ **Step 3/4:** Checking Priyo inbox for OTP... \`(Attempt: ${attempt}/${maxRetries})\`\n━━━━━━━━━━━━━━━━━━━━━`,
        { parse_mode: "Markdown", reply_markup: getCancelInline().reply_markup }
      );
    } catch (e) {}

    try {
      const resp = await axios.post(PRIYO_MESSAGES_URL, { sessionId }, {
        headers: { "Content-Type": "application/json" },
        timeout: 15000,
      });
      if (resp.status === 200) {
        const messages = resp.data.messages || [];
        for (const msg of messages) {
          const subject = msg.subject || "";
          const body = msg.body || "";
          const otpCode = msg.otpCode;

          if (body.includes("Confirm that you're human") || subject.includes("Action needed")) {
            return { otp: null, status: "CHECKPOINT_HUMAN" };
          }

          if (otpCode) return { otp: String(otpCode), status: "SUCCESS" };

          const otpMatch = body.match(/Confirmation code\s*[:\s]*(\d{6})/i) || body.match(/\b(\d{6})\b/);
          if (otpMatch) return { otp: otpMatch[1], status: "SUCCESS" };
        }
      }
    } catch (e) {}

    await new Promise((r) => setTimeout(r, delay));
  }
  return { otp: null, status: "TIMEOUT" };
}

async function pollTempMailOtpRealtime(token, statusMsg, baseText, userId, maxRetries = 20, delay = 3000, provider = "instant") {
  if (provider === "priyo") {
    return await pollPriyoMailOtp(token, statusMsg, baseText, userId, maxRetries, delay);
  }

  const inboxUrl = `${TEMPMAIL_INBOX_URL}${token}`;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    if (USER_SESSIONS[userId]?.isCanceled) return { otp: null, status: "CANCELED" };

    try {
      await bot.telegram.editMessageText(
        statusMsg.chat.id,
        statusMsg.message_id,
        undefined,
        `${baseText}\n⏳ **Step 3/4:** Checking inbox for OTP... \`(Attempt: ${attempt}/${maxRetries})\`\n━━━━━━━━━━━━━━━━━━━━━`,
        { parse_mode: "Markdown", reply_markup: getCancelInline().reply_markup }
      );
    } catch (e) {}

    try {
      const resp = await axios.get(inboxUrl, { headers: HEADERS_TEMPMAIL, timeout: 15000 });
      if (resp.status === 200) {
        const emails = resp.data.emails || [];
        for (const em of emails) {
          const subject = em.subject || "";
          const body = (em.body_text || "") + " " + (em.body_html || "");

          if (body.includes("Confirm that you're human") || subject.includes("Action needed")) {
            return { otp: null, status: "CHECKPOINT_HUMAN" };
          }

          const otpMatch = body.match(/Confirmation code\s*[:\s]*(\d{6})/i) || body.match(/\b(\d{6})\b/);
          if (otpMatch) return { otp: otpMatch[1], status: "SUCCESS" };
        }
      }
    } catch (e) {}

    await new Promise((r) => setTimeout(r, delay));
  }
  return { otp: null, status: "TIMEOUT" };
}

// ================= BOT COMMANDS =================
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  USER_SESSIONS[userId] = { state: "NONE", isCanceled: false, password: null };
  await ctx.reply(
    "👋 **Welcome!**\n\nClick the **'Create'** button below to create and confirm an account automatically:",
    { parse_mode: "Markdown", ...getMainKeyboard() }
  );
});

bot.action("cancel_action", async (ctx) => {
  const userId = ctx.from.id;
  if (USER_SESSIONS[userId]) {
    USER_SESSIONS[userId].isCanceled = true;
    USER_SESSIONS[userId].state = "NONE";
  }
  try {
    await ctx.editMessageText("❌ **Process has been cancelled.**", { parse_mode: "Markdown" });
  } catch (e) {}
  await ctx.answerCbQuery();
});

bot.on("text", async (ctx) => {
  const userId = ctx.from.id;
  const text = ctx.message.text.trim();

  if (!USER_SESSIONS[userId]) {
    USER_SESSIONS[userId] = { state: "NONE", isCanceled: false, password: null };
  }

  if (text === "Create") {
    USER_SESSIONS[userId].state = "AWAITING_PASSWORD";
    USER_SESSIONS[userId].isCanceled = false;
    await ctx.reply(
      "🔐 **পাসওয়ার্ড ইনপুট দিন**\n━━━━━━━━━━━━━━━━━━━━━\nঅনুগ্রহ করে অ্যাকাউন্টের জন্য একটি পাসওয়ার্ড পাঠান।\n\n📌 **শর্তাবলী:**\n• কমপক্ষে ৬ অক্ষর\n• যেকোনো ক্যারেক্টার ব্যবহার করা যাবে\n\n✍️ এখন আপনার পাসওয়ার্ড টাইপ করে পাঠান:",
      { parse_mode: "Markdown", ...getCancelInline() }
    );
    return;
  }

  if (USER_SESSIONS[userId].state === "AWAITING_PASSWORD") {
    const password = text;

    if (password.length < 6) {
      await ctx.reply(
        "❌ **পাসওয়ার্ড খুব ছোট!**\nকমপক্ষে ৬ অক্ষরের পাসওয়ার্ড দিন।\n\nআবার চেষ্টা করুন:",
        { parse_mode: "Markdown" }
      );
      return;
    }

    USER_SESSIONS[userId].password = password;
    USER_SESSIONS[userId].state = "PROCESSING";
    USER_SESSIONS[userId].isCanceled = false;

    const statusMsg = await ctx.reply(
      "⚡ **REAL-TIME ACCOUNT CREATOR**\n━━━━━━━━━━━━━━━━━━━━━\n✅ **পাসওয়ার্ড গৃহীত!**\n⏳ **Step 1/4:** Generating Temp Mail...\n━━━━━━━━━━━━━━━━━━━━━",
      { parse_mode: "Markdown", ...getCancelInline() }
    );

    // 1. Create Temp Mail
    const tempData = await createTempMail();
    if (!tempData || !tempData.address) {
      USER_SESSIONS[userId].state = "NONE";
      try {
        await bot.telegram.editMessageText(statusMsg.chat.id, statusMsg.message_id, undefined, "❌ Failed to generate Temp Mail! Please try again.");
      } catch (e) {}
      return;
    }

    const tempEmail = tempData.address;
    const tempToken = tempData.token;
    const mailProvider = tempData.provider || "instant";

    if (USER_SESSIONS[userId].isCanceled) return;

    const dashboardStep1 = `⚡ **REAL-TIME ACCOUNT CREATOR**\n━━━━━━━━━━━━━━━━━━━━━\n✅ **Step 1:** Temp Mail ready:\n📧 **Email:** \`${tempEmail}\`\n\n⏳ **Step 2/4:** Creating Meta Account...\n━━━━━━━━━━━━━━━━━━━━━`;
    try {
      await bot.telegram.editMessageText(statusMsg.chat.id, statusMsg.message_id, undefined, dashboardStep1, { parse_mode: "Markdown", reply_markup: getCancelInline().reply_markup });
    } catch (e) {}

    // 2. Meta Account Creation (With Random Name)
    const randomName = getRandomName();
    const data = { ...BASE_FORM_CREATE };
    data.contact_point = tempEmail;
    data.password = encodeMetaPassword(password);
    data.first_name = randomName.firstName;
    data.last_name = randomName.lastName;
    data.redirect_uri = "https://auth.meta.com/recover/success/?redirect_uri=https%3A%2F%2Fauth.meta.com%2Foidc%3Fapp_id%3D1522763855472543";

    try {
      const formData = new URLSearchParams(data).toString();
      const resp = await axios.post(TARGET_CREATE_URL, formData, {
        headers: HEADERS_CREATE,
        timeout: 30000,
        maxRedirects: 0,
        validateStatus: () => true,
      });

      const rawText = resp.data;
      const parsed = parseMetaResponse(typeof rawText === "string" ? rawText : JSON.stringify(rawText));
      const { success, reason } = classifyCreateResponse(resp.status, parsed, typeof rawText === "string" ? rawText : "");

      // Extract cookies
      const responseCookies = {};
      const setCookie = resp.headers["set-cookie"];
      if (setCookie) {
        setCookie.forEach((cookie) => {
          const [kv] = cookie.split(";");
          const [k, v] = kv.split("=");
          if (k && v) responseCookies[k.trim()] = v.trim();
        });
      }

      const fullCookieDict = {
        datr: generateRandomToken(24),
        ps_l: "1",
        ps_n: "1",
        locale: "en_GB",
        ...responseCookies,
      };

      const cookieStr = Object.entries(fullCookieDict).map(([k, v]) => `${k}=${v}`).join("; ");

      let extractedUid = "";
      if (parsed && typeof parsed.payload === "object" && parsed.payload?.uid) {
        extractedUid = String(parsed.payload.uid);
      } else if (success && /^\d+$/.test(reason)) {
        extractedUid = reason;
      }

      if (!success || !extractedUid) {
        USER_SESSIONS[userId].state = "NONE";
        const failCard = `❌ **ACCOUNT CREATION FAILED!**\n━━━━━━━━━━━━━━━━━━━━━\n📧 **Email:** \`${tempEmail}\`\n⚠️ **Reason:** ${reason}\n━━━━━━━━━━━━━━━━━━━━━`;
        try {
          await bot.telegram.editMessageText(statusMsg.chat.id, statusMsg.message_id, undefined, failCard, { parse_mode: "Markdown" });
        } catch (e) {}
        return;
      }

      const savedCsi = BASE_FORM_CREATE.csi;
      const savedWf = BASE_FORM_CREATE.waterfall_id;

      const confirmLink = `https://auth.meta.com/register/confirm/?redirect_uri=https%3A%2F%2Fauth.meta.com%2Foidc%2F%3Fapp_id%3D1522763855472543&waterfall_id=${savedWf}&csi=${savedCsi}&event_flow=login_manual`;

      const checkHeaders = { ...HEADERS_CONFIRM, Cookie: cookieStr, referer: confirmLink };

      let liveDtsg = "", liveLsd = "", pageUid = "";
      try {
        const confRes = await axios.get(confirmLink, { headers: checkHeaders, timeout: 15000 });
        const tokens = extractTokensAndUid(confRes.data);
        liveDtsg = tokens.fb_dtsg;
        liveLsd = tokens.lsd;
        pageUid = tokens.actor_id;
      } catch (e) {}

      const finalUid = extractedUid || pageUid;

      if (USER_SESSIONS[userId].isCanceled) return;

      const dashboardStep2 = `⚡ **REAL-TIME ACCOUNT CREATOR**\n━━━━━━━━━━━━━━━━━━━━━\n✅ **Step 1:** Email: \`${tempEmail}\`\n✅ **Step 2:** Account Created! \`(UID: ${finalUid})\`\n`;

      // 3. Poll for OTP
      const { otp: otpCode, status: statusOtp } = await pollTempMailOtpRealtime(
        tempToken, statusMsg, dashboardStep2, userId, 20, 3000, mailProvider
      );

      if (USER_SESSIONS[userId].isCanceled) return;

      if (statusOtp === "CHECKPOINT_HUMAN") {
        USER_SESSIONS[userId].state = "NONE";
        const checkpointMsg = `⚠️ **HUMAN VERIFICATION CHECKPOINT!**\n━━━━━━━━━━━━━━━━━━━━━\n📧 **Email:** \`${tempEmail}\`\n🆔 **UID:** \`${finalUid}\`\n\nMeta requested 'Confirm that you are human' for this address.\n━━━━━━━━━━━━━━━━━━━━━`;
        try {
          await bot.telegram.editMessageText(statusMsg.chat.id, statusMsg.message_id, undefined, checkpointMsg, { parse_mode: "Markdown" });
        } catch (e) {}
        return;
      } else if (!otpCode) {
        USER_SESSIONS[userId].state = "NONE";
        const timeoutMsg = `⚠️ **OTP TIMEOUT!**\n━━━━━━━━━━━━━━━━━━━━━\n📧 **Email:** \`${tempEmail}\`\n🆔 **UID:** \`${finalUid}\`\nMeta did not deliver the code in time.\n━━━━━━━━━━━━━━━━━━━━━`;
        try {
          await bot.telegram.editMessageText(statusMsg.chat.id, statusMsg.message_id, undefined, timeoutMsg, { parse_mode: "Markdown" });
        } catch (e) {}
        return;
      }

      const dashboardStep3 = `⚡ **REAL-TIME ACCOUNT CREATOR**\n━━━━━━━━━━━━━━━━━━━━━\n✅ **Step 1:** Email: \`${tempEmail}\`\n✅ **Step 2:** UID: \`${finalUid}\`\n✅ **Step 3:** OTP Code received: \`${otpCode}\` 🔥\n\n⏳ **Step 4/4:** Confirming Meta Account...\n━━━━━━━━━━━━━━━━━━━━━`;
      try {
        await bot.telegram.editMessageText(statusMsg.chat.id, statusMsg.message_id, undefined, dashboardStep3, { parse_mode: "Markdown" });
      } catch (e) {}

      // 4. Confirm OTP
      const fbDtsg = liveDtsg || "NAfw3-iVgzAwb3wze6-QRU-d6X36d-knUVwny-8I9gCaoBHl9mph0_A:16:1789089771";
      const lsd = liveLsd || "mVvZ2A2krrrCYh31NtUS0j";
      const jazoest = calculateJazoest(fbDtsg);
      const qplJoinId = "f" + Array.from({ length: 16 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");

      const variablesPayload = {
        input: {
          confirmation_code: { sensitive_string_value: String(otpCode) },
          confirmation_code_type: "OTP_CODE",
          event_flow: "login_manual",
          rl_client_session_id: savedCsi,
          waterfall_id: savedWf,
          source_app_id: "1522763855472543",
          qpl_join_id: qplJoinId,
          actor_id: String(finalUid),
          client_mutation_id: "1",
        },
      };

      const formData2 = {
        av: String(finalUid),
        __user: "0",
        __a: "1",
        __req: "g",
        __hs: "20707.HYP:frl_comet_auth_pkg.2.1...0",
        dpr: "2",
        __ccg: "MODERATE",
        __rev: "1047236770",
        __s: "le1ban:0ytxdz:jokh1r",
        __hsi: String(Math.floor(Math.random() * 1000000000000000000) + 7000000000000000000),
        __dyn: "7xeUmwlEnwn8K2Wmh0no6u5U4e0yoW3q32360CEbo1nEhw2nVE4W099w8G1Dz81s8hwnU2lwv89k2C1Fwc60D82IzXwae4UaEW0Loco5G0zK1swa-0raazo7u0zE2ZwrU6C0hq1Iwqo5u1qwUw8S1Tw8q0JU0Vy3mew",
        __csr: "g_8BH89a--KgUACXB99ilbbb428kDxeczoC6Vpu4HBQ2CbGaw1kq0ty0dDw0JQ7FAhp21CuexetoaE2KwiUd8mzX9Ax25E8U06sG00g9y013jwSDwcWkAw0k_wb20qisCEjw7N-0eBw27E3NwXz82BxK0gUw0Jl4wmQ3K69VU1yA9w2fO0fe06sEgyVU04Nx1mfo2cw2B10O2x0",
        __hsdp: "gd5ZN4qQbQEjg0b_o1E806b4w0DG06HU",
        __hblp: "09G6e0ti029C581uo09ZU04ny0l-06HU0wi2u17xyfwtU0pQw8W0fTw8e0bZw31o",
        __sjsp: "gd5ZN4BOd2Za4Q",
        __comet_req: "33",
        fb_dtsg: fbDtsg,
        jazoest: jazoest,
        lsd: lsd,
        __spin_r: "1047236770",
        __spin_b: "trunk",
        __spin_t: String(Math.floor(Date.now() / 1000)),
        __jssesw: "1",
        fb_api_caller_class: "RelayModern",
        fb_api_req_friendly_name: "FRLConfirmEmailMutation",
        server_timestamps: "true",
        variables: JSON.stringify(variablesPayload),
        doc_id: "9851798224911796",
      };

      const headersConf = { ...HEADERS_CONFIRM, Cookie: cookieStr, "x-fb-lsd": lsd, referer: confirmLink };

      const confFormData = new URLSearchParams(formData2).toString();
      const confResponse = await axios.post(TARGET_CONFIRM_URL, confFormData, {
        headers: headersConf,
        timeout: 30000,
        validateStatus: () => true,
      });

      const resParsed = parseMetaResponse(typeof confResponse.data === "string" ? confResponse.data : JSON.stringify(confResponse.data));
      const confirmInfo = resParsed?.data?.confirm_email || {};

      USER_SESSIONS[userId].state = "NONE";

      // 5. Final Output Card (with Name)
      let finalDashboard;
      if (confirmInfo.isConfirmed === true) {
        const confirmedAccId = confirmInfo.accountId || finalUid;
        finalDashboard = `🎉 **ACCOUNT CREATED & CONFIRMED!**\n━━━━━━━━━━━━━━━━━━━━━\n👤 **Name:** \`${randomName.firstName} ${randomName.lastName}\`\n✅ **Step 1 (Email):** \`${tempEmail}\`\n✅ **Step 2 (UID):** \`${confirmedAccId}\`\n✅ **Step 3 (OTP Code):** \`${otpCode}\`\n✅ **Password:** \`${password}\` 🟢\n━━━━━━━━━━━━━━━━━━━━━`;
      } else {
        finalDashboard = `⚠️ **ACCOUNT CREATED BUT OTP NOT CONFIRMED!**\n━━━━━━━━━━━━━━━━━━━━━\n👤 **Name:** \`${randomName.firstName} ${randomName.lastName}\`\n✅ **Step 1 (Email):** \`${tempEmail}\`\n✅ **Step 2 (UID):** \`${finalUid}\`\n✅ **Step 3 (OTP Code):** \`${otpCode}\`\n✅ **Password:** \`${password}\` 🟢\n━━━━━━━━━━━━━━━━━━━━━`;
      }

      try {
        await bot.telegram.editMessageText(statusMsg.chat.id, statusMsg.message_id, undefined, finalDashboard, { parse_mode: "Markdown" });
      } catch (e) {}

    } catch (e) {
      USER_SESSIONS[userId].state = "NONE";
      try {
        await bot.telegram.editMessageText(statusMsg.chat.id, statusMsg.message_id, undefined, `❌ Error: ${e.message}`);
      } catch (err) {}
    }
    return;
  }

  await ctx.reply("Please click the **'Create'** button below to start.", { parse_mode: "Markdown", ...getMainKeyboard() });
});

// ================= EXPRESS WEBHOOK =================
const WEBHOOK_PATH = `/webhook/${BOT_TOKEN}`;

app.use(bot.webhookCallback(WEBHOOK_PATH));

app.get("/", (req, res) => {
  res.send("🤖 Bot is running!");
});

app.get("/set-webhook", async (req, res) => {
  const webhookUrl = `${req.protocol}://${req.get("host")}${WEBHOOK_PATH}`;
  try {
    await bot.telegram.setWebhook(webhookUrl);
    res.send(`✅ Webhook set to: ${webhookUrl}`);
  } catch (e) {
    res.status(500).send(`❌ Error: ${e.message}`);
  }
});

// Vercel Serverless handler
export default app;
