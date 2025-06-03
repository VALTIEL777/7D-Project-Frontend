import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SitejobLayoutComponent } from './sitejob-layout.component';

describe('SitejobLayoutComponent', () => {
  let component: SitejobLayoutComponent;
  let fixture: ComponentFixture<SitejobLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SitejobLayoutComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SitejobLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
