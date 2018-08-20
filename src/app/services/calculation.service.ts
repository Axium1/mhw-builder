import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { AmmoCapacitiesModel } from '../models/ammo-capacities.model';
import { CalculationVariableModel } from '../models/calculation-variable.model';
import { ExtraDataModel } from '../models/extra-data.model';
import { OtherDataModel } from '../models/other-data.model';
import { SharpnessBarModel } from '../models/sharpness-bar.model';
import { SharpnessModel } from '../models/sharpness-model';
import { StatDetailModel } from '../models/stat-detail.model';
import { StatsModel } from '../models/stats.model';
import { WeaponType } from '../types/weapon.type';

@Injectable()
export class CalculationService {
	public attackCalcsUpdated$ = new Subject<StatDetailModel[]>();
	public defenseCalcsUpdated$ = new Subject<StatDetailModel[]>();
	public ammoUpdated$ = new Subject<AmmoCapacitiesModel>();
	public sharpnessUpdated$ = new Subject<SharpnessBarModel>();
	public extraDataUpdated$ = new Subject<ExtraDataModel>();

	attackCalcs = new Array<StatDetailModel>();
	defenseCalcs = new Array<StatDetailModel>();
	sharpnessBar = new SharpnessBarModel;
	extraData = new ExtraDataModel;

	updateCalcs(stats: StatsModel) {
		this.buildAttackCalcs(stats);
		this.buildDefenseCalcs(stats);
		this.buildAmmoCapacities(stats);
		this.getSharpnessBar(stats);
		this.getExtraData(stats);

		this.attackCalcsUpdated$.next(this.attackCalcs);
		this.defenseCalcsUpdated$.next(this.defenseCalcs);

		this.ammoUpdated$.next(stats.ammoCapacitiesUp);
		this.sharpnessUpdated$.next(this.sharpnessBar);
		this.extraDataUpdated$.next(this.extraData);
	}

	private buildAttackCalcs(stats: StatsModel) {
		this.attackCalcs = [];

		this.attackCalcs.push(this.getAttack(stats));
		if (stats.activeAttack || stats.effectivePhysicalSharpnessModifier) {
			this.attackCalcs.push(this.getAttackPotential(stats));
		}

		this.attackCalcs.push(this.getAffinity(stats));
		if (stats.activeAffinity || stats.weakPointAffinity || stats.drawAffinity || stats.slidingAffinity) {
			this.attackCalcs.push(this.getAffinityPotential(stats));
		}

		this.attackCalcs.push(this.getCriticalBoost(stats));

		if (stats.ailment) {
			const ailmentCalc = this.getAilment(stats);
			this.attackCalcs.push(ailmentCalc);
			this.attackCalcs.push(this.getAilmentAttack(stats, ailmentCalc));
		}

		if (stats.element) {
			const elementCalc = this.getElement(stats);
			this.attackCalcs.push(elementCalc);
			this.attackCalcs.push(this.getElementAttack(stats, elementCalc));
		}

		if (stats.elderseal) {
			this.attackCalcs.push(this.getElderseal(stats));
		}

		if (stats.healOnHitPercent) {
			this.attackCalcs.push(this.getHealOnHitPercent(stats));
		}

		this.attackCalcs.push(this.getRawAttackAverage(stats));
		this.attackCalcs.push(this.getRawAttackAveragePotential(stats));
	}

	private getAttack(stats: StatsModel): StatDetailModel {
		const attackCalc: StatDetailModel = {
			name: 'Attack',
			value: stats.totalAttack,
			calculationVariables: [
				{
					displayName: 'Base Weapon Attack',
					name: 'attack',
					value: stats.attack,
					colorClass: 'green'
				},
				{
					displayName: 'Passive Attack',
					name: 'passiveAttack',
					value: stats.passiveAttack,
					colorClass: 'orange'
				},
				{
					displayName: 'Weapon Modifier',
					name: 'weaponModifier',
					value: stats.weaponAttackModifier,
					colorClass: 'purple'
				}
			]
		};

		if (stats.elementless) {
			attackCalc.calculationVariables.push(this.getElementlessVariable(stats));
			attackCalc.calculationTemplate = `{attack} × {elementlessBoostPercent} + {passiveAttack} × {weaponModifier} ≈ ${stats.totalAttack}`;
		} else {
			attackCalc.calculationTemplate = `{attack} + {passiveAttack} × {weaponModifier} ≈ ${stats.totalAttack}`;
		}

		return attackCalc;
	}

