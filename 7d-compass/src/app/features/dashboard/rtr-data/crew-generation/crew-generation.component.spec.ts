import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrewGenerationComponent } from './crew-generation.component';

describe('CrewGenerationComponent', () => {
  let component: CrewGenerationComponent;
  let fixture: ComponentFixture<CrewGenerationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrewGenerationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CrewGenerationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
