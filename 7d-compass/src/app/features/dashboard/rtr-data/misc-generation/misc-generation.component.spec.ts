import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MiscGenerationComponent } from './misc-generation.component';

describe('MiscGenerationComponent', () => {
  let component: MiscGenerationComponent;
  let fixture: ComponentFixture<MiscGenerationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MiscGenerationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MiscGenerationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
