import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RouteHistoryComponent } from './route-history.component';

describe('RouteHistoryComponent', () => {
  let component: RouteHistoryComponent;
  let fixture: ComponentFixture<RouteHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouteHistoryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RouteHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
