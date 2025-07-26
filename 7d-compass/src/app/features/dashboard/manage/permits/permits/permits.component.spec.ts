import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PermitsComponent } from './permits.component';

describe('PermitsComponent', () => {
  let component: PermitsComponent;
  let fixture: ComponentFixture<PermitsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PermitsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PermitsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
