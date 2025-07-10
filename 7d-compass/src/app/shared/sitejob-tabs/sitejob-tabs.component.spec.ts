import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SitejobTabsComponent } from './sitejob-tabs.component';

describe('SitejobTabsComponent', () => {
  let component: SitejobTabsComponent;
  let fixture: ComponentFixture<SitejobTabsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SitejobTabsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SitejobTabsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
