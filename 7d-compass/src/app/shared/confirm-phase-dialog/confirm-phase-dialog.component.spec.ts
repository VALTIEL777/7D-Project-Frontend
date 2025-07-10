import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmPhaseDialogComponent } from './confirm-phase-dialog.component';

describe('ConfirmPhaseDialogComponent', () => {
  let component: ConfirmPhaseDialogComponent;
  let fixture: ComponentFixture<ConfirmPhaseDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmPhaseDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfirmPhaseDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
