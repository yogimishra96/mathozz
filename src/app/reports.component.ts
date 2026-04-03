import { Component, inject, signal, OnInit, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AppService, ProblemReport } from './app.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="reports-container">
      <h1>Problem Reports</h1>

      @if (loading()) {
        <div class="loading">
          <i class="fa-solid fa-spinner fa-spin"></i>
          <p>Loading...</p>
        </div>
      } @else if (authError()) {
        <div class="auth-error">
          <i class="fa-solid fa-lock"></i>
          <p>You must be logged in to view problem reports.</p>
          <button class="btn btn-primary" (click)="goToMainApp()">
            Go to Main App
          </button>
        </div>
      } @else {
        <div class="filters-section">
          <div class="search-container">
            <i class="fa-solid fa-search"></i>
            <input
              type="text"
              placeholder="Search reports..."
              [value]="searchQuery()"
              (input)="searchQuery.set($any($event.target).value)"
              class="search-input"
            />
          </div>

          <div class="filter-controls">
            <select
              [value]="statusFilter()"
              (change)="statusFilter.set($any($event.target).value)"
              class="filter-select"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="resolved">Resolved</option>
            </select>

            <select
              [value]="pageSize()"
              (change)="pageSize.set(+$any($event.target).value); currentPage.set(1)"
              class="filter-select"
            >
              <option value="10">10 per page</option>
              <option value="25">25 per page</option>
              <option value="50">50 per page</option>
            </select>
          </div>
        </div>

        <div class="results-info">
          Showing {{ paginatedReports().length }} of {{ totalFilteredReports() }} reports
        </div>

        <button class="btn btn-outline refresh-btn" (click)="loadReports()">
          <i class="fa-solid fa-refresh"></i> Refresh
        </button>

        <div class="table-container">
          <table class="reports-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Description</th>
                <th>Screen</th>
                <th>Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              @for (report of paginatedReports(); track report.id) {
                <tr [class.resolved]="report.resolved">
                  <td>{{ report.userEmail || 'Anonymous' }}</td>
                  <td class="description" (click)="openModal(report)" style="cursor: pointer;">
                    {{ report.description }}
                  </td>
                  <td>{{ report.screen }}</td>
                  <td>{{ formatDate(report.timestamp) }}</td>
                  <td>
                    <span class="status" [class.resolved]="report.resolved">
                      {{ report.resolved ? 'Resolved' : 'Open' }}
                    </span>
                  </td>
                  <td>
                    @if (!report.resolved) {
                      <button class="btn btn-sm btn-success" (click)="markResolved(report.id)">
                        Resolve
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        @if (totalPages() > 1) {
          <div class="pagination">
            <button
              class="btn btn-outline pagination-btn"
              [disabled]="currentPage() === 1"
              (click)="currentPage.set(1)"
            >
              <i class="fa-solid fa-angle-double-left"></i>
            </button>

            <button
              class="btn btn-outline pagination-btn"
              [disabled]="currentPage() === 1"
              (click)="currentPage.set(currentPage() - 1)"
            >
              <i class="fa-solid fa-angle-left"></i>
            </button>

            <span class="pagination-info">
              Page {{ currentPage() }} of {{ totalPages() }}
            </span>

            <button
              class="btn btn-outline pagination-btn"
              [disabled]="currentPage() === totalPages()"
              (click)="currentPage.set(currentPage() + 1)"
            >
              <i class="fa-solid fa-angle-right"></i>
            </button>

            <button
              class="btn btn-outline pagination-btn"
              [disabled]="currentPage() === totalPages()"
              (click)="currentPage.set(totalPages())"
            >
              <i class="fa-solid fa-angle-double-right"></i>
            </button>
          </div>
        }
      }
    </div>

    <!-- Description Modal -->
    @if (showModal() && selectedReport()) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Problem Report Details</h2>
            <button class="modal-close" (click)="closeModal()">
              <i class="fa-solid fa-times"></i>
            </button>
          </div>
          <div class="modal-body">
            <div class="detail-row">
              <strong>User:</strong> {{ selectedReport()!.userEmail || 'Anonymous' }}
            </div>
            <div class="detail-row">
              <strong>Screen:</strong> {{ selectedReport()!.screen }}
            </div>
            <div class="detail-row">
              <strong>Date:</strong> {{ formatDate(selectedReport()!.timestamp) }}
            </div>
            <div class="detail-row">
              <strong>Status:</strong>
              <span class="status" [class.resolved]="selectedReport()!.resolved">
                {{ selectedReport()!.resolved ? 'Resolved' : 'Open' }}
              </span>
            </div>
            <div class="detail-row">
              <strong>Description:</strong>
              <div class="full-description">
                {{ selectedReport()!.description }}
              </div>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .reports-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
      font-family: 'DM Sans', sans-serif;
      background: #0e0f0d;
      color: #e2e8d8;
      min-height: 100vh;
    }

    h1 {
      color: #e2e8d8;
      margin-bottom: 20px;
      font-size: 1.8rem;
    }

    .refresh-btn {
      margin-bottom: 20px;
    }

    .filters-section {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
      align-items: center;
      flex-wrap: wrap;
    }

    .search-container {
      position: relative;
      flex: 1;
      min-width: 250px;
      max-width: 400px;
    }

    .search-container i {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: #9aa88a;
    }

    .search-input {
      width: 100%;
      padding: 10px 12px 10px 40px;
      background: #1a1c16;
      border: 1px solid #323529;
      border-radius: 6px;
      color: #e2e8d8;
      font-size: 0.9rem;
    }

    .search-input:focus {
      outline: none;
      border-color: #c8e86a;
    }

    .search-input::placeholder {
      color: #9aa88a;
    }

    .filter-controls {
      display: flex;
      gap: 10px;
    }

    .filter-select {
      padding: 8px 12px;
      background: #1a1c16;
      border: 1px solid #323529;
      border-radius: 6px;
      color: #e2e8d8;
      font-size: 0.9rem;
      min-width: 120px;
    }

    .filter-select:focus {
      outline: none;
      border-color: #c8e86a;
    }

    .results-info {
      color: #9aa88a;
      font-size: 0.9rem;
      margin-bottom: 10px;
    }

    .table-container {
      background: #1a1c16;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0,0,0,0.3);
    }

    .reports-table {
      width: 100%;
      border-collapse: collapse;
    }

    .reports-table th {
      background: #252720;
      color: #e2e8d8;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      font-size: 0.9rem;
      border-bottom: 1px solid #323529;
    }

    .reports-table td {
      padding: 12px;
      border-bottom: 1px solid #252720;
      vertical-align: top;
    }

    .reports-table tbody tr {
      background: #1a1c16;
      transition: background-color 0.2s;
    }

    .reports-table tbody tr:hover {
      background: #252720;
    }

    .reports-table tbody tr.resolved {
      opacity: 0.6;
    }

    .description {
      max-width: 300px;
      word-wrap: break-word;
    }

    .status {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .status:not(.resolved) {
      background: #e06868;
      color: white;
    }

    .status.resolved {
      background: #7ecf7e;
      color: white;
    }

    .btn {
      padding: 6px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: #7ecf7e;
      color: white;
      cursor: pointer;
      font-size: 0.8rem;
      transition: all 0.2s;
    }

    .btn:hover {
      background: #6bbf6e;
    }

    .btn-outline {
      background: transparent;
      color: #e2e8d8;
      border-color: #525c42;
    }

    .btn-outline:hover {
      background: #252720;
      border-color: #e2e8d8;
    }

    .btn-sm {
      padding: 4px 8px;
      font-size: 0.75rem;
    }

    .auth-error {
      text-align: center;
      padding: 40px 20px;
      background: #1a1c16;
      border-radius: 8px;
      border: 1px solid #252720;
    }

    .auth-error i {
      font-size: 3rem;
      color: #525c42;
      margin-bottom: 16px;
      display: block;
    }

    .auth-error p {
      color: #9aa88a;
      font-size: 1.1rem;
      margin: 0;
    }

    .loading {
      text-align: center;
      padding: 40px 20px;
    }

    .loading i {
      font-size: 2rem;
      color: #c8e86a;
      margin-bottom: 16px;
    }

    .loading p {
      color: #9aa88a;
      font-size: 1.1rem;
      margin: 0;
    }

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: #1a1c16;
      border-radius: 8px;
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
      border: 1px solid #252720;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid #252720;
    }

    .modal-header h2 {
      margin: 0;
      color: #e2e8d8;
      font-size: 1.5rem;
    }

    .modal-close {
      background: none;
      border: none;
      color: #9aa88a;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 5px;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .modal-close:hover {
      background: #252720;
      color: #e2e8d8;
    }

    .modal-body {
      padding: 20px;
    }

    .detail-row {
      margin-bottom: 15px;
      color: #e2e8d8;
    }

    .detail-row strong {
      color: #c8e86a;
      display: inline-block;
      min-width: 80px;
    }

    .full-description {
      margin-top: 8px;
      padding: 12px;
      background: #252720;
      border-radius: 4px;
      white-space: pre-wrap;
      word-wrap: break-word;
      line-height: 1.5;
      color: #e2e8d8;
      border: 1px solid #323529;
    }

    /* Pagination Styles */
    .pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      margin-top: 20px;
      padding: 15px 0;
    }

    .pagination-btn {
      padding: 8px 12px;
      min-width: 40px;
    }

    .pagination-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .pagination-info {
      color: #9aa88a;
      font-size: 0.9rem;
      margin: 0 15px;
      white-space: nowrap;
    }
  `]
})
export class ReportsComponent implements OnInit {
  private svc = inject(AppService);
  private router = inject(Router);

  reports = signal<ProblemReport[]>([]);
  authError = signal(false);
  loading = signal(true);
  showModal = signal(false);
  selectedReport = signal<ProblemReport | null>(null);

  // Filter and search signals
  statusFilter = signal<'all' | 'open' | 'resolved'>('all');
  searchQuery = signal('');
  currentPage = signal(1);
  pageSize = signal(10);

  // Computed signals for filtering and pagination
  filteredReports = computed(() => {
    let filtered = this.reports();

    // Apply status filter
    if (this.statusFilter() !== 'all') {
      filtered = filtered.filter(report =>
        this.statusFilter() === 'resolved' ? report.resolved : !report.resolved
      );
    }

    // Apply search filter
    if (this.searchQuery().trim()) {
      const query = this.searchQuery().toLowerCase().trim();
      filtered = filtered.filter(report =>
        (report.description?.toLowerCase().includes(query)) ||
        (report.userEmail?.toLowerCase().includes(query)) ||
        (report.screen?.toLowerCase().includes(query))
      );
    }

    return filtered;
  });

  totalFilteredReports = computed(() => this.filteredReports().length);

  paginatedReports = computed(() => {
    const filtered = this.filteredReports();
    const start = (this.currentPage() - 1) * this.pageSize();
    const end = start + this.pageSize();
    return filtered.slice(start, end);
  });

  totalPages = computed(() => Math.ceil(this.totalFilteredReports() / this.pageSize()));

  // Move effect to field initializer for proper injection context
  authWatcher = effect(() => {
    const user = this.svc.user();
    this.loading.set(false);

    // Allow access for admin purposes (you can add proper admin auth later)
    if (user || true) {  // Temporarily allow access without auth
      this.authError.set(false);
      this.loadReports();
    } else {
      this.authError.set(true);
      this.reports.set([]);
    }
  });

  ngOnInit() {
    // Effect is now initialized in field initializer above
  }

  async loadReports() {
    try {
      const reports = await this.svc.getProblemReports();
      this.reports.set(reports);
      this.currentPage.set(1); // Reset to first page when loading new data
    } catch (error) {
      console.error('Failed to load reports:', error);
    }
  }

  async markResolved(reportId: string) {
    try {
      await this.svc.markReportResolved(reportId);
      // Update local state
      this.reports.update(reports =>
        reports.map(r => r.id === reportId ? { ...r, resolved: true } : r)
      );
    } catch (error) {
      console.error('Failed to mark report as resolved:', error);
    }
  }

  formatDate(timestamp: any): string {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  }

  goToMainApp() {
    this.router.navigate(['/']);
  }

  openModal(report: ProblemReport) {
    this.selectedReport.set(report);
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.selectedReport.set(null);
  }
}