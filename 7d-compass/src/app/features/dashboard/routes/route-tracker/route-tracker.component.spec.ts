import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RouteTrackerComponent } from './route-tracker.component';

describe('RouteTrackerComponent', () => {
  let component: RouteTrackerComponent;
  let fixture: ComponentFixture<RouteTrackerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouteTrackerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RouteTrackerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
