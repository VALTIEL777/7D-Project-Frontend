import { Component } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { MATERIAL_MODULES } from '../../../../material';
import { DashboardLayoutComponent } from "../../../../shared/dashboard-layout/dashboard-layout.component";
import { CardWithButtonComponent } from '../../../../shared/card-with-button/card-with-button.component';
import { DataTableComponent } from '../../../../shared/data-table/data-table.component';
import { MatDialog } from '@angular/material/dialog';
import { SearchDialogComponent } from '../../../../shared/search-dialog/search-dialog.component';
import { ConfirmationDialogComponent } from '../../../../shared/confirmation-dialog/confirmation-dialog.component';

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
  styleUrl: './misc-generation.component.scss'
})
export class MiscGenerationComponent {
  

  form: FormGroup;

  

  // Variables for select inputs
  selectedEmployee: any = null;
  selectedSkills: string[] = [];

  // Dummy data (replace with actual API data if needed)
  employeeList = [
    { name: 'Alice' },
    { name: 'Bob' },
    { name: 'Charlie' }
  ];

skillList = ['Leadership', 'Welding', 'Electrical', 'Plumbing'];

  skillIcons: { [key: string]: string } = {
  Leadership: 'directions_car',
  Welding: 'build',
  Electrical: 'precision_manufacturing',
  Plumbing: 'square_foot'
};

  constructor(private fb: FormBuilder, private dialog: MatDialog) {
   this.form = this.fb.group({
  // EMPLOYEE SECTION
  selectedEmployee: [null, Validators.required],
  selectedSkills: [[], Validators.required],
  isLeader: [false],
  employees: this.fb.array([]),

  // MATERIALS SECTION
  newMaterialName: [null, Validators.required],
  newMaterialUnit: [null, Validators.required],
  newMaterialQuantity: [null, [Validators.required, Validators.min(1)]],
  materials: this.fb.array([]), 

  // EQUIPMENT SECTION
  newEquipmentName: [null, Validators.required],
  newEquipmentQuantity: [null, [Validators.required, Validators.min(1)]],
  newEquipmentSupplier: [null, Validators.required],
  equipment: this.fb.array([]), 

  // ROUTE
  route: [null, Validators.required]
});


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

  get employeeDataa() {
    return this.employees.value;
  }

  get materialDataa() {
    return this.materials.value;
  }

  get equipmentDataa() {
    return this.equipment.value;
  }



//EMPLOYEES
  employeecolumns: ColumnDefinition[] = [
     {
      name: 'num',
      header: '#',
      cell: (employee: any) => employee.num
    },
    {
      name: 'fullName',
      header: 'Full Name',
      cell: (employee: any) => `${employee.firstname} ${employee.lastname}`
    },
     {
      name: 'Skills',
      header: 'Skills',
  cell: (employee: any) => Array.isArray(employee.skills) ? employee.skills.join(', ') : employee.skills
    },
     {
      name: 'leader',
      header: 'Leader',
      cell: (employee: any) => employee.leader
    },
     {
      name: 'actions',
      header: 'Actions',
      cell: () => '',
      isActionColumn: true
    }
  ];

  employeeCounter = 1;
  employeeData: any[] = [];

addEmployee() {
  const selectedEmployee = this.form.get('selectedEmployee')?.value;
  const selectedSkills = this.form.get('selectedSkills')?.value;
  const isLeader = this.form.get('isLeader')?.value;

  if (selectedEmployee && selectedSkills?.length) {
    const fullName = selectedEmployee.name;
    const [firstname, ...lastnameParts] = fullName.split(' ');
    const lastname = lastnameParts.join(' ');

    const employeeGroup = this.fb.group({
      num: this.form.get('employees')?.value.length + 1,
      firstname,
      lastname,
      skills: [Array.isArray(selectedSkills) ? [...selectedSkills] : [selectedSkills]],
      leader: [isLeader]
    });

    (this.form.get('employees') as FormArray).push(employeeGroup);

    this.form.patchValue({
      selectedEmployee: null,
      selectedSkills: [],
      isLeader: false
    });
  }
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

      const index = this.employees.controls.findIndex(
        ctrl => ctrl.value.num === employee.num
      );

      if (index !== -1) {
        const updatedEmployee = {
          ...this.employees.at(index).value,
          firstname,
          lastname,
          ...result
        };

        this.employees.at(index).patchValue(updatedEmployee);

        console.log('Empleado actualizado:', updatedEmployee);
      }
    }
  });
}


 onDeleteEmployee(employee: any) {
  const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
    width: '450px',
    disableClose: true,
    panelClass: 'confirmation-dialog',
    data: {
      title: 'Eliminar empleado',
      message: `¿Estás seguro de eliminar a ${employee.firstname} ${employee.lastname}? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar'
    }
  });

  dialogRef.afterClosed().subscribe(confirmed => {
    if (confirmed) {
      const index = this.employees.controls.findIndex(
        ctrl => ctrl.value.num === employee.num
      );
      if (index !== -1) {
        this.employees.removeAt(index);
        console.log('Empleado eliminado:', employee);
      }
    }
  });
}


//MATERIALS
materialOptions = [
  { value: 'Cement', viewValue: 'Cement'},
  { value: 'Sand', viewValue: 'Sand'},
  { value: 'Gravel', viewValue: 'Gravel'},
  { value: 'Rebar', viewValue: 'Rebar'}
];
unitOptions = ['Bags', 'Tons', 'Kg', 'Liters', 'm³'];



materialColumns: ColumnDefinition[] = [
  {
    name: 'num',
    header: '#',
    cell: (material: any) => material.num
  },
  {
    name: 'name',
    header: 'Name',
    cell: (material: any) => material.name
  },
  {
    name: 'quantity',
    header: 'Quantity',
    cell: (material: any) => material.quantity
  },
  {
    name: 'unit',
    header: 'Unit',
    cell: (material: any) => material.unit
  },
  {
    name: 'actions',
    header: 'Actions',
    cell: () => '',
    isActionColumn: true
  }
];
materialData = [
  {
    num: 1,
    name: 'Cement',
    quantity: 10,
    unit: 'bags'
  }
];

addMaterial() {
const name = this.form.get('newMaterialName')?.value;
  const quantity = this.form.get('newMaterialQuantity')?.value;
  const unit = this.form.get('newMaterialUnit')?.value;

  if (name && quantity > 0 && unit) {
    this.materials.push(this.fb.group({
      num: this.materials.length + 1,
      name,
      quantity,
      unit
    }));

    // Reset form fields
    this.form.patchValue({
      newMaterialName: '',
      newMaterialQuantity: '',
      newMaterialUnit: ''
    });
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
      const index = this.materials.controls.findIndex(
        ctrl => ctrl.value.num === material.num
      );
      if (index !== -1) {
        this.materials.at(index).patchValue({
          ...this.materials.at(index).value,
          ...result
        });
        console.log('Material actualizado:', this.materials.at(index).value);
      }
    }
  });
}


onDeleteMaterial(material: any) {
  const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
    width: '450px',
    disableClose: true,
    panelClass: 'confirmation-dialog',
    data: {
      title: 'Eliminar material',
      message: `¿Estás seguro de eliminar el material ${material.name}? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar'
    }
  });

  dialogRef.afterClosed().subscribe(confirmed => {
    if (confirmed) {
      const index = this.materials.controls.findIndex(
        ctrl => ctrl.value.num === material.num
      );
      if (index !== -1) {
        this.materials.removeAt(index);
        console.log('Material eliminado:', material);
      }
    }
  });
}


