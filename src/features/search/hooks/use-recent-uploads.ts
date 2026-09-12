import { useRecentDeliveries } from "@/features/deliveries/hooks/use-recent-deliveries";
import { useStoreSession } from "@/features/store-session/hooks/use-store-session";
import type { RecentUpload } from "../types";

// Adapts features/deliveries's DeliveryGroup shape to the display-only
// RecentUpload shape this feature's components render.
export interface UseRecentUploadsResult {
  uploads: RecentUpload[];
}

export function useRecentUploads(): UseRecentUploadsResult {
  const { storeCode } = useStoreSession();
  const { groups } = useRecentDeliveries(storeCode);

  const uploads: RecentUpload[] = groups.map((group) => ({
    deliveryCode: group.delivery.delivery_code,
    deliveryDate: group.delivery.delivery_date,
    itemCount: group.items.length,
  }));

  return { uploads };
}
