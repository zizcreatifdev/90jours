import { usePushNotifications } from "@/hooks/use-push-notifications";

const PushNotificationProvider = () => {
  usePushNotifications();
  return null;
};

export default PushNotificationProvider;
