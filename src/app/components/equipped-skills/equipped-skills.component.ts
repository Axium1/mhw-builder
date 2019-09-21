import { Component, OnInit } from '@angular/core';
import { EquippedSetBonusModel } from '../../models/equipped-set-bonus.model';
import { EquippedSkillModel } from '../../models/equipped-skill.model';
import { SkillService } from '../../services/skill.service';
import { TooltipService } from '../../services/tooltip.service';
import { PointerType } from '../../types/pointer.type';

@Component({
	selector: 'mhw-builder-equipped-skills',
	templateUrl: './equipped-skills.component.html',
	styleUrls: ['./equipped-skills.component.scss']
})
export class EquippedSkillsComponent implements OnInit {
	skills: EquippedSkillModel[];
	setBonuses: EquippedSetBonusModel[];

	skillsVisible = true;

	constructor(
		private skillService: SkillService,
		private tooltipService: TooltipService
	) { }

	ngOnInit() {
		this.skillService.skillsUpdated$.subscribe(skills => {
			this.skills = skills;
			this.skills.sort(function (skill1, skill2) {
				if (skill1.isSetBonus && !skill2.isSetBonus) {
					return 1;
				} if (!skill1.isSetBonus && skill2.isSetBonus) {
					return -1;
				} else if (skill1.equippedCount > skill2.equippedCount) {
					return -1;
				} else if (skill1.equippedCount < skill2.equippedCount) {
					return 1;
				} else if (skill1.totalLevelCount > skill2.totalLevelCount) {
					return -1;
				} else if (skill1.totalLevelCount < skill2.totalLevelCount) {
					return 1;
				} else {
					return skill1.name.localeCompare(skill2.name);
				}
			});
		});

		this.skillService.setBonusesUpdated$.subscribe(setBonuses => {
			this.setBonuses = setBonuses;
		});
	}

	getMinCount(tool1Count: number, tool2Count: number) {
		return Math.min(tool1Count, tool2Count);
	}

	getMaxCount(tool1Count: number, tool2Count: number) {
		return Math.max(tool1Count, tool2Count);
	}

	getSkillCountColor(skill: EquippedSkillModel): string {
		if (skill.isSetBonus) {
			return '#F0E68C';
		} else if (skill.equippedCount > skill.totalLevelCount) {
			return '#ffa07a';
		} else if (skill.equippedCount == skill.totalLevelCount) {
			return '#87cefa';
		} else if (skill.equippedCount + Math.max(skill.equippedTool1Count, skill.equippedTool2Count) >= skill.totalLevelCount) {
			return '#86ff86';
		}

		return 'white';
	}

	getSetBonusColor(equippedCount: number, requiredCount: number): string {
		if (equippedCount > requiredCount) {
			return '#ffa07a';
		} else if (equippedCount == requiredCount) {
			return '#87cefa';
		}
		return 'rgba(200,200,200,0.5)';
	}

	showSkillDetails(event: PointerEvent, equippedSkill: EquippedSkillModel) {
		if (event.pointerType == PointerType.Mouse) {
			this.tooltipService.setEquippedSkill(equippedSkill);
		}
	}

	clearSkillDetails() {
		this.tooltipService.setEquippedSkill(null);
	}

	showOnClickSkillDetails(equippedSkill: EquippedSkillModel) {
		this.tooltipService.setEquippedSkill(equippedSkill);
	}

	showSetBonusDetails(event: PointerEvent, equippedSetBonus: EquippedSetBonusModel) {
		if (event.pointerType == PointerType.Mouse) {
			this.tooltipService.setEquippedSetBonus(equippedSetBonus);
		}
	}

	clearSetBonusDetails() {
		this.tooltipService.setEquippedSetBonus(null);
	}

	showOnClickSetBonusDetails(equippedSetBonus: EquippedSetBonusModel) {
		this.tooltipService.setEquippedSetBonus(equippedSetBonus);
	}
}
