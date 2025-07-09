import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, timer } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Notification {
  userNotificationId: number;
  userId: number;
  notificationId: number;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  notificationTypeId: number;
  title: string;
  message: string;
  entityType: string;
  entityId: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  expiresAt: string | null;
  typeName: string;
  icon: string;
  color: string;
}

export interface UnreadCount {
  unreadCount: number;
}

export interface NotificationResponse {
  message: string;
  updatedCount?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private baseUrl = `${environment.apiUrl}/notifications`;
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  private unreadCountSubject = new BehaviorSubject<number>(0);
  private currentUserId = 1; // TODO: Get from auth service

  public notifications$ = this.notificationsSubject.asObservable();
  public unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private http: HttpClient) {
    this.startPolling();
  }

  // Get user notifications
  getUserNotifications(limit: number = 50, offset: number = 0, unreadOnly: boolean = false): Observable<Notification[]> {
    const params = { limit: limit.toString(), offset: offset.toString(), unreadOnly: unreadOnly.toString() };
    return this.http.get<Notification[]>(`${this.baseUrl}/user/${this.currentUserId}`, { params })
      .pipe(
        tap(notifications => {
          this.notificationsSubject.next(notifications);
        })
      );
  }

  // Get unread count
  getUnreadCount(): Observable<UnreadCount> {
    return this.http.get<UnreadCount>(`${this.baseUrl}/user/${this.currentUserId}/unread-count`)
      .pipe(
        tap(response => {
          this.unreadCountSubject.next(response.unreadCount);
        })
      );
  }

  // Mark notification as read
  markAsRead(notificationId: number): Observable<NotificationResponse> {
    return this.http.put<NotificationResponse>(`${this.baseUrl}/user/${this.currentUserId}/mark-read/${notificationId}`, {})
      .pipe(
        tap(() => {
          this.updateNotificationReadStatus(notificationId, true);
          this.refreshUnreadCount();
        })
      );
  }

  // Mark all notifications as read
  markAllAsRead(): Observable<NotificationResponse> {
    return this.http.put<NotificationResponse>(`${this.baseUrl}/user/${this.currentUserId}/mark-all-read`, {})
      .pipe(
        tap(() => {
          this.markAllNotificationsAsRead();
          this.refreshUnreadCount();
        })
      );
  }

  // Delete notification
  deleteNotification(notificationId: number): Observable<NotificationResponse> {
    return this.http.delete<NotificationResponse>(`${this.baseUrl}/user/${this.currentUserId}/delete/${notificationId}`)
      .pipe(
        tap(() => {
          this.removeNotification(notificationId);
          this.refreshUnreadCount();
        })
      );
  }

  // Create custom notification (admin only)
  createCustomNotification(notificationData: {
    notificationTypeId: number;
    title: string;
    message: string;
    entityType: string;
    entityId: number;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    expiresAt?: string;
    userIds?: number[];
    assignToAll?: boolean;
  }): Observable<Notification> {
    return this.http.post<Notification>(this.baseUrl, notificationData);
  }

  // Get notifications by entity
  getNotificationsByEntity(entityType: string, entityId: number): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.baseUrl}/entity/${entityType}/${entityId}`);
  }

  // Start polling for new notifications
  private startPolling(): void {
    // Poll every 30 seconds for new notifications
    timer(0, 30000).pipe(
      switchMap(() => this.getUnreadCount())
    ).subscribe();
  }

  // Update notification read status locally
  private updateNotificationReadStatus(notificationId: number, isRead: boolean): void {
    const notifications = this.notificationsSubject.value;
    const updatedNotifications = notifications.map(notification =>
      notification.notificationId === notificationId
        ? { ...notification, isRead, readAt: isRead ? new Date().toISOString() : null }
        : notification
    );
    this.notificationsSubject.next(updatedNotifications);
  }

  // Mark all notifications as read locally
  private markAllNotificationsAsRead(): void {
    const notifications = this.notificationsSubject.value;
    const updatedNotifications = notifications.map(notification => ({
      ...notification,
      isRead: true,
      readAt: new Date().toISOString()
    }));
    this.notificationsSubject.next(updatedNotifications);
  }

  // Remove notification locally
  private removeNotification(notificationId: number): void {
    const notifications = this.notificationsSubject.value;
    const updatedNotifications = notifications.filter(notification =>
      notification.notificationId !== notificationId
    );
    this.notificationsSubject.next(updatedNotifications);
  }

  // Refresh unread count
  private refreshUnreadCount(): void {
    this.getUnreadCount().subscribe();
  }

  // Get current notifications
  get currentNotifications(): Notification[] {
    return this.notificationsSubject.value;
  }

  // Get current unread count
  get currentUnreadCount(): number {
    return this.unreadCountSubject.value;
  }

  // Check if user has unread notifications
  get hasUnreadNotifications(): boolean {
    return this.currentUnreadCount > 0;
  }

  // Load initial notifications
  loadNotifications(): void {
    this.getUserNotifications().subscribe();
  }

  // Set current user ID (should be called when user logs in)
  setCurrentUserId(userId: number): void {
    this.currentUserId = userId;
    this.loadNotifications();
  }
}
