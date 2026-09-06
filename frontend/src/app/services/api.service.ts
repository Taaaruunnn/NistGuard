import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  // This points to the Express server we just built
  private baseUrl = 'http://localhost:5000/api';

  constructor(private http: HttpClient) { }

  // 1. Fetch the NIST Controls for the questionnaire
  getControls(): Observable<any> {
    return this.http.get(`${this.baseUrl}/controls`);
  }

  // 2. Submit the completed assessment
  submitAssessment(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/assessments`, data);
  }

  // 3. Fetch a specific assessment's results (for the dashboard)
  getAssessment(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/assessments/${id}`);
  }
}