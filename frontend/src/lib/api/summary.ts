import { api } from "../http";

export interface RecentActivity {
  id: string;
  description: string;
  amount: number;
  date: string;
  payer_name: string;
  group_name: string;
  type: "lent" | "borrowed";
}

export interface Friend {
  id: string;
  name: string;
  email: string;
}

export interface SummaryData {
  total_owed: number;
  total_owe: number;
  group_count: number;
  friends: Friend[];
}

export const SummaryAPI = {
  getDashboard(groupId?: string) {
    const params = groupId ? `?group_id=${groupId}` : "";
    return api.get<SummaryData>(`/summary/${params}`);
  },
};
