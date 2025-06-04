import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FinesPenaltiesComponent } from './fines-penalties.component';

describe('FinesPenaltiesComponent', () => {
  let component: FinesPenaltiesComponent;
  let fixture: ComponentFixture<FinesPenaltiesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinesPenaltiesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FinesPenaltiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
