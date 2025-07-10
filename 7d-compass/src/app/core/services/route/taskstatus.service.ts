import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface TaskStatus {
  taskStatusId?: number;
  name: string;
  description: string;
  createdBy?: number;
  updatedBy?: number;
}

@Injectable({
  providedIn: 'root'
})
export class TaskstatusService {
  private baseUrl = environment.taskStatusServiceUrl;

  constructor(private http: HttpClient) {}

  // POST: Crear un nuevo estado
  createTaskStatus(taskStatus: TaskStatus): Observable<TaskStatus> {
    return this.http.post<TaskStatus>(this.baseUrl, taskStatus);
  }

  // GET: Obtener todos los estados
  getAllTaskStatuses(): Observable<TaskStatus[]> {
    return this.http.get<TaskStatus[]>(this.baseUrl);
  }

  // GET: Obtener un estado por ID
  getTaskStatusById(taskStatusId: number): Observable<TaskStatus> {
    return this.http.get<TaskStatus>(`${this.baseUrl}/${taskStatusId}`);
  }

  // PUT: Actualizar un estado por ID
  updateTaskStatus(taskStatusId: number, taskStatus: Partial<TaskStatus>): Observable<TaskStatus> {
    return this.http.put<TaskStatus>(`${this.baseUrl}/${taskStatusId}`, taskStatus);
  }

  // DELETE: Eliminar un estado por ID (soft delete en tu backend)
  deleteTaskStatus(taskStatusId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${taskStatusId}`);
  }
}
