import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MATERIAL_MODULES } from '../../../../material';
import { DashboardLayoutComponent } from "../../../../shared/dashboard-layout/dashboard-layout.component";
import { CardWithButtonComponent } from '../../../../shared/card-with-button/card-with-button.component';
import { DataTableComponent } from '../../../../shared/data-table/data-table.component';
import { MatDialog } from '@angular/material/dialog';
import { SearchDialogComponent } from '../../../../shared/search-dialog/search-dialog.component';
import { ConfirmationDialogComponent } from '../../../../shared/confirmation-dialog/confirmation-dialog.component';

import { CrewsService } from '../../../../core/services/human-resources/crew.service';
import { CrewEmployeesService } from '../../../../core/services/human-resources/crewemployees.service';
import { PeopleService } from '../../../../core/services/human-resources/users.service';
import { UsedInventoryService } from '../../../../core/services/material/used-inventory.service';
import { InventoryService } from '../../../../core/services/material/inventory.service';
import { EquipmentService } from '../../../../core/services/material/equipment.service';
import { UsedEquipmentService } from '../../../../core/services/material/used-equipment.service';
import { SupplierService } from '../../../../core/services/material/supplier.service';
import { forkJoin, map, Observable, startWith } from 'rxjs';
import { SkillsService } from '../../../../core/services/human-resources/skills.service';
import { RoutesService } from '../../../../core/services/route/route.service';
import { RouteStateService } from '../../../../core/services/shared/route-state.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { EmployeeSkillsService } from '../../../../core/services/human-resources/employeeskills.service';
import { MatDividerModule } from '@angular/material/divider';

interface ColumnDefinition {
  name: string;
  header: string;
  cell: (element: any) => string;
  isActionColumn?: boolean;
}

@Component({
  selector: 'app-crew-generation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatSnackBarModule,
    MATERIAL_MODULES,
    DashboardLayoutComponent,
    CardWithButtonComponent,
    DataTableComponent,
    MatDividerModule
  ],
  templateUrl: './crew-generation.component.html',
  styleUrls: ['./crew-generation.component.scss']
})
export class CrewGenerationComponent implements OnInit {
  form: FormGroup;

  // Listas cargadas desde backend
  employeeList: {
    employeeid: number;
    name: string;
    crewid: number;
    type: string;
    workedhours: number;
    skills?: string[];
    crewLeader: boolean;
  }[] = [];
  isLoading = false;

  typeList = [
    // Asphalt phases
    'Spotting',
    'Grind',
    'Asphalt',
    'Crack Seal',
    'Stripping',
    'No Parking Signs',
    'Install Signs',
    // Concrete phases
    'Sawcut',
    'Removal',
    'Framing',
    'Concrete',
    'Pour',
    'Clean',
    // Otros tipos adicionales
    'Dirt',
    'Steel Plate Pick Up'
  ];
  typeControl = new FormControl('');
  filteredTypes!: Observable<string[]>;
  materialControl = new FormControl('');
  filteredMaterials!: Observable<any[]>;
  equipmentControl = new FormControl('');
  filteredEquipments!: Observable<any[]>;
  skillList = ['Labor', 'Finisher', 'Driver', 'Machine', 'Measure', 'Spotter'];
  skillIcons: { [key: string]: string } = {
    Labor: 'engineering',
    Finisher: 'construction',
    Driver: 'directions_car',
    Machine: 'precision_manufacturing',
    Measure: 'square_foot',
    Spotter: 'visibility'
  };

materialOptions: {
  value: number;         // El `inventoryId` u otro identificador
  viewValue: string;     // El nombre del material
  unit: string;          // Unidad del material (e.g. 'Kg', 'Bags')
  quantity: number;
  costperunit : number;      // Cantidad usada si aplica, o 0 por defecto
}[] = [];
  unitOptions = ['Bolsa'];

equipmentOptions: {
  value: number;          // equipmentId
  viewValue: string;      // equipmentName
  supplier: string;       // supplierName
  quantity: number;       // from UsedEquipment
  hourlyrate: number;
}[] = [];

routes: any[] = [];


  constructor(
    private fb: FormBuilder,
    private dialog: MatDialog,
    private crewsService: CrewsService,
    private crewEmployeesService: CrewEmployeesService,
    private usedInventoryService: UsedInventoryService,
    private InventoryService: InventoryService,
    private usedEquipmentService: UsedEquipmentService,
    private EquipmentService: EquipmentService,
    private supplierService: SupplierService,
    private usersService: PeopleService,
    private skillsService: SkillsService,
    private routeService: RoutesService,
    private routeState: RouteStateService,
    private snackBar: MatSnackBar,
    private employeeSkillsService: EmployeeSkillsService
  ) {
    this.form = this.fb.group({
      type: [null, ],
      // workedhours: [null, [ Validators.max(12)]],

      selectedEmployee: [null],
      selectedSkills: [[], ],
      isLeader: [false],
      employees: this.fb.array([]),

      newMaterialName: [null, ],
      newMaterialUnit: [null, ],
      newMaterialQuantity: [null, [ Validators.max(100)]],
      materials: this.fb.array([]),

      newEquipmentName: [null],
      newEquipmentQuantity: [null, [ Validators.max(12)]],
      newEquipmentSupplier: [null],
      newEquipmentHoursLent: [null],
      equipment: this.fb.array([]),

      route: [null,]
    });
  }

