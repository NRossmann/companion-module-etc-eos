import { InstanceStatus } from '@companion-module/base'
// @ts-ignore - no types available for osc
import OSC from 'osc'

export interface ConnectionMode {
	port: number
	useSlip: boolean
	label: string
}

/**
 * OSCConnection manages the OSC socket connection and reconnection logic
 */
export class OSCConnection {
	private instance: any
	private oscSocket: any
	private reconnectTimer: NodeJS.Timeout | undefined
	private heartbeatInterval: NodeJS.Timeout | undefined

	public connectionModes: ConnectionMode[] = []
	public currentModeIndex: number = 0
	public eos_port: number = 0
	public use_slip: boolean = false
	public failedConnectionAttempts: number = 0
	public lastConnectionAttemptTime: number = 0
	public lastMessageReceived: number = 0
	public heartbeatTimeout: number = 30000

	constructor(instance: any) {
		this.instance = instance
	}

	/**
	 * Initialize the OSC connection with the given modes
	 */
	initialize(connectionModes: ConnectionMode[]): void {
		this.connectionModes = connectionModes
		this.currentModeIndex = 0
		this.eos_port = this.connectionModes[0].port
		this.use_slip = this.connectionModes[0].useSlip
		this.lastMessageReceived = Date.now()

		this.oscSocket = this.getOsc10Socket(this.instance.config.host, this.eos_port)
		this.setOscSocketListeners()
		this.startReconnectTimer()
		this.startHeartbeat()
	}

	/**
	 * Returns the monkey-patched OSC connection to the console.
	 */
	private getOsc10Socket(address: string | undefined, port: number): any {
		let oscTcp = new OSC.TCPSocketPort({
			address: address,
			port: port,
			useSLIP: this.use_slip,
			metadata: true,
		})

		// Enable TCP keepalive to detect dead connections
		if (oscTcp.socket) {
			oscTcp.socket.setKeepAlive(true, 10000) // Send keepalive every 10 seconds
		}

		// Return the OSC 1.0 TCP connection.
		return oscTcp
	}

