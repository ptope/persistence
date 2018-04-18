import { PersistenceNotifyOptions } from "./persistence-notify-options";

export interface PersistenceConfig {
	notifyOptions?: PersistenceNotifyOptions;
	prefix?: string;
	storageType?: 'sessionStorage' | 'localStorage';
}
