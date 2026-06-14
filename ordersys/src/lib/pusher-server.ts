import Pusher from "pusher";

const pusherConfig = {
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
};

const isConfigured = Object.values(pusherConfig).every(Boolean);
let warnedMissingConfig = false;

const realPusher = isConfigured
  ? new Pusher({
      appId: pusherConfig.appId!,
      key: pusherConfig.key!,
      secret: pusherConfig.secret!,
      cluster: pusherConfig.cluster!,
      useTLS: true,
    })
  : null;

export const pusherServer = {
  async trigger(channel: string | string[], event: string, data: unknown) {
    if (!realPusher) {
      if (!warnedMissingConfig) {
        warnedMissingConfig = true;
        console.warn(
          "Pusher server is disabled because PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, or PUSHER_CLUSTER is missing."
        );
      }
      return null;
    }

    return realPusher.trigger(channel, event, data);
  },
};
