import { ModuleWithProviders, NgModule } from "@angular/core";
import { PersistenceService } from "./persistence.service";
import { PersistenceConfig } from "./persistence.config";

@NgModule({
	providers: [PersistenceService],
})
export class PersistenceModule {
	public static withConfig(userConfig: PersistenceConfig = {}): ModuleWithProviders {
		return {
			ngModule: PersistenceModule,
			providers: [
				{provide: "PERSISTENCE_CONFIG", useValue: userConfig},
			],
		};
	}
}
