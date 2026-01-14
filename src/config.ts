import { Regex } from '@companion-module/base'
import * as constants from './constants.js'

/**
 * Returns configuration fields for the web config interface
 */
export function getConfigFields(): any[] {
	return [
		{
			type: 'textinput',
			id: 'host',
			label: 'Target IP',
			width: 8,
			regex: Regex.IP,
		},
		{
			type: 'textinput',
			id: 'user_id',
			label: 'User ID',
			default: 1,
			width: 4,
			regex: '/^(-1|0|\\d+)$/',
		},
		{
			type: 'static-text',
			id: 'advanced_settings',
			label: 'Advanced Settings',
			value: 'Configure system parameters below',
			width: 12,
		},
		{
			type: 'number',
			id: 'wheels_per_cat',
			label: 'Wheels per Category',
			default: constants.WHEELS_PER_CAT,
			min: 1,
			max: 128,
			width: 6,
		},
		{
			type: 'number',
			id: 'num_group_labels',
			label: 'Number of Group Labels',
			default: constants.NUM_GROUP_LABELS,
			min: 1,
			max: 100,
			width: 6,
		},
		{
			type: 'number',
			id: 'num_softkeys',
			label: 'Number of Softkeys',
			default: constants.NUM_SOFTKEYS,
			min: 1,
			max: 24,
			width: 6,
		},
		{
			type: 'number',
			id: 'eos_port',
			label: 'EOS Port',
			default: constants.EOS_PORT,
			min: 1,
			max: 65535,
			width: 6,
		},
		{
			type: 'number',
			id: 'eos_port_slip',
			label: 'EOS Port SLIP',
			default: constants.EOS_PORT_SLIP,
			min: 1,
			max: 65535,
			width: 6,
		},
		{
			type: 'number',
			id: 'num_macro_labels',
			label: 'Number of Macro Labels',
			default: constants.NUM_MACRO_LABELS,
			min: 1,
			max: 1000,
			width: 6,
		},
		{
			type: 'number',
			id: 'num_macro_start',
			label: 'Macro Start Number',
			default: constants.NUM_MACRO_START,
			min: 1,
			max: 99999,
			width: 6,
		},
	]
}
