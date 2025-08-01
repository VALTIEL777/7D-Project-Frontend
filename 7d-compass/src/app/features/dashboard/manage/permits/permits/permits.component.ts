import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardLayoutComponent } from "../../../../../shared/dashboard-layout/dashboard-layout.component";
import { CardWithButtonComponent } from '../../../../../shared/card-with-button/card-with-button.component';
import { MatDialog } from '@angular/material/dialog';
import { DataTableComponent } from '../../../../../shared/data-table/data-table.component';
import { ConfirmationDialogComponent } from '../../../../../shared/confirmation-dialog/confirmation-dialog.component';
import { SearchDialogComponent } from '../../../../../shared/search-dialog/search-dialog.component';
import { BaseDashboardComponent } from '../../../../../shared/base-dashboard.component';
import { FilterService } from '../../../../../core/services/filter.service';
import { TicketService, Ticket } from '../../../../../core/services/ticket.service';
import { PermitedticketsService, PermitedTicket } from '../../../../../core/services/permissions/permitedtickets.service';
import { PermitService, Permit } from '../../../../../core/services/permissions/permit.service';
import { PhotoEvidenceService } from '../../../../../core/services/route/photoevidence.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FabButtonComponent } from '../../../../../shared/fab-button/fab-button.component';
import { environment } from '../../../../../../environments/environment';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

interface ColumnDefinition {
  name: string;
  header: string;
  cell: (element: any) => string;
  isActionColumn?: boolean;
}

