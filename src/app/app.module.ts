import { Location, LocationStrategy, PathLocationStrategy } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { SortablejsModule } from 'angular-sortablejs';
import { VirtualScrollerModule } from 'ngx-virtual-scroller';
import { AppComponent } from './app.component';
import { AmmoCapacitiesComponent } from './components/ammo-capacities/ammo-capacities.component';
import { ArmorListComponent } from './components/armor-list/armor-list.component';
import { AugmentationDetailsComponent } from './components/augmentation-details/augmentation-details.component';
import { AugmentationSlotComponent } from './components/augmentation-slot/augmentation-slot.component';
import { AugmentationsListComponent } from './components/augmentations-list/augmentations-list.component';
import { CalcDetailsComponent } from './components/calc-details/calc-details.component';
import { CharmListComponent } from './components/charm-list/charm-list.component';
import { DecorationDetailsComponent } from './components/decoration-details/decoration-details.component';
import { DecorationListComponent } from './components/decoration-list/decoration-list.component';
import { DecorationSlotComponent } from './components/decoration-slot/decoration-slot.component';
import { EquippedSkillsComponent } from './components/equipped-skills/equipped-skills.component';
import { EquippedStatsComponent } from './components/equipped-stats/equipped-stats.component';
import { ItemDetailsComponent } from './components/item-details/item-details.component';
import { ItemSlotComponent } from './components/item-slot/item-slot.component';
import { MelodiesComponent } from './components/melodies/melodies.component';
import { ModalComponent } from './components/modal/modal.component';
import { ModificationDetailsComponent } from './components/modification-details/modification-details.component';
import { ModificationSlotComponent } from './components/modification-slot/modification-slot.component';
import { ModificationsListComponent } from './components/modifications-list/modifications-list.component';
import { SetBonusDetailsComponent } from './components/set-bonus-details/set-bonus-details.component';
import { SetListComponent } from './components/set-list/set-list.component';
import { SharpnessBarComponent } from './components/sharpness-bar/sharpness-bar.component';
import { SkillDetailsComponent } from './components/skill-details/skill-details.component';
import { TooltipComponent } from './components/tooltip/tooltip.component';
import { WeaponListComponent } from './components/weapon-list/weapon-list.component';
import { DataModule } from './data/data.module';
import { MaxSharpnessPipe } from './pipes/max-sharpness.pipe';
import { AppDataProvider } from './providers/app-data.provider';
import { BuildService } from './services/build.service';
import { CalculationService } from './services/calculation.service';
import { DataService } from './services/data.service';
import { EquipmentService } from './services/equipment.service';
import { SetService } from './services/set.service';
import { SkillService } from './services/skill.service';
import { SlotService } from './services/slot.service';
import { StatService } from './services/stat.service';
import { TooltipService } from './services/tooltip.service';

@NgModule({
	declarations: [
		AppComponent,
		ArmorListComponent,
		WeaponListComponent,
		AugmentationsListComponent,
		ModificationsListComponent,
		AmmoCapacitiesComponent,
		MelodiesComponent,
		DecorationListComponent,
		CharmListComponent,
		ItemDetailsComponent,
		AugmentationDetailsComponent,
		ModificationDetailsComponent,
		DecorationDetailsComponent,
		ItemSlotComponent,
		AugmentationSlotComponent,
		ModificationSlotComponent,
		DecorationSlotComponent,
		EquippedStatsComponent,
		EquippedSkillsComponent,
		CalcDetailsComponent,
		SkillDetailsComponent,
		SetBonusDetailsComponent,
		ModalComponent,
		TooltipComponent,
		MaxSharpnessPipe,
		SharpnessBarComponent,
		SetListComponent
	],
	imports: [
		BrowserModule,
		HttpClientModule,
		VirtualScrollerModule,
		SortablejsModule.forRoot({ animation: 150 }),
		DataModule
	],
	providers: [
		Location,
		{ provide: LocationStrategy, useClass: PathLocationStrategy },
		DataService,
		SkillService,
		TooltipService,
		EquipmentService,
		SlotService,
		StatService,
		CalculationService,
		BuildService,
		SetService,
		AppDataProvider,
		{ provide: APP_INITIALIZER, useFactory: appDataProviderFactory, deps: [AppDataProvider], multi: true }
	],
	bootstrap: [AppComponent]
})
export class AppModule { }

export function appDataProviderFactory(provider: AppDataProvider) {
	return () => provider.load().toPromise();
}
