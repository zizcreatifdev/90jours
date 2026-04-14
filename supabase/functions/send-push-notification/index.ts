import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── VAPID helpers (RFC 8292 / RFC 8291) ──

function base64UrlDecode(str: string): Uint8Array {
  const s = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - (s.length % 4)) % 4;
  const b64 = s + "=".repeat(pad);
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function base64UrlEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function importVapidKeys(publicKeyB64: string, privateKeyB64: string) {
  const pubRaw = base64UrlDecode(publicKeyB64);
  const privRaw = base64UrlDecode(privateKeyB64);

  // Build JWK from raw keys
  const privKey = await crypto.subtle.importKey(
    "pkcs8",
    buildPkcs8(privRaw, pubRaw),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  return { privKey, pubRaw };
}

function buildPkcs8(privRaw: Uint8Array, pubRaw: Uint8Array): ArrayBuffer {
  // PKCS#8 wrapper for EC P-256 private key
  const header = new Uint8Array([
    0x30, 0x81, 0x87, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86,
    0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d,
    0x03, 0x01, 0x07, 0x04, 0x6d, 0x30, 0x6b, 0x02, 0x01, 0x01, 0x04, 0x20,
  ]);
  const mid = new Uint8Array([0xa1, 0x44, 0x03, 0x42, 0x00]);
  const result = new Uint8Array(
    header.length + privRaw.length + mid.length + pubRaw.length
  );
  result.set(header, 0);
  result.set(privRaw, header.length);
  result.set(mid, header.length + privRaw.length);
  result.set(pubRaw, header.length + privRaw.length + mid.length);
  return result.buffer;
}

async function createVapidJwt(
  endpoint: string,
  subject: string,
  privKey: CryptoKey
): Promise<string> {
  const aud = new URL(endpoint).origin;
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600;

  const header = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" }))
  );
  const payload = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify({ aud, exp, sub: subject }))
  );

  const data = new TextEncoder().encode(`${header}.${payload}`);
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privKey,
    data
  );

  // Convert DER signature to raw r||s format
  const rawSig = derToRaw(new Uint8Array(sig));
  return `${header}.${payload}.${base64UrlEncode(rawSig)}`;
}

function derToRaw(der: Uint8Array): Uint8Array {
  // DER: 0x30 <len> 0x02 <rlen> <r> 0x02 <slen> <s>
  const raw = new Uint8Array(64);
  let offset = 2; // skip 0x30 <len>
  // r
  offset++; // 0x02
  const rLen = der[offset++];
  const rStart = rLen > 32 ? offset + (rLen - 32) : offset;
  const rDst = rLen > 32 ? 0 : 32 - rLen;
  raw.set(der.slice(rStart, offset + rLen), rDst);
  offset += rLen;
  // s
  offset++; // 0x02
  const sLen = der[offset++];
  const sStart = sLen > 32 ? offset + (sLen - 32) : offset;
  const sDst = sLen > 32 ? 32 : 64 - sLen;
  raw.set(der.slice(sStart, offset + sLen), sDst);
  return raw;
}

// ── Payload Encryption (aes128gcm per RFC 8291) ──