  limitWorkedHours(event: any) {
  const input = event.target as HTMLInputElement;
  let value = parseFloat(input.value);

  if (isNaN(value) || value < 1) {
    value = 1;
  } else if (value > 12) {
    value = 12;
  }

  // Opcional: redondear a 1 decimal (por ejemplo)
  value = Math.round(value * 10) / 10;

  input.value = value.toString();
  this.form.get('workedhours')?.setValue(value);
}



limitEquipmentQuantity(event: any) {
  const input = event.target as HTMLInputElement;
  let value = Number(input.value);

  if (value > 12) {
    value = 12;
  } else if (value < 0) {
    value = 0;
  }

  input.value = value.toString();
  this.form.get('newEquipmentQuantity')?.setValue(value);
}

limitMaterialQuantity(event: any) {
  const input = event.target as HTMLInputElement;
  let value = Number(input.value);

  if (value > 100) {
    value = 100;
  } else if (value < 0) {
    value = 0;
  }

  input.value = value.toString();
  this.form.get('newMaterialQuantity')?.setValue(value);
}



  ngOnInit(): void {
    this.loadEmployees();
    this.loadMaterials();
    this.loadEquipment();
    this.updateEmployeeData();
    this.updateMaterialData();
    this.updateEquipmentData();
    this.loadRoutes();

    this.filteredEmployees = this.employeeControl.valueChanges.pipe(
      startWith(''),
      map(value => this._filterEmployees(value)),
      startWith([])
    );

    // Autocomplete para type
    this.filteredTypes = this.typeControl.valueChanges.pipe(
      startWith(''),
      map(value => this._filterTypes(typeof value === 'string' ? value : ''))
    );
    this.typeControl.valueChanges.subscribe((type: string | null) => {
      if (type && this.typeList.includes(type)) {
        this.form.get('type')?.setValue(type);
      }
    });

    // Autocomplete para material
    this.filteredMaterials = this.materialControl.valueChanges.pipe(
      startWith(''),
      map(value => this._filterMaterials(typeof value === 'string' ? value : ''))
    );

    // Autocomplete para equipment
    this.filteredEquipments = this.equipmentControl.valueChanges.pipe(
      startWith(''),
      map(value => this._filterEquipments(typeof value === 'string' ? value : ''))
    );
  }

  private _filterTypes(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.typeList.filter(type => type.toLowerCase().includes(filterValue));
  }

  private _filterMaterials(value: string): any[] {
    const filterValue = value.toLowerCase();
    return this.materialOptions.filter(option => option.viewValue.toLowerCase().includes(filterValue));
  }

  onTypeSelected(type: string) {
    this.form.get('type')?.setValue(type);
  }

  get employees(): FormArray {
    return this.form.get('employees') as FormArray;
  }
  get materials(): FormArray {
    return this.form.get('materials') as FormArray;
  }
  get equipment(): FormArray {
    return this.form.get('equipment') as FormArray;
  }

