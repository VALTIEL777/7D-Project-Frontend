import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardWithoutButtonComponent } from './card-without-button.component';

describe('CardWithoutButtonComponent', () => {
  let component: CardWithoutButtonComponent;
  let fixture: ComponentFixture<CardWithoutButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardWithoutButtonComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CardWithoutButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