async function encryptPayload(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string
) {
  const clientPublicKey = base64UrlDecode(subscription.keys.p256dh);
  const clientAuth = base64UrlDecode(subscription.keys.auth);

  // Generate local key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  const localPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", localKeyPair.publicKey)
  );

  // Import client public key
  const clientKey = await crypto.subtle.importKey(
    "raw",
    clientPublicKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Derive shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: clientKey },
      localKeyPair.privateKey,
      256
    )
  );

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF for IKM
  const authInfo = new TextEncoder().encode("WebPush: info\0");
  const authInfoFull = new Uint8Array(
    authInfo.length + clientPublicKey.length + localPublicKeyRaw.length
  );
  authInfoFull.set(authInfo, 0);
  authInfoFull.set(clientPublicKey, authInfo.length);
  authInfoFull.set(localPublicKeyRaw, authInfo.length + clientPublicKey.length);

  const authHkdfKey = await crypto.subtle.importKey(
    "raw",
    clientAuth,
    { name: "HKDF" },
    false,
    ["deriveBits"]
  );

  const ikm = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt: sharedSecret, info: authInfoFull },
      authHkdfKey,
      256
    )
  );

  // Derive CEK and nonce
  const ikmKey = await crypto.subtle.importKey(
    "raw",
    ikm,
    { name: "HKDF" },
    false,
    ["deriveBits"]
  );

  const cekInfo = new TextEncoder().encode("Content-Encoding: aes128gcm\0");
  const nonceInfo = new TextEncoder().encode("Content-Encoding: nonce\0");

  const cekBits = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt, info: cekInfo },
      ikmKey,
      128
    )
  );

  const nonceBits = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt, info: nonceInfo },
      ikmKey,
      96
    )
  );

  // Encrypt
  const cek = await crypto.subtle.importKey("raw", cekBits, "AES-GCM", false, [
    "encrypt",
  ]);

  const paddedPayload = new Uint8Array(
    new TextEncoder().encode(payload).length + 2
  );
  paddedPayload.set(new TextEncoder().encode(payload), 0);
  paddedPayload[paddedPayload.length - 2] = 2; // delimiter
  paddedPayload[paddedPayload.length - 1] = 0; // padding

  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonceBits },
      cek,
      paddedPayload
    )
  );

  // Build aes128gcm header: salt(16) + rs(4) + idlen(1) + keyid(65) + ciphertext
  const rs = 4096;
  const header = new Uint8Array(16 + 4 + 1 + localPublicKeyRaw.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, rs);
  header[20] = localPublicKeyRaw.length;
  header.set(localPublicKeyRaw, 21);

  const body = new Uint8Array(header.length + encrypted.length);
  body.set(header, 0);
  body.set(encrypted, header.length);

  return body;
}

// ── Main handler ──

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claimsData, error: claimsError } =
      await supabaseUser.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_ids, title, body: msgBody } = await req.json();

    if (!user_ids || !Array.isArray(user_ids) || !title || !msgBody) {
      return new Response(
        JSON.stringify({ error: "Missing user_ids, title, or body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get subscriptions
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from("push_subscriptions")
      .select("subscription")
      .in("user_id", user_ids);

    if (subError) {
      return new Response(JSON.stringify({ error: subError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: "No subscriptions found" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
    const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT")!;

    const { privKey, pubRaw } = await importVapidKeys(
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );

    const payload = JSON.stringify({ title, body: msgBody });

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      const subscription = sub.subscription as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };

      try {
        const jwt = await createVapidJwt(
          subscription.endpoint,
          VAPID_SUBJECT,
          privKey
        );

        const encryptedBody = await encryptPayload(subscription, payload);

        const response = await fetch(subscription.endpoint, {
          method: "POST",
          headers: {
            Authorization: `vapid t=${jwt}, k=${base64UrlEncode(pubRaw)}`,
            "Content-Type": "application/octet-stream",
            "Content-Encoding": "aes128gcm",
            TTL: "86400",
            Urgency: "high",
          },
          body: encryptedBody,
        });

        if (response.ok || response.status === 201) {
          sent++;
        } else {
          console.error(
            `Push failed for ${subscription.endpoint}: ${response.status} ${await response.text()}`
          );
          failed++;

          // Remove stale subscriptions (410 Gone)
          if (response.status === 410 || response.status === 404) {
            await supabaseAdmin
              .from("push_subscriptions")
              .delete()
              .eq("subscription->>endpoint", subscription.endpoint);
          }
        }
      } catch (e) {
        console.error("Push send error:", e);
        failed++;
      }
    }

    return new Response(JSON.stringify({ sent, failed }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Edge function error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