  // Carga empleados desde backend
  loadEmployees() {
  import('rxjs').then(({ forkJoin }) => {
    forkJoin({
      people: this.usersService.getAllPeople(),           // Trae todos los empleados
      crewEmployees: this.crewEmployeesService.getAllCrewEmployees(),
      crews: this.crewsService.getAllCrews(),
      skills: this.skillsService.getAllSkills()           // Si cada skill tiene userid
    }).subscribe({
      next: ({ people, crewEmployees, crews, skills }) => {
        // ✅ DEBUG: Log de datos cargados desde la base de datos
        console.log('📦 People loaded:', people.length);
        console.log('📦 CrewEmployees loaded:', crewEmployees.length);
        console.log('📦 Crews loaded:', crews.length);
        console.log('📦 Sample crewEmployee:', crewEmployees[0]);
        console.log('📦 Sample crew:', crews[0]);
        
        // ✅ DEBUG: Mostrar todos los crewIds en crewEmployees
        const crewIdsInCrewEmployees = [...new Set(crewEmployees.map(ce => ce.crewid || ce.crewId))];
        console.log('🔍 Crew IDs in crewEmployees:', crewIdsInCrewEmployees);
        console.log('🔍 Types of crew IDs in crewEmployees:', crewIdsInCrewEmployees.map(id => typeof id));
        
        // ✅ DEBUG: Mostrar todos los crewIds en crews
        const crewIdsInCrews = crews.map(c => c.crewid || c.crewId);
        console.log('🔍 Crew IDs in crews:', crewIdsInCrews);
        console.log('🔍 Types of crew IDs in crews:', crewIdsInCrews.map(id => typeof id));
        
        // ✅ DEBUG: Encontrar crews huérfanos
        const orphanedCrewIds = crewIdsInCrewEmployees.filter(id => 
          !crewIdsInCrews.some(crewId => crewId == id) // ✅ Usar == para comparar strings y numbers
        );
        console.log('⚠️ Orphaned crew IDs (deleted crews):', orphanedCrewIds);
        
       this.employeeList = people.map((person: any) => {
  // ✅ VERIFICAR EN LA BASE DE DATOS si el empleado está asignado a algún crew ACTIVO
  const crewAssignment = crewEmployees.find((ce: any) => 
    ce.employeeId === person.employeeId || 
    ce.peopleId === person.employeeId ||
    ce.employeeid === person.employeeId
  );
  
  // ✅ Buscar el crew y verificar si EXISTE en la tabla crews
  const crew = crewAssignment ? crews.find((c: any) => {
    const crewId = crewAssignment.crewid || crewAssignment.crewId;
    const cId = c.crewid || c.crewId || c.id;
    return crewId == cId; // ✅ Usar == para comparar strings y numbers
  }) : null;
  
  // ✅ Verificar si el crew existe (no fue eliminado)
  const isCrewExists = crew !== null && crew !== undefined;
  
  const personSkills = skills
    .filter((s: any) => s.userId === person.userId)
    .map((s: any) => s.name);

  const employeeData = {
    employeeid: person.employeeId, // ✅ Este es el que debe usarse para crear CrewEmployee
    userid: person.userId,         // ✅ Este es para identificar al usuario logueado
    name: `${person.firstname} ${person.lastname}`,
    crewid: isCrewExists ? (crewAssignment?.crewid || crewAssignment?.crewId) : null, // ✅ Solo si el crew existe
    type: isCrewExists ? (crew?.type || '') : '',
    workedhours: isCrewExists ? (crew?.workedhours || 0) : 0,
    skills: personSkills,
    crewLeader: isCrewExists ? (crewAssignment?.crewleader || crewAssignment?.crewLeader || false) : false
  };

  // ✅ DEBUG: Log para empleados asignados
  if (crewAssignment && isCrewExists) {
    console.log(`🔍 Employee ${employeeData.name} is assigned to EXISTING crew ${crewAssignment.crewid || crewAssignment.crewId}`);
  } else if (crewAssignment && !isCrewExists) {
    console.log(`⚠️ Employee ${employeeData.name} was assigned to DELETED crew ${crewAssignment.crewid || crewAssignment.crewId} - now available`);
    
    // ✅ DEBUG específico para crew 4
    if (crewAssignment.crewid === 4 || crewAssignment.crewId === 4) {
      console.log(`🔍 DEBUG Crew 4 - Employee: ${employeeData.name}, CrewAssignment:`, crewAssignment);
      console.log(`🔍 DEBUG Crew 4 - Found crew in crews table:`, crew);
      console.log(`🔍 DEBUG Crew 4 - isCrewExists:`, isCrewExists);
    }
  }

  return employeeData;
});

        // ✅ DEBUG: Log final de empleados
        console.log('📦 Final employeeList:', this.employeeList.length);
        console.log('📦 Assigned employees:', this.employeeList.filter(emp => emp.crewid).length);
        console.log('📦 Available employees:', this.employeeList.filter(emp => !emp.crewid).length);
        
        // ✅ DEBUG: Mostrar detalles de crews eliminados
        const deletedCrews = crews.filter(c => c.deletedAt || c.deletedat);
        if (deletedCrews.length > 0) {
          console.log('🗑️ Deleted crews found:', deletedCrews.length);
          deletedCrews.forEach(crew => {
            console.log(`  - Crew ID: ${crew.crewid || crew.crewId}, Type: ${crew.type}, DeletedAt: ${crew.deletedAt || crew.deletedat}`);
          });
        }
        
        // ✅ DEBUG: Mostrar crews que no existen en la tabla crews pero sí en crewEmployees
        if (orphanedCrewIds.length > 0) {
          console.log('⚠️ Orphaned crew assignments found (crew deleted but employees still assigned):', orphanedCrewIds);
          orphanedCrewIds.forEach(crewId => {
            const orphanedEmployees = crewEmployees.filter(ce => (ce.crewid || ce.crewId) === crewId);
            console.log(`  - Crew ID ${crewId}: ${orphanedEmployees.length} employees will be marked as available`);
          });
        }
      },
      error: (err) => console.error('Error loading employee data:', err)
    });
  });
}




