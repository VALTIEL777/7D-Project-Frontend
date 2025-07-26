import { TestBed } from '@angular/core/testing';

import { PermitService } from './permit.service';

describe('PermitService', () => {
  let service: PermitService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PermitService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
