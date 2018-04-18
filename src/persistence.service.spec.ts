import { TestBed, inject } from '@angular/core/testing';

import { PersistenceService } from './persistence.service';
import { PersistenceConfig } from './persistence.config';

const prov: PersistenceConfig = {
	prefix: 'TEST', storageType: 'localStorage'
};

describe('PersistenceService', () => {
	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				PersistenceService,
				{ provide: 'PERSISTENCE_CONFIG', useValue: prov }
			]
		});
	});

	afterEach(() => {
		localStorage.clear();
	});

	it('should be created', inject(
		[PersistenceService, 'PERSISTENCE_CONFIG'],
		(service: PersistenceService, config: PersistenceConfig) => {
			expect(service).toBeTruthy();
		})
	);

	it('#set #get should store value', inject(
		[PersistenceService, 'PERSISTENCE_CONFIG'],
		(service: PersistenceService, config: PersistenceConfig) => {
			const val = "TESTING_VALUE";
			expect(service.set("val", val)).toBeTruthy();
			expect(service.get("val")).toEqual(val);
		})
	);

	it('#clearAll should clear all stored values', inject(
		[PersistenceService, 'PERSISTENCE_CONFIG'],
		(service: PersistenceService, config: PersistenceConfig) => {
			const val = "TESTING_VALUE";
			for (let i = 0; i < 10; i++) {
				expect(service.set("val" + i, val)).toBeTruthy();
			}

			expect(service.clearAll()).toBeTruthy();

			for (let i = 0; i < 10; i++) {
				expect(service.get("val" + i)).toBeNull();
			}
		})
	);

	it('#clearAll with params should clear all matching stored values', inject(
		[PersistenceService, 'PERSISTENCE_CONFIG'],
		(service: PersistenceService, config: PersistenceConfig) => {
			const val = "TESTING_VALUE";
			expect(service.set("NOTval", val)).toBeTruthy();

			for (let i = 0; i < 10; i++) {
				expect(service.set("val" + i, val)).toBeTruthy();
			}

			expect(service.clearAll("val[0-9]+")).toBeTruthy();

			for (let i = 0; i < 10; i++) {
				expect(service.get("val" + i)).toBeNull();
			}

			expect(service.get("NOTval")).toEqual(val);
		})
	);

	it('#length should get accurate length', inject(
		[PersistenceService, 'PERSISTENCE_CONFIG'],
		(service: PersistenceService, config: PersistenceConfig) => {
			const val = "TESTING_VALUE";
			const elements = 10;

			for (let i = 0; i < elements; i++) {
				service.set("val" + i, val);
			}

			expect(service.length()).toEqual(elements);
		})
	);

	it('#keys should return all scoped keys', inject(
		[PersistenceService, 'PERSISTENCE_CONFIG'],
		(service: PersistenceService, config: PersistenceConfig) => {
			const val = "TESTING_VALUE";
			const elements = 10;
			const keys = [];

			for (let i = 0; i < elements; i++) {
				keys.push("val" + i);
				service.set("val" + i, val);
			}

			expect(service.keys()).toEqual(keys);
		})
	);

	it('#remove should remove keys', inject(
		[PersistenceService, 'PERSISTENCE_CONFIG'],
		(service: PersistenceService, config: PersistenceConfig) => {
			const val = "TESTING_VALUE";
			const elements = 10;
			const keys = [];

			for (let i = 0; i < elements; i++) {
				keys.push("val" + i);
				service.set("val" + i, val);
			}

			expect(service.remove(...keys)).toBeTruthy();
			expect(service.keys().length).toEqual(0);
		})
	);
});
