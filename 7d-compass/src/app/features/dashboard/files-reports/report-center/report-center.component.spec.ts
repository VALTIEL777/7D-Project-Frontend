import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportCenterComponent } from './report-center.component';

describe('ReportCenterComponent', () => {
  let component: ReportCenterComponent;
  let fixture: ComponentFixture<ReportCenterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportCenterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportCenterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
