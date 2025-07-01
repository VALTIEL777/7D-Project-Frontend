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

interface ColumnDefinition {
  name: string;
  header: string;
  cell: (element: any) => string;
  isActionColumn?: boolean;
}

@Component({
  selector: 'app-misc-generation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MATERIAL_MODULES,
    DashboardLayoutComponent,
    CardWithButtonComponent,
    DataTableComponent,
  ],
  templateUrl: './misc-generation.component.html',
  styleUrls: ['./misc-generation.component.scss']
})
export class MiscGenerationComponent implements OnInit {
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

  typeList = ['Crack Seal', 'Clean Up', 'Asphalt'];
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
  quantity: number;      // Cantidad usada si aplica, o 0 por defecto
}[] = [];
  unitOptions = ['Bolsa'];

equipmentOptions: {
  value: number;          // equipmentId
  viewValue: string;      // equipmentName
  supplier: string;       // supplierName
  quantity: number;       // from UsedEquipment
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
    private routeService: RoutesService
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
    map(value => this._filterEmployees(value))
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
          const assignment = crewEmployees.find((ce: any) => ce.employeeid === person.userid);
          const crew = assignment ? crews.find((c: any) => c.crewid === assignment.crewid) : null;
          const personSkills = skills
            .filter((s: any) => s.userid === person.userid)
            .map((s: any) => s.name);

          return {
            employeeid: person.userid,
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
          quantity: used?.quantity || 0  // si no hay usado, pone 0
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
            supplier: supplier?.name || 'Unknown'
          };
        });
      },
      error: (err) => console.error('Error loading equipment data:', err)
    });
  });
}