	private getAttackPotential(stats: StatsModel): StatDetailModel {
		const attackPotentialCalc: StatDetailModel = {
			name: 'Attack Potential',
			value: stats.totalAttackPotential,
			calculationVariables: [
				{
					displayName: 'Base Weapon Attack',
					name: 'attack',
					value: stats.attack,
					colorClass: 'green'
				},
				{
					displayName: 'Physical Sharpness Modifier',
					name: 'sharpnessModifier',
					value: stats.effectivePhysicalSharpnessModifier,
					colorClass: 'blue'
				},
				{
					displayName: 'Passive Attack',
					name: 'passiveAttack',
					value: stats.passiveAttack,
					colorClass: 'orange'
				},
				{
					displayName: 'Active Attack',
					name: 'activeAttack',
					value: stats.activeAttack,
					colorClass: 'red'
				},
				{
					displayName: 'Weapon Modifier',
					name: 'weaponModifier',
					value: stats.weaponAttackModifier,
					colorClass: 'purple'
				}
			]
		};

		if (stats.elementlessBoostPercent > 0 && stats.totalAilmentAttack == 0 && stats.totalElementAttack == 0) {
			attackPotentialCalc.calculationTemplate = `{attack} × {elementlessBoostPercent} × {sharpnessModifier} + ({passiveAttack} + {activeAttack}) × {weaponModifier} ≈ ${stats.totalAttackPotential}`;
			attackPotentialCalc.calculationVariables.push(this.getElementlessVariable(stats));
		} else {
			attackPotentialCalc.calculationTemplate = `{attack} × {sharpnessModifier} + ({passiveAttack} + {activeAttack}) × {weaponModifier} ≈ ${stats.totalAttackPotential}`;
		}

		return attackPotentialCalc;
	}

	private getElementlessVariable(stats: StatsModel): CalculationVariableModel {
		return {
			displayName: 'Elementless Boost Modifier',
			name: 'elementlessBoostPercent',
			value: (1 + stats.elementlessBoostPercent / 100),
			colorClass: 'kakhi'
		};
	}

	private getSharpnessBar(stats: StatsModel) {
		const sharpnessLevelsBar = Object.assign([], stats.sharpnessLevelsBar);

		if (stats.sharpnessLevelsBar && !isNaN(stats.sharpnessLevelsBar[0])) {
			let total = sharpnessLevelsBar.reduce((a, b) => a + b, 0);
			const maxHandicraftLevels = 40 + 5 - total;
			this.sharpnessBar.tooltipTemplate = '';
			this.sharpnessBar.sharps = [];

			let levelsToSubstract = Math.min(5 - (stats.passiveSharpness / 10), maxHandicraftLevels);
			let levelsToAdd = Math.min((stats.passiveSharpness / 10), maxHandicraftLevels);
			const sharpnessEmpty = levelsToSubstract;
			let last = true;

			for (let i = sharpnessLevelsBar.length - 1; i >= 0; i--) {
				if (levelsToSubstract > 0) {
					const toSubstract = Math.min(sharpnessLevelsBar[i], levelsToSubstract);
					sharpnessLevelsBar[i] -= toSubstract;
					levelsToSubstract -= toSubstract;
				}
				const aux = Math.min(sharpnessLevelsBar[i], levelsToAdd);

				if (levelsToAdd > 0) {
					const sharpnessAux: SharpnessModel = {
						colorIndex: i,
						level: aux,
						active: true,
						last: last
					};
					last = false;
					if (levelsToAdd - aux == 0) {
						sharpnessAux.first = true;
					}
					this.sharpnessBar.sharps.push(sharpnessAux);
				}
				if (levelsToAdd < sharpnessLevelsBar[i]) {
					const sharpnessAux: SharpnessModel = {
						colorIndex: i,
						level: sharpnessLevelsBar[i] - levelsToAdd,
						active: false
					};
					this.sharpnessBar.sharps.push(sharpnessAux);
				}
				levelsToAdd -= aux;

				// When handicraft is not needed
				if (total > 40 && sharpnessLevelsBar[i] > 0) {
					const toSubstract2 = Math.min(sharpnessLevelsBar[i], total - 40);
					sharpnessLevelsBar[i] -= toSubstract2;
					total -= toSubstract2;
				}
				this.sharpnessBar.tooltipTemplate =
					'| <span class="sharp-' + i + '">' + sharpnessLevelsBar[i] * 10 + '</span> ' + this.sharpnessBar.tooltipTemplate;
			}

			this.sharpnessBar.sharps = this.sharpnessBar.sharps.reverse();
			this.sharpnessBar.levels = sharpnessLevelsBar;
			this.sharpnessBar.empty = sharpnessEmpty;
			this.sharpnessBar.widthModifier = 3.5;
			this.sharpnessBar.levelsMissing = 6 - sharpnessLevelsBar.length;
			this.sharpnessBar.tooltipTemplate += ' | = <span class="sharp-8">' + ((total - sharpnessEmpty) * 10) + '</span>';
			this.sharpnessBar.sharpnessDataNeeded = stats.sharpnessDataNeeded;
			this.sharpnessBar.color = stats.sharpnessDataNeeded ? 'red' : 'white';
		}
	}

