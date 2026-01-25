import { api } from "../http";
import type { PaginatedResponse } from "./types";

export interface BillShare {
  id: string;
  user_id: string;
  user_name: string;
  amount: number;
  paid: boolean;
}

export interface Bill {
  id: string;
  description: string;
  total_amount: number;
  paid_by: string;
  payer?: {
    id: string;
    name: string;
    email: string;
  };
  group_id: string;
  group?: {
    name: string;
  };
  created_at: string;
  shares: BillShare[];
}

export interface BillCreate {
  description: string;
  total_amount: number;
  paid_by: string;
  group_id: string;
  split_type?: "EQUAL" | "EXACT" | "PERCENTAGE";
  shares: { user_id: string; amount?: number }[];
}

export const BillsAPI = {
  create(data: BillCreate) {
    return api.post<Bill>("/bills/", data);
  },

  getGroupBills(groupId: string, skip = 0, limit = 20, search?: string) {
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    });
    if (search) params.append("search", search);
    return api.get<PaginatedResponse<Bill>>(`/bills/group/${groupId}?${params.toString()}`);
  },

  getUserBills(skip = 0, limit = 20) {
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    });
    return api.get<PaginatedResponse<Bill>>(`/bills/?${params.toString()}`);
  },

  getDetail(id: string) {
    return api.get<Bill>(`/bills/${id}`);
  },

  markShareAsPaid(shareId: string) {
    return api.patch<BillShare>(`/bills/shares/${shareId}/mark-paid`);
  },

  markShareAsUnpaid(shareId: string) {
    return api.patch<BillShare>(`/bills/shares/${shareId}/mark-unpaid`);
  },
};
