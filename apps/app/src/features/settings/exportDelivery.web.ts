export type DeliveryResult = 'delivered' | 'cancelled';

/** Web build (inside the Windows app): saves the export as a .json file through the browser. */
export async function deliverExport(fileName: string, text: string): Promise<DeliveryResult> {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    // Give the download a moment to start before the address is released.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
  return 'delivered';
}
