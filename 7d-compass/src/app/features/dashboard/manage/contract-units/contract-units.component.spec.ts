import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContractUnitsComponent } from './contract-units.component';

describe('ContractUnitsComponent', () => {
  let component: ContractUnitsComponent;
  let fixture: ComponentFixture<ContractUnitsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContractUnitsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContractUnitsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