	private getExtraData(stats: StatsModel) {
		this.extraData = stats.extraData;
	}

	private getAffinity(stats: StatsModel): StatDetailModel {
		const affinityValue = `${stats.affinity + stats.passiveAffinity}%`;
		const affinityCalc: StatDetailModel = {
			name: 'Affinity',
			value: affinityValue,
			calculationTemplate: `{affinity} + {passiveAffinity} = ${affinityValue}`,
			calculationVariables: [
				{
					displayName: 'Weapon Base Affinity',
					name: 'affinity',
					value: stats.affinity,
					colorClass: 'green'
				},
				{
					displayName: 'Passive Affinity',
					name: 'passiveAffinity',
					value: stats.passiveAffinity,
					colorClass: 'blue'
				}
			]
		};

		return affinityCalc;
	}

	private getAffinityPotential(stats: StatsModel): StatDetailModel {
		const affinityTotal = stats.affinity + stats.passiveAffinity + stats.weakPointAffinity + stats.activeAffinity;
		const value = `${affinityTotal}%`;
		const affinityPotentialCalc: StatDetailModel = {
			name: 'Affinity Potential',
			value: value,
			calculationTemplate: `Base: {base} + {passive} + {weakPoint} + {active} = ${value}`,
			calculationVariables: [
				{
					displayName: 'Weapon Base Affinity',
					name: 'base',
					value: stats.affinity,
					colorClass: 'green'
				},
				{
					displayName: 'Passive Affinity',
					name: 'passive',
					value: stats.passiveAffinity,
					colorClass: 'yellow'
				},
				{
					displayName: 'Weak Point Affinity',
					name: 'weakPoint',
					value: stats.weakPointAffinity,
					colorClass: 'blue'
				},
				{
					displayName: 'Active Affinity',
					name: 'active',
					value: stats.activeAffinity,
					colorClass: 'orange'
				}
			]
		};

		if (stats.drawAffinity > 0) {
			affinityPotentialCalc.calculationVariables.push({
				displayName: 'Draw Attack Affinity',
				name: 'draw',
				value: stats.drawAffinity,
				colorClass: 'kakhi'
			});
			affinityPotentialCalc.value += ` | ${(affinityTotal + stats.drawAffinity)}%`;
			affinityPotentialCalc.calculationTemplate +=
				`<br>Draw: ` + `{base} + {passive} + {weakPoint} + {active} + {draw} = ${(affinityTotal + stats.drawAffinity)}%`;
		}

		if (stats.slidingAffinity > 0) {
			affinityPotentialCalc.calculationVariables.push({
				displayName: 'Sliding Attack Affinity',
				name: 'sliding',
				value: stats.slidingAffinity,
				colorClass: 'kakhi'
			});
			affinityPotentialCalc.value += ` | ${(affinityTotal + stats.slidingAffinity)}%`;
			affinityPotentialCalc.calculationTemplate +=
				`<br>Slide: ` + `{base} + {passive} + {weakPoint} + {active} + {sliding} =  ${(affinityTotal + stats.slidingAffinity)}%`;
		}

		return affinityPotentialCalc;
	}

	private getCriticalBoost(stats: StatsModel): StatDetailModel {
		const critBoostValue = `${125 + stats.passiveCriticalBoostPercent}%`;
		const critBoostCalc: StatDetailModel = {
			name: 'Critical Boost',
			value: critBoostValue,
			calculationTemplate: `{base} + {passive} = ${critBoostValue}`,
			calculationVariables: [
				{
					displayName: 'Base Critical Boost',
					name: 'base',
					value: '125',
					colorClass: 'green'
				},
				{
					displayName: 'Passive Critical Boost',
					name: 'passive',
					value: stats.passiveCriticalBoostPercent,
					colorClass: 'blue'
				}
			]
		};

		return critBoostCalc;
	}