  // Carga materiales (inventario) desde backend
loadMaterials() {
  forkJoin({
    inventory: this.InventoryService.getAllInventory(),
    usedInventory: this.usedInventoryService.getAllUsedInventory()
  }).subscribe({
    next: ({ inventory, usedInventory }) => {
      // Asociamos los materiales usados por su inventoryId
      const usedInventoryMap = new Map<number, any>();
      usedInventory.forEach((used: any) => {
        usedInventoryMap.set(used.inventoryid, used);
      });

      // Unimos los datos para la lista
      this.materialOptions = inventory.map((inv: any) => {
        const used = usedInventoryMap.get(inv.inventoryid);
        return {
          value: inv.inventoryid,
          viewValue: inv.name,
          unit: inv.unit,
          quantity: used?.quantity || 0,  // si no hay usado, pone 0
          costperunit: Number(inv.costperunit)
        };
      });
    },
    error: (err) => console.error('Error loading materials or used materials:', err)
  });
}

  // Carga equipos desde backend
 loadEquipment() {
  // Cargamos en paralelo: equipos, usados y proveedores
  import('rxjs').then(({ forkJoin }) => {
    forkJoin({
      equipment: this.EquipmentService.getAllEquipment(),
      used: this.usedEquipmentService.getAllUsedEquipment(),
      suppliers: this.supplierService.getAllSuppliers()
    }).subscribe({
      next: ({ equipment, used, suppliers }) => {
        this.equipmentOptions = equipment.map((eq: any) => {
          const usedEq = used.find((u: any) => u.equipmentid === eq.equipmentid);
          const supplier = suppliers.find((s: any) => s.supplierid === eq.supplierid);

          return {
            value: eq.equipmentid,
            viewValue: eq.equipmentname,
            quantity: usedEq?.quantity || 0,
            supplier: supplier?.name || 'Unknown',
            hourlyrate: Number(eq.hourlyrate) || 0
          };
        });
      },
      error: (err) => console.error('Error loading equipment data:', err)
    });
  });
}

loadRoutes() {
  this.routeService.getAllRoutes().subscribe({
    next: (res) => {
      console.log('📦 Resultado crudo de getAllRoutes():', res);
      // Verifica si necesitas res.data o algo similar
this.routes = Array.isArray(res.routes) ? res.routes : [];
    },
    error: (err) => {
      console.error('❌ Error al cargar rutas:', err);
    }
  });
}





