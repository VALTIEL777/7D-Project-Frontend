import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RtrProcessingComponent } from './rtr-processing.component';

describe('RtrProcessingComponent', () => {
  let component: RtrProcessingComponent;
  let fixture: ComponentFixture<RtrProcessingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RtrProcessingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RtrProcessingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
