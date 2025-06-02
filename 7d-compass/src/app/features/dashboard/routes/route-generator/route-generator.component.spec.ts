import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RouteGeneratorComponent } from './route-generator.component';

describe('RouteGeneratorComponent', () => {
  let component: RouteGeneratorComponent;
  let fixture: ComponentFixture<RouteGeneratorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouteGeneratorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RouteGeneratorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
