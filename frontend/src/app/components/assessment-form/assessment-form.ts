import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-assessment-form',
  standalone: true,
  imports: [CommonModule, FormsModule], // Import modules for ngFor and ngModel
  templateUrl: './assessment-form.html',
  styleUrls: ['./assessment-form.css']
})
export class AssessmentForm implements OnInit {
  // Form fields for the organization
  organizationName = '';
  industry = '';
  scope = '';
  
  controls: any[] = [];
  responses: { [key: string]: string } = {}; // Object to track answers by control ID

  constructor(private apiService: ApiService, private router: Router) {}

  ngOnInit() {
    // Fetch the NIST controls from the backend when the component loads
    this.apiService.getControls().subscribe({
      next: (data) => {
        this.controls = data;
        // Set a default answer for every control so the user doesn't have to click empty dropdowns
        this.controls.forEach(c => {
          this.responses[c._id] = 'Not Implemented';
        });
      },
      error: (err) => console.error('Error fetching controls', err)
    });
  }

  onSubmit() {
    // Map our simple responses object back into the array format the backend expects
    const assessmentData = {
      organizationName: this.organizationName,
      industry: this.industry,
      scope: this.scope,
      responses: this.controls.map(c => ({
        controlId: c._id,
        implementationStatus: this.responses[c._id],
        evidence: '' // Optional: we can add an input field for this later
      }))
    };

    // Send the completed form to the Express backend
    this.apiService.submitAssessment(assessmentData).subscribe({
      next: (res) => {
        console.log('Assessment Scored and Saved!', res);
        // Navigate to the dashboard, passing the new Assessment ID in the URL
        this.router.navigate(['/dashboard', res.data._id]);
      },
      error: (err) => console.error('Error submitting assessment', err)
    });
  }
}