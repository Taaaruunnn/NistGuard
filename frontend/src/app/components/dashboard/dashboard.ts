import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; // <-- 1. Import added here
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, BaseChartDirective],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {
  assessmentId: string = '';
  assessmentData: any = null;

  public barChartType: ChartType = 'bar';
  public barChartData: ChartData<'bar'> = {
    labels: ['Govern', 'Identify', 'Protect', 'Detect', 'Respond', 'Recover'],
    datasets: [
      { data: [0, 0, 0, 0, 0, 0], label: 'Function Score (%)', backgroundColor: '#0056b3' }
    ]
  };
  public barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    scales: { y: { min: 0, max: 100 } }
  };

  constructor(
    private route: ActivatedRoute, 
    private apiService: ApiService,
    private cdr: ChangeDetectorRef // <-- 2. Injected here
  ) {}

  ngOnInit() {
    this.assessmentId = this.route.snapshot.paramMap.get('id') || '';
    
    if (this.assessmentId) {
      this.apiService.getAssessment(this.assessmentId).subscribe({
        next: (res: any) => {
          this.assessmentData = res.data;
          const scores = this.assessmentData.scores;
          
          this.barChartData.datasets[0].data = [
            scores.govern,
            scores.identify,
            scores.protect,
            scores.detect,
            scores.respond,
            scores.recover
          ];
          
          this.barChartData = { ...this.barChartData };
          
          // 3. Manually tell Angular to redraw the UI!
          this.cdr.detectChanges(); 
        },
        error: (err: any) => console.error('Error fetching assessment', err)
      });
    }
  }
}