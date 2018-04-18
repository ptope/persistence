import { Injectable, Inject } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Subscriber } from 'rxjs/Subscriber';
import { share } from 'rxjs/operators';
import { PersistenceEvent } from './persistence-event';
import { PersistenceConfig } from './persistence.config';
import { PersistenceNotifyOptions } from './persistence-notify-options';

const LOCAL_STORAGE_NOT_SUPPORTED = 'LOCAL_STORAGE_NOT_SUPPORTED';

@Injectable()
export class PersistenceService {
	public get errors$(): Observable<string> {
		return this._errors$;
	}
	public get warnings$(): Observable<string> {
		return this._warnings$;
	}
	public get removeItems$(): Observable<PersistenceEvent> {
		return this._removeItems$;
	}
	public get setItems$(): Observable<PersistenceEvent> {
		return this._setItems$;
	}

	private _errors$: Observable<string>;
	private _warnings$: Observable<string>;
	private _removeItems$: Observable<PersistenceEvent>;
	private _setItems$: Observable<PersistenceEvent>;

	private errors: Subscriber<string> = new Subscriber<string>();
	private warnings: Subscriber<string> = new Subscriber<string>();
	private removeItems: Subscriber<PersistenceEvent> = new Subscriber<PersistenceEvent>();
	private setItems: Subscriber<PersistenceEvent> = new Subscriber<PersistenceEvent>();

	private notifyOptions: PersistenceNotifyOptions = {
		setItem: false,
		removeItem: false
	};

	private isSupported = false;
	private prefix = 'ls';
	private storageType: 'sessionStorage' | 'localStorage' = 'localStorage';
	private webStorage: Storage;

	constructor(@Inject('PERSISTENCE_CONFIG') config: PersistenceConfig) {
		const { notifyOptions, prefix, storageType } = config;

		if (notifyOptions != null) {
			const { setItem, removeItem } = notifyOptions;
			this.setNotify(!!setItem, !!removeItem);
		}
		if (prefix != null) {
			this.setPrefix(prefix);
		}
		if (storageType != null) {
			this.setStorageType(storageType);
		}

		// create observables and observers
		this._errors$ = new Observable<string>(
			(observer: Subscriber<string>) => this.errors = observer).pipe(share());
		this._removeItems$ = new Observable<PersistenceEvent>(
			(observer: Subscriber<PersistenceEvent>) => this.removeItems = observer).pipe(share());
		this._setItems$ = new Observable<PersistenceEvent>(
			(observer: Subscriber<PersistenceEvent>) => this.setItems = observer).pipe(share());
		this._warnings$ = new Observable<string>(
			(observer: Subscriber<string>) => this.warnings = observer).pipe(share());

		this.isSupported = this.checkSupport();
	}

	public clearAll(regularExpression?: string): boolean {
		// Setting both regular expressions independently
		// Empty strings result in catchall RegExp
		const prefixRegex = !!this.prefix ? new RegExp('^' + this.prefix) : new RegExp('');
		const testRegex = !!regularExpression ? new RegExp(regularExpression) : new RegExp('');

		if (!this.isSupported) {
			this.warnings.next(LOCAL_STORAGE_NOT_SUPPORTED);
			return false;
		}

		const prefixLength = this.prefix.length;

		for (const key in this.webStorage) {
			// Only remove items that are for this app and match the regular expression
			if (prefixRegex.test(key) && testRegex.test(key.substr(prefixLength))) {
				try {
					this.remove(key.substr(prefixLength));
				} catch (e) {
					this.errors.next(e.message);
					return false;
				}
			}
		}
		return true;
	}

	public length(): number {
		let count = 0;
		const storage = this.webStorage;
		for (let i = 0; i < storage.length; i++) {
			if (storage.key(i).indexOf(this.prefix) === 0) {
				count += 1;
			}
		}
		return count;
	}

