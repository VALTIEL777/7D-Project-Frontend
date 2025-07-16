import { Component } from '@angular/core';
import { DashboardLayoutComponent } from '../../../../shared/dashboard-layout/dashboard-layout.component';
import { DataTableComponent } from '../../../../shared/data-table/data-table.component';
import { CardWithButtonComponent } from '../../../../shared/card-with-button/card-with-button.component';
import { ConfirmationDialogComponent } from '../../../../shared/confirmation-dialog/confirmation-dialog.component';
import { SearchDialogComponent } from '../../../../shared/search-dialog/search-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ColumnDefinition } from '../../../../shared/data-table/data-table.component';
import { InvoiceStepperCardComponent, InvoiceStepperData } from '../../../../shared/invoice-stepper-card/invoice-stepper-card.component';
import { TicketService, PaymentInvoiceInfo } from '../../../../core/services/ticket.service';
import { FilterService } from '../../../../core/services/filter.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-income',
  imports: [
    DashboardLayoutComponent,
    DataTableComponent,
    CardWithButtonComponent,
    InvoiceStepperCardComponent,
  ],
  templateUrl: './income.component.html',
  styleUrl: './income.component.scss',
})
export class IncomeComponent {
  filterSubscription: Subscription = new Subscription();
  filteredInvoiceData: any[] = [];

  constructor(
    private dialog: MatDialog,
    private sanitizer: DomSanitizer,
    private ticketService: TicketService,
    private filterService: FilterService
  ) {}
  sanitize(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  totalIncome: number = 0;
  stepperData: InvoiceStepperData = {};
  invoiceData: any[] = [];

  ngOnInit(): void {
    this.fetchInvoiceData();
    this.filterSubscription.add(
      this.filterService.textSearch$.subscribe(() => this.applyFilters())
    );
    this.filterSubscription.add(
      this.filterService.dateRange$.subscribe(() => this.applyFilters())
    );
  }

  ngOnDestroy(): void {
    this.filterSubscription.unsubscribe();
  }

  fetchInvoiceData(): void {
    this.ticketService.getPaymentInvoiceInfo().subscribe({
      next: (response) => {
        if (response.success && Array.isArray(response.data)) {
          this.invoiceData = response.data.map((invoice) => {
            const diff = Number(invoice.amountPaid ?? 0) - Number(invoice.calculatedCost ?? 0);
            return {
              ...invoice,
              income: `${diff > 0 ? '+' : diff < 0 ? '-' : ''}$${Math.abs(diff)}`,
            };
          });
          this.totalIncome = this.invoiceData.reduce((sum, invoice) => {
            const diff = Number(invoice.amountPaid ?? 0) - Number(invoice.calculatedCost ?? 0);
            return sum + diff;
          }, 0);
          this.applyFilters();
        } else {
          this.invoiceData = [];
          this.filteredInvoiceData = [];
          this.totalIncome = 0;
        }
      },
      error: (err) => {
        this.invoiceData = [];
        this.filteredInvoiceData = [];
        this.totalIncome = 0;
      }
    });
  }

  applyFilters(): void {
    const text = this.filterService.currentTextSearch?.toLowerCase() || '';
    // Date range filter stub (implement as needed)
    // const dateRange = this.filterService.currentDateRange;
    this.filteredInvoiceData = this.invoiceData.filter(invoice =>
      invoice.ticketCode?.toLowerCase().includes(text) ||
      invoice.invoiceNumber?.toLowerCase().includes(text)
    );
  }

  onEditTicket(ticket: any): void {
    const dialogRef = this.dialog.open(SearchDialogComponent, {
      width: '500px',
      data: {
        title: `Invoice: #${ticket.invoiceNumber}`,
        data: { ...ticket },
        excludedFields: [],
      },
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        const index = this.invoiceData.findIndex(
          (t) => t.invoiceNumber === ticket.invoiceNumber
        );
        if (index !== -1) {
          const updated = {
            ...this.invoiceData[index],
            ...result,
          };
          this.invoiceData[index] = updated;

          console.log('Invoice updated:', updated);
        }
      }
    });
  }

  onDeleteTicket(ticket: any): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '450px',
      disableClose: true,
      panelClass: 'confirmation-dialog',
      data: {
        title: 'Delete Invoice',
        message: `Are you sure you want to delete invoice #${ticket.invoiceNumber}? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.invoiceData = this.invoiceData.filter(
          (t) => t.invoiceNumber !== ticket.invoiceNumber
        );
        console.log('Invoice deleted:', ticket);
      }
    });
  }

  // Stepper event handlers
  onStepCompleted(event: { step: number; data: any }) {
    console.log(`Step ${event.step} completed:`, event.data);
    this.stepperData = { ...this.stepperData, ...event.data };
  }

  onProcessCompleted(data: InvoiceStepperData) {
    console.log('Invoice processing completed:', data);
    // You can add logic here to refresh the invoice data or show success message
  }

  invoiceColumns: ColumnDefinition[] = [
    // Remove paymentNumber column since it's not in the API response
    {
      name: 'invoiceNumber',
      header: 'Invoice #',
      cell: (invoice: any) => invoice.invoiceNumber,
    },
    {
      name: 'ticketCode',
      header: 'Ticket',
      cell: (invoice: any) => invoice.ticketCode,
    },
    {
      name: 'amountRequested',
      header: 'Amount Requested',
      cell: (invoice: any) => `$${invoice.amountRequested}`,
    },
    {
      name: 'calculatedCost',
      header: 'Calculated Cost',
      cell: (invoice: any) => `$${invoice.calculatedCost}`,
    },
    {
      name: 'amountToPay',
      header: 'Amount to Pay',
      cell: (invoice: any) => `$${invoice.amountToPay}`,
    },
    {
      name: 'amountPaid',
      header: 'Amount Paid',
      cell: (invoice: any) => invoice.amountPaid !== null && invoice.amountPaid !== undefined ? `$${invoice.amountPaid}` : '-',
    },
    {
      name: 'income',
      header: 'Income',
      cell: (invoice: any) => {
        const diff = Number(invoice.amountPaid ?? 0) - Number(invoice.calculatedCost ?? 0);
        const sign = diff > 0 ? '+' : diff < 0 ? '-' : '';
        const color = diff > 0 ? 'green' : diff < 0 ? 'red' : 'gray';
        const html = `<span style="color:${color}; font-weight: bold;">${sign}$${Math.abs(diff)}</span>`;
        return this.sanitize(html);
      },
      isHtml: true,
    },
    {
      name: 'statusPaid',
      header: 'Status',
      cell: (invoice: any) => invoice.statusPaid || '-',
    },
  ];
}
