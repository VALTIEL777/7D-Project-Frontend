import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardLayoutComponent } from "../../../../../shared/dashboard-layout/dashboard-layout.component";
import { CardWithButtonComponent } from '../../../../../shared/card-with-button/card-with-button.component';
import { MatDialog } from '@angular/material/dialog';
import { DataTableComponent } from '../../../../../shared/data-table/data-table.component';
import { ConfirmationDialogComponent } from '../../../../../shared/confirmation-dialog/confirmation-dialog.component';
import { SearchDialogComponent } from '../../../../../shared/search-dialog/search-dialog.component';
import { FilterService } from '../../../../../core/services/filter.service';
import { TicketService, Ticket } from '../../../../../core/services/ticket.service';
import { PermitedticketsService, PermitedTicket } from '../../../../../core/services/permissions/permitedtickets.service';
import { PermitService, Permit } from '../../../../../core/services/permissions/permit.service';
import { PhotoEvidenceService } from '../../../../../core/services/route/photoevidence.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FabButtonComponent } from '../../../../../shared/fab-button/fab-button.component';
import { environment } from '../../../../../../environments/environment';
import { MatIconModule } from '@angular/material/icon';

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
    MatIconModule
  ],
  templateUrl: './permits.component.html',
  styleUrl: './permits.component.scss'
})
export class PermitsComponent implements OnInit {
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
  filteredData: any[] = [];
  allData: any[] = [];

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
    private filterService: FilterService,
    private snackBar: MatSnackBar
  ) {
    console.log('🔧 PermitsComponent constructor llamado');
    console.log('🔧 permitService:', this.permitService);
    console.log('🔧 permitedTicketsService:', this.permitedTicketsService);
    console.log('🔧 ticketService:', this.ticketService);
    console.log('🔧 filterService:', this.filterService);
    console.log('🔧 snackBar:', this.snackBar);
    console.log('🔧 dialog:', this.dialog);
  }

  ngOnInit(): void {
    console.log('🚀 PermitsComponent.ngOnInit() iniciado');
    this.loadPermits();
    console.log('📞 loadPermits() llamado');
  }

  // Getter for filtered permit data
  get filteredPermitData() {
    console.log('📊 filteredPermitData getter llamado');
    console.log('📋 filteredData length:', this.filteredData.length);
    console.log('📋 tableData length:', this.tableData.length);
    console.log('📋 allData length:', this.allData.length);
    return this.filteredData;
  }

  loadPermits(): void {
    console.log('🚀 PermitsComponent.loadPermits() iniciado');
    console.log('📡 URL del servicio:', this.permitService.getApiInfo().baseUrl);
    
    // Limpiar datos existentes
    this.tableData = [];
    this.allData = [];
    this.filteredData = [];
    
    // Solo cargar datos reales de la API
    this.permitService.getAllPermits().subscribe({
      next: (permits) => {
        console.log('✅ Permits API response:', permits);
        console.log('📊 Número de permisos recibidos:', permits.length);
        console.log('📋 Tipo de respuesta:', typeof permits);
        console.log('📋 Es array?', Array.isArray(permits));
        
        if (!permits || permits.length === 0) {
          console.log('⚠️ No se encontraron permisos en la API');
          this.snackBar.open('No se encontraron permisos en la API', 'Close', { duration: 3000 });
        } else {
          console.log('🔄 Cargando datos reales con tickets asociados');
          console.log('📋 Primer permiso de la API:', permits[0]);
          this.loadAssociatedData(permits);
        }
      },
      error: (err) => {
        console.error('❌ Error loading permits:', err);
        console.log('🔧 Detalles del error:', {
          status: err.status,
          statusText: err.statusText,
          message: err.message,
          url: err.url
        });
        this.snackBar.open(`Error cargando permisos: ${err.status} - ${err.message}`, 'Close', { duration: 5000 });
      }
    });
  }

  private loadAssociatedData(permits: Permit[]): void {
    console.log('🔄 loadAssociatedData iniciado con', permits.length, 'permisos');
    console.log('📋 Permisos recibidos:', permits.map(p => ({ id: p.PermitId, number: p.permitNumber })));
    
    // Cargar permited tickets y tickets en paralelo
    this.permitedTicketsService.getAllPermitedTickets().subscribe({
      next: (permitedTickets) => {
        console.log('✅ Permited tickets cargados:', permitedTickets);
        console.log('📋 Número de asociaciones encontradas:', permitedTickets.length);
        if (permitedTickets.length > 0) {
          console.log('📋 Primera asociación:', permitedTickets[0]);
        }
        
        this.ticketService.getAllTickets().subscribe({
          next: (tickets) => {
            console.log('✅ Tickets cargados:', tickets);
            console.log('📋 Número de tickets encontrados:', tickets.length);
            if (tickets.length > 0) {
              console.log('📋 Primer ticket:', { id: tickets[0].ticketId, code: tickets[0].ticketCode });
            }
            
            // Asociar tickets con permisos
            this.tableData = permits.map(permit => {
              const permitId = permit.PermitId || permit.permitId;
              console.log(`🔍 Procesando permiso ${permit.permitNumber || permit.permitnumber} con ID:`, permitId);
              
              const associatedTicketIds = permitedTickets
                .filter(pt => {
                  console.log(`🔍 Comparando: permitId=${pt.permitId} vs permit.PermitId=${permitId}`);
                  return pt.permitId === permitId && permitId !== undefined;
                })
          .map(pt => pt.ticketId);
              
              console.log(`🔗 Permiso ${permit.permitNumber || permit.permitnumber}: ID=${permitId}, IDs de tickets asociados:`, associatedTicketIds);
              
              const associatedTickets = tickets.filter(t => {
                const ticketId = t.ticketId || t.ticketid;
                const isAssociated = associatedTicketIds.includes(ticketId || 0);
                if (isAssociated) {
                  console.log(`✅ Ticket ${t.ticketCode} (ID: ${ticketId}) asociado al permiso ${permit.permitNumber}`);
                }
                return isAssociated;
              });
              
              console.log(`🔗 Permiso ${permit.permitNumber || permit.permitnumber}: Tickets encontrados:`, associatedTickets.length);
              
        return { ...permit, tickets: associatedTickets };
            });
            
            this.allData = [...this.tableData];
            this.filteredData = [...this.tableData];
            
            console.log('✅ Datos finales con tickets asociados:', this.tableData);
            console.log('📊 Estado final - tableData:', this.tableData.length);
            console.log('📊 Estado final - filteredData:', this.filteredData.length);
            
            // Mostrar resumen de asociaciones
            this.tableData.forEach(permit => {
              console.log(`📋 Permiso ${permit.permitNumber}: ${permit.tickets.length} tickets asociados`);
            });

            // Cargar archivos asociados a todos los permisos
            this.loadAllPermitFiles();
          },
          error: (err) => {
            console.error('❌ Error loading tickets:', err);
            // Continuar solo con permisos
            this.tableData = permits.map(permit => ({ ...permit, tickets: [] }));
            this.allData = [...this.tableData];
            this.filteredData = [...this.tableData];
          }
        });
      },
      error: (err) => {
        console.error('❌ Error loading permited tickets:', err);
        // Continuar solo con permisos
        this.tableData = permits.map(permit => ({ ...permit, tickets: [] }));
        this.allData = [...this.tableData];
        this.filteredData = [...this.tableData];
      }
    });
  }



  public createTestAssociations(): void {
    console.log('🔗 Creando asociaciones de prueba...');
    
    // Obtener los primeros permisos y tickets disponibles
    this.permitService.getAllPermits().subscribe({
      next: (permits) => {
        console.log('📋 Permisos disponibles para asociar:', permits.map(p => ({ id: p.PermitId, number: p.permitNumber })));
        
        this.ticketService.getAllTickets().subscribe({
          next: (tickets) => {
            console.log('📋 Tickets disponibles para asociar:', tickets.map(t => ({ id: t.ticketId, code: t.ticketCode })));
            
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
              
              console.log('🔗 Asociaciones de prueba a crear:', testAssociations);
              
              // Crear las asociaciones
              let createdCount = 0;
              testAssociations.forEach((association, index) => {
                console.log(`🔗 Creando asociación ${index + 1}:`, association);
                
                this.permitedTicketsService.createPermitedTickets(association).subscribe({
                  next: (response) => {
                    createdCount++;
                    console.log(`✅ Asociación ${index + 1} creada:`, response);
                    
                    if (createdCount === testAssociations.length) {
                      this.snackBar.open(`${createdCount} asociaciones de prueba creadas exitosamente`, 'Close', { duration: 3000 });
                      console.log('🔄 Recargando datos para mostrar las asociaciones...');
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
    console.log('➕ onCreatePermit llamado con:', newPermit);
    const permitToCreate = {
      ...newPermit,
      createdBy: this.getCurrentUserId(),
      updatedBy: this.getCurrentUserId()
    };

    this.permitService.createPermit(permitToCreate).subscribe({
      next: (createdPermit) => {
        const permitWithTickets = { ...createdPermit, tickets: [] };
        this.tableData = [...this.tableData, permitWithTickets];
        this.allData = [...this.tableData];
        this.filteredData = [...this.tableData];
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
              this.allData = [...this.tableData];
              this.filteredData = [...this.tableData];
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
    console.log('🗑️ onDelete llamado con:', permit);
    
    // Obtener el ID correcto del permiso
    const permitId = permit.PermitId || permit.permitId || permit.permitid;
    
    if (!permitId) {
      console.error('❌ No se pudo obtener el ID del permiso:', permit);
      this.snackBar.open('Error: No se pudo identificar el permiso', 'Close', { duration: 3000 });
      return;
    }
    
    console.log('🎯 ID del permiso a eliminar:', permitId);
    
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
        console.log('🚀 Intentando eliminar permiso con ID:', permitId);
        
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
              console.log('🔄 Intentando soft delete con PUT...');
              
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
      console.log('📄 Archivo seleccionado:', file);
      
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
      
      console.log('✅ Archivo PDF válido seleccionado:', file.name);
      
      // Si se pasó un permiso específico, subir automáticamente
      if (permit) {
        this.uploadPermitFile(permit);
      }
    }
  }

  uploadPermitFile(permit: any): void {
    if (!this.selectedPermitFile) {
      console.log('⚠️ No hay archivo seleccionado');
      return;
    }

    console.log('🚀 Subiendo archivo PDF para permiso:', permit.permitNumber);
    this.uploadingFile = true;
    this.pdfFileError = null;

    // Obtener el ticketId del primer ticket asociado al permiso
    let ticketId = null;
    if (permit.tickets && permit.tickets.length > 0) {
      ticketId = permit.tickets[0].ticketId || permit.tickets[0].ticketid;
      console.log('🎫 Usando ticketId del primer ticket asociado:', ticketId);
    } else {
      console.log('⚠️ No hay tickets asociados al permiso, ticketId será null');
    }

    // Crear FormData siguiendo el patrón de current.component
    const formData = new FormData();
    formData.append('file', this.selectedPermitFile);
    formData.append('ticketId', ticketId?.toString() || '');
    formData.append('name', this.selectedPermitFile.name);
    formData.append('comment', `Archivo subido para el permiso: ${permit.permitNumber}`);

    console.log('📦 FormData preparado:', {
      file: this.selectedPermitFile.name,
      ticketId: ticketId,
      name: this.selectedPermitFile.name,
      comment: `Archivo subido para el permiso: ${permit.permitNumber}`
    });

    this.photoEvidenceService.uploadPhotoEvidence(formData).subscribe({
      next: (response) => {
        console.log('✅ Archivo subido exitosamente:', response);
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
    console.log('🔍 Verificando estado de la API...');
    console.log('📡 URL del servicio de permisos:', this.permitService.getApiInfo().baseUrl);
    
    // Hacer petición directa a la API de permisos
    fetch(this.permitService.getApiInfo().baseUrl)
      .then(response => {
        console.log('🔍 Respuesta directa de permisos:', response.status, response.statusText);
        console.log('📋 Headers de respuesta:', response.headers);
        return response.json();
      })
      .then(data => {
        console.log('📋 Datos crudos de permisos:', data);
        console.log('📊 Número de permisos:', data.permits?.length || 0);
        
        if (data.permits && data.permits.length > 0) {
          console.log('📋 Primer permiso crudo:', data.permits[0]);
          console.log('🎯 Campos disponibles:', Object.keys(data.permits[0]));
        }
        
        // Si hay datos, intentar cargarlos
        if (data.permits && data.permits.length > 0) {
          console.log('🔄 Intentando cargar datos reales...');
          this.loadAssociatedData(data.permits);
        } else {
          console.log('⚠️ No hay permisos en la respuesta de la API');
        }
      })
      .catch(error => {
        console.error('❌ Error en petición directa a permisos:', error);
      });
  }

  public forceLoadFromApi(): void {
    console.log('🔄 Forzando carga de datos desde la API...');
    console.log('📡 URL del servicio:', this.permitService.getApiInfo().baseUrl);
    
    // Limpiar datos existentes
    this.tableData = [];
    this.allData = [];
    this.filteredData = [];
    
    // Hacer una petición directa para diagnosticar
    fetch(this.permitService.getApiInfo().baseUrl)
      .then(response => {
        console.log('🔍 Respuesta directa de la API:', response.status, response.statusText);
        return response.json();
      })
      .then(data => {
        console.log('📋 Datos crudos de la API:', data);
        console.log('📊 Número de permisos en respuesta cruda:', data.permits?.length || 0);
      })
      .catch(error => {
        console.error('❌ Error en petición directa:', error);
      });
    
    // Cargar usando el servicio
    this.loadPermits();
  }

  public testDeleteEndpoint(): void {
    console.log('🧪 Probando endpoint de eliminación...');
    
    if (this.tableData.length === 0) {
      console.log('⚠️ No hay permisos para probar');
      this.snackBar.open('No hay permisos para probar eliminación', 'Close', { duration: 3000 });
      return;
    }
    
    const firstPermit = this.tableData[0];
    const permitId = firstPermit.PermitId || firstPermit.permitId || firstPermit.permitid;
    
    console.log('🎯 Probando endpoint DELETE para el permiso ID:', permitId);
    console.log('📋 Permiso a eliminar:', firstPermit);
    
    // Probar el endpoint DELETE estándar
    const deleteUrl = `${environment.permitServiceUrl}/${permitId}`;
    console.log('🔍 URL de eliminación:', deleteUrl);
    
    // Probar OPTIONS primero
    fetch(deleteUrl, { method: 'OPTIONS' })
      .then(response => {
        console.log('✅ OPTIONS response:', response.status, response.headers.get('allow'));
        console.log('📋 Headers completos:', response.headers);
      })
      .catch(error => {
        console.log('❌ OPTIONS error:', error);
      });
    
    // Probar DELETE
    fetch(deleteUrl, { method: 'DELETE' })
      .then(response => {
        console.log('✅ DELETE response:', response.status, response.statusText);
        if (response.ok) {
          console.log('🎉 ¡Endpoint DELETE funciona!');
          this.snackBar.open('¡Endpoint DELETE funciona!', 'Close', { duration: 3000 });
          return response.json();
        } else {
          console.log('❌ DELETE falló con status:', response.status);
          this.snackBar.open(`DELETE falló: ${response.status}`, 'Close', { duration: 3000 });
          return null;
        }
      })
      .then(data => {
        if (data) {
          console.log('📋 Respuesta del servidor:', data);
        }
      })
      .catch(error => {
        console.log('❌ DELETE error:', error);
        this.snackBar.open(`Error en DELETE: ${error.message}`, 'Close', { duration: 3000 });
      });
  }

  loadPermitFiles(permitId: number): void {
    console.log('📁 Cargando archivos para el permiso:', permitId);
    
    // Buscar el permiso para obtener sus tickets asociados
    const permit = this.tableData.find(p => p.PermitId === permitId);
    if (!permit) {
      console.log('❌ Permiso no encontrado:', permitId);
      return;
    }

    // Obtener los ticketIds asociados al permiso
    const ticketIds = permit.tickets?.map((t: any) => t.ticketId || t.ticketid).filter((id: any) => id) || [];
    console.log('🎫 TicketIds asociados al permiso:', ticketIds);

    if (ticketIds.length === 0) {
      console.log('⚠️ No hay tickets asociados al permiso, no se pueden cargar archivos');
      this.permitFiles[permitId] = [];
      return;
    }

    this.photoEvidenceService.getAllPhotoEvidence().subscribe({
      next: (files) => {
        console.log('✅ Archivos cargados:', files);
        
        // Filtrar archivos que pertenezcan a los tickets del permiso y NO estén eliminados
        const permitFiles = files.filter((file: any) => {
          // Excluir archivos eliminados
          if (file.deletedat) {
            console.log(`🗑️ Excluyendo archivo eliminado: ${file.name} (deletedat: ${file.deletedat})`);
            return false;
          }
          
          return ticketIds.includes(file.ticketId) || 
                 file.comment?.includes(`permiso: ${permit.permitNumber}`);
        });
        
        this.permitFiles[permitId] = permitFiles;
        console.log(`📁 Archivos activos asociados al permiso ${permitId}:`, permitFiles);
        console.log(`📊 Total de archivos encontrados: ${files.length}, Archivos activos: ${permitFiles.length}`);
      },
      error: (error) => {
        console.error('❌ Error cargando archivos del permiso:', error);
      }
    });
  }

  deletePermitFile(photoId: number, permitId: number): void {
    console.log('🗑️ Eliminando archivo:', photoId, 'del permiso:', permitId);
    
    this.photoEvidenceService.deletePhotoEvidence(photoId).subscribe({
      next: () => {
        console.log('✅ Archivo eliminado exitosamente');
        this.snackBar.open('Archivo eliminado exitosamente', 'Close', { duration: 3000 });
        
        // Limpiar inmediatamente el array de archivos del permiso
        this.permitFiles[permitId] = [];
        console.log('🔄 Archivos del permiso limpiados inmediatamente');
        
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
    console.log('📁 Cargando archivos para todos los permisos...');
    
    this.photoEvidenceService.getAllPhotoEvidence().subscribe({
      next: (files) => {
        console.log('✅ Todos los archivos cargados:', files);
        
        // Agrupar archivos por permitId usando ticketIds asociados
        this.tableData.forEach(permit => {
          const permitId = permit.PermitId;
          
          // Obtener los ticketIds asociados al permiso
          const ticketIds = permit.tickets?.map((t: any) => t.ticketId || t.ticketid).filter((id: any) => id) || [];
          
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
          console.log(`📁 Permiso ${permit.permitNumber}: ${permitFiles.length} archivos activos (tickets: ${ticketIds.join(', ')})`);
        });
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
