/**
 * Web Crypto AES-GCM encryption/decryption utilities for Excalidraw collaboration.
 * Follows upstream Excalidraw's end-to-end encryption architecture.
 */

const IV_LENGTH_BYTES = 12;

export const generateEncryptionKey = async (): Promise<string> => {
  if (typeof window === "undefined" || !window.crypto || !window.crypto.subtle) {
    // Fallback for SSR/node environments
    const randomBytes = new Uint8Array(16);
    return Array.from(randomBytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  const key = await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 128,
    },
    true,
    ["encrypt", "decrypt"]
  );

  const exported = await window.crypto.subtle.exportKey("raw", key);
  return bytesToBase64Url(new Uint8Array(exported));
};

export const getOrCreateRoomKey = async (slug: string, explicitKey?: string | null): Promise<string> => {
  if (explicitKey) return explicitKey;

  if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(`sketchflow-room-key-v1-${slug}`);
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
      const keyBytes = new Uint8Array(hashBuffer, 0, 16);
      return bytesToBase64Url(keyBytes);
    } catch {
      // Fallback
    }
  }

  return generateEncryptionKey();
};

export const encryptData = async (
  keyStr: string,
  data: Uint8Array
): Promise<{ encryptedBuffer: ArrayBuffer; iv: Uint8Array }> => {
  const keyBytes = base64UrlToBytes(keyStr);
  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    keyBytes as unknown as BufferSource,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  const iv = new Uint8Array(IV_LENGTH_BYTES);
  window.crypto.getRandomValues(iv);

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv as unknown as BufferSource,
    },
    cryptoKey,
    data as unknown as BufferSource
  );

  return { encryptedBuffer, iv };
};

export const decryptData = async (
  iv: Uint8Array | ArrayBuffer | any,
  encryptedBuffer: ArrayBuffer | Uint8Array | any,
  keyStr: string
): Promise<ArrayBuffer> => {
  const keyBytes = base64UrlToBytes(keyStr);
  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    keyBytes as unknown as BufferSource,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  let cleanIv: Uint8Array;
  if (iv instanceof Uint8Array) {
    cleanIv = new Uint8Array(iv.buffer, iv.byteOffset, iv.byteLength);
  } else if (iv instanceof ArrayBuffer) {
    cleanIv = new Uint8Array(iv);
  } else if (iv?.data) {
    cleanIv = new Uint8Array(iv.data);
  } else {
    cleanIv = new Uint8Array(iv);
  }

  let cleanBuffer: any = encryptedBuffer;
  if (encryptedBuffer instanceof ArrayBuffer) {
    cleanBuffer = encryptedBuffer;
  } else if (encryptedBuffer instanceof Uint8Array) {
    cleanBuffer = new Uint8Array(
      encryptedBuffer.buffer,
      encryptedBuffer.byteOffset,
      encryptedBuffer.byteLength
    );
  } else if (encryptedBuffer?.data) {
    cleanBuffer = new Uint8Array(encryptedBuffer.data);
  }

  return await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: cleanIv as unknown as BufferSource,
    },
    cryptoKey,
    cleanBuffer as unknown as BufferSource
  );
};

// Helper: Uint8Array to URL-safe base64 string
export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Helper: URL-safe base64 string to Uint8Array
export function base64UrlToBytes(base64Url: string): Uint8Array {
  let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
