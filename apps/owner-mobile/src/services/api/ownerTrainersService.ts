/**
 * GymDeck Owner Mobile - Trainer & Personal Training API Service
 */

import { apiClient } from './client';
import {
  ApiResponse,
  TrainerSummary,
  TrainerAssignmentItem,
  PTPackageSummary,
  CreateTrainerInput,
  AssignTrainerInput,
  PurchasePTPackageInput,
} from '../../types';

export class OwnerTrainersService {
  /**
   * 1. Get All Trainers in Gym
   */
  public static async getTrainers(includeInactive = false, query?: string): Promise<TrainerSummary[]> {
    const response = await apiClient.get<ApiResponse<{ trainers: TrainerSummary[] }>>(
      '/owner/trainers',
      { params: { includeInactive, query } }
    );
    return response.data.data.trainers;
  }

  /**
   * 2. Get Single Trainer Details with Clients & Earnings Summary
   */
  public static async getTrainerById(trainerId: string): Promise<any> {
    const response = await apiClient.get<ApiResponse<{ trainer: any }>>(
      `/owner/trainers/${trainerId}`
    );
    return response.data.data.trainer;
  }

  /**
   * 3. Create New Trainer
   */
  public static async createTrainer(data: CreateTrainerInput): Promise<any> {
    const response = await apiClient.post<ApiResponse<{ trainer: any }>>(
      '/owner/trainers',
      data
    );
    return response.data.data.trainer;
  }

  /**
   * 4. Update Trainer
   */
  public static async updateTrainer(trainerId: string, data: Partial<CreateTrainerInput>): Promise<any> {
    const response = await apiClient.patch<ApiResponse<{ trainer: any }>>(
      `/owner/trainers/${trainerId}`,
      data
    );
    return response.data.data.trainer;
  }

  /**
   * 5. Archive / Deactivate Trainer
   */
  public static async archiveTrainer(trainerId: string): Promise<any> {
    const response = await apiClient.delete<ApiResponse<{ trainer: any }>>(
      `/owner/trainers/${trainerId}`
    );
    return response.data.data.trainer;
  }

  /**
   * 6. Assign Trainer to Member
   */
  public static async assignTrainer(memberId: string, data: AssignTrainerInput): Promise<any> {
    const response = await apiClient.post<ApiResponse<any>>(
      `/owner/members/${memberId}/trainer-assignment`,
      data
    );
    return response.data.data;
  }

  /**
   * 7. End Trainer Assignment
   */
  public static async endTrainerAssignment(memberId: string, assignmentId: string): Promise<any> {
    const response = await apiClient.patch<ApiResponse<any>>(
      `/owner/members/${memberId}/trainer-assignment/${assignmentId}/end`
    );
    return response.data.data;
  }

  /**
   * 8. Get Member Trainer History
   */
  public static async getMemberTrainerHistory(memberId: string): Promise<TrainerAssignmentItem[]> {
    const response = await apiClient.get<ApiResponse<{ history: TrainerAssignmentItem[] }>>(
      `/owner/members/${memberId}/trainer-history`
    );
    return response.data.data.history;
  }

  /**
   * 9. Purchase PT Package for Member
   */
  public static async purchasePTPackage(memberId: string, data: PurchasePTPackageInput): Promise<any> {
    const response = await apiClient.post<ApiResponse<any>>(
      `/owner/members/${memberId}/pt-packages`,
      data
    );
    return response.data.data;
  }

  /**
   * 10. Get Member PT Packages
   */
  public static async getMemberPTPackages(memberId: string): Promise<PTPackageSummary[]> {
    const response = await apiClient.get<ApiResponse<{ packages: PTPackageSummary[] }>>(
      `/owner/members/${memberId}/pt-packages`
    );
    return response.data.data.packages;
  }

  /**
   * 11. Complete PT Session (Deduct 1 Session)
   */
  public static async completePTSession(
    packageId: string,
    data: { durationMinutes?: number; focusArea?: string; trainerNotes?: string }
  ): Promise<any> {
    const response = await apiClient.post<ApiResponse<any>>(
      `/owner/pt-packages/${packageId}/complete-session`,
      data
    );
    return response.data.data;
  }

  /**
   * 12. Cancel PT Session
   */
  public static async cancelPTSession(sessionId: string, reason: string): Promise<any> {
    const response = await apiClient.post<ApiResponse<any>>(
      `/owner/pt-sessions/${sessionId}/cancel`,
      { reason }
    );
    return response.data.data;
  }

  /**
   * 13. Get Trainer Earnings Ledger
   */
  public static async getTrainerEarnings(trainerId: string, period?: string): Promise<any> {
    const response = await apiClient.get<ApiResponse<any>>(
      `/owner/trainers/${trainerId}/earnings`,
      { params: { period } }
    );
    return response.data.data;
  }
}
