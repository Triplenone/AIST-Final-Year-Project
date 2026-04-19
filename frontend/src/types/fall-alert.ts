export type FallAlertKind = 'sos' | 'fall';

/** 单条警报行（支持多设备同屏列表） */
export type FallAlertDetailRow = {
  id: string;
  deviceId: string;
  boundUser: string;
  location: string;
  triggeredAtIso: string;
  kinds: FallAlertKind[];
  /** 后端 `event.event_id`；用于「前往处理」写库及多客户端同步关窗 */
  sourceEventId?: number;
};
