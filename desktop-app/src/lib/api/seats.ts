import apiClient from './client';
import type {
  ApiResponse,
  AssignSeatRequest,
  BulkCreateResult,
  BulkCreateSeatsRequest,
  CreateSeatBookingRequest,
  ReleaseSeatBookingRequest,
  Seat,
  SeatBooking,
  SeatBookingsQueryOptions,
  SeatEligibleStudent,
  SeatQueryOptions,
  UpdateSeatRequest,
} from '@/types';

function buildQueryParams(options: Record<string, number | string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  }
  return params.toString();
}

export const seatsApi = {
  async getAll(options: SeatQueryOptions = {}): Promise<Seat[]> {
    const query = buildQueryParams({
      month: options.month,
      year: options.year,
      branch_id: options.branch_id,
    });
    const response = await apiClient.get<ApiResponse<Seat[]>>(`/seats?${query}`);
    return response.data.data || [];
  },

  async getEligibleStudents(options: SeatQueryOptions): Promise<SeatEligibleStudent[]> {
    const query = buildQueryParams({
      month: options.month,
      year: options.year,
      branch_id: options.branch_id,
    });
    const response = await apiClient.get<ApiResponse<SeatEligibleStudent[]>>(
      `/seats/eligible-students?${query}`,
    );
    return response.data.data || [];
  },

  async getBookings(options: SeatBookingsQueryOptions): Promise<SeatBooking[]> {
    const query = buildQueryParams({
      month: options.month,
      year: options.year,
      branch_id: options.branch_id,
      limit: options.limit,
    });
    const response = await apiClient.get<ApiResponse<SeatBooking[]>>(
      `/seats/bookings?${query}`,
    );
    return response.data.data || [];
  },

  async createBooking(data: CreateSeatBookingRequest): Promise<SeatBooking> {
    const response = await apiClient.post<ApiResponse<SeatBooking>>('/seats/bookings', data);
    if (!response.data.data) {
      throw new Error('Failed to create seat booking');
    }
    return response.data.data;
  },

  async releaseBooking(bookingId: number, data: ReleaseSeatBookingRequest): Promise<SeatBooking> {
    const response = await apiClient.patch<ApiResponse<SeatBooking>>(
      `/seats/bookings/${bookingId}/release`,
      data,
    );
    if (!response.data.data) {
      throw new Error('Failed to release seat booking');
    }
    return response.data.data;
  },

  async bulkCreate(data: BulkCreateSeatsRequest): Promise<BulkCreateResult> {
    const response = await apiClient.post<ApiResponse<BulkCreateResult>>('/seats/bulk', data);
    if (!response.data.data) {
      throw new Error('Failed to create seats');
    }
    return response.data.data;
  },

  async update(seatId: number, data: UpdateSeatRequest): Promise<Seat> {
    const response = await apiClient.patch<ApiResponse<Seat>>(`/seats/${seatId}`, data);
    if (!response.data.data) {
      throw new Error('Failed to update seat');
    }
    return response.data.data;
  },

  async assign(seatId: number, data: AssignSeatRequest): Promise<Seat> {
    const response = await apiClient.patch<ApiResponse<Seat>>(`/seats/${seatId}/assign`, data);
    if (!response.data.data) {
      throw new Error('Failed to assign seat');
    }
    return response.data.data;
  },

  async unassign(seatId: number): Promise<Seat> {
    const response = await apiClient.patch<ApiResponse<Seat>>(`/seats/${seatId}/unassign`);
    if (!response.data.data) {
      throw new Error('Failed to unassign seat');
    }
    return response.data.data;
  },
};
