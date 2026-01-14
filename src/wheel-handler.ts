import { ParamMap } from './param_map.js'
import { GetVariableDefinitions } from './variables.js'

export interface WheelData {
	label: string
	stringval: string
	cat: string | number
	floatval: string | number
}

/**
 * WheelHandler manages encoder wheel data and operations
 */
export class WheelHandler {
	private instance: any
	public wheels: WheelData[] = []
	public readingWheels: boolean = false
	private wheelTimer: NodeJS.Timeout | undefined

	constructor(instance: any) {
		this.instance = instance
		this.emptyWheelData()
	}

	/**
	 * Empty wheel data
	 */
	emptyWheelData(): void {
		for (let i = 1; i <= 100; i++) {
			this.wheels[i] = {
				label: '',
				stringval: '',
				cat: '',
				floatval: '',
			}
		}
	}

	/**
	 * Handle wheel message update
	 */
	handleWheelMessage(wheel_num: number, message: any): void {
		if (wheel_num < 1) return

		let wheel_label = message.args[0].value
		let wheel_stringval = '0'
		let wheel_cat = message.args[1].value || 0
		let wheel_floatval: string | number = message.args[2].value

		if (wheel_floatval != null) {
			wheel_floatval = Number(wheel_floatval)
			wheel_floatval = wheel_floatval.toFixed(3)
		} else {
			wheel_floatval = 0.0
		}

		let wmatches = wheel_label.match(/^([^\[]*)\s*\[([^\]]*)\]/)
		if (wmatches != null && wmatches.length == 3) {
			wheel_label = wmatches[1].trimEnd()
			wheel_stringval = wmatches[2]
		}

		// Update private wheel data
		this.wheels[wheel_num].label = wheel_label
		this.wheels[wheel_num].stringval = wheel_stringval
		this.wheels[wheel_num].cat = wheel_cat
		this.wheels[wheel_num].floatval = wheel_floatval

		// Set individual wheel params we care about specifically
		// as the wheel numbers can change.
		let distinctparam = this.getDistinctParamForWheelLabel(wheel_label)
		if (distinctparam != '') {
			this.instance.stateManager.setInstanceStates(
				{
					[`${distinctparam}_stringval`]: wheel_stringval,
					[`${distinctparam}_floatval`]: wheel_floatval,
				},
				true
			)
		}

		// if we are not yet reading wheels, set flag to show we are,
		// and set a timeout after 100ms to process them into category sets.
		// If we get a new one, clear and restart that timer.
		// We don't know how many wheels, so this is a best guess way
		// of knowing when to process them all into groups.
		if (this.readingWheels == false) {
			this.readingWheels = true
			this.wheelTimer = setTimeout(() => this.doCategoryWheels(), 100)
		} else {
			// cancel and restart timer waiting for next value
			if (this.wheelTimer) {
				clearTimeout(this.wheelTimer)
			}
			this.wheelTimer = setTimeout(() => this.doCategoryWheels(), 100)
		}
	}

	/**
	 * Assemble catXX_wheel_* variables after last wheel
	 * parameter received.
	 */
	doCategoryWheels(): void {
		let variableDefinitions = GetVariableDefinitions(this.instance)
		let updateDefs: Record<string, any> = {}
		let catWheels: number[][] = []

		// if we got here, we assume we are done with the batch of wheel info
		this.readingWheels = false

		this.wheels.forEach((wheelobj, index) => {
			if (!catWheels[wheelobj.cat as any]) {
				catWheels[wheelobj.cat as any] = []
			}
			catWheels[wheelobj.cat as any].push(index)
		})

		// Loop through categories 0-6
		for (let i = 0; i <= 6; i++) {
			// nothing in this category
			if (!catWheels[i]) {
				updateDefs[`wheel_cat${i}_count`] = 0
			} else {
				for (let j = 0; j < Math.min(catWheels[i].length, this.instance.wheelsPerCategory); j++) {
					updateDefs[`cat${i}_wheel_${j + 1}_label`] = this.wheels[catWheels[i][j]].label
					updateDefs[`cat${i}_wheel_${j + 1}_stringval`] = this.wheels[catWheels[i][j]].stringval
					updateDefs[`cat${i}_wheel_${j + 1}_floatval`] = this.wheels[catWheels[i][j]].floatval
					let eosCmd = this.wheels[catWheels[i][j]].label
					if (eosCmd && eosCmd != '') {
						eosCmd = eosCmd.replace(/ /g, '_').replace(/\//g, '\\')
						eosCmd = eosCmd.toLowerCase()
					} else {
						eosCmd = ''
					}
					updateDefs[`cat${i}_wheel_${j + 1}_oscname`] = eosCmd
				}
				updateDefs[`cat${i}_wheel_count`] = catWheels[i].length
			}
		}

		this.instance.setVariableValues(updateDefs)
	}

	/**
	 * Reset our internal wheel variables
	 */
	emptyEncVariables(): void {
		let variableDefinitions = GetVariableDefinitions(this.instance)
		let updateDefs: Record<string, any> = {}

		variableDefinitions.forEach((varDef: any) => {
			if (varDef['variableId'].startsWith('enc_') || /^cat\d_/.test(varDef['variableId'])) {
				updateDefs[varDef['variableId']] = ''
			}
		})

		this.instance.setVariableValues(updateDefs)
		this.emptyWheelData()
	}

	/**
	 * Get distinct parameter name for a wheel label
	 */
	getDistinctParamForWheelLabel(wheel_label: string): string {
		let distinctparam = ''
		if (wheel_label != null && wheel_label != '') {
			let lc_wheel_label = wheel_label.toLowerCase()
			if (lc_wheel_label in ParamMap) {
				distinctparam = ParamMap[lc_wheel_label]
			}
		}
		return distinctparam
	}
}