	/**
	 * Sets the listeners on the oscSocket object.
	 */
	private setOscSocketListeners(): void {
		this.oscSocket.on('error', (err: Error) => {
			if (this.instance.instanceState['connected'] === true) {
				// Only show errors if we're connected, otherwise we'll flood the debug log each time
				//  the module tries to reconnect to the console.
				this.instance.log('error', `Error: ${err.message}`)
			}
		})

		// Setup message handlers
		this.oscSocket.on('message', (message: any) => {
			// Update last message timestamp for heartbeat monitoring
			this.lastMessageReceived = Date.now()

			if (this.instance.debugToLogger) {
				this.instance.log('debug', `Eos OSC message: ${message.address}`)
				this.instance.log('debug', `  Eos OSC message args: ${JSON.stringify(message.args)}`)
			}

			let matches

			// Active cue
			const cueActive = /^\/eos\/out\/active\/cue\/([\d\.]+)\/([\d\.]+)$/
			const cueActiveText = '/eos/out/active/cue/text'

			// Pending cue
			const cuePending = /^\/eos\/out\/pending\/cue\/([\d\.]+)\/([\d\.]+)$/
			const cuePendingText = '/eos/out/pending/cue/text'
			const cuePendingOut = '/eos/out/pending/cue'

			// Previous cue
			const cuePrevious = /^\/eos\/out\/previous\/cue\/([\d\.]+)\/([\d\.]+)$/
			const cuePreviousText = '/eos/out/previous/cue/text'
			const cuePreviousOut = '/eos/out/previous/cue'

			// Show info
			const showName = '/eos/out/show/name'
			const version = '/eos/out/get/version'
			const showLoaded = '/eos/out/event/show/loaded'
			const showCleared = '/eos/out/event/show/cleared'

			// Other patterns
			const softkey = /^\/eos\/out\/softkey\/(\d+)$/
			const cmd = /^\/eos\/out\/user\/(\d+)\/cmd$/
			const chan = '/eos/out/active/chan'
			const groupUpdated = /^\/eos\/out\/notify\/group\/list\/([\d\.]+)\/([\d\.]+)$/
			const groupLabel = /^\/eos\/out\/get\/group\/([\d\.]+)\/list\/([\d\.]+)\/([\d\.]+)$/
			const groupNull = /^\/eos\/out\/get\/group\/([\d\.]+)$/
			const colorhs = '/eos/out/color/hs'
			const macroLabel = /^\/eos\/out\/get\/macro\/(\d+)\/list\/(\d+)\/(\d+)$/
			const macroUpdated = /^\/eos\/out\/notify\/macro\/list\/([\d\.]+)\/([\d\.]+)$/
			const macroFired = /^\/eos\/out\/event\/macro\/(\d+)$/
			const enc_wheel = /^\/eos\/out\/active\/wheel\/(\d+)/

			if ((matches = message.address.match(cueActive))) {
				this.instance.stateManager.setInstanceStates(
					{
						cue_active_list: matches[1],
						cue_active_num: matches[2],
					},
					true
				)
				this.instance.checkFeedbacks('active_cue')
			} else if (message.address === cueActiveText) {
				this.instance.stateManager.parseCueName('active', message.args[0].value)
			} else if ((matches = message.address.match(cuePending))) {
				this.instance.stateManager.setInstanceStates(
					{
						cue_pending_list: matches[1],
						cue_pending_num: matches[2],
					},
					true
				)
				this.instance.checkFeedbacks('pending_cue')
			} else if (message.address === cuePendingOut && message.args.length == 0) {
				this.instance.stateManager.setInstanceStates(
					{
						cue_pending_list: '',
						cue_pending_num: '',
					},
					true
				)
			} else if (message.address === cuePendingText) {
				this.instance.stateManager.parseCueName('pending', message.args[0].value)
			} else if ((matches = message.address.match(cuePrevious))) {
				this.instance.stateManager.setInstanceStates(
					{
						cue_previous_list: matches[1],
						cue_previous_num: matches[2],
					},
					true
				)
				this.instance.checkFeedbacks('previous_cue')
			} else if (message.address === cuePreviousOut && message.args.length == 0) {
				this.instance.stateManager.setInstanceStates(
					{
						cue_previous_list: '',
						cue_previous_num: '',
					},
					true
				)
			} else if (message.address === cuePreviousText) {
				this.instance.stateManager.parseCueName('previous', message.args[0].value)
			} else if (message.address === showName && message.args.length === 1 && message.args[0].type === 's') {
				this.instance.stateManager.setInstanceStates(
					{
						show_name: message.args[0].value,
					},
					true
				)
			} else if (
				message.address === version &&
				message.args.length === 3 &&
				message.args[0].type === 's' &&
				message.args[1].type === 's' &&
				message.args[2].type === 'i'
			) {
				this.instance.stateManager.setInstanceStates(
					{
						eos_version: message.args[0].value,
						fixture_library_version: message.args[1].value,
						gel_swatch_type: message.args[2].value,
					},
					true
				)
			} else if (message.address === version && message.args.length === 1 && message.args[0].type === 's') {
				this.instance.stateManager.setInstanceStates(
					{
						eos_version: message.args[0].value,
						fixture_library_version: '',
						gel_swatch_type: '',
					},
					true
				)
			} else if (message.address === showLoaded || message.address === showCleared) {
				// Reset the state when a show is loaded or a new show is created.
				this.instance.stateManager.requestFullState()
			} else if (
				(matches = message.address.match(softkey)) &&
				message.args.length === 1 &&
				message.args[0].type === 's'
			) {
				this.instance.stateManager.setInstanceStates(
					{
						[`softkey_label_${matches[1]}`]: message.args[0].value,
					},
					true
				)
			} else if ((matches = message.address.match(cmd))) {
				let userid = matches[1]
				if (userid == this.instance.config.user_id || this.instance.config.user_id == '-1') {
					this.instance.stateManager.setInstanceStates(
						{
							cmd: message.args[0].value,
						},
						true
					)
				}
			} else if (message.address === chan) {
				// This may be a better place to reset our parameter data variables
				let chantext = message.args[0].value
				let chanarg_matches = chantext.match(/^(\d+)/)

				if (chanarg_matches != null && chanarg_matches.length > 1) {
					let actChan = chanarg_matches[1]
					// if channel changed, we need to get full set of wheel data
					if (actChan != this.instance.lastActChan) {
						this.instance.wheelHandler.emptyEncVariables()
						this.instance.stateManager.requestFullState()
						this.instance.lastActChan = parseInt(actChan)
					}
				} else if (this.instance.lastActChan != 0) {
					// No channel active, clear out encoders, set lastActChan
					// to zero so we don't keep looping on this. Initially set to -1
					this.instance.wheelHandler.emptyEncVariables()
					this.instance.stateManager.requestFullState()
					this.instance.lastActChan = 0
				}
			} else if ((matches = message.address.match(groupUpdated))) {
				// A group was updated, request new title
				// This is not the group number but the index number
				let group_num = message.args[1].value
				if (group_num <= this.instance.howManyGroupLabels) {
					this.instance.sendOsc('/eos/get/group', [{ type: 'i', value: group_num }], false)
				}
			} else if ((matches = message.address.match(macroUpdated))) {
				// A macro was updated, request new label
				// Match the OSC address for macro updates
				let macro_num = message.args[1].value
				if (
					macro_num >= this.instance.startMacro &&
					macro_num <= this.instance.howManyMacroLabels + this.instance.startMacro
				) {
					// Send a request to get the updated macro label with no arguments
					this.instance.sendOsc('/eos/get/macro', [{ type: 'i', value: macro_num }], false)
				}
			} else if ((matches = message.address.match(groupLabel))) {
				let group_num = matches[1]
				let group_label = message.args[2].value || ''
				if (group_label) {
					this.instance.stateManager.setInstanceStates(
						{
							[`group_label_${group_num}`]: message.args[2].value,
						},
						true
					)
				}
			} else if ((matches = message.address.match(macroLabel))) {
				let macro_num = matches[1]
				let macro_label = message.args[2].value || ''

				if (macro_label) {
					// Update the instance state with the new macro label
					this.instance.stateManager.setInstanceStates(
						{
							[`macro_label_${macro_num}`]: message.args[2].value,
						},
						true
					)
				}
			} else if ((matches = message.address.match(macroFired))) {
				// Macro was fired/triggered
				let macro_num = matches[1]
				this.instance.log('info', `Macro ${macro_num} fired!`)
				this.instance.stateManager.setInstanceStates(
					{
						macro_fired: macro_num,
					},
					false
				)
				this.instance.log('debug', `macro_fired state set to: ${macro_num}`)
				this.instance.checkFeedbacks('macro_fired')

				// Clear the macro_fired state after 1 second
				setTimeout(() => {
					this.instance.stateManager.setInstanceStates(
						{
							macro_fired: null,
						},
						false
					)
					this.instance.log('debug', `macro_fired state cleared`)
					this.instance.checkFeedbacks('macro_fired')
				}, 1000)
			} else if ((matches = message.address.match(groupNull))) {
				let group_num = matches[1]
				this.instance.stateManager.setInstanceStates(
					{
						[`group_label_${group_num}`]: '',
					},
					true
				)
			} else if (message.address === colorhs) {
				this.instance.stateManager.setInstanceStates(
					{
						hue: message.args[0].value.toFixed(3),
						saturation: message.args[1].value.toFixed(3),
						enc_hue_floatval: message.args[0].value.toFixed(3),
						enc_hue_stringval: message.args[0].value.toFixed(3).toString(),
						enc_saturation_floatval: message.args[1].value.toFixed(3),
						enc_saturation_stringval: message.args[1].value.toFixed(3).toString(),
						enc_saturationv2_floatval: message.args[1].value.toFixed(3),
						enc_saturationv2_stringval: message.args[1].value.toFixed(3).toString(),
					},
					true
				)
			} else if ((matches = message.address.match(enc_wheel))) {
				// set variables/state for wheel values
				let wheel_num = matches[1]
				if (wheel_num >= 1) {
					this.instance.wheelHandler.handleWheelMessage(parseInt(wheel_num), message)
				}
			}
		})

		this.oscSocket.open()

		this.oscSocket.socket.on('close', (error: any) => {
			this.instance.log('info', 'Connection closed')
			this.setConnectionState(false)
		})

		this.oscSocket.socket.on('error', (err: Error) => {
			this.instance.log('debug', `Socket error: ${err.message}`)
			// Don't set disconnected here, let 'close' event handle it
		})

		this.oscSocket.socket.on('connect', () => {
			// Enable TCP keepalive after connection
			if (this.oscSocket && this.oscSocket.socket) {
				this.oscSocket.socket.setKeepAlive(true, 10000)
			}
			this.instance.log('info', 'Connection established')
			this.lastMessageReceived = Date.now()
			this.setConnectionState(true)
			this.instance.stateManager.requestFullState()
		})
	}

