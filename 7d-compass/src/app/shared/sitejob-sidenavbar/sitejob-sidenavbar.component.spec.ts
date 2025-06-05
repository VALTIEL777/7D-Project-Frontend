import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SitejobSidenavbarComponent } from './sitejob-sidenavbar.component';

describe('SitejobSidenavbarComponent', () => {
  let component: SitejobSidenavbarComponent;
  let fixture: ComponentFixture<SitejobSidenavbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SitejobSidenavbarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SitejobSidenavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
