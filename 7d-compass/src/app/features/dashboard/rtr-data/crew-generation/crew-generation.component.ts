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
  'Crack Seal',
  'Asphalt',
  'Sawcut',
  'Framing',
  'Pour',
  'Clean',
  'Dirt',
  'Grind',
  'Stripping',
  'Spotting',
  'Install Signs',
  'Steel Plate Pick Up'
];
  skillList = ['Driver', 'Tool', 'Machine', 'Measure'];
  skillIcons: { [key: string]: string } = {
    Driver: 'directions_car',
    Tool: 'build',
    Machine: 'precision_manufacturing',
    Measure: 'square_foot'
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
      workedhours: [null, [ Validators.max(12)]],

      selectedEmployee: [null],
      selectedSkills: [[], ],
      isLeader: [false],
      employees: this.fb.array([]),

      newMaterialName: [null, ],
      newMaterialUnit: [null, ],
      newMaterialQuantity: [null, [ Validators.max(12)]],
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
  } else if (value < 1) {
    value = 1;
  }

  input.value = value.toString();
  this.form.get('newEquipmentQuantity')?.setValue(value);
}

limitMaterialQuantity(event: any) {
  const input = event.target as HTMLInputElement;
  let value = Number(input.value);

  if (value > 12) {
    value = 12;
  } else if (value < 1) {
    value = 1;
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
      startWith([]) // <-- Esto asegura que siempre se emite un array al principio
  );

   // 🔧 Manejo del estado del slide-toggle
  if (this.hasLeaderAlready) {
    this.form.get('isLeader')?.disable();
  } else {
    this.form.get('isLeader')?.enable();
  }
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
       this.employeeList = people.map((person: any) => {
  const assignment = crewEmployees.find((ce: any) => ce.employeeId === person.employeeId);
  const crew = assignment ? crews.find((c: any) => c.crewid === assignment.crewid) : null;
  const personSkills = skills
    .filter((s: any) => s.userId === person.userId)
    .map((s: any) => s.name);

  return {
    employeeid: person.employeeId, // ✅ Este es el que debe usarse para crear CrewEmployee
    userid: person.userId,         // ✅ Este es para identificar al usuario logueado
    name: `${person.firstname} ${person.lastname}`,
    crewid: assignment?.crewid || null,
    type: crew?.type || '',
    workedhours: crew?.workedhours || 0,
    skills: personSkills,
    crewLeader: assignment?.crewleader || false
  };
});

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

  return this.employeeList.filter(employee =>
    employee.name.toLowerCase().includes(filterValue)
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
      }
    }
  });
    this.updateEmployeeData();

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
      }
    }
  });
    this.updateEmployeeData();

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
}