	/**
	 * Sets the connection state of this module to the Eos console.
	 */
	setConnectionState(isConnected: boolean): void {
		let currentState = this.instance.instanceState['connected']

		this.instance.updateStatus(isConnected ? InstanceStatus.Ok : InstanceStatus.Disconnected)
		this.instance.stateManager.setInstanceStates({ connected: isConnected })

		if (currentState !== isConnected) {
			// The connection state changed. Update the feedback.
			this.instance.checkFeedbacks('connected')
		}
	}

	/**
	 * Watches for disconnects and reconnects to the console.
	 * Automatically detects the correct port and SLIP setting by trying all combinations.
	 */
	startReconnectTimer(): void {
		if (this.reconnectTimer !== undefined) {
			// Timer is already running.
			return
		}

		this.failedConnectionAttempts = 0
		this.lastConnectionAttemptTime = 0

		this.reconnectTimer = setInterval(() => {
			if (!this.oscSocket || !this.oscSocket.socket) {
				// Socket not valid, create new one
				this.instance.log('info', 'Socket invalid, creating new connection')
				this.oscSocket = this.getOsc10Socket(this.instance.config.host, this.eos_port)
				this.setOscSocketListeners()
				return
			}

			const socketState = this.oscSocket.socket.readyState

			if (socketState === 'open') {
				// Already connected. Nothing to do.
				this.failedConnectionAttempts = 0
				return
			}

			// Socket is not open (closed, closing, or connecting)
			// Always create a new socket instead of trying to reuse
			const now = Date.now()
			if (now - this.lastConnectionAttemptTime > 5000) {
				this.failedConnectionAttempts++
				this.lastConnectionAttemptTime = now

				// After 2 failed attempts (10 seconds), try next combination
				if (this.failedConnectionAttempts >= 2) {
					// Move to next mode in the list
					this.currentModeIndex = (this.currentModeIndex + 1) % this.connectionModes.length
					const nextMode = this.connectionModes[this.currentModeIndex]

					this.instance.log('info', `Connection failed, trying: ${nextMode.label}`)
					this.use_slip = nextMode.useSlip
					this.eos_port = nextMode.port
					this.failedConnectionAttempts = 0
				}

				// Always close old socket and create new one
				this.instance.log('debug', `Attempting reconnect with: ${this.connectionModes[this.currentModeIndex].label}`)
				this.closeOscSocket()
				this.oscSocket = this.getOsc10Socket(this.instance.config.host, this.eos_port)
				this.setOscSocketListeners()
			}
		}, 5000)
	}

