import { useEffect, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

let cachedVapidKey: string | null = null;

async function getVapidPublicKey(): Promise<string | null> {
  if (cachedVapidKey) return cachedVapidKey;
  try {
    const { data, error } = await supabase.functions.invoke("get-vapid-key");
    if (!error && data?.publicKey) {
      cachedVapidKey = data.publicKey;
      return cachedVapidKey;
    }
  } catch (e) {
    console.error("Failed to fetch VAPID key:", e);
  }
  return null;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const { user } = useAuth();

  const subscribe = useCallback(async () => {
    const vapidKey = await getVapidPublicKey();
    if (!user || !vapidKey) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      const registration = await navigator.serviceWorker.ready;
      const reg = registration as any;
      
      // Check for existing subscription
      let subscription = await reg.pushManager.getSubscription();

      if (!subscription) {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
      }

      const subJson = subscription.toJSON();

      // Save to database (upsert based on unique constraint)
      await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          subscription: subJson,
        } as any,
        { onConflict: "user_id,((subscription->>'endpoint'))" }
      );

      console.log("Push subscription saved");
    } catch (err) {
      console.error("Push subscription failed:", err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      // Small delay to let the service worker register first
      const timer = setTimeout(subscribe, 2000);
      return () => clearTimeout(timer);
    }
  }, [user, subscribe]);
}

export async function sendPushToUsers(
  userIds: string[],
  title: string,
  body: string
) {
  if (!userIds.length) return;

  try {
    await supabase.functions.invoke("send-push-notification", {
      body: { user_ids: userIds, title, body },
    });
  } catch (err) {
    console.error("Failed to send push notifications:", err);
  }
}
