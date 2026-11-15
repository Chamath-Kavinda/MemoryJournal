import { Share } from 'react-native';

export type DeliveryResult = 'delivered' | 'cancelled';

/**
 * Android and iOS: opens the system share sheet with the export as text, so the person can save
 * it to Files or Drive, or send it to themselves. (A file attachment would need a file-system
 * package this app does not use; see D-034.)
 */
export async function deliverExport(fileName: string, text: string): Promise<DeliveryResult> {
  const result = await Share.share({ title: fileName, message: text });
  return result.action === Share.dismissedAction ? 'cancelled' : 'delivered';
}