  // Aquí irían todos tus métodos para agregar/editar/borrar empleados, materiales, equipos
  // (Los que ya tienes, no los repito para no extender mucho la respuesta)
  employeecolumns: ColumnDefinition[] = [
  { name: 'num', header: 'No.', cell: e => e.num?.toString() ?? '' },
      { name: 'fullName', header: 'Full Name', cell: e => `${e.firstname} ${e.lastname}` },

  {
    name: 'skills',
    header: 'Skills',
    cell: (e: any) => Array.isArray(e.skills) ? e.skills.join(', ') : ''
  },
  {
    name: 'leader',
    header: 'Leader',
    cell: e => e.leader ? 'Yes' : 'No'
  },
  { name: 'actions', header: 'Actions', cell: () => '', isActionColumn: true }
];

private _employeeDataa: any[] = [];

updateEmployeeData() {
  this._employeeDataa = this.employees.controls.map(ctrl => ctrl.value);
}


get employeeDataa(): any[] {
  return Array.isArray(this._employeeDataa) ? this._employeeDataa : [];
}


employeeControl = new FormControl('');
filteredEmployees!: Observable<any[]>;
displayEmployee(employee: any): string {
  return employee && employee.name ? employee.name : '';
}


private _filterEmployees(value: string | any): any[] {
  if (!this.employeeList || this.employeeList.length === 0) return [];

  const filterValue = typeof value === 'string'
    ? value.toLowerCase()
    : value?.name?.toLowerCase() || '';

  // ✅ Filtrar solo empleados disponibles (sin equipo asignado) y que no estén ya en la lista
  const currentEmployeeIds = this.employees.controls.map(emp => emp.get('employeeid')?.value);
  
  return this.employeeList.filter(employee => 
    employee.name.toLowerCase().includes(filterValue) &&
    !employee.crewid && // Solo empleados sin equipo asignado
    !currentEmployeeIds.includes(employee.employeeid) // No incluir empleados ya en la lista
  );
}

// ✅ NUEVO MÉTODO: Obtener empleados disponibles (sin equipo asignado)
getAvailableEmployees(): any[] {
  // ✅ Empleados sin crew asignado Y que no estén en la lista actual
  const currentEmployeeIds = this.employees.controls.map(emp => emp.get('employeeid')?.value);
  return this.employeeList.filter(employee => 
    !employee.crewid && 
    !currentEmployeeIds.includes(employee.employeeid)
  );
}

// ✅ NUEVO MÉTODO: Obtener empleados asignados
getAssignedEmployees(): any[] {
  // ✅ Empleados con crew asignado O que estén en la lista actual
  const currentEmployeeIds = this.employees.controls.map(emp => emp.get('employeeid')?.value);
  return this.employeeList.filter(employee => 
    employee.crewid || 
    currentEmployeeIds.includes(employee.employeeid)
  );
}


onEmployeeSelected(employee: any) {
  if (!employee) {
    this.form.get('selectedEmployee')!.setValue(null);
    this.form.get('selectedSkills')!.setValue([]);
    return;
  }

  this.form.get('selectedEmployee')!.setValue(employee);

  this.employeeSkillsService.getEmployeeSkillsByEmployee(employee.employeeid).subscribe({
    next: (employeeSkills: any[]) => {
      const skillNames = employeeSkills.map(es => es.skillname);
      const filteredSkillNames = skillNames.filter(name =>
        this.skillList.includes(name)
      );
      console.log('✅ Skills cargadas:', filteredSkillNames);

      // ✅ Rellena el <mat-select>
      this.form.get('selectedSkills')!.setValue(filteredSkillNames);
    },
    error: (err) => {
      console.error('❌ Error loading employee skills', err);
      this.form.get('selectedSkills')!.setValue([]);
    }
  });
}




addEmployee() {
  const selected = this.form.get('selectedEmployee')?.value;
  const selectedSkills = this.form.get('selectedSkills')?.value;
  const isLeader = this.form.get('isLeader')?.value;
  const workedhours = parseFloat(this.form.get('workedhours')?.value);
  const type = this.form.get('type')?.value;

  if (!selected || !selected.employeeid) {
    console.warn('⚠️ No se puede agregar el empleado. Falta información.');
    return;
  }

  // ✅ VALIDACIÓN: Verificar si el empleado ya tiene un equipo asignado
  if (selected.crewid) {
    this.snackBar.open(
      `⚠️ ${selected.name} ya tiene un equipo asignado (${selected.type || 'Sin tipo'}). No se puede agregar nuevamente.`, 
      'Cerrar', 
      {
        duration: 5000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['warning-snackbar']
      }
    );
    
    // Limpiar el formulario
    this.form.patchValue({
      selectedEmployee: null,
      selectedSkills: [],
      isLeader: false
    });
    this.employeeControl.setValue('');
    this.employeeControl.markAsPristine();
    this.employeeControl.markAsUntouched();
    return;
  }

  // ✅ VALIDACIÓN: Verificar si el empleado ya está en la lista actual
  const isAlreadyInList = this.employees.controls.some(emp => emp.get('employeeid')?.value === selected.employeeid);
  if (isAlreadyInList) {
    this.snackBar.open(
      `⚠️ ${selected.name} ya está en la lista actual. No se puede agregar duplicados.`, 
      'Cerrar', 
      {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['warning-snackbar']
      }
    );
    
    // Limpiar el formulario
    this.form.patchValue({
      selectedEmployee: null,
      selectedSkills: [],
      isLeader: false
    });
    this.employeeControl.setValue('');
    this.employeeControl.markAsPristine();
    this.employeeControl.markAsUntouched();
    return;
  }

  const [firstname, ...lastnameParts] = selected.name.trim().split(' ');
  const lastname = lastnameParts.join(' ');

  const employeeGroup = this.fb.group({
    num: this.employees.length + 1,
    employeeid: selected.employeeid,
    userid: selected.userid ?? null,
    firstname,
    lastname,
    skills: [Array.isArray(selectedSkills) ? [...selectedSkills] : [selectedSkills]],
    leader: isLeader,
    type,
    workedhours
  });

  this.employees.push(employeeGroup);

  this.form.patchValue({
    selectedEmployee: null,
    selectedSkills: [],
    isLeader: false
  });

 // ✅ Limpia el input del autocompletado
  this.employeeControl.setValue('');
  this.employeeControl.markAsPristine();
  this.employeeControl.markAsUntouched();

  this.updateEmployeeData();

  if (this.hasLeaderAlready) {
    this.form.get('isLeader')?.disable();
  } else {
    this.form.get('isLeader')?.enable();
  }
  
  // ✅ Forzar actualización de estadísticas
  this.forceStatsUpdate();
}



// ✅ MÉTODO PARA VERIFICAR SI UN CREW EXISTE
private isCrewExists(crew: any): boolean {
  return crew !== null && crew !== undefined;
}

// ✅ MÉTODO PARA VERIFICAR SI UN EMPLEADO ESTÁ ASIGNADO EN LA BASE DE DATOS
private isEmployeeAssignedInDatabase(employeeId: number): Observable<boolean> {
  return new Observable(observer => {
    // ✅ Cargar crews y crewEmployees para verificar asignaciones activas
    import('rxjs').then(({ forkJoin }) => {
      forkJoin({
        crewEmployees: this.crewEmployeesService.getAllCrewEmployees(),
        crews: this.crewsService.getAllCrews()
      }).subscribe({
        next: ({ crewEmployees, crews }) => {
          const crewAssignment = crewEmployees.find((ce: any) => 
            ce.employeeId === employeeId || 
            ce.peopleId === employeeId ||
            ce.employeeid === employeeId
          );
          
          if (crewAssignment) {
            // ✅ Verificar si el crew existe
            const crew = crews.find((c: any) => 
              c.crewid === crewAssignment.crewid || 
              c.crewId === crewAssignment.crewId ||
              c.id === crewAssignment.crewId
            );
            
            const isActive = this.isCrewExists(crew);
            observer.next(isActive);
          } else {
            observer.next(false);
          }
          observer.complete();
        },
        error: (err) => {
          console.error('❌ Error checking employee assignment:', err);
          observer.next(false);
          observer.complete();
        }
      });
    });
  });
}

// ✅ MÉTODO PARA FORZAR ACTUALIZACIÓN DE ESTADÍSTICAS
private forceStatsUpdate(): void {
  // ✅ Forzar detección de cambios en las estadísticas
  setTimeout(() => {
    console.log('📊 Stats updated - Available:', this.getAvailableEmployees().length, 'Assigned:', this.getAssignedEmployees().length);
  }, 0);
}

get hasLeaderAlready(): boolean {
  return this.employees.controls.some(emp => emp.get('leader')?.value === true);
}


onEditEmployee(employee: any) {
  const dialogRef = this.dialog.open(SearchDialogComponent, {
    width: '500px',
    data: {
      title: `Employee: ${employee.firstname}`,
      data: {
        ...employee,
        name: `${employee.firstname} ${employee.lastname}`
      },
      excludedFields: []
    }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      const [firstname, ...lastnameParts] = result.name.split(' ');
      const lastname = lastnameParts.join(' ');

      const index = this.employees.controls.findIndex(ctrl => ctrl.value.num === employee.num);
      if (index !== -1) {
        this.employees.at(index).patchValue({
          firstname,
          lastname,
          ...result
        });
        this.updateEmployeeData();
        this.forceStatsUpdate(); // ✅ Actualizar estadísticas después de editar
      }
    }
  });
    this.updateEmployeeData();
    this.forceStatsUpdate(); // ✅ Actualizar estadísticas después de editar

}

