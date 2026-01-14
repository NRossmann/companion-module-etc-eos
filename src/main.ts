import { InstanceBase, InstanceStatus, runEntrypoint } from '@companion-module/base'
import UpdateActions from './actions.js'
import { getConfigFields } from './config.js'
import * as constants from './constants.js'
import UpdateFeedbacks from './feedbacks.js'
import { ConnectionMode, OSCConnection } from './osc-connection.js'
import UpdatePresetDefinitions from './presets.js'
import { StateManager } from './state-manager.js'
import type { ModuleConfig } from './types.js'
import UpgradeScripts from './upgrades.js'
import { UpdateVariableDefinitions } from './variables.js'
import { WheelHandler } from './wheel-handler.js'

class ModuleInstance extends InstanceBase<ModuleConfig> {
	config!: ModuleConfig
	instanceState: Record<string, any> = {}
	debugToLogger: boolean = true
	lastActChan: number = -1
	howManyGroupLabels: number = 0
	howManyMacroLabels: number = 0
	startMacro: number = 0
	wheelsPerCategory: number = 0

	// Handlers
	stateManager!: StateManager
	wheelHandler!: WheelHandler
	oscConnection!: OSCConnection

	constructor(internal: any) {
		super(internal)
	}

	async init(config: ModuleConfig): Promise<void> {
		this.config = config

		this.updateStatus(InstanceStatus.Disconnected)

		this.instanceState = {}
		this.debugToLogger = true
		this.lastActChan = -1

		// Initialize configuration parameters
		this.howManyGroupLabels = this.config.num_group_labels || constants.NUM_GROUP_LABELS
		this.howManyMacroLabels = this.config.num_macro_labels || constants.NUM_MACRO_LABELS
		this.startMacro = this.config.num_macro_start || constants.NUM_MACRO_START
		this.wheelsPerCategory = this.config.wheels_per_cat || constants.WHEELS_PER_CAT

		// Initialize handlers
		this.stateManager = new StateManager(this)
		this.wheelHandler = new WheelHandler(this)
		this.oscConnection = new OSCConnection(this)

		// Setup connection modes for auto-detection
		const eosPort = this.config.eos_port || constants.EOS_PORT
		const eosPortSlip = this.config.eos_port_slip || constants.EOS_PORT_SLIP
		const connectionModes: ConnectionMode[] = [
			{ port: eosPortSlip, useSlip: true, label: `Port ${eosPortSlip} with SLIP` },
			{ port: eosPortSlip, useSlip: false, label: `Port ${eosPortSlip} without SLIP` },
			{ port: eosPort, useSlip: true, label: `Port ${eosPort} with SLIP` },
			{ port: eosPort, useSlip: false, label: `Port ${eosPort} without SLIP` },
		]

		this.updateActions() // export actions
		this.updateFeedbacks() // export feedbacks
		this.updateVariableDefinitions() // export variable definitions
		this.updatePresets() // export presets

		// Initialize OSC connection
		this.oscConnection.initialize(connectionModes)
	}

	// When module gets deleted
	async destroy(): Promise<void> {
		this.oscConnection.destroy()
		this.log('debug', 'destroy')
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		let currentHost = this.config.host
		let currentUserId = this.config.user_id

		this.config = config

		if (currentHost !== this.config.host || currentUserId !== this.config.user_id) {
			this.oscConnection.closeOscSocket()
			await this.init(config)
		}
	}

	// Return config fields for web config
	getConfigFields(): any[] {
		return getConfigFields()
	}

	updateActions(): void {
		UpdateActions(this)
	}

	updateFeedbacks(): void {
		UpdateFeedbacks(this)
	}

	updateVariableDefinitions(): void {
		UpdateVariableDefinitions(this)
	}

	updatePresets(): void {
		UpdatePresetDefinitions(this)
	}

	/**
	 * Sends the path to the OSC host (delegates to OSCConnection)
	 */
	sendOsc(path: string, args: any[], appendPrefix: boolean): void {
		this.oscConnection.sendOsc(path, args, appendPrefix)
	}

	/**
	 * For actions - Set intensity for channels/groups/subs
	 */
	setIntensity(prefix: string, id: string | number, value: string | number): void {
		let suffix = ''
		let arg: any[] = []
		if (!isNaN(value as any)) {
			// Numeric value as a percentage
			if (prefix == 'sub') {
				// Value must be a float from 0.0 to 1.0 for subs.
				arg = [{ type: 'f', value: Math.min(100, parseFloat(value as string)) / 100.0 }]
			} else {
				// Value must be an int from 1 to 100 for chans/groups.
				arg = [{ type: 'f', value: Math.min(100, parseInt(value as string)) }]
			}
		} else {
			// A special command, like "min", "max", "out", "full. Append to command.
			suffix = `/${value}`
		}

		this.sendOsc(`${prefix}/${id}${suffix}`, arg, true)
	}
}

export default runEntrypoint(ModuleInstance, UpgradeScripts)
