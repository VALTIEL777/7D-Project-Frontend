import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilesPermitsComponent } from './files-permits.component';

describe('FilesPermitsComponent', () => {
  let component: FilesPermitsComponent;
  let fixture: ComponentFixture<FilesPermitsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilesPermitsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FilesPermitsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