onDeleteEmployee(employee: any) {
  const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
    width: '450px',
    disableClose: true,
    panelClass: 'confirmation-dialog',
    data: {
      title: 'Delete Employee',
      message: `Are you sure you want to delete ${employee.firstname} ${employee.lastname}?`,
      confirmText: 'Delete',
      cancelText: 'Cancel'
    }
  });

  dialogRef.afterClosed().subscribe(confirmed => {
    if (confirmed) {
      const index = this.employees.controls.findIndex(ctrl => ctrl.value.num === employee.num);
      if (index !== -1) {
        this.employees.removeAt(index);
        this.updateEmployeeData();
        this.forceStatsUpdate(); // ✅ Llamar a forceStatsUpdate después de eliminar un empleado
      }
    }
  });
    this.updateEmployeeData();
    // this.forceStatsUpdate(); // ✅ Llamar a forceStatsUpdate después de eliminar un empleado
}

// MATERIALES
materialColumns: ColumnDefinition[] = [
  { name: 'num', header: 'No.', cell: m => m.num?.toString() ?? '' },
  { name: 'name', header: 'Material', cell: m => m.name ?? '' },
  { name: 'quantity', header: 'Quantity', cell: m => m.quantity?.toString() ?? '' },
  { name: 'unit', header: 'Unit', cell: m => m.unit ?? '' },
  { name: 'actions', header: 'Actions', cell: () => '', isActionColumn: true }
];

selectedMaterialUnit: string = '';


onMaterialSelected(inventoryid: number) {
  const selected = this.materialOptions.find(m => m.value === inventoryid);
  this.selectedMaterialUnit = selected?.unit || '';
}

onMaterialAutoSelected(option: any) {
  this.form.get('newMaterialName')?.setValue(option.value);
  this.onMaterialSelected(option.value);
}
private _materialDataa: any[] = [];

private updateMaterialData(): void {
  this._materialDataa = this.materials.controls.map(ctrl => {
    const quantity = Number(ctrl.value.quantity) || 0;
    const costPerUnit = Number(ctrl.value.costperunit) || 0;
    return {
      ...ctrl.value,
      materialcost: quantity * costPerUnit
    };
  });
}

get materialDataa() {
  return this._materialDataa;
}

addMaterial() {
  const selectedMaterialId = this.form.get('newMaterialName')?.value;
  const quantity = Number(this.form.get('newMaterialQuantity')?.value) || 0;

  const selected = this.materialOptions.find(m => m.value === selectedMaterialId);

  if (selected && quantity > 0) {
    const costPerUnit = Number(selected.costperunit) || 0;
    const materialCost = quantity * costPerUnit;

    this.materials.push(this.fb.group({
      num: this.materials.length + 1,
      inventoryid: selected.value,
      name: selected.viewValue,
      quantity,
      unit: selected.unit,
      costperunit: costPerUnit,
      materialcost: materialCost // ✅ Se guarda el costo total aquí
    }));

    // Limpiar campos del formulario
    this.form.patchValue({
      newMaterialName: '',
      newMaterialQuantity: ''
    });
    this.selectedMaterialUnit = '';

    this.updateMaterialData(); // ✅ Refuerza los datos para el save()
  }
}