	private getAilment(stats: StatsModel): StatDetailModel {
		const ailmentCalc: StatDetailModel = {
			name: 'Ailment',
			value: stats.ailment,
			info: []
		};

		if (stats.ailmentCapped) {
			ailmentCalc.info.push('Ailment attack is capped.');
			ailmentCalc.color = 'yellow';
		}

		if (stats.ailmentHidden && stats.elementAttackMultiplier < 1) {
			ailmentCalc.info.push('Effectiveness reduced due to hidden ailment.');
			ailmentCalc.color = !stats.elementAttackMultiplier ? 'red' : 'yellow';
		}

		return ailmentCalc;
	}

	private getAilmentAttack(stats: StatsModel, ailmentCalc: StatDetailModel): StatDetailModel {
		const ailmentAttackCalc: StatDetailModel = {
			name: 'Ailment Attack',
			value: stats.totalAilmentAttack,
			color: ailmentCalc.color,
			info: ailmentCalc.info,
			calculationVariables: [
				{
					displayName: 'Weapon Base Ailment Attack',
					name: 'base',
					value: stats.baseAilmentAttack,
					colorClass: 'green'
				},
				{
					displayName: 'Passive Ailment Attack',
					name: 'passive',
					value: stats.effectivePassiveAilmentAttack,
					colorClass: 'yellow'
				},
				{
					displayName: 'Ailment Attack Cap',
					name: 'cap',
					value: stats.ailmentCap,
					colorClass: 'orange'
				}
			]
		};

		if (stats.ailmentHidden) {
			ailmentAttackCalc.calculationVariables.push({
				displayName: 'Hidden Ailment Multiplier',
				name: 'multiplier',
				value: stats.elementAttackMultiplier,
				colorClass: 'blue'
			});

			if (stats.elementAttackMultiplier) {
				ailmentAttackCalc.calculationTemplate = `{base} × {multiplier} + {passive} ≈ ${stats.totalAilmentAttack}`;
			} else {
				ailmentAttackCalc.calculationTemplate = `({base} + {passive}) × {multiplier} ≈ ${stats.totalAilmentAttack}`;
			}
		} else {
			ailmentAttackCalc.calculationTemplate = `{base} + {passive} = ${stats.totalAilmentAttack}`;
		}

		return ailmentAttackCalc;
	}

	private getElement(stats: StatsModel): StatDetailModel {
		const elementCalc: StatDetailModel = {
			name: 'Element',
			value: stats.element,
			info: []
		};

		if (stats.elementCapped) {
			elementCalc.info.push('Element attack is capped.');
			elementCalc.color = 'yellow';
		}

		if (stats.elementHidden && stats.elementAttackMultiplier < 1) {
			elementCalc.info.push('Effectiveness reduced due to hidden element.');
			elementCalc.color = !stats.elementAttackMultiplier ? 'red' : 'yellow';
		}

		return elementCalc;
	}

	private getElementAttack(stats: StatsModel, elementCalc: StatDetailModel): StatDetailModel {
		const elementAttackCalc: StatDetailModel = {
			name: 'Element Attack',
			value: stats.totalElementAttack,
			color: elementCalc.color,
			info: elementCalc.info,
			calculationVariables: [
				{
					displayName: 'Weapon Base Element Attack',
					name: 'base',
					value: stats.baseElementAttack,
					colorClass: 'green'
				},
				{
					displayName: 'Passive Element Attack',
					name: 'passive',
					value: stats.effectivePassiveElementAttack,
					colorClass: 'yellow'
				},
				{
					displayName: 'Element Attack Cap',
					name: 'cap',
					value: stats.elementCap,
					colorClass: 'orange'
				}
			]
		};

		if (stats.elementHidden) {
			elementAttackCalc.calculationVariables.push({
				displayName: 'Hidden Element Multiplier',
				name: 'multiplier',
				value: stats.elementAttackMultiplier,
				colorClass: 'blue'
			});

			if (stats.elementAttackMultiplier) {
				elementAttackCalc.calculationTemplate = `{base} × {multiplier} + {passive} ≈ ${stats.totalElementAttack}`;
			} else {
				elementAttackCalc.calculationTemplate = `({base} + {passive}) × {multiplier} ≈ ${stats.totalElementAttack}`;
			}
		} else {
			elementAttackCalc.calculationTemplate = `{base} + {passive} = ${stats.totalElementAttack}`;
		}

		return elementAttackCalc;
	}

	private getElderseal(stats: StatsModel): StatDetailModel {
		return {
			name: 'Elderseal',
			value: stats.elderseal
		};
	}

	private getHealOnHitPercent(stats: StatsModel): StatDetailModel {
		return {
			name: 'Heal on Hit',
			value: stats.healOnHitPercent
		};
	}

