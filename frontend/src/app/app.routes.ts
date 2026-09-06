import { Routes } from '@angular/router';
import { AssessmentForm} from './components/assessment-form/assessment-form';
import { DashboardComponent } from './components/dashboard/dashboard';

export const routes: Routes = [
  { path: '', component: AssessmentForm}, // Show form on load
  { path: 'dashboard/:id', component: DashboardComponent } // Dashboard expects an assessment ID
];