onEditMaterial(material: any) {
  const dialogRef = this.dialog.open(SearchDialogComponent, {
    width: '500px',
    data: {
      title: `Material: ${material.name}`,
      data: { ...material },
      excludedFields: []
    }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      const index = this.materials.controls.findIndex(ctrl => ctrl.value.num === material.num);
      if (index !== -1) {
        this.materials.at(index).patchValue(result);
        this.updateMaterialData();
      }
    }
  });
    this.updateMaterialData();
}

onDeleteMaterial(material: any) {
  const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
    width: '450px',
    disableClose: true,
    panelClass: 'confirmation-dialog',
    data: {
      title: 'Delete Material',
      message: `Are you sure you want to delete ${material.name}?`,
      confirmText: 'Delete',
      cancelText: 'Cancel'
    }
  });

  dialogRef.afterClosed().subscribe(confirmed => {
    if (confirmed) {
      const index = this.materials.controls.findIndex(ctrl => ctrl.value.num === material.num);
      if (index !== -1) {
        this.materials.removeAt(index);
        this.updateMaterialData();
      }
    }
  });
  this.updateMaterialData();

}

// EQUIPOS
equipmentColumns: ColumnDefinition[] = [
  { name: 'num', header: 'No.', cell: e => e.num?.toString() ?? '' },
  { name: 'name', header: 'Equipment', cell: e => e.name ?? '' },
  { name: 'supplier', header: 'Supplier', cell: e => e.supplier ?? '' },
  { name: 'quantity', header: 'Quantity', cell: e => e.quantity?.toString() ?? '' },
  { name: 'hourslent', header: 'Hours Lent', cell: e => e.hourslent?.toString() ?? '0' },
  { name: 'actions', header: 'Actions', cell: () => '', isActionColumn: true }
];

private _equipmentDataa: any[] = [];

selectedEquipmentSupplier: string = '';

onEquipmentSelected(equipmentid: number) {
  const selected = this.equipmentOptions.find(e => e.value === equipmentid);
  this.selectedEquipmentSupplier = selected?.supplier || '';
}

private updateEquipmentData(): void {
  this._equipmentDataa = this.equipment.controls.map(ctrl => {
    const quantity = Number(ctrl.value.quantity) || 0;
    const hoursLent = Number(ctrl.value.hourslent) || 0;
    const hourlyRate = Number(ctrl.value.hourlyrate) || 0;

    return {
      ...ctrl.value,
      equipmentcost: quantity * hoursLent * hourlyRate
    };
  });
}


get equipmentDataa() {
  return this._equipmentDataa;
}

addEquipment() {
  const equipmentid = this.form.get('newEquipmentName')?.value;
  const quantity = Number(this.form.get('newEquipmentQuantity')?.value) || 0;
  const hourslent = Number(this.form.get('newEquipmentHoursLent')?.value) || 0;

  const selected = this.equipmentOptions.find(e => e.value === equipmentid);

  if (selected && quantity > 0) {
    const hourlyRate = Number(selected.hourlyrate) || 0;
    const equipmentCost = quantity * hourslent * hourlyRate;

    this.equipment.push(this.fb.group({
      num: this.equipment.length + 1,
      equipmentid: selected.value,
      name: selected.viewValue,
      quantity,
      supplier: selected.supplier,
      hourlyrate: hourlyRate,
      hourslent,
      equipmentcost: equipmentCost // ✅ Se calcula aquí
    }));

    // Limpiar los campos del formulario
    this.form.patchValue({
      newEquipmentName: '',
      newEquipmentQuantity: '',
      newEquipmentHoursLent: ''
    });
    this.selectedEquipmentSupplier = '';

    this.updateEquipmentData();
  }
}


onEditEquipment(equipment: any) {
  const dialogRef = this.dialog.open(SearchDialogComponent, {
    width: '500px',
    data: {
      title: `Equipment: ${equipment.name}`,
      data: { ...equipment },
      excludedFields: []
    }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      const index = this.equipment.controls.findIndex(ctrl => ctrl.value.num === equipment.num);
      if (index !== -1) {
        this.equipment.at(index).patchValue(result);
        this.updateEquipmentData();
      }
    }
  });
    this.updateEquipmentData();
}

onDeleteEquipment(equipment: any) {
  const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
    width: '450px',
    disableClose: true,
    panelClass: 'confirmation-dialog',
    data: {
      title: 'Delete Equipment',
      message: `Are you sure you want to delete ${equipment.name}?`,
      confirmText: 'Delete',
      cancelText: 'Cancel'
    }
  });

  dialogRef.afterClosed().subscribe(confirmed => {
    if (confirmed) {
      const index = this.equipment.controls.findIndex(ctrl => ctrl.value.num === equipment.num);
      if (index !== -1) {
        this.equipment.removeAt(index);
        this.updateEquipmentData();
      }
    }
  });
    this.updateEquipmentData();
}