//EQUIPMENT
equipmentOptions: string[] = ['Bulldozer', 'Excavator', 'Crane', 'Loader'];
supplierOptions: string[] = ['CAT', 'Komatsu', 'Volvo', 'Hitachi'];


equipmentColumns: ColumnDefinition[] = [
  {
    name: 'num',
    header: '#',
    cell: (equipment: any) => equipment.num
  },
  {
    name: 'name',
    header: 'Name',
    cell: (equipment: any) => equipment.name
  },
  {
    name: 'quantity',
    header: 'Quantity',
    cell: (equipment: any) => equipment.quantity
  },
  {
    name: 'supplier',
    header: 'Supplier',
    cell: (equipment: any) => equipment.supplier
  },
  {
    name: 'actions',
    header: 'Actions',
    cell: () => '',
    isActionColumn: true
  }
];
equipmentData = [
   {
    num: 1,
    name: 'Drill',
    quantity: 2,
    supplier: 'Makita'
  }
];

addEquipment() {
  const name = this.form.get('newEquipmentName')?.value;
  const quantity = this.form.get('newEquipmentQuantity')?.value;
  const supplier = this.form.get('newEquipmentSupplier')?.value;

  if (name && quantity > 0) {
    this.equipment.push(this.fb.group({
      num: this.equipment.length + 1,
      name: String(name),       // ← asegura que sea texto
      quantity,
      supplier: String(supplier) // ← asegura que sea texto
    }));

    this.form.patchValue({
      newEquipmentName: null,
      newEquipmentQuantity: '',
      newEquipmentSupplier: null
    });
  }
}


onEditEquipment(equipment: any) {
  const dialogRef = this.dialog.open(SearchDialogComponent, {
    width: '500px',
    data: {
      title: `Equipo: ${equipment.name}`,
      data: { ...equipment },
      excludedFields: []
    }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      const index = this.equipment.controls.findIndex(
        ctrl => ctrl.value.num === equipment.num
      );

      if (index !== -1) {
        this.equipment.at(index).patchValue(result);
        console.log('Equipo actualizado:', this.equipment.at(index).value);
      }
    }
  });
}


onDeleteEquipment(equipment: any) {
  const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
    width: '450px',
    disableClose: true,
    panelClass: 'confirmation-dialog',
    data: {
      title: 'Eliminar equipo',
      message: `¿Estás seguro de eliminar el equipo ${equipment.name}? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar'
    }
  });

  dialogRef.afterClosed().subscribe(confirmed => {
    if (confirmed) {
      const index = this.equipment.controls.findIndex(
        (ctrl) => ctrl.value.num === equipment.num
      );
      if (index !== -1) {
        this.equipment.removeAt(index);
        console.log('Equipo eliminado:', equipment);
      }
    }
  });
}



  save() {
  if (this.form.valid) {
    console.log('Form Data:', this.form.value);
  } else {
    this.form.markAllAsTouched(); // <- Esto es importante para mostrar errores
    console.warn('Form is invalid.');
  }
}

}
