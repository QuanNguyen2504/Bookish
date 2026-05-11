// lib/api/shipping-api.ts

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface ShippingFeeData {
  distanceKm: number;
  distanceText: string;
  durationText: string;
  shippingFee: number;
  feeDescription: string;
  originAddress: string;
  destinationAddress: string;
}

export const shippingApi = {
  /**
   * Tính phí ship theo địa chỉ giao hàng
   */
  calculate: async (destinationAddress: string, token?: string): Promise<ShippingFeeData> => {
    const res = await fetch(`${API_BASE_URL}/api/shipping/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ destinationAddress }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Không thể tính phí vận chuyển');
    return data;
  },
};