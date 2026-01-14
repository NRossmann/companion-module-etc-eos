/**
 * StateManager handles all state management operations for the module
 */
export class StateManager {
	private instance: any

	constructor(instance: any) {
		this.instance = instance
	}

	/**
	 * Updates the internal state of a variable within this module.
	 * Optionally updates the dynamic variable with its new value.
	 */
	setInstanceStates(values: Record<string, any>, isVariable?: boolean): void {
		for (const [key, value] of Object.entries(values)) {
			this.instance.instanceState[key] = value
		}

		if (isVariable) {
			this.instance.setVariableValues(values)
		}
	}

	/**
	 * Empties the state (variables/feedbacks), but preserves the connected state.
	 */
	emptyState(): void {
		this.instance.instanceState = {
			connected: this.instance.instanceState['connected'],
		}

		this.instance.checkFeedbacks('pending_cue', 'active_cue', 'connected')
	}

	/**
	 * Requests the current state from the console.
	 */
	requestFullState(): void {
		this.emptyState()

		// Request the current state of the console.
		this.instance.sendOsc('/eos/reset', [], false)

		// Switch to the correct user_id.
		this.instance.sendOsc('/eos/user', [{ type: 'i', value: this.instance.config.user_id }], false)

		// Turn on subscription for show file event updates
		this.instance.sendOsc('/eos/subscribe', [{ type: 'i', value: 1 }], false)

		// Get xx groups worth of labels - issue the request here to get the values,
		// they are caught in the on.message elsewhere
		for (let i = 1; i <= this.instance.howManyGroupLabels; i++) {
			this.instance.sendOsc('/eos/get/group', [{ type: 'i', value: i }], false)
		}

		// Get xx macros worth of labels - issue the request here to get the values,
		// they are caught in the on.message elsewhere
		for (let i = this.instance.startMacro; i <= this.instance.howManyMacroLabels + this.instance.startMacro; i++) {
			this.instance.sendOsc('/eos/get/macro', [{ type: 'i', value: i }], false)
		}
	}

	/**
	 * Parses a cue's name (and the additional information within it) and updates the internal state.
	 */
	parseCueName(type: string, cueName: string): void {
		// Cue name will look something like:
		//  51.1 Drums 3.0 100%
		//  <CUE NUMBER> <LABEL> <DURATION> [<INTENSITY PERCENTAGE>]
		//
		// or, if the cue doesn't have a label:
		//  51.1 3.0 100%
		//  <CUE NUMBER> <DURATION> [<INTENSITY PERCENTAGE>]
		//
		// Fixed to accommodate CUE NUMBER of list/cue, as in 1/1.
		//
		// If the CUE value is " 0.0" then reset active cue list/number
		const cuematch =
			/^(?<CUE_NUMBER>[\d\.]+\/[\d\.]+|[\d\.]+)?(?<CUE_LIST>\/[\d\.]+)?( (?<LABEL>.*?))? (?<DURATION>[\d\.]+)( (?<INTENSITY>[\d\.]+%))?$/
		let matches = cueName.match(cuematch)

		if (matches !== null && matches.length >= 6) {
			// Parse the response.
			const newValues: Record<string, any> = {
				[`cue_${type}_label`]: matches[3] || matches[2], // Use cue number if label not available.
				[`cue_${type}_duration`]: matches[5],
			}

			if (matches.length === 8) {
				newValues[`cue_${type}_intensity`] = matches[7]
			}

			this.setInstanceStates(newValues, true)
		} else {
			// Use as-is. Couldn't parse properly.
			this.setInstanceStates(
				{
					[`cue_${type}_label`]: cueName,
				},
				true
			)
		}

		// Clear out when active cue is no longer active
		if ('active' == type && (' 0.0 ' == cueName.substring(0, 5) || '' == cueName)) {
			this.setInstanceStates(
				{
					cue_active_list: '',
					cue_active_num: '',
				},
				true
			)
			this.instance.checkFeedbacks('active_cue')
		}
	}
}
