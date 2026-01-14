// Companion Module Imports
import { InstanceBase, InstanceStatus, runEntrypoint } from '@companion-module/base'

// Module Component Imports
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

/**
 * Main module class for ETC Eos companion module
 * Manages OSC communication with ETC Eos lighting consoles
 */
class ModuleInstance extends InstanceBase<ModuleConfig> {
	// Configuration
	config!: ModuleConfig

	// State Management
	instanceState: Record<string, any> = {}
	debugToLogger: boolean = true
	lastActChan: number = -1

	// Configuration Parameters
	howManyGroupLabels: number = 0
	howManyMacroLabels: number = 0
	startMacro: number = 0
	wheelsPerCategory: number = 0

	// Core Handlers
	stateManager!: StateManager
	wheelHandler!: WheelHandler
	oscConnection!: OSCConnection

	constructor(internal: any) {
		super(internal)
	}

	/**
	 * Initialize the module instance
	 * Sets up configuration, state, and establishes OSC connection
	 * @param config - Module configuration from Companion
	 */
	async init(config: ModuleConfig): Promise<void> {
		this.config = config

		// Set initial connection status
		this.updateStatus(InstanceStatus.Disconnected)

		// Reset instance state
		this.instanceState = {}
		this.debugToLogger = true
		this.lastActChan = -1

		// Initialize configuration parameters with fallback to defaults
		this.howManyGroupLabels = this.config.num_group_labels || constants.NUM_GROUP_LABELS
		this.howManyMacroLabels = this.config.num_macro_labels || constants.NUM_MACRO_LABELS
		this.startMacro = this.config.num_macro_start || constants.NUM_MACRO_START
		this.wheelsPerCategory = this.config.wheels_per_cat || constants.WHEELS_PER_CAT

		// Initialize core handlers
		this.stateManager = new StateManager(this)
		this.wheelHandler = new WheelHandler(this)
		this.oscConnection = new OSCConnection(this)

		// Configure OSC connection modes for auto-detection
		// Tries multiple port/SLIP combinations to find the correct connection
		const eosPort = this.config.eos_port || constants.EOS_PORT
		const eosPortSlip = this.config.eos_port_slip || constants.EOS_PORT_SLIP
		const connectionModes: ConnectionMode[] = [
			{ port: eosPortSlip, useSlip: true, label: `Port ${eosPortSlip} with SLIP` },
			{ port: eosPortSlip, useSlip: false, label: `Port ${eosPortSlip} without SLIP` },
			{ port: eosPort, useSlip: true, label: `Port ${eosPort} with SLIP` },
			{ port: eosPort, useSlip: false, label: `Port ${eosPort} without SLIP` },
		]

		// Register actions, feedbacks, variables, and presets
		this.updateActions()
		this.updateFeedbacks()
		this.updateVariableDefinitions()
		this.updatePresets()

		// Establish OSC connection with the console
		this.oscConnection.initialize(connectionModes)
	}

	/**
	 * Clean up when module is deleted or Companion exits
	 */
	async destroy(): Promise<void> {
		this.oscConnection.destroy()
		this.log('debug', 'destroy')
	}

	/**
	 * Handle configuration updates from the user
	 * Reinitializes connection if host or user ID changes
	 * @param config - Updated configuration from Companion
	 */
	async configUpdated(config: ModuleConfig): Promise<void> {
		const currentHost = this.config.host
		const currentUserId = this.config.user_id

		this.config = config

		// Reinitialize if connection-critical settings changed
		if (currentHost !== this.config.host || currentUserId !== this.config.user_id) {
			this.oscConnection.closeOscSocket()
			await this.init(config)
		}
	}

	/**
	 * Provide configuration fields for the Companion web interface
	 * @returns Array of configuration field definitions
	 */
	/**
	 * Provide configuration fields for the Companion web interface
	 * @returns Array of configuration field definitions
	 */
	getConfigFields(): any[] {
		return getConfigFields()
	}

	/**
	 * Update action definitions
	 * Delegates to actions.ts to register all available actions
	 */
	updateActions(): void {
		UpdateActions(this)
	}

	/**
	 * Update feedback definitions
	 * Delegates to feedbacks.ts to register all available feedbacks
	 */
	updateFeedbacks(): void {
		UpdateFeedbacks(this)
	}

	/**
	 * Update variable definitions
	 * Delegates to variables.ts to register all available variables
	 */
	updateVariableDefinitions(): void {
		UpdateVariableDefinitions(this)
	}

	/**
	 * Update preset definitions
	 * Delegates to presets.ts to register all available presets
	 */
	updatePresets(): void {
		UpdatePresetDefinitions(this)
	}

	/**
	 * Send an OSC message to the ETC Eos console
	 * @param path - OSC path (e.g., '/eos/chan/1')
	 * @param args - Array of OSC arguments
	 * @param appendPrefix - Whether to append the configured OSC prefix
	 */
	sendOsc(path: string, args: any[], appendPrefix: boolean): void {
		this.oscConnection.sendOsc(path, args, appendPrefix)
	}

	/**
	 * Set intensity for channels, groups, or subs
	 * Used by actions to control lighting fixtures
	 * @param prefix - Type of target ('chan', 'group', 'sub')
	 * @param id - Channel/group/sub number
	 * @param value - Intensity value (0-100) or special command ('min', 'max', 'out', 'full')
	 */
	setIntensity(prefix: string, id: string | number, value: string | number): void {
		let suffix = ''
		let arg: any[] = []

		if (!isNaN(value as any)) {
			// Numeric value - handle differently for subs vs channels/groups
			if (prefix === 'sub') {
				// Subs require float value from 0.0 to 1.0
				arg = [{ type: 'f', value: Math.min(100, parseFloat(value as string)) / 100.0 }]
			} else {
				// Channels/groups use integer value from 0 to 100
				arg = [{ type: 'f', value: Math.min(100, parseInt(value as string)) }]
			}
		} else {
			// Special command string (min, max, out, full, etc.) - append to OSC path
			suffix = `/${value}`
		}

		this.sendOsc(`${prefix}/${id}${suffix}`, arg, true)
	}
}

// Export the module instance with upgrade scripts
export default runEntrypoint(ModuleInstance, UpgradeScripts)