	public get<T>(key: string): T {
		if (!this.isSupported) {
			this.warnings.next(LOCAL_STORAGE_NOT_SUPPORTED);
			return null;
		}

		const item = this.webStorage ? this.webStorage.getItem(this.deriveKey(key)) : null;
		// FIXME: not a perfect solution, since a valid 'null' string can't be stored
		if (!item || item === 'null') {
			return null;
		}

		try {
			return JSON.parse(item);
		} catch (e) {
			return null;
		}
	}

	public getStorageType(): string {
		return this.storageType;
	}

	public keys(): Array<string> {
		if (!this.isSupported) {
			this.warnings.next(LOCAL_STORAGE_NOT_SUPPORTED);
			return [];
		}

		const prefixLength = this.prefix.length;
		const keys: Array<string> = [];
		for (const key in this.webStorage) {
			// Only return keys that are for this app
			if (key.substr(0, prefixLength) === this.prefix) {
				try {
					keys.push(key.substr(prefixLength));
				} catch (e) {
					this.errors.next(e.message);
					return [];
				}
			}
		}
		return keys;
	}

	public remove(...keys: Array<string>): boolean {
		let result = true;
		keys.forEach((key: string) => {
			if (!this.isSupported) {
				this.warnings.next(LOCAL_STORAGE_NOT_SUPPORTED);
				result = false;
			}

			try {
				this.webStorage.removeItem(this.deriveKey(key));
				if (this.notifyOptions.removeItem) {
					this.removeItems.next({
						key: key,
						storageType: this.storageType
					});
				}
			} catch (e) {
				this.errors.next(e.message);
				result = false;
			}
		});
		return result;
	}

	public set(key: string, value: any): boolean {
		// Let's convert `undefined` values to `null` to get the value consistent
		if (value === undefined) {
			value = null;
		} else {
			value = JSON.stringify(value);
		}

		if (!this.isSupported) {
			this.warnings.next(LOCAL_STORAGE_NOT_SUPPORTED);
			return false;
		}

		try {
			if (this.webStorage) {
				this.webStorage.setItem(this.deriveKey(key), value);
			}
			if (this.notifyOptions.setItem) {
				this.setItems.next({
					key: key,
					value: value,
					storageType: this.storageType
				});
			}
		} catch (e) {
			this.errors.next(e.message);
			return false;
		}
		return true;
	}

	private deriveKey(key: string): string {
		return `${this.prefix}${key}`;
	}

	private checkSupport(): boolean {
		try {
			const supported = this.storageType in window
				&& window[this.storageType] !== null;

			if (supported) {
				this.webStorage = window[this.storageType];

				// When Safari (OS X or iOS) is in private browsing mode, it
				// appears as though localStorage is available, but trying to
				// call .setItem throws an exception.
				//
				// "QUOTA_EXCEEDED_ERR: DOM Exception 22: An attempt was made
				// to add something to storage that exceeded the quota."
				const key = this.deriveKey(`__${Math.round(Math.random() * 1e7)}`);
				this.webStorage.setItem(key, '');
				this.webStorage.removeItem(key);
			}

			return supported;
		} catch (e) {
			this.errors.next(e.message);
			return false;
		}
	}

	private setPrefix(prefix: string): void {
		this.prefix = prefix;

		// If there is a prefix set in the config let's use that with an appended
		// period for readability:
		const PERIOD = '.';
		if (this.prefix && !this.prefix.endsWith(PERIOD)) {
			this.prefix = !!this.prefix ? `${this.prefix}${PERIOD}` : '';
		}
	}

	private setStorageType(storageType: 'sessionStorage' | 'localStorage'): void {
		this.storageType = storageType;
	}

	private setNotify(setItem: boolean, removeItem: boolean): void {
		if (setItem != null) {
			this.notifyOptions.setItem = setItem;
		}
		if (removeItem != null) {
			this.notifyOptions.removeItem = removeItem;
		}
	}
}