	private getRawAttackAverage(stats: StatsModel): StatDetailModel {
		const totalAffinity = Math.min(stats.affinity + stats.passiveAffinity, 100);
		const rawAttackAvg =
			this.getRawAverage(stats.totalAttack, totalAffinity, stats.passiveCriticalBoostPercent, stats.weaponAttackModifier);

		const rawAttackAvgCalc: StatDetailModel = {
			name: 'Raw Attack Average',
			value: Number.isInteger(rawAttackAvg) ? rawAttackAvg : 0,
			extra1:
				stats.totalAilmentAttack ?
					this.getAilmentAverage(stats.totalAilmentAttack, 0, 0, 1)
					: null,
			class1: stats.totalAilmentAttack ? stats.ailment : null,
			extra2: stats.totalElementAttack ?
				this.getElementAverage(stats.totalElementAttack, 0, 0, 1)
				: null,
			class2: stats.totalElementAttack ? stats.element : null,
			calculationTemplate: `({totalAttack} × {totalAffinity} × {criticalBoost} + {totalAttack} × (100% - {totalAffinity})) <br>÷ {weaponModifier} <br>=<br> [${rawAttackAvg}`,
			calculationVariables: [
				{
					displayName: 'Total Attack',
					name: 'totalAttack',
					value: stats.totalAttack,
					colorClass: 'green'
				},
				{
					displayName: 'Total Affinity',
					name: 'totalAffinity',
					value: totalAffinity,
					colorClass: 'blue'
				},
				{
					displayName: 'Total Critical Boost',
					name: 'criticalBoost',
					value: (stats.passiveCriticalBoostPercent + 125) + '%',
					colorClass: 'kakhi'
				},
				{
					displayName: 'Weapon Modifier',
					name: 'weaponModifier',
					value: stats.weaponAttackModifier,
					colorClass: 'purple'
				}
			]
		};

		if (stats.drawAffinity > 0) {
			rawAttackAvgCalc.value
				+= ` | ${this.getRawAverage(stats.totalAttack, totalAffinity + stats.drawAffinity, stats.passiveCriticalBoostPercent, stats.weaponAttackModifier)}`;
			rawAttackAvgCalc.calculationTemplate
				+= ` | ${this.getRawAverage(stats.totalAttack, totalAffinity + stats.drawAffinity, stats.passiveCriticalBoostPercent, stats.weaponAttackModifier)}`;
			rawAttackAvgCalc.calculationVariables[1].value += '|' + (totalAffinity + stats.drawAffinity);
		}

		if (stats.slidingAffinity > 0) {
			rawAttackAvgCalc.value
				+= ` | ${this.getRawAverage(stats.totalAttack, totalAffinity + stats.slidingAffinity, stats.passiveCriticalBoostPercent, stats.weaponAttackModifier)}`;
			rawAttackAvgCalc.calculationTemplate
				+= ` | ${this.getRawAverage(stats.totalAttack, totalAffinity + stats.slidingAffinity, stats.passiveCriticalBoostPercent, stats.weaponAttackModifier)}`;
			rawAttackAvgCalc.calculationVariables[1].value += '|' + (totalAffinity + stats.slidingAffinity);
		}

		rawAttackAvgCalc.calculationTemplate += ']';
		if (stats.drawAffinity > 0 || stats.slidingAffinity > 0) {
			rawAttackAvgCalc.calculationVariables[1].value = '[' + rawAttackAvgCalc.calculationVariables[1].value + ']';
		}
		rawAttackAvgCalc.calculationVariables[1].value += '%';

		return rawAttackAvgCalc;
	}