loadRoutes() {
  this.routeService.getAllRoutes().subscribe({
    next: (routes: any[]) => {
      this.routes = routes;
      console.log('📦 Rutas cargadas:', this.routes);
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


get employeeDataa() {
  return this._employeeDataa;
}

employeeControl = new FormControl('');
filteredEmployees!: Observable<any[]>;
displayEmployee(employee: any): string {
  return employee && employee.name ? employee.name : '';
}


private _filterEmployees(value: string | any): any[] {
  const filterValue = typeof value === 'string' ? value.toLowerCase() : value?.name.toLowerCase();

  return this.employeeList.filter(employee => employee.name.toLowerCase().includes(filterValue));
}

onEmployeeSelected(selectedEmployee: any) {
  this.form.patchValue({ selectedEmployee: selectedEmployee });
}


  // EMPLEADOS
addEmployee() {
  const selected = this.form.get('selectedEmployee')?.value;
  const selectedSkills = this.form.get('selectedSkills')?.value;
  let isLeader = this.form.get('isLeader')?.value;
const workedhours = parseFloat(this.form.get('workedhours')?.value);
  const type = this.form.get('type')?.value;

  if (selected && selectedSkills?.length) {
    let fullName = '';
    let employeeid: number | null = null;

    if (typeof selected === 'string') {
      fullName = selected.trim();
      const found = this.employeeList.find(e => e.name === fullName);
      if (found) {
        employeeid = found.employeeid;
      } else {
        console.warn('⚠️ Empleado no encontrado:', fullName);
        return;
      }
    } else if (typeof selected === 'object' && selected.name && selected.employeeid) {
      fullName = selected.name;
      employeeid = selected.employeeid;
    }

    if (!employeeid) {
      console.warn('⚠️ employeeid es null. No se puede agregar el empleado.');
      return;
    }

    const [firstname, ...lastnameParts] = fullName.trim().split(' ');
    const lastname = lastnameParts.join(' ');

    const employeeGroup = this.fb.group({
      num: this.employees.length + 1,
      employeeid,
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

    this.updateEmployeeData();

// 🔧 Deshabilita el toggle si ya hay líder
if (this.hasLeaderAlready) {
  this.form.get('isLeader')?.disable();
} else {
  this.form.get('isLeader')?.enable();
}

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

updateMaterialData() {
  this._materialDataa = this.materials.controls.map(ctrl => ctrl.value);
}
get materialDataa() {
  return this._materialDataa;
}

addMaterial() {
  const selectedMaterialId = this.form.get('newMaterialName')?.value;
  const quantity = this.form.get('newMaterialQuantity')?.value;

  const selected = this.materialOptions.find(m => m.value === selectedMaterialId);

  if (selected && quantity > 0) {
    this.materials.push(this.fb.group({
      num: this.materials.length + 1,
      inventoryid: selected.value,
      name: selected.viewValue,
      quantity,
      unit: selected.unit
    }));

    // Limpiar campos del formulario
    this.form.patchValue({
      newMaterialName: '',
      newMaterialQuantity: ''
    });
    this.selectedMaterialUnit = '';
    this.updateMaterialData();
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
  { name: 'quantity', header: 'Quantity', cell: e => e.quantity?.toString() ?? '' },
  { name: 'supplier', header: 'Supplier', cell: e => e.supplier ?? '' },
  { name: 'actions', header: 'Actions', cell: () => '', isActionColumn: true }
];

private _equipmentDataa: any[] = [];

selectedEquipmentSupplier: string = '';

onEquipmentSelected(equipmentid: number) {
  const selected = this.equipmentOptions.find(e => e.value === equipmentid);
  this.selectedEquipmentSupplier = selected?.supplier || '';
}

updateEquipmentData() {
  this._equipmentDataa = this.equipment.controls.map(ctrl => ctrl.value);
}

get equipmentDataa() {
  return this._equipmentDataa;
}

addEquipment() {
  const equipmentid = this.form.get('newEquipmentName')?.value;
  const quantity = this.form.get('newEquipmentQuantity')?.value;

  const selected = this.equipmentOptions.find(e => e.value === equipmentid);

  if (selected && quantity > 0) {
    this.equipment.push(this.fb.group({
      num: this.equipment.length + 1,
      equipmentid: selected.value,
      name: selected.viewValue,
      quantity,
      supplier: selected.supplier
    }));

    this.form.patchValue({
      newEquipmentName: '',
      newEquipmentQuantity: ''
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

    const selectedRouteId = this.form.get('route')?.value;
  if (!selectedRouteId) {
    console.warn('⚠️ No hay ruta seleccionada');
    return;
  }

  // Agrupar empleados por tipo de crew
  const crewsPorTipo = new Map<string, typeof this._employeeDataa>();
  for (const emp of this._employeeDataa) {
    if (!crewsPorTipo.has(emp.type)) {
      crewsPorTipo.set(emp.type, []);
    }
    crewsPorTipo.get(emp.type)?.push(emp);
  }

  crewsPorTipo.forEach((empleados, tipo) => {
    // Obtener las horas trabajadas (del primer empleado del grupo)
    const rawHoras = empleados[0]?.workedhours;
    const horas = typeof rawHoras === 'number' && !isNaN(rawHoras)
      ? Number(rawHoras.toFixed(2))
      : 0;

    const crewData = {
      type: tipo,
      photo: 'eqA.jpg',
      workedHours: horas,
      routeId: selectedRouteId, 
      createdBy: 1,
      updatedBy: 1
    };

    console.log('🛠️ Creando crew con:', crewData);

    this.crewsService.createCrew(crewData).subscribe({
      next: (createdCrew) => {
        console.log('📥 Respuesta de createCrew:', createdCrew);

        // Extraer ID del crew
        const crewid = createdCrew?.crewid ?? createdCrew?.crewId ?? createdCrew?.id;
        console.log('📌 crewid extraído:', crewid);
        console.log('🔍 Tipo de crewid:', typeof crewid, crewid);

        if (!crewid) {
          console.error('❌ crewId no recibido. Cancelando operaciones relacionadas.');
          return;
        }

        console.log('🧪 Datos antes de crear empleados: ', empleados);
console.log('🧪 Datos materiales: ', this._materialDataa);
console.log('🧪 Datos equipo: ', this._equipmentDataa);
console.log('📌 crewid extraído:', crewid);

        // Crear empleados asignados
        const employees$ = empleados
          .filter(emp => !!emp.employeeid)
          .map(emp => this.crewEmployeesService.createCrewEmployee({
            crewId: crewid,
            peopleId: emp.employeeid,
            crewLeader: emp.leader ?? false,
            createdBy: 1,
            updatedBy: 1
          }));
          console.log('🧍 Empleados recibidos para crear CrewEmployees:', empleados);


    console.log('🧪 crewid justo antes de crear materiales y equipo:', crewid); // <-- aquí

        // Crear inventario usado
        const materials$ = this._materialDataa
          .filter(mat => !!mat.inventoryid)
          .map(mat => this.usedInventoryService.createUsedInventory({
            CrewId: crewid,
            inventoryId: mat.inventoryid,
            quantity: mat.quantity,
            materialCost: 0,
            createdBy: 1,
            updatedBy: 1
          }));

        // Crear equipo usado
        const equipment$ = this._equipmentDataa
          .filter(eq => !!eq.equipmentid)
          .map(eq => this.usedEquipmentService.createUsedEquipment({
            CrewId: crewid,
            equipmentId: eq.equipmentid,
            startdate: new Date(),
            enddate: new Date(),
            hoursLent: 0,
            quantity: eq.quantity,
            equipmentCost: 0,
            observation: '',
            createdBy: 1,
            updatedBy: 1
          }));

console.log('📦 Requests de Inventario:', materials$);
console.log('🔧 Requests de Equipos:', equipment$);


        // Ejecutar todas las llamadas juntas
        import('rxjs').then(({ forkJoin }) => {
          forkJoin([...employees$, ...materials$, ...equipment$]).subscribe({
            next: () => {
              console.log(`✅ Crew '${tipo}' y entidades relacionadas creadas exitosamente`);
              this.form.reset();
              this.employees.clear();
              this.materials.clear();
              this.equipment.clear();
            },
            error: (err) => {
              console.error('❌ Error al crear entidades relacionadas', err);
            }
          });
        });
      },
      error: (err) => {
        console.error('❌ Error al crear crew', err);
      }
    });
  });
}

}
