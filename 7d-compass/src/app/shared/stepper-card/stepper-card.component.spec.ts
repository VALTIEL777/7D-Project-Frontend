import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepperCardComponent } from './stepper-card.component';

describe('StepperCardComponent', () => {
  let component: StepperCardComponent;
  let fixture: ComponentFixture<StepperCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StepperCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StepperCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