	private getRawAttackAveragePotential(stats: StatsModel): StatDetailModel {
		const totalAffinityPotential = Math.min(stats.affinity + stats.passiveAffinity + stats.weakPointAffinity + stats.activeAffinity, 100);
		const rawAttackAveragePotential =
			this.getRawAverage(stats.totalAttackPotential, totalAffinityPotential, stats.passiveCriticalBoostPercent, stats.weaponAttackModifier);

		const rawAttackAveragePotentialCalc: StatDetailModel = {
			name: 'Raw Attack Average Potential',
			value: Number.isInteger(rawAttackAveragePotential) ? rawAttackAveragePotential : 0,
			extra1:
				stats.totalAilmentAttack ?
					this.getAilmentAverage(stats.totalAilmentAttack, Math.max(stats.crititalStatus ? totalAffinityPotential : 0, 0), stats.passiveCriticalBoostPercent, stats.effectiveElementalSharpnessModifier)
					: null,
			class1:
				stats.totalAilmentAttack ? stats.ailment : null,
			extra2:
				stats.totalElementAttack ?
					this.getElementAverage(stats.totalElementAttack, Math.max(stats.crititalElement ? totalAffinityPotential : 0, 0), stats.passiveCriticalBoostPercent, stats.effectiveElementalSharpnessModifier)
					: null,
			class2:
				stats.totalElementAttack ? stats.element : null,
			calculationTemplate:
				`({totalAttackPotential} × {totalAffinityPotential} × {criticalBoost} + {totalAttackPotential} × (100% - {totalAffinityPotential})) <br>÷ {weaponModifier} <br>=<br> [${rawAttackAveragePotential}`,
			calculationVariables: [
				{
					displayName: 'Total Attack Potential',
					name: 'totalAttackPotential',
					value: stats.totalAttackPotential,
					colorClass: 'green'
				},
				{
					displayName: 'Total Affinity Potential',
					name: 'totalAffinityPotential',
					value: totalAffinityPotential,
					colorClass: 'blue'
				},
				{
					displayName: 'Total Critical Boost',
					name: 'criticalBoost',
					value: stats.passiveCriticalBoostPercent + 125 + '%',
					colorClass: 'kakhi'
				},
				{
					displayName: 'Weapon Modifier',
					name: 'weaponModifier',
					value: stats.weaponAttackModifier,
					colorClass: 'purple'
				}
			]
		};

		if (stats.drawAffinity > 0) {
			rawAttackAveragePotentialCalc.value
				+= ` | ${this.getRawAverage(stats.totalAttackPotential, totalAffinityPotential + stats.drawAffinity, stats.passiveCriticalBoostPercent, stats.weaponAttackModifier)}`;
			rawAttackAveragePotentialCalc.calculationTemplate
				+= ` | ${this.getRawAverage(stats.totalAttackPotential, totalAffinityPotential + stats.drawAffinity, stats.passiveCriticalBoostPercent, stats.weaponAttackModifier)}`;
			rawAttackAveragePotentialCalc.calculationVariables[1].value += '|' + (totalAffinityPotential + stats.drawAffinity);
		}

		if (stats.slidingAffinity > 0) {
			rawAttackAveragePotentialCalc.value
				+= ` | ${this.getRawAverage(stats.totalAttackPotential, totalAffinityPotential + stats.slidingAffinity, stats.passiveCriticalBoostPercent, stats.weaponAttackModifier)}`;
			rawAttackAveragePotentialCalc.calculationTemplate
				+= ` | ${this.getRawAverage(stats.totalAttackPotential, totalAffinityPotential + stats.slidingAffinity, stats.passiveCriticalBoostPercent, stats.weaponAttackModifier)}`;
			rawAttackAveragePotentialCalc.calculationVariables[1].value += '|' + (totalAffinityPotential + stats.slidingAffinity);
		}

		rawAttackAveragePotentialCalc.calculationTemplate += ']';
		if (stats.drawAffinity > 0 || stats.slidingAffinity > 0) {
			rawAttackAveragePotentialCalc.calculationVariables[1].value = '[' + rawAttackAveragePotentialCalc.calculationVariables[1].value + ']';
		}
		rawAttackAveragePotentialCalc.calculationVariables[1].value += '%';

		return rawAttackAveragePotentialCalc;
	}

	private buildDefenseCalcs(stats: StatsModel) {
		this.defenseCalcs = [];

		this.defenseCalcs.push({
			name: 'Defense',
			value: (stats.defense + stats.passiveDefense) + ' ➝ ' + (stats.maxDefense + stats.passiveDefense) + ' ➟ ' + (stats.augmentedDefense + stats.passiveDefense)
		});

		if (stats.passiveHealth) {
			this.defenseCalcs.push({
				name: 'Health',
				value: 100 + stats.passiveHealth
			});
		}

		if (stats.passiveStamina) {
			this.defenseCalcs.push({
				name: 'Stamina',
				value: 100 + stats.passiveStamina
			});
		}

		this.defenseCalcs.push({
			name: 'Fire Resist',
			value: stats.fireResist + stats.passiveFireResist
		});

		this.defenseCalcs.push({
			name: 'Water Resist',
			value: stats.waterResist + stats.passiveWaterResist
		});

		this.defenseCalcs.push({
			name: 'Thunder Resist',
			value: stats.thunderResist + stats.passiveThunderResist
		});

		this.defenseCalcs.push({
			name: 'Ice Resist',
			value: stats.iceResist + stats.passiveIceResist
		});

		this.defenseCalcs.push({
			name: 'Dragon Resist',
			value: stats.dragonResist + stats.passiveDragonResist
		});
	}