@Component({
  selector: 'app-permits',
  standalone: true,
  imports: [
    CommonModule,
    DashboardLayoutComponent,
    CardWithButtonComponent,
    DataTableComponent,
    ConfirmationDialogComponent,
    SearchDialogComponent,
    FabButtonComponent,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './permits.component.html',
  styleUrl: './permits.component.scss'
})
export class PermitsComponent extends BaseDashboardComponent implements OnInit {
  columns: ColumnDefinition[] = [
    {
      name: 'permitNumber',
      header: 'Permit Number',
      cell: (permit: any) => {
        const permitNumber = permit.permitNumber || permit.permitnumber || 'N/A';
        const duplicateCount = this.getDuplicateCount(permit);
        if (duplicateCount > 1) {
          return `${permitNumber} (${duplicateCount} duplicates)`;
        }
        return permitNumber;
      }
    },
    {
      name: 'status',
      header: 'Status',
      cell: (permit: any) => {
        const status = permit.status;
        if (typeof status === 'boolean') {
          return status ? 'Active' : 'Inactive';
        }
        return status || 'N/A';
      }
    },
    {
      name: 'startDate',
      header: 'Start Date',
      cell: (permit: any) => {
        const date = permit.startDate || permit.startdate;
        if (date) {
          return new Date(date).toLocaleDateString();
        }
        return 'N/A';
      }
    },
    {
      name: 'expireDate',
      header: 'Expire Date',
      cell: (permit: any) => {
        const date = permit.expireDate || permit.expiredate;
        if (date) {
          return new Date(date).toLocaleDateString();
        }
        return 'N/A';
      }
    },
    {
      name: 'tickets',
      header: 'Associated Tickets',
      cell: (permit: any) => {
        if (permit.tickets && permit.tickets.length > 0) {
          const ticketCodes = permit.tickets.map((t: any) => t.ticketCode || t.ticketcode || 'N/A').join(', ');
          return ticketCodes;
        }
        return 'No tickets';
      }
    },
    {
      name: 'actions',
      header: 'Actions',
      cell: (permit: any) => '',
      isActionColumn: true
    }
  ];

  tableData: any[] = [];
  isLoading: boolean = false;

  // Propiedades para manejo de archivos PDF
  selectedPermitFile: File | null = null;
  pdfFileError: string | null = null;
  uploadingFile = false;
  permitFiles: { [permitId: number]: any[] } = {};
  
  // Propiedades para seguimiento de progreso de subida
  uploadProgress = {
    current: 0,
    total: 0,
    isUploading: false
  };

  constructor(
    private dialog: MatDialog,
    private permitService: PermitService,
    private permitedTicketsService: PermitedticketsService,
    private ticketService: TicketService,
    private photoEvidenceService: PhotoEvidenceService,
    filterService: FilterService,
    private snackBar: MatSnackBar
  ) {
    super(filterService);
  }

  override ngOnInit(): void {
    super.ngOnInit();
    this.loadPermits();
  }

  protected override loadData(): void {
    // Initialize data for filtering
    this.allData = [...this.tableData];
    this.filteredData = [...this.allData];
  }

  // Override text search to include permit fields and associated tickets
  protected override matchesTextSearch(item: any, searchTerm: string): boolean {
    const searchableFields = ['permitNumber', 'status', 'startDate', 'expireDate'];

    // Buscar en campos del permiso
    const permitMatch = searchableFields.some(field => {
      const value = this.getNestedValue(item, field);
      if (value) {
        return String(value).toLowerCase().includes(searchTerm.toLowerCase());
      }
      return false;
    });

    if (permitMatch) {
      return true;
    }

    // Buscar en tickets asociados por ticketCode
    if (item.tickets && Array.isArray(item.tickets)) {
      return item.tickets.some((ticket: any) => {
        const ticketCode = ticket.ticketCode || ticket.ticketcode;
        if (ticketCode) {
          return String(ticketCode).toLowerCase().includes(searchTerm.toLowerCase());
        }
        return false;
      });
    }

    return false;
  }

  // Getter for filtered permit data
  get filteredPermitData() {
    return this.filteredData;
  }

  loadPermits(): void {
    this.isLoading = true;
    
    // Limpiar datos existentes
    this.tableData = [];
    
    // Solo cargar datos reales de la API
    this.permitService.getAllPermits().subscribe({
      next: (permits) => {
        if (!permits || permits.length === 0) {
          this.isLoading = false;
          this.snackBar.open('No permits found in API', 'Close', { duration: 3000 });
        } else {
          this.loadAssociatedData(permits);
        }
      },
              error: (err) => {
          this.isLoading = false;
          console.error('❌ Error loading permits:', err);
          this.snackBar.open(`Error loading permits: ${err.status} - ${err.message}`, 'Close', { duration: 5000 });
        }
    });
  }

  private loadAssociatedData(permits: Permit[]): void {
    // Mostrar loading state
    this.snackBar.open('Loading permits and associations...', 'Close', { duration: 2000 });
    
    // Cargar permited tickets y tickets en paralelo usando forkJoin
    import('rxjs').then(({ forkJoin }) => {
      forkJoin({
        permitedTickets: this.permitedTicketsService.getAllPermitedTickets(),
        tickets: this.ticketService.getAllTickets()
      }).subscribe({
        next: ({ permitedTickets, tickets }) => {
          // Crear mapas para acceso rápido O(1) en lugar de O(n)
          const permitedTicketsMap = new Map();
          permitedTickets.forEach(pt => {
            if (!permitedTicketsMap.has(pt.permitId)) {
              permitedTicketsMap.set(pt.permitId, []);
            }
            permitedTicketsMap.get(pt.permitId).push(pt.ticketId);
          });
          
          const ticketsMap = new Map();
          tickets.forEach(t => {
            const ticketId = t.ticketId || t.ticketid;
            ticketsMap.set(ticketId, t);
          });
          
          // Asociar tickets con permisos de manera optimizada
          this.tableData = permits.map(permit => {
            const permitId = permit.PermitId || permit.permitId;
            const associatedTicketIds = permitedTicketsMap.get(permitId) || [];
            
            const associatedTickets = associatedTicketIds
              .map((ticketId: number) => ticketsMap.get(ticketId))
              .filter(Boolean); // Eliminar undefined
            
            return { ...permit, tickets: associatedTickets };
          });
          
          this.loadData(); // Initialize filtering data
          
          this.isLoading = false;
          this.snackBar.open(`${this.tableData.length} permits loaded successfully`, 'Close', { duration: 2000 });
          
          // ✅ Cargar archivos inmediatamente después de cargar los permisos
          console.log('📄 Iniciando carga de archivos para todos los permisos...');
          this.loadAllPermitFiles();
        },
        error: (err) => {
          console.error('❌ Error loading associated data:', err);
          // Continuar solo con permisos
          this.tableData = permits.map(permit => ({ ...permit, tickets: [] }));
          this.allData = [...this.tableData];
          this.filteredData = [...this.tableData];
          this.snackBar.open('Error loading associations, showing only permits', 'Close', { duration: 3000 });
          
          // ✅ Intentar cargar archivos incluso si fallan las asociaciones
          this.loadAllPermitFiles();
        }
      });
    });
  }



  public createTestAssociations(): void {
    
    // Obtener los primeros permisos y tickets disponibles
    this.permitService.getAllPermits().subscribe({
      next: (permits) => {
        
        this.ticketService.getAllTickets().subscribe({
          next: (tickets) => {
            
            if (permits.length > 0 && tickets.length > 0) {
              // Crear algunas asociaciones de prueba
              const testAssociations = [
                {
                  permitId: permits[0].PermitId || 0,
                  ticketId: tickets[0].ticketId || tickets[0].ticketid || 0,
                  createdBy: 1,
                  updatedBy: 1
                }
              ];
              
              // Si hay más de un permiso y ticket, crear más asociaciones
              if (permits.length > 1 && tickets.length > 1) {
                testAssociations.push({
                  permitId: permits[1].PermitId || 0,
                  ticketId: tickets[1].ticketId || tickets[1].ticketid || 0,
                  createdBy: 1,
                  updatedBy: 1
                });
              }
              
              // Si hay más de dos, crear una tercera asociación
              if (permits.length > 2 && tickets.length > 2) {
                testAssociations.push({
                  permitId: permits[2].PermitId || 0,
                  ticketId: tickets[2].ticketId || tickets[2].ticketid || 0,
                  createdBy: 1,
                  updatedBy: 1
                });
              }
              
              
              // Crear las asociaciones
              let createdCount = 0;
              testAssociations.forEach((association, index) => {
                
                this.permitedTicketsService.createPermitedTickets(association).subscribe({
                  next: (response) => {
                    createdCount++;
                    
                                      if (createdCount === testAssociations.length) {
                    this.snackBar.open(`${createdCount} test associations created successfully`, 'Close', { duration: 3000 });
                    this.loadPermits(); // Recargar datos para mostrar las asociaciones
                  }
                  },
                  error: (error) => {
                    console.error(`❌ Error creando asociación ${index + 1}:`, error);
                    this.snackBar.open(`Error creating association ${index + 1}`, 'Close', { duration: 3000 });
                  }
                });
              });
            } else {
              console.log('⚠️ No hay suficientes permisos o tickets para crear asociaciones');
              this.snackBar.open('Not enough data to create associations', 'Close', { duration: 3000 });
            }
          },
          error: (error) => {
            console.error('❌ Error cargando tickets:', error);
            this.snackBar.open('Error loading tickets', 'Close', { duration: 3000 });
          }
        });
      },
      error: (error) => {
        console.error('❌ Error cargando permisos:', error);
        this.snackBar.open('Error loading permits', 'Close', { duration: 3000 });
      }
    });
  }

  onCreatePermit(newPermit: any): void {
    const permitToCreate = {
      ...newPermit,
      createdBy: this.getCurrentUserId(),
      updatedBy: this.getCurrentUserId()
    };

    this.permitService.createPermit(permitToCreate).subscribe({
      next: (createdPermit) => {
        const permitWithTickets = { ...createdPermit, tickets: [] };
        this.tableData = [...this.tableData, permitWithTickets];
        this.loadData(); // Update filtering data
        this.snackBar.open('Permit created successfully', 'Close', { duration: 3000 });
        console.log('Permit created:', createdPermit);
      },
      error: (err) => {
        console.error('Error creating permit:', err);
        this.snackBar.open('Error creating permit', 'Close', { duration: 3000 });
      }
    });
  }

  onEdit(permit: any) {
    console.log('✏️ onEdit llamado con:', permit);
    const dialogRef = this.dialog.open(SearchDialogComponent, {
      width: '500px',
      data: {
        title: `Edit Permit: ${permit.permitNumber}`,
        data: permit,
        excludedFields: ['PermitId', 'permitNumber', 'deletedAt', 'updatedAt', 'createdAt', 'createdBy', 'updatedBy', 'tickets'],
        fields: [
          { name: 'status', label: 'Status', type: 'select', required: true, options: [
            { value: true, label: 'Active' },
            { value: false, label: 'Inactive' }
          ]},
          { name: 'startDate', label: 'Start Date', type: 'date', required: true },
          { name: 'expireDate', label: 'Expire Date', type: 'date', required: true }
        ]
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && permit.PermitId) {
        const index = this.tableData.findIndex(p => p.PermitId === permit.PermitId);
        if (index !== -1) {
          const updatedPermit = {
            ...permit,
            ...result,
            updatedBy: this.getCurrentUserId()
          };

          this.permitService.updatePermit(permit.PermitId, updatedPermit).subscribe({
            next: () => {
              this.tableData[index] = { ...updatedPermit, tickets: permit.tickets };
              this.loadData(); // Update filtering data
              this.snackBar.open('Permit updated successfully', 'Close', { duration: 3000 });
            },
            error: err => {
              console.error('Error updating permit:', err);
              this.snackBar.open('Error updating permit', 'Close', { duration: 3000 });
            }
          });
        }
      }
    });
  }

  onDelete(permit: any) {
    
    // Obtener el ID correcto del permiso
    const permitId = permit.PermitId || permit.permitId || permit.permitid;
    
          if (!permitId) {
        console.error('❌ No se pudo obtener el ID del permiso:', permit);
        this.snackBar.open('Error: Could not identify the permit', 'Close', { duration: 3000 });
        return;
      }
    
    
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '450px',
      disableClose: true,
      panelClass: 'confirmation-dialog',
      data: {
        title: 'Delete Permit',
        message: `Are you sure you want to delete permit ${permit.permitNumber}? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Keep Permit'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        
        // Primero intentar DELETE
        this.permitService.deletePermit(permitId).subscribe({
          next: (response) => {
            console.log('✅ Permiso eliminado exitosamente:', response);
            this.snackBar.open('Permit deleted successfully', 'Close', { duration: 3000 });
            
            // Recargar datos desde la API para asegurar sincronización
            console.log('🔄 Recargando datos después de eliminación...');
            this.loadPermits();
          },
          error: (err) => {
            console.error('❌ Error deleting permit:', err);
            
            // Si DELETE falla, intentar soft delete con PUT
            if (err.status === 404) {
              
              const softDeleteData = {
                deletedat: new Date().toISOString(),
                status: 'Inactive',
                updatedBy: this.getCurrentUserId()
              };
              
              this.permitService.updatePermit(permitId, softDeleteData).subscribe({
                next: (response) => {
                  console.log('✅ Soft delete exitoso:', response);
                  this.snackBar.open('Permit marked as deleted successfully', 'Close', { duration: 3000 });
                  
                  // Recargar datos para mostrar el estado actualizado
                  this.loadPermits();
                },
                error: (updateErr) => {
                  console.error('❌ Error en soft delete:', updateErr);
                  this.snackBar.open('Error marking permit as deleted', 'Close', { duration: 5000 });
                }
              });
            } else {
              let errorMessage = 'Error deleting permit';
              if (err.status === 405) {
                errorMessage = 'Delete method not allowed for permits';
              }
              
              this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
            }
          }
        });
      }
    });
  }

  onUploadPdf(permit: any): void {
    console.log('📄 onUploadPdf llamado para permiso:', permit);
    
    // Cargar archivos existentes del permiso
    this.loadPermitFiles(permit.PermitId);
    
    // Crear un input de archivo temporal
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'application/pdf';
    fileInput.style.display = 'none';
    
    fileInput.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        this.onPermitFileSelected(event, permit);
      }
    };
    
    fileInput.click();
  }

  onPermitFileSelected(event: any, permit?: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validar que sea un PDF
      if (file.type !== 'application/pdf') {
        this.pdfFileError = 'Only PDF files are allowed';
        this.selectedPermitFile = null;
        return;
      }

      // Validar tamaño (máximo 10MB)
      if (file.size > 10 * 1024 * 1024) {
        this.pdfFileError = 'File is too large. Maximum 10MB';
        this.selectedPermitFile = null;
        return;
      }

      // Detectar caracteres raros en el nombre
      const unsafePattern = /[^a-zA-Z0-9_.-]/;
      const fileExtension = file.name.split('.').pop() || 'pdf';
      let finalFile: File;

      if (unsafePattern.test(file.name)) {
        // Si hay caracteres raros, renombrar
        const safeName = `${Date.now()}_${permit?.PermitId || 'permit'}.${fileExtension}`;
        finalFile = new File([file], safeName, { type: file.type });
      } else {
        // Si el nombre es seguro, usar el original
        finalFile = file;
      }

      this.selectedPermitFile = finalFile;
      this.pdfFileError = null;

      // Si se pasó un permiso específico, subir automáticamente
      if (permit) {
        this.uploadPermitFile(permit);
      }
    }
  }

  uploadPermitFile(permit: any): void {
    if (!this.selectedPermitFile) {
      return;
    }

    this.uploadingFile = true;
    this.pdfFileError = null;

    // Buscar todos los permisos con el mismo permitNumber
    const samePermitNumber = permit.permitNumber || permit.permitnumber;
    const permitsWithSameNumber = this.tableData.filter(p => 
      (p.permitNumber || p.permitnumber) === samePermitNumber
    );

    console.log(`📄 Encontrados ${permitsWithSameNumber.length} permisos con permitNumber: ${samePermitNumber}`);

    // Si solo hay un permiso con ese número, subir normalmente
    if (permitsWithSameNumber.length === 1) {
      this.uploadSinglePermitFile(permit);
      return;
    }

    // Si hay múltiples permisos con el mismo número, mostrar confirmación
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '500px',
      disableClose: true,
      panelClass: 'confirmation-dialog',
      data: {
        title: 'Propagate PDF to Similar Permits',
        message: `Found ${permitsWithSameNumber.length} permits with the same number (${samePermitNumber}).\n\nDo you want to upload the PDF file to all permits with this number?\n\nPermits found:\n${permitsWithSameNumber.map(p => `• ${p.permitNumber} (ID: ${p.PermitId})`).join('\n')}`,
        confirmText: 'Upload to All',
        cancelText: 'Only This One'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        // Subir a todos los permisos con el mismo número
        this.uploadToMultiplePermits(permitsWithSameNumber);
      } else {
        // Subir solo al permiso seleccionado
        this.uploadSinglePermitFile(permit);
      }
    });
  }

  private uploadSinglePermitFile(permit: any): void {
    // Obtener el ticketId del primer ticket asociado al permiso
    let ticketId = null;
    if (permit.tickets && permit.tickets.length > 0) {
      ticketId = permit.tickets[0].ticketId || permit.tickets[0].ticketid;
    }

    // Crear FormData siguiendo el patrón de current.component
    const formData = new FormData();
    formData.append('file', this.selectedPermitFile!);
    formData.append('ticketId', ticketId?.toString() || '');
    formData.append('name', this.selectedPermitFile!.name);
    formData.append('comment', `File uploaded for permit: ${permit.permitNumber}`);

    this.photoEvidenceService.uploadPhotoEvidence(formData).subscribe({
      next: (response) => {
        this.uploadingFile = false;
        this.selectedPermitFile = null;
        this.snackBar.open(`PDF file uploaded successfully for ${permit.permitNumber}`, 'Close', { duration: 3000 });
        
        // Recargar archivos asociados al permiso
        this.loadPermitFiles(permit.PermitId);
      },
      error: (error) => {
        console.error('❌ Error subiendo archivo:', error);
        this.uploadingFile = false;
        this.pdfFileError = 'Error uploading file. Please try again.';
        this.snackBar.open('Error uploading file', 'Close', { duration: 3000 });
      }
    });
  }

  private uploadToMultiplePermits(permits: any[]): void {
    console.log(`📄 Iniciando subida a ${permits.length} permisos...`);
    
    // Inicializar progreso
    this.uploadProgress = {
      current: 0,
      total: permits.length,
      isUploading: true
    };
    
    // Mostrar resumen antes de subir
    const permitNumbers = permits.map(p => p.permitNumber || p.permitnumber).join(', ');
    this.snackBar.open(`📄 Uploading file to ${permits.length} permits: ${permitNumbers}`, 'Close', { duration: 3000 });
    
    let completedUploads = 0;
    let failedUploads = 0;
    const totalUploads = permits.length;

    permits.forEach((permit, index) => {
      // Crear una copia del archivo para cada permiso
      const fileCopy = new File([this.selectedPermitFile!], this.selectedPermitFile!.name, { 
        type: this.selectedPermitFile!.type 
      });

      // Obtener el ticketId del primer ticket asociado al permiso
      let ticketId = null;
      if (permit.tickets && permit.tickets.length > 0) {
        ticketId = permit.tickets[0].ticketId || permit.tickets[0].ticketid;
      }

      // Crear FormData para este permiso
      const formData = new FormData();
      formData.append('file', fileCopy);
      formData.append('ticketId', ticketId?.toString() || '');
      formData.append('name', fileCopy.name);
      formData.append('comment', `File uploaded for permit: ${permit.permitNumber} (automatically propagated)`);

      this.photoEvidenceService.uploadPhotoEvidence(formData).subscribe({
        next: (response) => {
          completedUploads++;
          this.uploadProgress.current = completedUploads;
          console.log(`✅ Archivo subido exitosamente para permiso ${permit.permitNumber} (${completedUploads}/${totalUploads})`);
          
          // Recargar archivos para este permiso
          this.loadPermitFiles(permit.PermitId);
          
          // Verificar si todas las subidas han terminado
          if (completedUploads + failedUploads === totalUploads) {
            this.uploadingFile = false;
            this.selectedPermitFile = null;
            this.uploadProgress.isUploading = false;
            
                    // Recargar archivos de TODOS los permisos afectados
        permits.forEach(p => {
          this.loadPermitFiles(p.PermitId);
          // Forzar actualización de la UI después de un breve delay
          setTimeout(() => {
            console.log(`🔄 Forzando actualización de UI para permiso ${p.PermitId}`);
            // Trigger change detection
            this.loadData();
          }, 200);
        });

            if (failedUploads === 0) {
              this.snackBar.open(`✅ PDF file uploaded successfully to ${completedUploads} permits`, 'Close', { duration: 4000 });
            } else {
              this.snackBar.open(`⚠️ File uploaded to ${completedUploads} permits, ${failedUploads} failed`, 'Close', { duration: 5000 });
            }
          }
        },
        error: (error) => {
          failedUploads++;
          this.uploadProgress.current = completedUploads + failedUploads;
          console.error(`❌ Error subiendo archivo para permiso ${permit.permitNumber}:`, error);
          
          // Verificar si todas las subidas han terminado
          if (completedUploads + failedUploads === totalUploads) {
            this.uploadingFile = false;
            this.selectedPermitFile = null;
            this.uploadProgress.isUploading = false;
            
            if (failedUploads === totalUploads) {
              this.pdfFileError = 'Error uploading file to all permits.';
              this.snackBar.open('Error uploading file', 'Close', { duration: 3000 });
            } else {
              this.snackBar.open(`⚠️ File uploaded to ${completedUploads} permits, ${failedUploads} failed`, 'Close', { duration: 5000 });
            }
          }
        }
      });
    });
  }

  public checkApiStatus(): void {
    
    // Hacer petición directa a la API de permisos
    fetch(this.permitService.getApiInfo().baseUrl)
      .then(response => {
        return response.json();
      })
      .then(data => {
        
        if (data.permits && data.permits.length > 0) {
        }
        
        // Si hay datos, intentar cargarlos
        if (data.permits && data.permits.length > 0) {
          this.loadAssociatedData(data.permits);
        } else {
        }
      })
      .catch(error => {
        console.error('❌ Error en petición directa a permisos:', error);
      });
  }

  public forceLoadFromApi(): void {
    
    // Limpiar datos existentes
    this.tableData = [];
    this.allData = [];
    this.filteredData = [];
    
    // Hacer una petición directa para diagnosticar
    fetch(this.permitService.getApiInfo().baseUrl)
      .then(response => {
        return response.json();
      })
      .then(data => {
      })
      .catch(error => {
        console.error('❌ Error en petición directa:', error);
      });
    
    // Cargar usando el servicio
    this.loadPermits();
  }



  loadPermitFiles(permitId: number): void {
    console.log(`📄 Cargando archivos para permiso ${permitId}...`);
    
    // Buscar el permiso para obtener sus tickets asociados
    const permit = this.tableData.find(p => p.PermitId === permitId);
    if (!permit) {
      console.warn(`⚠️ Permiso ${permitId} no encontrado en tableData`);
      return;
    }

    // Obtener los ticketIds asociados al permiso
    const ticketIds = permit.tickets?.map((t: any) => t.ticketId || t.ticketid).filter((id: any) => id) || [];
    console.log(`📄 TicketIds asociados al permiso ${permitId}:`, ticketIds);

    if (ticketIds.length === 0) {
      console.log(`📄 No hay tickets asociados al permiso ${permitId}`);
      this.permitFiles[permitId] = [];
      return;
    }

    this.photoEvidenceService.getAllPhotoEvidence().subscribe({
      next: (files) => {
        console.log(`📄 Archivos totales recibidos: ${files.length}`);
        
        // Filtrar archivos que pertenezcan a los tickets del permiso y NO estén eliminados
        const permitFiles = files.filter((file: any) => {
          // Excluir archivos eliminados
          if (file.deletedat) {
            return false;
          }
          
          const matchesTicketId = ticketIds.includes(file.ticketId);
          const matchesComment = file.comment?.includes(`permiso: ${permit.permitNumber}`) ||
                               file.comment?.includes(`permit: ${permit.permitNumber}`);
          
          if (matchesTicketId || matchesComment) {
            console.log(`📄 Archivo encontrado para permiso ${permitId}:`, file.name);
          }
          
          return matchesTicketId || matchesComment;
        });
        
        console.log(`📄 Archivos encontrados para permiso ${permitId}: ${permitFiles.length}`);
        this.permitFiles[permitId] = permitFiles;
        
        // Forzar detección de cambios para actualizar la UI
        setTimeout(() => {
          console.log(`📄 Estado final para permiso ${permitId}: ${this.permitFiles[permitId].length} archivos`);
        }, 100);
      },
      error: (error) => {
        console.error('❌ Error cargando archivos del permiso:', error);
      }
    });
  }

  deletePermitFile(photoId: number, permitId: number): void {
    this.photoEvidenceService.deletePhotoEvidence(photoId).subscribe({
      next: () => {
        this.snackBar.open('File deleted successfully', 'Close', { duration: 3000 });
        
        // Limpiar inmediatamente el array de archivos del permiso
        this.permitFiles[permitId] = [];
        this.selectedPermitFile = null; // Limpiar archivo seleccionado
        this.pdfFileError = null;       // Limpiar error
        
        // Recargar archivos del permiso para asegurar sincronización
        setTimeout(() => {
          this.loadPermitFiles(permitId);
        }, 500);
      },
      error: (error) => {
        console.error('❌ Error eliminando archivo:', error);
        this.snackBar.open('Error deleting file', 'Close', { duration: 3000 });
      }
    });
  }

  // 🎯 NUEVO: Método para eliminar archivo de un solo permiso
  private deleteSinglePermitFile(permit: any, fileToDelete: any): void {
    console.log('🗑️ Eliminando archivo de un solo permiso:', fileToDelete);
    this.deletePermitFile(fileToDelete.photoid || fileToDelete.id, permit.PermitId);
  }

  // 🎯 NUEVO: Método para eliminar archivo de múltiples permisos
  private deleteFromMultiplePermits(permits: any[], fileToDelete: any): void {
    console.log(`🗑️ Iniciando eliminación de archivo en ${permits.length} permisos...`);
    
    // Mostrar resumen antes de eliminar
    const permitNumbers = permits.map(p => p.permitNumber || p.permitnumber).join(', ');
    this.snackBar.open(`🗑️ Deleting file from ${permits.length} permits: ${permitNumbers}`, 'Close', { duration: 3000 });
    
    let completedDeletions = 0;
    let failedDeletions = 0;
    const totalDeletions = permits.length;

    permits.forEach((permit, index) => {
      // Buscar archivos similares en cada permiso
      this.findSimilarFilesInPermit(permit, fileToDelete).then(similarFiles => {
        if (similarFiles.length > 0) {
          // Eliminar cada archivo similar encontrado
          similarFiles.forEach(file => {
            this.photoEvidenceService.deletePhotoEvidence(file.photoid || file.id).subscribe({
              next: (response) => {
                completedDeletions++;
                console.log(`✅ Archivo eliminado exitosamente para permiso ${permit.permitNumber} (${completedDeletions}/${totalDeletions})`);
                
                // Recargar archivos para este permiso
                this.loadPermitFiles(permit.PermitId);
                
                // Verificar si todas las eliminaciones han terminado
                if (completedDeletions + failedDeletions === totalDeletions) {
                  this.finalizeMultipleDeletions(completedDeletions, failedDeletions);
                }
              },
              error: (error) => {
                failedDeletions++;
                console.error(`❌ Error eliminando archivo para permiso ${permit.permitNumber}:`, error);
                
                // Verificar si todas las eliminaciones han terminado
                if (completedDeletions + failedDeletions === totalDeletions) {
                  this.finalizeMultipleDeletions(completedDeletions, failedDeletions);
                }
              }
            });
          });
        } else {
          // No se encontraron archivos similares en este permiso
          console.log(`⚠️ No se encontraron archivos similares en permiso ${permit.permitNumber}`);
          completedDeletions++;
          
          // Verificar si todas las eliminaciones han terminado
          if (completedDeletions + failedDeletions === totalDeletions) {
            this.finalizeMultipleDeletions(completedDeletions, failedDeletions);
          }
        }
      });
    });
  }

  // 🎯 NUEVO: Método para encontrar archivos similares en un permiso
  private async findSimilarFilesInPermit(permit: any, originalFile: any): Promise<any[]> {
    return new Promise((resolve) => {
      // Obtener los ticketIds asociados al permiso
      const ticketIds = permit.tickets?.map((t: any) => t.ticketId || t.ticketid).filter((id: any) => id) || [];

      if (ticketIds.length === 0) {
        resolve([]);
        return;
      }

      this.photoEvidenceService.getAllPhotoEvidence().subscribe({
        next: (files) => {
          // Filtrar archivos que pertenezcan a los tickets del permiso y NO estén eliminados
          const permitFiles = files.filter((file: any) => {
            // Excluir archivos eliminados
            if (file.deletedat) {
              return false;
            }
            
            // Buscar por ticketId o por comentario que mencione el permiso
            const matchesTicketId = ticketIds.includes(file.ticketId);
            const matchesComment = file.comment?.includes(`permit: ${permit.permitNumber}`) || 
                                 file.comment?.includes(`permiso: ${permit.permitNumber}`);
            
            // Buscar archivos con el mismo nombre o contenido similar
            const matchesFileName = file.name === originalFile.name;
            const matchesFileSize = file.size === originalFile.size;
            
            return (matchesTicketId || matchesComment) && (matchesFileName || matchesFileSize);
          });
          
          resolve(permitFiles);
        },
        error: (error) => {
          console.error('❌ Error buscando archivos similares:', error);
          resolve([]);
        }
      });
    });
  }

  // 🎯 NUEVO: Método para finalizar múltiples eliminaciones
  private finalizeMultipleDeletions(completedDeletions: number, failedDeletions: number): void {
    if (failedDeletions === 0) {
      this.snackBar.open(`✅ PDF file deleted successfully from ${completedDeletions} permits`, 'Close', { duration: 4000 });
    } else {
      this.snackBar.open(`⚠️ File deleted from ${completedDeletions} permits, ${failedDeletions} failed`, 'Close', { duration: 5000 });
    }
  }

  getPermitFilesCount(permitId: number): number {
    if (!permitId || !this.permitFiles[permitId]) {
      return 0;
    }
    return this.permitFiles[permitId].length;
  }

  hasPermitFiles = (permit: any): boolean => {
    const permitId = permit.PermitId;
    const count = this.getPermitFilesCount(permitId);
    console.log(`🔍 hasPermitFiles para permiso ${permitId}: ${count} archivos`);
    return count > 0;
  }

  onDeletePermitFile(permit: any): void {
    console.log('🗑️ onDeletePermitFile llamado para permiso:', permit);
    
    const permitId = permit.PermitId;
    const files = this.permitFiles[permitId];
    
    if (!files || files.length === 0) {
      console.log('⚠️ No hay archivos para eliminar');
      this.snackBar.open('No files to delete', 'Close', { duration: 3000 });
      return;
    }

    // Buscar todos los permisos con el mismo permitNumber
    const samePermitNumber = permit.permitNumber || permit.permitnumber;
    const permitsWithSameNumber = this.tableData.filter(p => 
      (p.permitNumber || p.permitnumber) === samePermitNumber
    );

    console.log(`🗑️ Encontrados ${permitsWithSameNumber.length} permisos con permitNumber: ${samePermitNumber}`);

    // Si solo hay un permiso con ese número, eliminar normalmente
    if (permitsWithSameNumber.length === 1) {
      this.deleteSinglePermitFile(permit, files[0]);
      return;
    }

    // Si hay múltiples permisos con el mismo número, mostrar confirmación para propagar eliminación
    const fileToDelete = files[0];
    const fileName = fileToDelete.name || 'Unnamed file';
    const fileDate = fileToDelete.createdat ? new Date(fileToDelete.createdat).toLocaleDateString() : 'Unknown date';

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '600px',
      disableClose: true,
      panelClass: 'confirmation-dialog',
      data: {
        title: 'Propagate PDF Deletion to Similar Permits',
        message: `Found ${permitsWithSameNumber.length} permits with the same number (${samePermitNumber}).\n\nDo you want to delete the PDF file from all permits with this number?\n\nFile: ${fileName}\nUpload date: ${fileDate}\n\nPermits found:\n${permitsWithSameNumber.map(p => `• ${p.permitNumber} (ID: ${p.PermitId})`).join('\n')}\n\nThis action cannot be undone.`,
        confirmText: 'Delete from All',
        cancelText: 'Only This One'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        // Eliminar de todos los permisos con el mismo número
        this.deleteFromMultiplePermits(permitsWithSameNumber, fileToDelete);
      } else {
        // Eliminar solo del permiso seleccionado
        this.deleteSinglePermitFile(permit, fileToDelete);
      }
    });
  }

  loadAllPermitFiles(): void {
    console.log('📄 loadAllPermitFiles iniciado...');
    
    // Solo cargar archivos si hay permisos
    if (this.tableData.length === 0) {
      console.log('📄 No hay permisos para cargar archivos');
      return;
    }
    
    console.log(`📄 Cargando archivos para ${this.tableData.length} permisos...`);
    
    this.photoEvidenceService.getAllPhotoEvidence().subscribe({
      next: (files) => {
        console.log(`📄 Archivos totales recibidos: ${files.length}`);
        
        // Crear un mapa de archivos por ticketId para acceso rápido
        const filesByTicketId = new Map();
        files.forEach(file => {
          if (!file.deletedat) { // Solo archivos no eliminados
            const ticketId = file.ticketId;
            if (!filesByTicketId.has(ticketId)) {
              filesByTicketId.set(ticketId, []);
            }
            filesByTicketId.get(ticketId).push(file);
          }
        });
        
        console.log(`📄 Archivos válidos por ticketId: ${filesByTicketId.size} tickets con archivos`);
        
        // Procesar permisos en lotes para no bloquear la UI
        const batchSize = 10;
        let currentIndex = 0;
        let totalFilesFound = 0;
        
        const processBatch = () => {
          const endIndex = Math.min(currentIndex + batchSize, this.tableData.length);
          
          for (let i = currentIndex; i < endIndex; i++) {
            const permit = this.tableData[i];
            const permitId = permit.PermitId;
            
            // Obtener los ticketIds asociados al permiso
            const ticketIds = permit.tickets?.map((t: any) => t.ticketId || t.ticketid).filter((id: any) => id) || [];
            
            // Recolectar archivos de todos los tickets asociados
            const permitFiles: any[] = [];
            ticketIds.forEach((ticketId: number) => {
              const ticketFiles = filesByTicketId.get(ticketId) || [];
              permitFiles.push(...ticketFiles);
            });
            
            // Agregar archivos que mencionen el permiso en el comentario
            files.forEach(file => {
              if (!file.deletedat && (
                file.comment?.includes(`permiso: ${permit.permitNumber}`) ||
                file.comment?.includes(`permit: ${permit.permitNumber}`)
              )) {
                permitFiles.push(file);
              }
            });
            
            this.permitFiles[permitId] = permitFiles;
            totalFilesFound += permitFiles.length;
            
            if (permitFiles.length > 0) {
              console.log(`📄 Permiso ${permitId} (${permit.permitNumber}): ${permitFiles.length} archivos`);
            }
          }
          
          currentIndex = endIndex;
          
          // Continuar con el siguiente lote si hay más permisos
          if (currentIndex < this.tableData.length) {
            setTimeout(processBatch, 10); // Pequeña pausa para no bloquear la UI
          } else {
            // Procesamiento completado
            console.log(`📄 Carga completada: ${totalFilesFound} archivos encontrados en total`);
            
            // Forzar actualización de la UI
            setTimeout(() => {
              console.log('🔄 Forzando actualización de UI después de cargar archivos...');
              this.loadData();
            }, 100);
          }
        };
        
        // Iniciar el procesamiento por lotes
        processBatch();
      },
      error: (error) => {
        console.error('❌ Error cargando todos los archivos:', error);
      }
    });
  }

  // Helper method to get current user ID (should be replaced with actual auth service)
  private getCurrentUserId(): number {
    // TODO: Implement this when auth service is available
    // return this.authService.getCurrentUser()?.id || 1;
    return 1; // Default for now
  }

  // ✅ Método para debuggear el estado de archivos de un permiso
  debugPermitFiles(permitId: number): void {
    console.log(`🔍 Debug archivos para permiso ${permitId}:`);
    console.log(`  - Archivos en memoria:`, this.permitFiles[permitId]);
    console.log(`  - Cantidad: ${this.getPermitFilesCount(permitId)}`);
    console.log(`  - hasPermitFiles: ${this.hasPermitFiles({ PermitId: permitId })}`);
  }

  // ✅ Método para debuggear todos los permisos
  debugAllPermitFiles(): void {
    console.log('🔍 Debug estado de archivos para todos los permisos:');
    this.tableData.forEach(permit => {
      const permitId = permit.PermitId;
      console.log(`  Permiso ${permitId} (${permit.permitNumber}):`);
      console.log(`    - hasPermitFiles: ${this.hasPermitFiles(permit)}`);
      console.log(`    - Cantidad archivos: ${this.getPermitFilesCount(permitId)}`);
      console.log(`    - Archivos:`, this.permitFiles[permitId]);
    });
  }

  // Método para obtener permisos con el mismo permitNumber
  getPermitsWithSameNumber(permitNumber: string): any[] {
    return this.tableData.filter(p => 
      (p.permitNumber || p.permitnumber) === permitNumber
    );
  }

  // Método para verificar si un permiso tiene duplicados
  hasDuplicatePermitNumber(permit: any): boolean {
    const permitNumber = permit.permitNumber || permit.permitnumber;
    const duplicates = this.getPermitsWithSameNumber(permitNumber);
    return duplicates.length > 1;
  }

  // Método para obtener el número de duplicados de un permiso
  getDuplicateCount(permit: any): number {
    const permitNumber = permit.permitNumber || permit.permitnumber;
    const duplicates = this.getPermitsWithSameNumber(permitNumber);
    return duplicates.length;
  }

  // Método para verificar si hay permisos duplicados en general
  hasDuplicatePermits(): boolean {
    const permitNumbers = new Set();
    return this.tableData.some(permit => {
      const permitNumber = permit.permitNumber || permit.permitnumber;
      if (permitNumbers.has(permitNumber)) {
        return true;
      }
      permitNumbers.add(permitNumber);
      return false;
    });
  }

  // Método para mostrar detalles de permisos duplicados
  showDuplicateDetails(): void {
    // Agrupar permisos por permitNumber
    const groupedPermits = new Map<string, any[]>();
    
    this.tableData.forEach(permit => {
      const permitNumber = permit.permitNumber || permit.permitnumber;
      if (!groupedPermits.has(permitNumber)) {
        groupedPermits.set(permitNumber, []);
      }
      groupedPermits.get(permitNumber)!.push(permit);
    });

    // Filtrar solo los grupos con más de un permiso
    const duplicates = Array.from(groupedPermits.entries())
      .filter(([_, permits]) => permits.length > 1)
      .map(([permitNumber, permits]) => ({
        permitNumber,
        permits,
        count: permits.length
      }));

    if (duplicates.length === 0) {
      this.snackBar.open('No duplicate permits found', 'Close', { duration: 3000 });
      return;
    }

    // Crear mensaje detallado con información más completa
    let message = `Found ${duplicates.length} groups of duplicate permits:\n\n`;
    duplicates.forEach((group, index) => {
      message += `${index + 1}. Permit Number: ${group.permitNumber} (${group.count} permits)\n`;
      group.permits.forEach(permit => {
        const startDate = permit.startDate || permit.startdate;
        const expireDate = permit.expireDate || permit.expiredate;
        const status = permit.status;
        const ticketsCount = permit.tickets?.length || 0;
        
        message += `   • ID: ${permit.PermitId}\n`;
        message += `     Status: ${status}\n`;
        message += `     Start Date: ${startDate ? new Date(startDate).toLocaleDateString() : 'N/A'}\n`;
        message += `     Expire Date: ${expireDate ? new Date(expireDate).toLocaleDateString() : 'N/A'}\n`;
        message += `     Associated tickets: ${ticketsCount}\n`;
        message += '\n';
      });
    });

    message += `\n💡 Note: When uploading a PDF file to any permit in a duplicate group, it can be automatically propagated to all permits in the same group. The same applies when deleting PDF files.`;

    // Mostrar diálogo con detalles
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '700px',
      disableClose: false,
      panelClass: 'confirmation-dialog',
      data: {
        title: 'Duplicate Permits Details',
        message: message,
        confirmText: 'Close',
        cancelText: 'Close'
      }
    });

    dialogRef.afterClosed().subscribe(() => {
      // Solo cerrar el diálogo
    });
  }
}