	/**
	 * Start heartbeat monitoring to detect dead connections
	 */
	startHeartbeat(): void {
		if (this.heartbeatInterval !== undefined) {
			// Already running
			return
		}

		this.heartbeatInterval = setInterval(() => {
			if (!this.instance.instanceState['connected']) {
				// Not connected, nothing to check
				return
			}

			const timeSinceLastMessage = Date.now() - this.lastMessageReceived

			if (timeSinceLastMessage > this.heartbeatTimeout) {
				// No messages received for too long, connection is probably dead
				this.instance.log('warn', `No messages received for ${timeSinceLastMessage}ms, connection appears dead`)
				this.setConnectionState(false)

				// Force socket close to trigger reconnect
				if (this.oscSocket && this.oscSocket.socket) {
					try {
						this.oscSocket.socket.destroy()
					} catch (e: any) {
						this.instance.log('debug', `Error destroying socket: ${e.message}`)
					}
				}
			} else if (this.oscSocket && this.oscSocket.socket && this.oscSocket.socket.readyState === 'open') {
				// Send a ping to keep connection alive and verify it works
				// Eos will respond with /eos/out/ping
				this.instance.sendOsc('/eos/ping', [], false)
			}
		}, 15000) // Check every 15 seconds
	}

	/**
	 * Closes the OSC socket.
	 */
	closeOscSocket(): void {
		if (this.oscSocket !== undefined) {
			this.oscSocket.close()

			if (this.oscSocket.socket !== undefined) {
				this.oscSocket.socket.destroy()
				delete this.oscSocket.socket
			}

			delete this.oscSocket
		}

		this.instance.stateManager.emptyState()
	}

	/**
	 * Stops all timers and closes the connection
	 */
	destroy(): void {
		// Clear the reconnect timer if it exists.
		if (this.reconnectTimer !== undefined) {
			clearInterval(this.reconnectTimer)
			this.reconnectTimer = undefined
		}

		// Clear the heartbeat timer if it exists.
		if (this.heartbeatInterval !== undefined) {
			clearInterval(this.heartbeatInterval)
			this.heartbeatInterval = undefined
		}

		// Close the socket.
		this.closeOscSocket()
	}

	/**
	 * Sends the path to the OSC host.
	 */
	sendOsc(path: string, args: any[], appendPrefix: boolean): void {
		if (!this.instance.config.host) {
			return
		}

		if (appendPrefix !== false) {
			path = `/eos/${path}`
		}

		let packet = {
			address: path,
			args: args,
		}

		if (this.instance.debugToLogger) {
			this.instance.log('info', `Eos: Sending packet: ${JSON.stringify(packet)}`)
		}

		this.oscSocket.send(packet)
	}

	/**
	 * Get the OSC socket (for external access if needed)
	 */
	getSocket(): any {
		return this.oscSocket
	}
}