	private buildAmmoCapacities(stats: StatsModel) {
		if (stats.ammoCapacities) {
			stats.ammoCapacitiesUp = JSON.parse(JSON.stringify(stats.ammoCapacities));
			if (stats.ammoUp >= 1) {
				stats.ammoCapacitiesUp.normal[0]
					+= (stats.ammoCapacitiesUp.normal[0] >= 5 ? 2 : (stats.ammoCapacitiesUp.normal[0] > 0 ? 1 : 0));
				stats.ammoCapacitiesUp.piercing[0]
					+= (stats.ammoCapacitiesUp.piercing[0] >= 5 ? 2 : (stats.ammoCapacitiesUp.piercing[0] > 0 ? 1 : 0));
				stats.ammoCapacitiesUp.spread[0]
					+= (stats.ammoCapacitiesUp.spread[0] >= 5 ? 2 : (stats.ammoCapacitiesUp.spread[0] > 0 ? 1 : 0));
				stats.ammoCapacitiesUp.sticky[0]
					+= (stats.ammoCapacitiesUp.sticky[0] < 3 && stats.ammoCapacitiesUp.sticky[0] > 0 ? 1 : 0);
				stats.ammoCapacitiesUp.cluster[0]
					+= (stats.ammoCapacitiesUp.cluster[0] < 3 && stats.ammoCapacitiesUp.cluster[0] > 0 ? 1 : 0);
			}
			if (stats.ammoUp >= 2) {
				stats.ammoCapacitiesUp.normal[1]
					+= (stats.ammoCapacitiesUp.normal[1] >= 5 ? 2 : (stats.ammoCapacitiesUp.normal[1] > 0 ? 1 : 0));
				stats.ammoCapacitiesUp.piercing[1]
					+= (stats.ammoCapacitiesUp.piercing[1] >= 5 ? 2 : (stats.ammoCapacitiesUp.piercing[1] > 0 ? 1 : 0));
				stats.ammoCapacitiesUp.spread[1]
					+= (stats.ammoCapacitiesUp.spread[1] >= 5 ? 2 : (stats.ammoCapacitiesUp.spread[1] > 0 ? 1 : 0));
				stats.ammoCapacitiesUp.sticky[1]
					+= (stats.ammoCapacitiesUp.sticky[1] < 2 && stats.ammoCapacitiesUp.sticky[1] > 0 ? 1 : 0);
				stats.ammoCapacitiesUp.cluster[1]
					+= (stats.ammoCapacitiesUp.cluster[1] < 2 && stats.ammoCapacitiesUp.cluster[1] > 0 ? 1 : 0);

				stats.ammoCapacitiesUp.recover[0]
					+= (stats.ammoCapacitiesUp.recover[0] >= 5 ? 2 : (stats.ammoCapacitiesUp.recover[0] > 0 ? 1 : 0));
				stats.ammoCapacitiesUp.poison[0]
					+= (stats.ammoCapacitiesUp.poison[0] >= 5 ? 2 : (stats.ammoCapacitiesUp.poison[0] > 0 ? 1 : 0));
				stats.ammoCapacitiesUp.paralysis[0]
					+= (stats.ammoCapacitiesUp.paralysis[0] >= 5 ? 2 : (stats.ammoCapacitiesUp.paralysis[0] > 0 ? 1 : 0));
				stats.ammoCapacitiesUp.sleep[0]
					+= (stats.ammoCapacitiesUp.sleep[0] >= 5 ? 2 : (stats.ammoCapacitiesUp.sleep[0] > 0 ? 1 : 0));
				stats.ammoCapacitiesUp.exhaust[0]
					+= (stats.ammoCapacitiesUp.exhaust[0] >= 5 ? 2 : (stats.ammoCapacitiesUp.exhaust[0] > 0 ? 1 : 0));
			}
			if (stats.ammoUp >= 3) {
				stats.ammoCapacitiesUp.normal[2]
					+= (stats.ammoCapacitiesUp.normal[2] >= 5 ? 2 : (stats.ammoCapacitiesUp.normal[2] > 0 ? 1 : 0));
				stats.ammoCapacitiesUp.piercing[2]
					+= (stats.ammoCapacitiesUp.piercing[2] >= 5 ? 2 : (stats.ammoCapacitiesUp.piercing[2] > 0 ? 1 : 0));
				stats.ammoCapacitiesUp.spread[2]
					+= (stats.ammoCapacitiesUp.spread[2] >= 5 ? 2 : (stats.ammoCapacitiesUp.spread[2] > 0 ? 1 : 0));

				stats.ammoCapacitiesUp.recover[1]
					+= (stats.ammoCapacitiesUp.recover[1] >= 5 ? 2 : (stats.ammoCapacitiesUp.recover[1] > 0 ? 1 : 0));
				stats.ammoCapacitiesUp.poison[1]
					+= (stats.ammoCapacitiesUp.poison[1] >= 5 ? 2 : (stats.ammoCapacitiesUp.poison[1] > 0 ? 1 : 0));
				stats.ammoCapacitiesUp.paralysis[1]
					+= (stats.ammoCapacitiesUp.paralysis[1] >= 5 ? 2 : (stats.ammoCapacitiesUp.paralysis[1] > 0 ? 1 : 0));
				stats.ammoCapacitiesUp.sleep[1]
					+= (stats.ammoCapacitiesUp.sleep[1] >= 5 ? 2 : (stats.ammoCapacitiesUp.sleep[1] > 0 ? 1 : 0));
				stats.ammoCapacitiesUp.exhaust[1]
					+= (stats.ammoCapacitiesUp.exhaust[1] >= 5 ? 2 : (stats.ammoCapacitiesUp.exhaust[1] > 0 ? 1 : 0));

				stats.ammoCapacitiesUp.flaming
					+= (stats.ammoCapacitiesUp.flaming >= 5 ? 2 : (stats.ammoCapacitiesUp.flaming > 0 ? 1 : 0));
				stats.ammoCapacitiesUp.water
					+= (stats.ammoCapacitiesUp.water >= 5 ? 2 : (stats.ammoCapacitiesUp.water > 0 ? 1 : 0));
				stats.ammoCapacitiesUp.freeze
					+= (stats.ammoCapacitiesUp.freeze >= 5 ? 2 : (stats.ammoCapacitiesUp.freeze > 0 ? 1 : 0));
				stats.ammoCapacitiesUp.thunder
					+= (stats.ammoCapacitiesUp.thunder >= 5 ? 2 : (stats.ammoCapacitiesUp.thunder > 0 ? 1 : 0));
				stats.ammoCapacitiesUp.dragon
					+= (stats.ammoCapacitiesUp.dragon < 3 && stats.ammoCapacitiesUp.dragon > 0 ? 1 : 0);
				stats.ammoCapacitiesUp.slicing
					+= (stats.ammoCapacitiesUp.slicing < 3 && stats.ammoCapacitiesUp.slicing > 0 ? 1 : 0);
				stats.ammoCapacitiesUp.demon
					+= (stats.ammoCapacitiesUp.demon >= 5 ? 2 : (stats.ammoCapacitiesUp.demon > 0 ? 1 : 0));
				stats.ammoCapacitiesUp.armor
					+= (stats.ammoCapacitiesUp.armor >= 5 ? 2 : (stats.ammoCapacitiesUp.armor > 0 ? 1 : 0));
				stats.ammoCapacitiesUp.tranq
					+= (stats.ammoCapacitiesUp.tranq >= 5 ? 2 : (stats.ammoCapacitiesUp.tranq > 0 ? 1 : 0));
			}
		}
	}

	private getAilmentAverage(attack: number, affinity: number, criticalBoostPercent: number, elementAttackModififier: number): number {
		return Math.round((
			(attack * (Math.min(affinity, 100) / 100) * (Math.min(affinity, 100) > 0 ? (criticalBoostPercent + 125) / 100 : 1.25))
			+ (attack * (1 - Math.min(affinity, 100) / 100))
		) * elementAttackModififier / 30);
	}

	private getRawAverage(attack: number, affinity: number, criticalBoostPercent: number, weaponAttackModifier: number): number {
		return Math.round((
			(attack * (Math.min(affinity, 100) / 100) * (Math.min(affinity, 100) > 0 ? (criticalBoostPercent + 125) / 100 : 1.25))
			+ (attack * (1 - Math.min(affinity, 100) / 100))
		) / weaponAttackModifier);
	}

	private getElementAverage(attack: number, affinity: number, criticalBoostPercent: number, elementAttackModififier: number): number {
		return Math.round((
			(attack * (Math.min(affinity, 100) / 100) * (Math.min(affinity, 100) > 0 ? (criticalBoostPercent + 125) / 100 : 1.25))
			+ (attack * (1 - Math.min(affinity, 100) / 100))
		) * elementAttackModififier / 10);
	}
}