save() {
  if (this.form.invalid) {
    this.form.markAllAsTouched();
    console.warn('Formulario inválido');
    return;
  }


  this.isLoading = true; // <-- iniciar loader

  const selectedRouteId = this.form.get('route')?.value;
  const selectedRoute = this.routes.find(r => r.routeid === selectedRouteId);
  const selectedRouteCode = selectedRoute?.routecode;
  localStorage.setItem('selectedRouteCode', selectedRouteCode || '');

  this.routeState.setRouteCode(selectedRouteCode || '');
  if (!selectedRouteId) {
    console.warn('⚠️ No hay ruta seleccionada');
    this.isLoading = false; // detener loader
    return;
  }

  const crewsPorTipo = new Map<string, typeof this._employeeDataa>();
  for (const emp of this._employeeDataa) {
    if (!crewsPorTipo.has(emp.type)) {
      crewsPorTipo.set(emp.type, []);
    }
    crewsPorTipo.get(emp.type)?.push(emp);
  }

    // ✅ FORZAR ACTUALIZACIÓN DE LOS DATOS
  this.updateEmployeeData();
  this.updateMaterialData();
  this.updateEquipmentData();

  // ✅ LOG ANTES DE ENVIAR
  console.log('📦 Material data to send:', this._materialDataa);
  console.log('📦 Equipment data to send:', this._equipmentDataa);


  crewsPorTipo.forEach((empleados, tipo) => {
    const rawHoras = empleados[0]?.workedhours;
    const horas = typeof rawHoras === 'number' && !isNaN(rawHoras) ? Number(rawHoras.toFixed(2)) : 0;

    const crewData = {
      type: tipo,
      photo: 'eqA.jpg',
      workedHours: horas,
      routeId: selectedRouteId,
      createdBy: 1,
      updatedBy: 1
    };

    this.crewsService.createCrew(crewData).subscribe({
      next: (createdCrew) => {
        const crewid = createdCrew?.crewid ?? createdCrew?.crewId ?? createdCrew?.id;

        if (!crewid) {
          console.error('❌ crewId no recibido.');
          this.isLoading = false;
          return;
        }

        const employees$ = empleados
          .filter(emp => !!emp.employeeid)
          .map(emp => this.crewEmployeesService.createCrewEmployee({
            crewId: crewid,
            peopleId: emp.employeeid,
            crewLeader: emp.leader ?? false,
            createdBy: 1,
            updatedBy: 1
          }));

        const materials$ = this._materialDataa
  .filter(mat => !!mat.inventoryid)
  .map(mat => {
    const quantity = Number(mat.quantity) || 0;
    const costPerUnit = Number(mat.costperunit) || 0;
    const materialCost = quantity * costPerUnit;

    return this.usedInventoryService.createUsedInventory({
      CrewId: crewid,
      inventoryId: mat.inventoryid,
      quantity,
      MaterialCost: materialCost,
      createdBy: 1,
      updatedBy: 1
    });
  });



        const equipment$ = this._equipmentDataa
  .filter(eq => !!eq.equipmentid)
  .map(eq => this.usedEquipmentService.createUsedEquipment({
    CrewId: crewid,
    equipmentId: eq.equipmentid,
    startdate: new Date(),
    enddate: new Date(),
    hoursLent: eq.hourslent,
    quantity: eq.quantity,
    equipmentCost: eq.equipmentcost, // ✅ ya viene calculado correctamente
    observation: '',
    createdBy: 1,
    updatedBy: 1
  }));


        import('rxjs').then(({ forkJoin }) => {
          forkJoin([...employees$, ...materials$, ...equipment$]).subscribe({
            next: () => {
              console.log(`✅ Crew creado correctamente`);
              this.form.reset();
              this.employees.clear();
              this.materials.clear();
              this.equipment.clear();
              this.isLoading = false; // detener loader

              // ✅ RECARGAR EMPLEADOS DESPUÉS DE GUARDAR
              this.loadEmployees();

              this.snackBar.open('Crew saved successfully!', 'Close', {
  duration: 3000, // milisegundos
  horizontalPosition: 'center',
  verticalPosition: 'top',
  panelClass: ['success-snackbar'] // opcional para estilo
});

            },
            error: (err) => {
              console.error('❌ Error al crear entidades relacionadas', err);
              this.isLoading = false; // detener loader
            }
          });
        });
      },
      error: (err) => {
        console.error('❌ Error al crear crew', err);
        this.isLoading = false; // detener loader
      }
    });
  });
}
displayMaterial(material: any): string {
  return material && material.viewValue ? material.viewValue : '';
}

private _filterEquipments(value: string): any[] {
  const filterValue = value.toLowerCase();
  return this.equipmentOptions.filter(option => option.viewValue.toLowerCase().includes(filterValue));
}

onEquipmentAutoSelected(option: any) {
  this.form.get('newEquipmentName')?.setValue(option.value);
  this.onEquipmentSelected(option.value);
}

displayEquipment(equipment: any): string {
  return equipment && equipment.viewValue ? equipment.viewValue : '';
}
}

