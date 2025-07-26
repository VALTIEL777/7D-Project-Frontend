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
      cell: (permit: any) => permit.permitNumber || permit.permitnumber || 'N/A'
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

  // Override text search to include permit fields
  protected override matchesTextSearch(item: any, searchTerm: string): boolean {
    const searchableFields = ['permitNumber', 'status', 'startDate', 'expireDate'];

    return searchableFields.some(field => {
      const value = this.getNestedValue(item, field);
      if (value) {
        return String(value).toLowerCase().includes(searchTerm);
      }
      return false;
    });
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
          this.snackBar.open('No se encontraron permisos en la API', 'Close', { duration: 3000 });
        } else {
          this.loadAssociatedData(permits);
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error('❌ Error loading permits:', err);
        this.snackBar.open(`Error cargando permisos: ${err.status} - ${err.message}`, 'Close', { duration: 5000 });
      }
    });
  }

  private loadAssociatedData(permits: Permit[]): void {
    // Mostrar loading state
    this.snackBar.open('Cargando permisos y asociaciones...', 'Close', { duration: 2000 });
    
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
          this.snackBar.open(`${this.tableData.length} permisos cargados exitosamente`, 'Close', { duration: 2000 });
          
          // Cargar archivos de manera diferida para no bloquear la UI
          setTimeout(() => {
            this.loadAllPermitFiles();
          }, 100);
        },
        error: (err) => {
          console.error('❌ Error loading associated data:', err);
          // Continuar solo con permisos
          this.tableData = permits.map(permit => ({ ...permit, tickets: [] }));
          this.allData = [...this.tableData];
          this.filteredData = [...this.tableData];
          this.snackBar.open('Error cargando asociaciones, mostrando solo permisos', 'Close', { duration: 3000 });
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
                      this.snackBar.open(`${createdCount} asociaciones de prueba creadas exitosamente`, 'Close', { duration: 3000 });
                      this.loadPermits(); // Recargar datos para mostrar las asociaciones
                    }
                  },
                  error: (error) => {
                    console.error(`❌ Error creando asociación ${index + 1}:`, error);
                    this.snackBar.open(`Error creando asociación ${index + 1}`, 'Close', { duration: 3000 });
                  }
                });
              });
            } else {
              console.log('⚠️ No hay suficientes permisos o tickets para crear asociaciones');
              this.snackBar.open('No hay suficientes datos para crear asociaciones', 'Close', { duration: 3000 });
            }
          },
          error: (error) => {
            console.error('❌ Error cargando tickets:', error);
            this.snackBar.open('Error cargando tickets', 'Close', { duration: 3000 });
          }
        });
      },
      error: (error) => {
        console.error('❌ Error cargando permisos:', error);
        this.snackBar.open('Error cargando permisos', 'Close', { duration: 3000 });
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
      this.snackBar.open('Error: No se pudo identificar el permiso', 'Close', { duration: 3000 });
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
        this.pdfFileError = 'Solo se permiten archivos PDF';
        this.selectedPermitFile = null;
        return;
      }
      
      // Validar tamaño (máximo 10MB)
      if (file.size > 10 * 1024 * 1024) {
        this.pdfFileError = 'El archivo es demasiado grande. Máximo 10MB';
        this.selectedPermitFile = null;
        return;
      }
      
      this.selectedPermitFile = file;
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

    // Obtener el ticketId del primer ticket asociado al permiso
    let ticketId = null;
    if (permit.tickets && permit.tickets.length > 0) {
      ticketId = permit.tickets[0].ticketId || permit.tickets[0].ticketid;
    }

    // Crear FormData siguiendo el patrón de current.component
    const formData = new FormData();
    formData.append('file', this.selectedPermitFile);
    formData.append('ticketId', ticketId?.toString() || '');
    formData.append('name', this.selectedPermitFile.name);
    formData.append('comment', `Archivo subido para el permiso: ${permit.permitNumber}`);

    this.photoEvidenceService.uploadPhotoEvidence(formData).subscribe({
      next: (response) => {
        this.uploadingFile = false;
        this.selectedPermitFile = null;
        this.snackBar.open(`Archivo PDF subido exitosamente para ${permit.permitNumber}`, 'Close', { duration: 3000 });
        
        // Recargar archivos asociados al permiso
        this.loadPermitFiles(permit.PermitId);
      },
      error: (error) => {
        console.error('❌ Error subiendo archivo:', error);
        this.uploadingFile = false;
        this.pdfFileError = 'Error al subir el archivo. Inténtalo de nuevo.';
        this.snackBar.open('Error al subir el archivo', 'Close', { duration: 3000 });
      }
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
    // Buscar el permiso para obtener sus tickets asociados
    const permit = this.tableData.find(p => p.PermitId === permitId);
    if (!permit) {
      return;
    }

    // Obtener los ticketIds asociados al permiso
    const ticketIds = permit.tickets?.map((t: any) => t.ticketId || t.ticketid).filter((id: any) => id) || [];

    if (ticketIds.length === 0) {
      this.permitFiles[permitId] = [];
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
          
          return ticketIds.includes(file.ticketId) || 
                 file.comment?.includes(`permiso: ${permit.permitNumber}`);
        });
        
        this.permitFiles[permitId] = permitFiles;
      },
      error: (error) => {
        console.error('❌ Error cargando archivos del permiso:', error);
      }
    });
  }

  deletePermitFile(photoId: number, permitId: number): void {
    this.photoEvidenceService.deletePhotoEvidence(photoId).subscribe({
      next: () => {
        this.snackBar.open('Archivo eliminado exitosamente', 'Close', { duration: 3000 });
        
        // Limpiar inmediatamente el array de archivos del permiso
        this.permitFiles[permitId] = [];
        
        // Recargar archivos del permiso para asegurar sincronización
        setTimeout(() => {
          this.loadPermitFiles(permitId);
        }, 500);
      },
      error: (error) => {
        console.error('❌ Error eliminando archivo:', error);
        this.snackBar.open('Error eliminando archivo', 'Close', { duration: 3000 });
      }
    });
  }

  getPermitFilesCount(permitId: number): number {
    if (!permitId || !this.permitFiles[permitId]) {
      return 0;
    }
    return this.permitFiles[permitId].length;
  }

  hasPermitFiles = (permit: any): boolean => {
    const permitId = permit.PermitId;
    return this.getPermitFilesCount(permitId) > 0;
  }

  onDeletePermitFile(permit: any): void {
    console.log('🗑️ onDeletePermitFile llamado para permiso:', permit);
    
    const permitId = permit.PermitId;
    const files = this.permitFiles[permitId];
    
    if (!files || files.length === 0) {
      console.log('⚠️ No hay archivos para eliminar');
      this.snackBar.open('No hay archivos para eliminar', 'Close', { duration: 3000 });
      return;
    }

    // Mostrar información del archivo a eliminar
    const fileToDelete = files[0];
    const fileName = fileToDelete.name || 'Archivo sin nombre';
    const fileDate = fileToDelete.createdat ? new Date(fileToDelete.createdat).toLocaleDateString() : 'Fecha desconocida';

    // Mostrar diálogo de confirmación
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '500px',
      disableClose: true,
      panelClass: 'confirmation-dialog',
      data: {
        title: 'Eliminar Archivo PDF',
        message: `¿Estás seguro de que quieres eliminar el archivo PDF del permiso ${permit.permitNumber}?\n\nArchivo: ${fileName}\nFecha de subida: ${fileDate}\n\nEsta acción no se puede deshacer.`,
        confirmText: 'Eliminar Archivo',
        cancelText: 'Cancelar'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        console.log('🗑️ Confirmado eliminar archivo:', fileToDelete);
        this.deletePermitFile(fileToDelete.photoid || fileToDelete.id, permitId);
      }
    });
  }

  loadAllPermitFiles(): void {
    // Solo cargar archivos si hay permisos
    if (this.tableData.length === 0) {
      return;
    }
    
    this.photoEvidenceService.getAllPhotoEvidence().subscribe({
      next: (files) => {
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
        
        // Procesar permisos en lotes para no bloquear la UI
        const batchSize = 10;
        let currentIndex = 0;
        
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
              if (!file.deletedat && file.comment?.includes(`permiso: ${permit.permitNumber}`)) {
                permitFiles.push(file);
              }
            });
            
            this.permitFiles[permitId] = permitFiles;
          }
          
          currentIndex = endIndex;
          
          // Continuar con el siguiente lote si hay más permisos
          if (currentIndex < this.tableData.length) {
            setTimeout(processBatch, 10); // Pequeña pausa para no bloquear la UI
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
}
